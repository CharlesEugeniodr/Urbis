import React from 'react';

export const PriorityBadge = ({ priority }: { priority: string }) => {
  const colors: Record<string, string> = {
    LOW: '#10b981',
    NORMAL: '#3b82f6',
    HIGH: '#f59e0b',
    CRITICAL: '#ef4444',
    EMERGENCY: '#7f1d1d'
  };
  return (
    <span style={{ color: colors[priority] || '#000', fontWeight: 'bold', fontSize: '0.85rem' }}>
      {priority}
    </span>
  );
};
