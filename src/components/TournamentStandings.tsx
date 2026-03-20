import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface TournamentTeam {
  id: string;
  tournament_id: string;
  team_name: string;
}

interface TournamentMatch {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  played_at: string;
}

interface StandingsRow {
  teamId: string;
  teamName: string;
  pj: number;
  pg: number;
  pp: number;
  pts: number;
}

interface Props {
  tournamentId: string;
  tournamentName: string;
  onBack: () => void;
}

const TournamentStandings: React.FC<Props> = ({ tournamentId, tournamentName, onBack }) => {
  const { effectiveRoles } = useAuth();
  const { teams: appTeams, myTeamName } = useApp();
  const isGlobal = effectiveRoles.some(r => r === 'super_admin' || r === 'system_operator');

  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [selectedAppTeamId, setSelectedAppTeamId] = useState('');
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [matchForm, setMatchForm] = useState({ homeId: '', awayId: '', homeScore: 0, awayScore: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [teamsRes, matchesRes] = await Promise.all([
      supabase.from('tournament_teams').select('*').eq('tournament_id', tournamentId),
      supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId),
    ]);
    setTeams(teamsRes.data || []);
    setMatches(matchesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tournamentId]);

  // Build available teams list: "Mi equipo" + rival teams from AppContext
  const availableTeams = [
    ...(myTeamName ? [{ id: '__my_team__', label: myTeamName }] : []),
    ...appTeams.map(t => ({ id: t.id, label: t.clubName })),
  ];

  // Filter out teams already added to this tournament
  const alreadyAddedNames = new Set(teams.map(t => t.team_name));
  const selectableTeams = availableTeams.filter(t => !alreadyAddedNames.has(t.label));

  const addTeam = async () => {
    const selected = availableTeams.find(t => t.id === selectedAppTeamId);
    if (!selected) return;
    const { error } = await supabase.from('tournament_teams').insert({
      tournament_id: tournamentId,
      team_name: selected.label,
    });
    if (error) { toast.error('Error al agregar equipo'); return; }
    setSelectedAppTeamId('');
    fetchData();
    toast.success('Equipo agregado');
  };

  const removeTeam = async (id: string) => {
    await supabase.from('tournament_teams').delete().eq('id', id);
    fetchData();
  };

  const addMatch = async () => {
    if (!matchForm.homeId || !matchForm.awayId || matchForm.homeId === matchForm.awayId) {
      toast.error('Selecciona dos equipos diferentes');
      return;
    }
    const { error } = await supabase.from('tournament_matches').insert({
      tournament_id: tournamentId,
      home_team_id: matchForm.homeId,
      away_team_id: matchForm.awayId,
      home_score: matchForm.homeScore,
      away_score: matchForm.awayScore,
    });
    if (error) { toast.error('Error al registrar resultado'); return; }
    setMatchForm({ homeId: '', awayId: '', homeScore: 0, awayScore: 0 });
    setShowAddMatch(false);
    fetchData();
    toast.success('Resultado registrado');
  };

  const deleteMatch = async (id: string) => {
    await supabase.from('tournament_matches').delete().eq('id', id);
    fetchData();
  };

  // Calculate standings
  const standings: StandingsRow[] = teams.map(t => {
    const teamMatches = matches.filter(m => m.home_team_id === t.id || m.away_team_id === t.id);
    let pg = 0, pp = 0;
    teamMatches.forEach(m => {
      const isHome = m.home_team_id === t.id;
      const myScore = isHome ? m.home_score : m.away_score;
      const otherScore = isHome ? m.away_score : m.home_score;
      if (myScore > otherScore) pg++;
      else pp++;
    });
    return { teamId: t.id, teamName: t.team_name, pj: teamMatches.length, pg, pp, pts: pg * 2 + pp * 1 };
  }).sort((a, b) => b.pts - a.pts || b.pg - a.pg);

  const teamName = (id: string) => teams.find(t => t.id === id)?.team_name || '?';

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <h2 className="text-lg font-extrabold text-foreground flex-1">{tournamentName}</h2>
      </div>

      {/* Standings table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead className="text-center w-12">PJ</TableHead>
              <TableHead className="text-center w-12">PG</TableHead>
              <TableHead className="text-center w-12">PP</TableHead>
              <TableHead className="text-center w-12 font-bold">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sin equipos registrados</TableCell></TableRow>
            )}
            {standings.map((row, i) => (
              <TableRow key={row.teamId}>
                <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-semibold">{row.teamName}</TableCell>
                <TableCell className="text-center">{row.pj}</TableCell>
                <TableCell className="text-center">{row.pg}</TableCell>
                <TableCell className="text-center">{row.pp}</TableCell>
                <TableCell className="text-center font-bold text-primary">{row.pts}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Results list */}
      {matches.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground">Resultados</h3>
          {matches.map(m => (
            <div key={m.id} className="flex items-center bg-card rounded-lg px-3 py-2 gap-2 text-sm">
              <span className="flex-1 text-right font-semibold truncate">{teamName(m.home_team_id)}</span>
              <span className="font-bold text-primary px-2">{m.home_score} - {m.away_score}</span>
              <span className="flex-1 font-semibold truncate">{teamName(m.away_team_id)}</span>
              {isGlobal && (
                <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => deleteMatch(m.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin controls */}
      {isGlobal && (
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-bold text-foreground">Gestión del torneo</h3>

          {/* Add team */}
          <div className="flex gap-2">
            <Input placeholder="Nombre del equipo" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
            <Button onClick={addTeam} size="icon" className="shrink-0"><Plus className="w-4 h-4" /></Button>
          </div>

          {/* Team list with remove */}
          {teams.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {teams.map(t => (
                <div key={t.id} className="flex items-center gap-1 bg-muted rounded-full px-3 py-1 text-xs font-medium">
                  {t.team_name}
                  <button onClick={() => removeTeam(t.id)} className="ml-1 text-destructive hover:text-destructive/80">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add match result */}
          {teams.length >= 2 && (
            <>
              {!showAddMatch ? (
                <Button variant="outline" className="w-full" onClick={() => setShowAddMatch(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Registrar resultado
                </Button>
              ) : (
                <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="rounded-md border bg-background px-2 py-2 text-sm"
                      value={matchForm.homeId}
                      onChange={e => setMatchForm(f => ({ ...f, homeId: e.target.value }))}
                    >
                      <option value="">Local</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                    </select>
                    <select
                      className="rounded-md border bg-background px-2 py-2 text-sm"
                      value={matchForm.awayId}
                      onChange={e => setMatchForm(f => ({ ...f, awayId: e.target.value }))}
                    >
                      <option value="">Visitante</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number" min={0} placeholder="Pts Local"
                      value={matchForm.homeScore}
                      onChange={e => setMatchForm(f => ({ ...f, homeScore: parseInt(e.target.value) || 0 }))}
                    />
                    <Input
                      type="number" min={0} placeholder="Pts Visitante"
                      value={matchForm.awayScore}
                      onChange={e => setMatchForm(f => ({ ...f, awayScore: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={addMatch}><Save className="w-4 h-4 mr-2" /> Guardar</Button>
                    <Button variant="ghost" onClick={() => setShowAddMatch(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentStandings;
