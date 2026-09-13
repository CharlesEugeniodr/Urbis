import React from 'react';

const statusMap: Record<string, string> = {
  OPEN: 'Aberto',
  TRIAGE: 'Em Triagem',
  DISPATCHED: 'Despachado',
  IN_SERVICE: 'Em Atendimento',
  RESOLVED: 'Resolvido',
  REJECTED: 'Rejeitado'
};

export const StatusBadge = ({ status }: { status: string }) => {
  return (
    <span className={`badge status-${status}`}>
      {statusMap[status] || status}
    </span>
  );
};
