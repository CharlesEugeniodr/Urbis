import React from 'react';
import { useServiceOrders } from '../api/hooks';
import { StatusBadge } from '../components/StatusBadge';

export const ServiceOrdersPage = () => {
  const { data, isLoading } = useServiceOrders();

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="table-card">
      <div className="table-header"><h3>Ordens de Serviço</h3></div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Ocorrência</th>
            <th>Status</th>
            <th>Atualizado Em</th>
          </tr>
        </thead>
        <tbody>
          {data?.records?.map((r: any) => (
            <tr key={r.id}>
              <td>{r.id.substring(0,8)}</td>
              <td>{r.occurrenceId.substring(0,8)}</td>
              <td><StatusBadge status={r.status} /></td>
              <td>{new Date(r.updatedAt).toLocaleString('pt-BR')}</td>
            </tr>
          ))}
          {(!data?.records || data.records.length === 0) && <tr><td colSpan={4}>Nenhuma OS encontrada.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};
