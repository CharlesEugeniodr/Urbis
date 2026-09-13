import React from 'react';
import { Bell, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/mapa': 'Mapa Interativo',
  '/ocorrencias': 'Lista de Ocorrências',
  '/os': 'Ordens de Serviço',
  '/relatorios': 'Relatórios Gerenciais',
  '/auditoria': 'Log de Auditoria'
};

export const TopBar = () => {
  const location = useLocation();
  const title = routeTitles[location.pathname] || 'Detalhes da Ocorrência';

  return (
    <header className="topbar">
      <h2>{title}</h2>
      <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
        <div style={{position: 'relative'}}>
          <Search size={18} style={{position: 'absolute', left: 10, top: 10, color: 'gray'}}/>
          <input type="text" placeholder="Buscar..." style={{padding: '10px 10px 10px 35px', borderRadius: '20px', border: '1px solid #ddd'}} />
        </div>
        <Bell style={{cursor: 'pointer', color: '#666'}}/>
      </div>
    </header>
  );
};
