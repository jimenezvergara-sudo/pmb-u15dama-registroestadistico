// Nikita — Asistente táctico conversacional de BASQUEST+.
// Ahora consulta Supabase directamente usando el JWT del usuario,
// para construir un contexto REAL (roster + últimos partidos del club/categoría)
// y evitar que la IA invente datos.
//
// Endpoint: POST /nikita-chat
// Body: {
//   messages: [{ role: 'user' | 'assistant', content: string }],
//   statsPayload?: string,           // contexto extra opcional (ej. box score actual)
//   rama?: 'femenino' | 'masculino' | 'mixto',
//   teamName?: string,
//   category?: string,
// }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Rama = "femenino" | "masculino" | "mixto";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const ramaInstruction = (rama: Rama): string => {
  switch (rama) {
    case "masculino":
      return 'IMPORTANTE: El equipo es MASCULINO. Refiérete siempre como "jugador/jugadores", masculino genérico. Nunca uses "jugadora" ni femenino.';
    case "mixto":
      return 'IMPORTANTE: El equipo es MIXTO. Usa lenguaje neutral: "deportistas", "el equipo", "integrantes". Evita marcar género específico.';
    case "femenino":
    default:
      return 'IMPORTANTE: El equipo es FEMENINO. Refiérete siempre como "jugadora/jugadoras", femenino genérico. Nunca uses "jugador" ni masculino.';
  }
};

// ---------------------------------------------------------------------------
// Construcción de contexto desde la BBDD (RLS aplicada por el JWT del usuario)
// ---------------------------------------------------------------------------
async function buildDbContext(authHeader: string, category?: string): Promise<string> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const lines: string[] = [];

  try {
    // Roster (filtrado por categoría si aplica). RLS limita a club del usuario.
    let rosterQ = supa.from("club_players").select("name, number, category").order("number", { ascending: true });
    if (category) rosterQ = rosterQ.eq("category", category);
    const { data: roster, error: rosterErr } = await rosterQ;

    if (rosterErr) {
      lines.push(`(No pude leer el roster: ${rosterErr.message})`);
    } else if (!roster || roster.length === 0) {
      lines.push("ROSTER: (vacío — el club no tiene jugadoras/jugadores cargados en esta categoría)");
    } else {
      lines.push(`ROSTER (${roster.length} ${category ? `en ${category}` : "registros"}):`);
      for (const p of roster) {
        lines.push(`- #${p.number} ${p.name}${p.category ? ` [${p.category}]` : ""}`);
      }
    }

    // Últimos partidos (máx 8) para contexto histórico real.
    let gamesQ = supa
      .from("club_games")
      .select("id, date, opponent_name, is_home, leg, category, shots, actions, opponent_scores, roster")
      .order("date", { ascending: false })
      .limit(8);
    if (category) gamesQ = gamesQ.eq("category", category);
    const { data: games, error: gamesErr } = await gamesQ;

    if (gamesErr) {
      lines.push(`\n(No pude leer los partidos: ${gamesErr.message})`);
    } else if (games && games.length > 0) {
      lines.push(`\nÚLTIMOS ${games.length} PARTIDOS:`);

      // Acumulador agregado por jugadora a lo largo de TODOS los partidos retornados.
      // Clave: playerId. Valor: estadísticas acumuladas.
      type Agg = {
        name: string;
        number: number | null;
        gp: number; // partidos jugados (al menos 1 evento)
        pts: number;
        twoM: number; twoA: number;
        threeM: number; threeA: number;
        ftM: number; ftA: number;
        oreb: number; dreb: number;
        ast: number; stl: number; tov: number; fouls: number;
      };
      const agg: Record<string, Agg> = {};
      const ensure = (pid: string, roster: Array<Record<string, unknown>>) => {
        if (!agg[pid]) {
          const found = roster.find((r) => (r?.id as string) === pid);
          agg[pid] = {
            name: (found?.name as string) ?? "Desconocida",
            number: (found?.number as number) ?? null,
            gp: 0, pts: 0,
            twoM: 0, twoA: 0, threeM: 0, threeA: 0, ftM: 0, ftA: 0,
            oreb: 0, dreb: 0, ast: 0, stl: 0, tov: 0, fouls: 0,
          };
        }
        return agg[pid];
      };

      for (const g of games) {
        // Calcular puntos propios desde shots (made === true).
        let pf = 0;
        const shots = Array.isArray(g.shots) ? g.shots : [];
        const actions = Array.isArray(g.actions) ? g.actions : [];
        const gameRoster = Array.isArray(g.roster) ? (g.roster as Array<Record<string, unknown>>) : [];
        const seenPlayers = new Set<string>();

        for (const s of shots as Array<Record<string, unknown>>) {
          const pid = (s?.playerId ?? s?.player_id) as string | undefined;
          const t = s?.type as string | undefined;
          // Inferir puntos: type "3pt"/"2pt"/"ft" o campo points.
          const pts3 = t === "3pt" || (s?.points as number) === 3;
          const pts2 = t === "2pt" || (s?.points as number) === 2;
          const pts1 = t === "ft" || (s?.points as number) === 1;
          const made = s?.made === true;

          if (made) pf += pts3 ? 3 : pts2 ? 2 : pts1 ? 1 : 0;

          if (pid) {
            seenPlayers.add(pid);
            const a = ensure(pid, gameRoster);
            if (pts3) { a.threeA += 1; if (made) { a.threeM += 1; a.pts += 3; } }
            else if (pts2) { a.twoA += 1; if (made) { a.twoM += 1; a.pts += 2; } }
            else if (pts1) { a.ftA += 1; if (made) { a.ftM += 1; a.pts += 1; } }
          }
        }

        for (const ac of actions as Array<Record<string, unknown>>) {
          const pid = (ac?.playerId ?? ac?.player_id) as string | undefined;
          const t = ac?.type as string | undefined;
          if (!pid || !t) continue;
          seenPlayers.add(pid);
          const a = ensure(pid, gameRoster);
          if (t === "offensive_rebound") a.oreb += 1;
          else if (t === "defensive_rebound") a.dreb += 1;
          else if (t === "rebound") a.dreb += 1; // legacy → defensivo
          else if (t === "assist") a.ast += 1;
          else if (t === "steal") a.stl += 1;
          else if (t === "turnover") a.tov += 1;
          else if (t === "foul") a.fouls += 1;
        }

        for (const pid of seenPlayers) ensure(pid, gameRoster).gp += 1;

        // Puntos rivales: suma opponent_scores por periodo.
        let pc = 0;
        const opp = Array.isArray(g.opponent_scores) ? g.opponent_scores : [];
        for (const o of opp as Array<Record<string, unknown>>) {
          const v = (o?.points ?? o?.score ?? 0) as number;
          if (typeof v === "number") pc += v;
        }
        const fecha = g.date ? new Date(g.date as string).toISOString().slice(0, 10) : "?";
        const sede = g.is_home === false ? "(V)" : "(L)";
        lines.push(`- ${fecha} vs ${g.opponent_name ?? "rival"} ${sede} — ${pf}-${pc}${g.leg ? ` [${g.leg}]` : ""}`);
      }

      // Render del agregado por jugadora (ordenado por PTS desc).
      const aggList = Object.values(agg).filter((a) => a.gp > 0);
      if (aggList.length > 0) {
        aggList.sort((a, b) => b.pts - a.pts);
        lines.push(`\nESTADÍSTICAS AGREGADAS POR JUGADORA (últimos ${games.length} partidos):`);
        lines.push(`Formato: #N Nombre | GP | PTS | 2PT m/a | 3PT m/a | TL m/a | RO | RD | AST | ROB | PER | FAL | PPG`);
        for (const a of aggList) {
          const ppg = a.gp > 0 ? (a.pts / a.gp).toFixed(1) : "0.0";
          const num = a.number != null ? `#${a.number}` : "#?";
          lines.push(
            `- ${num} ${a.name} | GP:${a.gp} | PTS:${a.pts} | 2PT:${a.twoM}/${a.twoA} | 3PT:${a.threeM}/${a.threeA} | TL:${a.ftM}/${a.ftA} | RO:${a.oreb} | RD:${a.dreb} | AST:${a.ast} | ROB:${a.stl} | PER:${a.tov} | FAL:${a.fouls} | PPG:${ppg}`,
          );
        }
      } else {
        lines.push(`\nESTADÍSTICAS AGREGADAS: (los partidos no tienen eventos individuales registrados)`);
      }
    } else {
      lines.push("\nÚLTIMOS PARTIDOS: (sin partidos registrados)");
    }
  } catch (e) {
    lines.push(`(Error consultando BBDD: ${e instanceof Error ? e.message : String(e)})`);
  }

  return lines.join("\n");
}

const buildSystemPrompt = (
  rama: Rama,
  teamName: string | undefined,
  category: string | undefined,
  dbContext: string,
  statsPayload: string | undefined,
): string => {
  const teamLine = teamName ? `Equipo: ${teamName}${category ? ` (${category})` : ""}.` : "";
  const dbBlock = dbContext
    ? `\n\n=== DATOS REALES DEL CLUB (Supabase, vía RLS) ===\n${dbContext}\n=== FIN DATOS ===`
    : "";
  const statsBlock = statsPayload
    ? `\n\nContexto estadístico adicional:\n${statsPayload}`
    : "";

  return `Eres **Nikita**, la asistente táctica de básquetbol de BASQUEST+. Acompañas a entrenadores y staff de categorías formativas en Chile.

${ramaInstruction(rama)}

${teamLine}

Tu estilo:
- Cercana, directa, profesional. Hablas en **español de Chile** (chileno neutro). Usa "tú" (no "vos" ni "vosotros"). Nunca uses voseo argentino ("hablás", "tenés", "podés", "decíme") — siempre tuteo chileno ("hablas", "tienes", "puedes", "dime"). Vocabulario chileno cuando aporta: "cancha", "partido", "entrenador/a", "harto".
- Respuestas BREVES por defecto (3-6 oraciones). Solo te extiendes si te lo piden.
- **NUNCA inventes nombres de jugadoras/jugadores ni números.** Si te preguntan por una persona o partido que NO aparece en los DATOS REALES de abajo, dilo explícitamente: "No tengo ese dato en la base." Usa EXCLUSIVAMENTE los nombres y dorsales que figuran en el ROSTER.
- Cuando te pregunten por "la más completa", "la mejor", "líder en X" o similares, USA SIEMPRE el bloque "ESTADÍSTICAS AGREGADAS POR JUGADORA" de abajo. Cita números concretos (PTS, PPG, AST, RO+RD, etc.). Si ese bloque está vacío, di que aún no hay eventos individuales registrados.
- Cuando hay datos, cítalos concretamente. No extrapoles ni redondees inventando.
- Si te preguntan algo fuera de básquetbol/coaching/estadística, rediriges amablemente.
- Emojis con moderación: 🏀 📊 🎯 💪 ⚠️.
- Markdown ligero: máximo **negrita** para 1-2 ideas clave.

Terminología obligatoria de BASQUEST+:
- "Triples", "Dobles", "Tiros Libres".
- Tiros de Cancha (TC) = 2pt + 3pt (NO incluye tiros libres).
- eFG% = (FGM + 0.5 × 3PM) / FGA. TS% = PTS / (2 × (FGA + 0.44 × FTA)).${dbBlock}${statsBlock}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages = body?.messages as ChatMessage[] | undefined;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeMessages: ChatMessage[] = messages
      .filter((m) =>
        m && typeof m.content === "string" &&
        (m.role === "user" || m.role === "assistant")
      )
      .slice(-20);

    if (safeMessages.length === 0) {
      return new Response(JSON.stringify({ error: "no valid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ramaInput = (body?.rama as string | undefined)?.toLowerCase();
    const rama: Rama =
      ramaInput === "masculino" || ramaInput === "mixto" ? (ramaInput as Rama) : "femenino";

    const teamName = typeof body?.teamName === "string" ? body.teamName : undefined;
    const category = typeof body?.category === "string" ? body.category : undefined;
    const statsPayload =
      typeof body?.statsPayload === "string" && body.statsPayload.length < 8000
        ? body.statsPayload
        : undefined;

    // === Contexto real desde la BBDD ===
    const dbContext = await buildDbContext(authHeader, category);

    const systemPrompt = buildSystemPrompt(rama, teamName, category, dbContext, statsPayload);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...safeMessages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas consultas, esperá unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA agotados. Contactá al administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const text = await response.text();
      console.error("Nikita gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply: string = data?.choices?.[0]?.message?.content ?? "Hmm, no pude responder eso. Probá de nuevo.";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nikita-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
