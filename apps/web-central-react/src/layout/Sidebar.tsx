import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map as MapIcon, AlertTriangle, ClipboardList, BarChart3, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        URBIS Central
      </div>
      <ul className="nav-list">
        <li><NavLink to="/" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}><LayoutDashboard size={20}/> Dashboard</NavLink></li>
        <li><NavLink to="/mapa" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}><MapIcon size={20}/> Mapa</NavLink></li>
        <li><NavLink to="/ocorrencias" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}><AlertTriangle size={20}/> Ocorrências</NavLink></li>
        <li><NavLink to="/os" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}><ClipboardList size={20}/> Ordens de Serviço</NavLink></li>
        <li><NavLink to="/relatorios" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}><BarChart3 size={20}/> Relatórios</NavLink></li>
        <li><NavLink to="/auditoria" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}><ShieldCheck size={20}/> Auditoria</NavLink></li>
      </ul>
      <div className="sidebar-footer">
        <div style={{fontSize: '0.875rem'}}>{user?.name || 'Operador'}</div>
        <button onClick={logout} style={{background: 'none', border: 'none', color: 'white', cursor: 'pointer'}}><LogOut size={20}/></button>
      </div>
    </aside>
  );
};
