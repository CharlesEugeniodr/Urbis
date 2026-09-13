import React from 'react';
import { LucideIcon } from 'lucide-react';

export const KpiCard = ({ title, value, icon: Icon, color }: { title: string, value: string|number, icon: LucideIcon, color?: string }) => {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={color ? { color, backgroundColor: `${color}20` } : {}}>
        <Icon size={24} />
      </div>
      <div className="kpi-info">
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
    </div>
  );
};
