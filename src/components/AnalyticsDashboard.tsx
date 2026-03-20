import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Users, Eye, Clock, Share2, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  totalViews: number;
  uniqueSessions: number;
  avgDuration: number;
  publicViews: number;
  todayViews: number;
  topPages: { page: string; views: number }[];
  viewsByDay: { date: string; views: number }[];
}

const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);

      const { data: views, error } = await supabase
        .from('page_views')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error || !views) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const totalViews = views.length;
      const uniqueSessions = new Set(views.map(v => v.session_id)).size;
      const durations = views.filter(v => v.duration_seconds && v.duration_seconds > 0).map(v => v.duration_seconds!);
      const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
      const publicViews = views.filter(v => v.is_public_view).length;
      const todayViews = views.filter(v => v.created_at.startsWith(today)).length;

      // Top pages
      const pageCounts: Record<string, number> = {};
      views.forEach(v => { pageCounts[v.page] = (pageCounts[v.page] || 0) + 1; });
      const topPages = Object.entries(pageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([page, views]) => ({ page, views }));

      // Views by day (last 7 days)
      const viewsByDay: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        viewsByDay[d.toISOString().split('T')[0]] = 0;
      }
      views.forEach(v => {
        const day = v.created_at.split('T')[0];
        if (viewsByDay[day] !== undefined) viewsByDay[day]++;
      });

      setData({
        totalViews,
        uniqueSessions,
        avgDuration,
        publicViews,
        todayViews,
        topPages,
        viewsByDay: Object.entries(viewsByDay).map(([date, views]) => ({ date, views })),
      });
      setLoading(false);
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return <p className="text-sm text-muted-foreground text-center py-8">Sin datos de analíticas</p>;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const maxDayViews = Math.max(...data.viewsByDay.map(d => d.views), 1);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Analíticas de Plataforma
      </h3>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Vistas hoy', value: data.todayViews, icon: <Eye className="w-4 h-4" /> },
          { label: 'Vistas totales', value: data.totalViews, icon: <Eye className="w-4 h-4" /> },
          { label: 'Sesiones únicas', value: data.uniqueSessions, icon: <Users className="w-4 h-4" /> },
          { label: 'Tiempo promedio', value: formatDuration(data.avgDuration), icon: <Clock className="w-4 h-4" /> },
          { label: 'Vistas públicas', value: data.publicViews, icon: <Share2 className="w-4 h-4" /> },
        ].map(kpi => (
          <Card key={kpi.label} className="border-border/40">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-muted-foreground">{kpi.icon}</span>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              </div>
              <p className="text-xl font-black text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mini bar chart — last 7 days */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Vistas últimos 7 días</p>
          <div className="flex items-end gap-1 h-20">
            {data.viewsByDay.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold text-foreground">{d.views}</span>
                <div
                  className="w-full bg-primary/80 rounded-t"
                  style={{ height: `${Math.max((d.views / maxDayViews) * 100, 4)}%` }}
                />
                <span className="text-[8px] text-muted-foreground">
                  {new Date(d.date).toLocaleDateString('es', { weekday: 'short' }).slice(0, 2)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top pages */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Páginas más visitadas</p>
          <div className="space-y-2">
            {data.topPages.map((p, i) => (
              <div key={p.page} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-xs font-semibold text-foreground truncate max-w-[180px]">{p.page}</span>
                </div>
                <span className="text-xs font-bold text-primary">{p.views}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
