import React from 'react';
import { useOccurrences } from '../api/hooks';
import { StatusBadge } from '../components/StatusBadge';
import { CategoryIcon } from '../components/CategoryIcon';
import { PriorityBadge } from '../components/PriorityBadge';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const IncidentListPage = () => {
  const { data, isLoading } = useOccurrences(100);
  const navigate = useNavigate();

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="table-card">
      <div className="table-header">
        <h3>Todas as Ocorrências</h3>
      </div>
      <table>
        <thead>
          <tr>
            <th>Protocolo</th>
            <th>Categoria</th>
            <th>Status</th>
            <th>Prioridade</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {data?.records?.map((r: any) => (
            <tr key={r.id} onClick={() => navigate(`/ocorrencias/${r.id}`)}>
              <td>{r.protocol || r.id}</td>
              <td style={{display: 'flex', alignItems: 'center', gap: 8}}><CategoryIcon code={r.categoryCode} size={16}/> {r.categoryCode}</td>
              <td><StatusBadge status={r.status} /></td>
              <td><PriorityBadge priority={r.priority || 'NORMAL'} /></td>
              <td>{r.createdAt ? format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm', {locale: ptBR}) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
