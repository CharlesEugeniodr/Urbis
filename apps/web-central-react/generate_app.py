import os

files = {
    "package.json": """
{
  "name": "web-central-react",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "date-fns": "^3.0.0",
    "echarts": "^5.5.0",
    "echarts-for-react": "^3.0.2",
    "lucide-react": "^0.300.0",
    "maplibre-gl": "^4.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "socket.io-client": "^4.7.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
""",
    "index.html": """
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>URBIS Central</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
""",
    "src/styles.css": """
:root {
  --primary: #07507C;
  --secondary: #2E8B57;
  --accent: #FF8C00;
  
  --status-open: #e43b3b;
  --status-triage: #f29b32;
  --status-dispatched: #e5c445;
  --status-inservice: #2f8de4;
  --status-resolved: #2dbd69;
  --status-rejected: #7f8b94;
  
  --bg-light: #f3f4f6;
  --bg-white: #ffffff;
  --text-dark: #1f2937;
  --text-muted: #6b7280;
  --border-color: #e5e7eb;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: var(--bg-light); color: var(--text-dark); }

/* Layout */
.app-container { display: flex; height: 100vh; overflow: hidden; }
.sidebar { width: 250px; background: var(--primary); color: white; display: flex; flex-direction: column; transition: width 0.3s; }
.sidebar-header { padding: 20px; font-size: 1.5rem; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); }
.nav-list { flex: 1; list-style: none; padding: 10px 0; }
.nav-item { padding: 12px 20px; display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.8); text-decoration: none; transition: 0.2s; }
.nav-item:hover, .nav-item.active { background: rgba(255,255,255,0.1); color: white; }
.sidebar-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; }

.main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.topbar { height: 60px; background: white; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
.page-content { flex: 1; overflow-y: auto; padding: 20px; }

/* Login */
.login-page { display: flex; height: 100vh; align-items: center; justify-content: center; background: var(--primary); }
.login-card { background: white; padding: 40px; border-radius: 8px; width: 100%; max-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.login-card h1 { margin-bottom: 20px; text-align: center; color: var(--primary); }
.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
.form-control { width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; }
.btn-primary { width: 100%; padding: 10px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-primary:hover { background: #064063; }

/* Dashboard & Cards */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
.kpi-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 15px; }
.kpi-icon { padding: 15px; border-radius: 8px; background: var(--bg-light); color: var(--primary); }
.kpi-info h3 { margin: 0; font-size: 1.5rem; }
.kpi-info p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }

.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 20px; }
.chart-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

/* Map */
.map-container { width: 100%; height: calc(100vh - 100px); border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

/* Tables */
.table-card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
.table-header { padding: 15px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { padding: 12px 20px; border-bottom: 1px solid var(--border-color); }
th { background: var(--bg-light); font-weight: 500; color: var(--text-muted); }
tr:hover { background: var(--bg-light); cursor: pointer; }

/* Badges */
.badge { padding: 4px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: bold; color: white; display: inline-flex; align-items: center; gap: 4px; }
.badge.status-OPEN { background: var(--status-open); }
.badge.status-TRIAGE { background: var(--status-triage); }
.badge.status-DISPATCHED { background: var(--status-dispatched); }
.badge.status-IN_SERVICE { background: var(--status-inservice); }
.badge.status-RESOLVED { background: var(--status-resolved); }
.badge.status-REJECTED { background: var(--status-rejected); }

.detail-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
.detail-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px;}
""",
    "src/api/client.ts": """
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = sessionStorage.getItem('urbis_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem('urbis_token');
      window.location.href = '/login';
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Erro na requisição da API');
  }

  return response.json();
}
""",
    "src/api/hooks.ts": """
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from './client';

export const useDashboard = () => useQuery({
  queryKey: ['dashboard'],
  queryFn: () => fetchApi('/v1/dashboard/summary')
});

export const useOccurrences = (limit = 50) => useQuery({
  queryKey: ['occurrences', limit],
  queryFn: () => fetchApi(`/v1/occurrences?limit=${limit}`)
});

export const useOccurrenceDetail = (id: string) => useQuery({
  queryKey: ['occurrence', id],
  queryFn: () => fetchApi(`/v1/occurrences/${id}`),
  enabled: !!id
});

export const useMapOccurrences = () => useQuery({
  queryKey: ['occurrences-map'],
  queryFn: () => fetchApi('/v1/occurrences/map')
});

export const useServiceOrders = () => useQuery({
  queryKey: ['service-orders'],
  queryFn: () => fetchApi('/v1/field/work-orders')
});

export const useTriageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string, decision: string }) => 
      fetchApi(`/v1/occurrences/${id}/triage`, {
        method: 'POST',
        body: JSON.stringify({ decision })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['occurrence'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });
};
""",
    "src/auth/AuthContext.tsx": """
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  user: any;
  login: (token: string, user: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('urbis_token'));
  const [user, setUser] = useState<any>(JSON.parse(sessionStorage.getItem('urbis_user') || 'null'));

  const login = (newToken: string, newUser: any) => {
    sessionStorage.setItem('urbis_token', newToken);
    sessionStorage.setItem('urbis_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    sessionStorage.removeItem('urbis_token');
    sessionStorage.removeItem('urbis_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
""",
    "src/auth/RequireAuth.tsx": """
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const RequireAuth = () => {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
};
""",
    "src/auth/LoginPage.tsx": """
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { fetchApi } from '../api/client';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await fetchApi('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      login(data.accessToken, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>URBIS Central</h1>
        {error && <div style={{color: 'red', marginBottom: 15}}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary">Entrar</button>
        </form>
      </div>
    </div>
  );
};
""",
    "src/layout/Sidebar.tsx": """
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
""",
    "src/layout/TopBar.tsx": """
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
""",
    "src/layout/MainLayout.tsx": """
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const MainLayout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <TopBar />
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
""",
    "src/components/StatusBadge.tsx": """
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
""",
    "src/components/CategoryIcon.tsx": """
import React from 'react';
import { Lightbulb, Droplets, Zap, ShieldAlert, Car, Map as MapIcon, HelpCircle } from 'lucide-react';

export const CategoryIcon = ({ code, size = 20 }: { code: string, size?: number }) => {
  switch (code) {
    case 'LIGHTING': return <Lightbulb size={size} />;
    case 'WATER': return <Droplets size={size} />;
    case 'ENERGY': return <Zap size={size} />;
    case 'TRAFFIC_SIGNAL': return <Car size={size} />;
    case 'PAVEMENT': return <MapIcon size={size} />;
    case 'RESILIENCE': return <ShieldAlert size={size} />;
    default: return <HelpCircle size={size} />;
  }
};
""",
    "src/components/PriorityBadge.tsx": """
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
""",
    "src/components/KpiCard.tsx": """
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
"""
}

files_part2 = {
    "src/pages/DashboardPage.tsx": """
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
""",
    "src/pages/MapPage.tsx": """
import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapOccurrences } from '../api/hooks';

export const MapPage = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { data } = useMapOccurrences();

  useEffect(() => {
    if (!mapContainer.current) return;
    
    if (!map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', // Free OSM-based style
        center: [-49.9, -6.07],
        zoom: 12
      });
      map.current.addControl(new maplibregl.NavigationControl());
    }

    if (data?.records && map.current) {
      data.records.forEach((rec: any) => {
        const color = rec.status === 'OPEN' ? '#e43b3b' : rec.status === 'RESOLVED' ? '#2dbd69' : '#f29b32';
        
        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
          `<h4>${rec.categoryCode}</h4><p>Status: ${rec.status}</p>`
        );

        new maplibregl.Marker({ color })
          .setLngLat([rec.lon, rec.lat])
          .setPopup(popup)
          .addTo(map.current!);
      });
    }
  }, [data]);

  return <div className="map-container" ref={mapContainer} />;
};
""",
    "src/pages/IncidentListPage.tsx": """
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
""",
    "src/pages/IncidentDetailPage.tsx": """
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOccurrenceDetail, useTriageMutation } from '../api/hooks';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, Check, X, Copy } from 'lucide-react';

export const IncidentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useOccurrenceDetail(id!);
  const triageMut = useTriageMutation();

  if (isLoading) return <div>Carregando detalhes...</div>;
  if (!data) return <div>Ocorrência não encontrada.</div>;

  const handleTriage = (decision: string) => {
    triageMut.mutate({ id: id!, decision });
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer'}}>
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="detail-grid">
        <div className="detail-card">
          <h2>Protocolo: {data.protocol || data.id}</h2>
          <div style={{margin: '15px 0'}}><StatusBadge status={data.status} /></div>
          <p><strong>Categoria:</strong> {data.categoryCode}</p>
          <p><strong>Descrição:</strong> {data.description}</p>
          <p><strong>Endereço:</strong> {data.address || 'Não informado'}</p>
          <p><strong>Score ICI:</strong> {(data.iciScore * 100).toFixed(1)}%</p>
        </div>

        {(data.status === 'OPEN' || data.status === 'TRIAGE') && (
          <div className="detail-card">
            <h3>Triagem</h3>
            <p style={{marginBottom: 15}}>Analise a ocorrência e defina a decisão:</p>
            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
              <button className="btn-primary" style={{background: '#2dbd69'}} onClick={() => handleTriage('PROCEDENT')}><Check size={16}/> Procedente</button>
              <button className="btn-primary" style={{background: '#7f8b94'}} onClick={() => handleTriage('IMPROCEDENT')}><X size={16}/> Improcedente</button>
              <button className="btn-primary" style={{background: '#f29b32'}} onClick={() => handleTriage('DUPLICATE')}><Copy size={16}/> Duplicada</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
""",
    "src/pages/ServiceOrdersPage.tsx": """
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
""",
    "src/pages/ReportsPage.tsx": """
import React from 'react';
export const ReportsPage = () => (
  <div className="detail-card">
    <h2>Relatórios Gerenciais</h2>
    <p>Selecione os filtros acima para gerar relatórios detalhados.</p>
    <div style={{height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', marginTop: 20, borderRadius: 8}}>
      Gráficos avançados em desenvolvimento...
    </div>
  </div>
);
""",
    "src/pages/AuditPage.tsx": """
import React from 'react';
export const AuditPage = () => (
  <div className="table-card">
    <div className="table-header"><h3>Log de Auditoria</h3></div>
    <table>
      <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Detalhes</th></tr></thead>
      <tbody>
        <tr><td>{new Date().toLocaleString('pt-BR')}</td><td>Operador</td><td>LOGIN</td><td>Sucesso</td></tr>
      </tbody>
    </table>
  </div>
);
""",
    "src/App.tsx": """
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { LoginPage } from './auth/LoginPage';
import { MainLayout } from './layout/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { MapPage } from './pages/MapPage';
import { IncidentListPage } from './pages/IncidentListPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { ServiceOrdersPage } from './pages/ServiceOrdersPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/mapa" element={<MapPage />} />
              <Route path="/ocorrencias" element={<IncidentListPage />} />
              <Route path="/ocorrencias/:id" element={<IncidentDetailPage />} />
              <Route path="/os" element={<ServiceOrdersPage />} />
              <Route path="/relatorios" element={<ReportsPage />} />
              <Route path="/auditoria" element={<AuditPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
""",
    "src/main.tsx": """
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
"""
}

all_files = {**files, **files_part2}

for filepath, content in all_files.items():
    directory = os.path.dirname(filepath)
    if directory:
        os.makedirs(directory, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\\n")

print("Files generated successfully!")
