import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensenarAdminDashboard, casosAdmin } from '../../services/supportService.js';
import { useAsync } from '../../hooks/useAsync.js';
import { StatCard, Pill, Cargando, ErrorBox } from '../../components/ui.jsx';
import Icon from '../../components/Icons.jsx';
import { BarChart } from '../../components/Chart.jsx';
import { infoCaso, infoCategoria } from '../../utils/states.js';
import { hace } from '../../utils/format.js';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { datos, cargando, error, recargar } = useAsync(
    async () => {
      const [resumen, casos] = await Promise.all([ensenarAdminDashboard(), casosAdmin()]);
      return { resumen, casos };
    },
    [],
  );

  useEffect(() => {
    document.addEventListener('er.ui:refresh', recargar);
    return () => document.removeEventListener('er.ui:refresh', recargar);
  }, [recargar]);

  const serie = useMemo(() => {
    if (!datos?.casos) return [];
    const hoy = new Date();
    const dias = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      const clave = d.toISOString().slice(0, 10);
      const total = datos.casos.filter((c) => (c.fechaCreacion || '').slice(0, 10) === clave).length;
      dias.push({ etiqueta: DIAS[d.getDay()], valor: total });
    }
    return dias;
  }, [datos]);

  const topCategorias = useMemo(() => {
    if (!datos?.casos) return [];
    const mapa = {};
    datos.casos.forEach((c) => {
      mapa[c.categoria] = (mapa[c.categoria] || 0) + 1;
    });
    return Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [datos]);

  if (cargando) return <Cargando texto="Cargando dashboard…" />;
  if (error) return <ErrorBox error={error} onReintentar={recargar} />;

  const d = datos.resumen;
  const maxCat = Math.max(1, ...topCategorias.map(([, v]) => v));

  return (
    <div className="stack">
      <div className="between">
        <div>
          <h2>Dashboard</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Estado general del soporte asistido por IA.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={recargar}><Icon name="refresh" size={16} /> Actualizar</button>
      </div>

      <div className="grid-cards">
        <StatCard icono={<Icon name="ticket" size={20} />} valor={d.casosNuevos} etiqueta="Nuevos / IA atendiendo" onClick={() => navigate('/admin/casos')} />
        <StatCard icono={<Icon name="alert" size={20} />} valor={d.escalados} etiqueta="Casos escalados" onClick={() => navigate('/admin/casos')} />
        <StatCard icono={<Icon name="user" size={20} />} valor={d.enAtencion} etiqueta="En atención por admin" onClick={() => navigate('/admin/casos')} />
        <StatCard icono={<Icon name="alert" size={20} />} valor={d.urgencias} etiqueta="Prioridad urgente" onClick={() => navigate('/admin/casos')} />
        <StatCard icono={<Icon name="flag" size={20} />} valor={d.reportesPendientes} etiqueta="Reportes pendientes" onClick={() => navigate('/admin/reportes')} />
        <StatCard icono={<Icon name="folder" size={20} />} valor={d.evidenciasPendientes} etiqueta="Evidencias de retos" onClick={() => navigate('/admin/evidencias')} />
        <StatCard icono={<Icon name="shield" size={20} />} valor={d.adminsActivos} etiqueta="Administradores activos" onClick={() => navigate('/admin/administradores')} />
        <StatCard icono={<Icon name="clock" size={20} />} valor={d.horasPromedioResolucion ?? 0} etiqueta="Horas promedio de resolución" />
      </div>

      <div className="detail-grid">
        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 12 }}>
            <b>Casos creados (últimos 7 días)</b>
            <span className="small muted">{d.casosTotales} en total</span>
          </div>
          <BarChart datos={serie} />
        </div>

        <div className="card card-pad">
          <b>Top categorías</b>
          <div className="stack mt" style={{ gap: 10 }}>
            {topCategorias.map(([cat, valor]) => (
              <div key={cat}>
                <div className="between small">
                  <span>{infoCategoria(cat).etiqueta}</span>
                  <b>{valor}</b>
                </div>
                <div className="barra-linea">
                  <span style={{ width: `${(valor / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
            {topCategorias.length === 0 && <p className="small muted">Sin datos.</p>}
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 12 }}>
            <b>Últimos casos</b>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/casos')}>Ver todos</button>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>ID</th><th>Título</th><th>Usuario</th><th>Categoría</th><th>Estado</th><th>Actualización</th></tr>
              </thead>
              <tbody>
                {(d.ultimosCasos ?? []).map((c) => (
                  <tr className="row-click" key={c.id} onClick={() => navigate(`/admin/casos/${c.id}`)}>
                    <td>#{c.id}</td>
                    <td style={{ maxWidth: 240 }}>
                      <span className="ellipsis" style={{ display: 'block' }}>{c.titulo}</span>
                    </td>
                    <td>{c.usuarioNombre}</td>
                    <td><Pill info={infoCategoria(c.categoria)} /></td>
                    <td><Pill info={infoCaso(c.estado)} /></td>
                    <td className="muted small">{hace(c.fechaActualizacion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-pad">
          <b>Actividad reciente</b>
          <ul className="timeline" style={{ marginTop: 12 }}>
            {(d.actividadReciente ?? []).map((a) => (
              <li key={a.id} className={a.accion?.startsWith('RESOLVER') ? 'mut' : ''}>
                <div className="timeline-title">{a.accion} · {a.entidadTipo} #{a.entidadId}</div>
                <div className="timeline-sub">{a.actor} · {a.motivo}</div>
                <div className="timeline-sub">{hace(a.fecha)}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
