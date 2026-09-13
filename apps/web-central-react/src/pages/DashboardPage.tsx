import React from 'react';
import { useDashboard, useOccurrences } from '../api/hooks';
import { KpiCard } from '../components/KpiCard';
import { AlertCircle, Clock, CheckCircle, XCircle, LayoutList, Calendar } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { StatusBadge } from '../components/StatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DashboardPage = () => {
  const { data: dash, isLoading } = useDashboard();
  const { data: recent } = useOccurrences(10);

  if (isLoading) return <div>Carregando dashboard...</div>;
  if (!dash) return <div>Erro ao carregar dashboard.</div>;

  const barOptions = {
    title: { text: 'Ocorrências por Status' },
    tooltip: {},
    xAxis: { type: 'category', data: Object.keys(dash.byStatus) },
    yAxis: { type: 'value' },
    series: [{ data: Object.values(dash.byStatus), type: 'bar', itemStyle: { color: '#07507C' } }]
  };

  const pieOptions = {
    title: { text: 'Por Categoria', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: '50%',
      data: Object.entries(dash.byCategory).map(([name, value]) => ({ name, value })),
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
    }]
  };

  return (
    <div>
      <div className="kpi-grid">
        <KpiCard title="Total Ocorrências" value={dash.occurrences} icon={LayoutList} />
        <KpiCard title="Abertas" value={dash.byStatus.OPEN || 0} icon={AlertCircle} color="#e43b3b" />
        <KpiCard title="Em Triagem" value={dash.byStatus.TRIAGE || 0} icon={Clock} color="#f29b32" />
        <KpiCard title="Em Atendimento" value={dash.byStatus.IN_SERVICE || 0} icon={Calendar} color="#2f8de4" />
        <KpiCard title="Resolvidas" value={dash.byStatus.RESOLVED || 0} icon={CheckCircle} color="#2dbd69" />
        <KpiCard title="OS Vencidas" value={0} icon={XCircle} color="#7f8b94" />
      </div>

      <div className="charts-grid">
        <div className="chart-card"><ReactECharts option={barOptions} /></div>
        <div className="chart-card"><ReactECharts option={pieOptions} /></div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <h3>Incidentes Recentes</h3>
        </div>
        <table>
          <thead><tr><th>Protocolo</th><th>Status</th><th>Data</th></tr></thead>
          <tbody>
            {recent?.records?.map((r: any) => (
              <tr key={r.id}>
                <td>{r.protocol || r.id}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{r.createdAt ? format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm', {locale: ptBR}) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
