import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext.jsx';
import { Avatar } from '../../components/ui.jsx';
import NotifBell from '../../components/NotifBell.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';
import { ensenarAdminDashboard } from '../../services/supportService.js';

const NAV = [
  { seccion: 'General' },
  { to: '/admin', icono: '📊', label: 'Dashboard' },
  { to: '/admin/casos', icono: '🎫', label: 'Casos', contador: 'escalados' },
  { to: '/admin/reportes', icono: '🚩', label: 'Reportes', contador: 'reportesPendientes' },
  { to: '/admin/evidencias', icono: '🗂️', label: 'Evidencias de retos', contador: 'evidenciasPendientes' },
  { seccion: 'Equipo y sistema' },
  { to: '/admin/administradores', icono: '🛡️', label: 'Administradores' },
  { to: '/admin/auditoria', icono: '🧾', label: 'Auditoría' },
  { to: '/admin/configuracion', icono: '⚙️', label: 'Configuración' },
];

export default function AdminLayout() {
  const { sesion, salir } = useApp();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [resumen, setResumen] = useState(null);

  const cargarResumen = useCallback(async () => {
    try {
      setResumen(await ensenarAdminDashboard());
    } catch {
      /* sin conexión */
    }
  }, []);

  useEffect(() => {
    cargarResumen();
    document.addEventListener('er.ui:refresh', cargarResumen);
    return () => document.removeEventListener('er.ui:refresh', cargarResumen);
  }, [cargarResumen]);

  return (
    <div className="admin-layout">
      {abierto && <div className="side-backdrop" onClick={() => setAbierto(false)} />}

      <aside className={`sidebar ${abierto ? 'abierta' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-badge logo-side">☘</span>
          <div>
            <b>Soporte Eco-Retos</b>
            <small>Panel de administración</small>
          </div>
        </div>

        {NAV.map((item) => {
          if (item.seccion) return <div className="nav-caption" key={`sec-${item.seccion}`}>{item.seccion}</div>;
          const contador = item.contador ? resumen?.[item.contador] ?? 0 : null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setAbierto(false)}
            >
              <span>{item.icono}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {contador > 0 && <span className="count">{contador}</span>}
            </NavLink>
          );
        })}

        <div className="nav-sep" />
        <div className="nav-link" onClick={() => navigate('/soporte')} role="button">
          <span>💬</span> Centro de soporte
        </div>
        <div className="nav-link" onClick={salir} role="button">
          <span>⎋</span> Cerrar sesión
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="menu-btn btn btn-ghost btn-sm" onClick={() => setAbierto((v) => !v)} aria-label="Abrir menú">
            ☰
          </button>
          <div className="row solo-desktop" style={{ gap: 8 }}>
            <span className="pill c-danger">Escalados: {resumen?.escalados ?? '—'}</span>
            <span className="pill c-warning">Reportes: {resumen?.reportesPendientes ?? '—'}</span>
            <span className="pill c-info">Evidencias: {resumen?.evidenciasPendientes ?? '—'}</span>
          </div>
          <div className="topbar-user">
            <NotifBell usuarioId={sesion.usuario.id} esAdmin />
            <ThemeToggle />
            <Avatar nombre={sesion.usuario.nombreUsuario} size="sm" />
            <span className="solo-desktop">{sesion.usuario.nombreUsuario}</span>
            <span className="pill c-success">ADMIN</span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
