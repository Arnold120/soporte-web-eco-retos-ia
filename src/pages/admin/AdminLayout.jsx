import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext.jsx';
import { Avatar } from '../../components/ui.jsx';
import Icon from '../../components/Icons.jsx';
import NotifBell from '../../components/NotifBell.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';
import { registrarAccesoPanel, resumenAdmin } from '../../services/supportService.js';
import { usePolling } from '../../hooks/usePolling.js';

const NAV = [
  { seccion: 'General' },
  { to: '/admin', icono: 'dashboard', label: 'Dashboard' },
  { to: '/admin/casos', icono: 'ticket', label: 'Casos', contador: 'escalados', aviso: 'escalados' },
  { to: '/admin/reportes', icono: 'flag', label: 'Reportes', contador: 'reportesPendientes', aviso: 'reportes' },
  { to: '/admin/evidencias', icono: 'folder', label: 'Evidencias de retos', contador: 'evidenciasPendientes', aviso: 'evidencias' },
  { seccion: 'Equipo y sistema' },
  { to: '/admin/administradores', icono: 'shield', label: 'Administradores' },
  { to: '/admin/auditoria', icono: 'receipt', label: 'Auditoría' },
  { to: '/admin/configuracion', icono: 'gear', label: 'Configuración' },
];

const INTERVALO_SONDEO_MS = 8000;

/** Detecta qué contadores crecieron entre dos resúmenes. */
function calcularNovedades(previo, actual) {
  if (!previo || !actual) return {};
  const claves = [
    ['escalados', 'escalados'],
    ['reportesPendientes', 'reportes'],
    ['evidenciasPendientes', 'evidencias'],
    ['casosNuevos', 'casosNuevos'],
  ];
  const novedades = {};
  claves.forEach(([origen, aviso]) => {
    if (Number(actual[origen] ?? 0) > Number(previo[origen] ?? 0)) novedades[aviso] = true;
  });
  return novedades;
}

export default function AdminLayout() {
  const { sesion, salir } = useApp();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [novedades, setNovedades] = useState({});
  const [actualizado, setActualizado] = useState(null);
  const resumenRef = useRef(null);
  const firmaRef = useRef(null);

  const cargarResumen = useCallback(async () => {
    try {
      const datos = await resumenAdmin();
      if (!datos) return;
      const previo = resumenRef.current;
      const firma = datos.firma ?? JSON.stringify(datos);

      if (firmaRef.current !== null && firma !== firmaRef.current) {
        const detectadas = calcularNovedades(previo, datos);
        if (Object.keys(detectadas).length > 0) {
          setNovedades((n) => ({ ...n, ...detectadas }));
          // Refresca la página actual sin recargarla ni perder filtros.
          document.dispatchEvent(new Event('er.ui:refresh'));
        }
      }

      firmaRef.current = firma;
      resumenRef.current = datos;
      setResumen(datos);
      setActualizado(new Date());
    } catch {
      /* sin conexión: se reintenta en el siguiente sondeo */
    }
  }, []);

  /* Actualización automática del panel: sondeo ligero cada 8 s.
     La primera consulta la realiza el propio hook al montar. */
  usePolling(cargarResumen, { intervaloMs: INTERVALO_SONDEO_MS });

  /* Auditoría: registra el acceso al panel una vez por montaje. */
  useEffect(() => {
    registrarAccesoPanel();
  }, []);

  const limpiarNovedad = (aviso) => {
    if (aviso) setNovedades((n) => ({ ...n, [aviso]: false }));
  };

  const pillClase = (aviso) => `pill ${novedades[aviso] ? 'pill-nuevo' : ''}`.trim();

  return (
    <div className="admin-layout">
      {abierto && <div className="side-backdrop" onClick={() => setAbierto(false)} />}

      <aside className={`sidebar ${abierto ? 'abierta' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-badge logo-side"><Icon name="leaf" size={20} /></span>
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
              onClick={() => {
                setAbierto(false);
                limpiarNovedad(item.aviso);
              }}
            >
              <Icon name={item.icono} size={18} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {novedades[item.aviso] && <span className="badge-nuevo">Nuevo</span>}
              {contador > 0 && <span className="count">{contador}</span>}
            </NavLink>
          );
        })}

        <div className="nav-sep" />
        <div className="nav-link" onClick={() => navigate('/soporte')} role="button">
          <Icon name="chat" size={18} /> Centro de soporte
        </div>
        <div className="nav-link" onClick={salir} role="button">
          <Icon name="logout" size={18} /> Cerrar sesión
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="menu-btn btn btn-ghost btn-sm" onClick={() => setAbierto((v) => !v)} aria-label="Abrir menú">
            <Icon name="menu" size={18} />
          </button>
          <div className="row solo-desktop" style={{ gap: 8 }}>
            <span className={pillClase('escalados')}>Escalados: {resumen?.escalados ?? '—'}</span>
            <span className={pillClase('reportes')}>Reportes: {resumen?.reportesPendientes ?? '—'}</span>
            <span className={pillClase('evidencias')}>Evidencias: {resumen?.evidenciasPendientes ?? '—'}</span>
            {actualizado && (
              <span className="small muted" title={`Última actualización: ${actualizado.toLocaleTimeString('es')}`}>
                Actualizado {actualizado.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
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
