import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePaginacion } from '../../hooks/usePaginacion.js';
import {
  reportesAdmin,
  resolverReporteAdmin,
  descartarReporteAdmin,
  moderarContenido,
} from '../../services/supportService.js';
import { Pill, EmptyState, Modal, Cargando, ErrorBox } from '../../components/ui.jsx';
import Pagination from '../../components/Pagination.jsx';
import { infoReporte, infoPrioridad, infoCategoria, ESTADO_REPORTE } from '../../utils/states.js';
import { fmtFecha, hace } from '../../utils/format.js';
import { exportarCsv } from '../../utils/exportCsv.js';

const ACCIONES = [
  ['ADVERTENCIA', 'Enviar advertencia'],
  ['RETIRAR_PUBLICACION', 'Retirar publicación'],
  ['BLOQUEAR', 'Bloquear publicación'],
  ['BLOQUEAR_USUARIO', 'Bloquear usuario'],
  ['NOTA', 'Solo nota interna'],
];

export default function AdminReportes() {
  const navigate = useNavigate();
  const { confirmar, verNotif } = useApp();
  const [estado, setEstado] = useState(null);
  const [q, setQ] = useState('');
  const [enRevisar, setEnRevisar] = useState(null);
  const [accion, setAccion] = useState(ACCIONES[0][0]);

  const { datos, cargando, error, recargar } = useAsync(
    () => reportesAdmin({ estado, q }),
    [estado, q],
  );

  useEffect(() => {
    document.addEventListener('er.ui:refresh', recargar);
    return () => document.removeEventListener('er.ui:refresh', recargar);
  }, [recargar]);

  const pendientes = useMemo(() => (datos ?? []).filter((r) => r.estado === ESTADO_REPORTE.PENDIENTE).length, [datos]);
  const pag = usePaginacion(datos ?? [], 10);

  const resolver = async () => {
    try {
      await resolverReporteAdmin(enRevisar.id, accion, 'Admin');
      setEnRevisar(null);
      verNotif('Reporte resuelto y registrado en auditoría.', 'success');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo resolver el reporte.', 'error');
    }
  };

  const descartar = async (r) => {
    const ok = await confirmar({
      titulo: 'Descartar reporte',
      mensaje: `El reporte #${r.id} se marcará como descartado. Esta acción queda en auditoría.`,
      textoBoton: 'Descartar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await descartarReporteAdmin(r.id, 'Admin');
      verNotif('Reporte descartado.', 'success');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo descartar.', 'error');
    }
  };

  const moderar = async (r, objetivo, accion) => {
    const id = objetivo === 'PUBLICACION' ? r.publicacionId : r.comentarioId;
    if (!id) return;
    const esOcultar = accion === 'OCULTAR';
    const ok = await confirmar({
      titulo: esOcultar ? 'Ocultar publicación' : 'Eliminar comentario',
      mensaje: esOcultar
        ? `La publicación #${id} dejará de ser visible en la app. El autor recibirá una notificación con la advertencia.`
        : `El comentario #${id} se eliminará definitivamente. El autor recibirá una notificación con la advertencia.`,
      textoBoton: esOcultar ? 'Ocultar' : 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await moderarContenido({
        objetivo,
        id,
        accion,
        motivo: `Reporte #${r.id}: ${(r.descripcion || r.motivo || '').slice(0, 200)}`,
      });
      verNotif('Acción aplicada y registrada en auditoría.', 'success');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo aplicar la acción.', 'error');
    }
  };

  const exportar = () => {
    exportarCsv('reportes', datos ?? [], [
      { etiqueta: 'ID', clave: 'id' },
      { etiqueta: 'Autor', clave: 'usuarioNombre' },
      { etiqueta: 'Descripción', clave: 'descripcion' },
      { etiqueta: 'Categoría', clave: 'categoria' },
      { etiqueta: 'Prioridad', clave: 'prioridad' },
      { etiqueta: 'Estado', clave: 'estado' },
      { etiqueta: 'Acción', clave: 'accion' },
      { etiqueta: 'Caso', clave: 'casoId' },
      { etiqueta: 'Fecha', valor: (r) => fmtFecha(r.fecha) },
    ]);
  };

  return (
    <div className="stack">
      <div className="between">
        <div>
          <h2>Reportes de contenido</h2>
          <p className="muted small" style={{ margin: 0 }}>
            {pendientes} pendiente(s) · moderación asistida por IA.
          </p>
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={recargar}>↻</button>
          <button className="btn btn-ghost btn-sm" onClick={exportar} disabled={!datos?.length}>⬇ Exportar CSV</button>
        </div>
      </div>

      <div className="card card-pad">
        <div className="filter-bar">
          {[[null, 'Todos'], [ESTADO_REPORTE.PENDIENTE, 'Pendientes'], [ESTADO_REPORTE.RESUELTA, 'Resueltos'], [ESTADO_REPORTE.DESCARTADA, 'Descartados']].map(([val, lbl]) => (
            <button key={lbl} className={`btn btn-sm ${estado === val ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setEstado(val)}>
              {lbl}
            </button>
          ))}
          <input
            className="input"
            style={{ width: 240, marginLeft: 'auto' }}
            placeholder="Buscar por autor o descripción"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {cargando && <Cargando texto="Cargando reportes…" />}
      <ErrorBox error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div className="card">
          <div className="tbl-wrap">
            {pag.total === 0 ? (
              <EmptyState icono="🚩" titulo="Sin reportes" texto="No hay reportes con los filtros actuales." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>ID</th><th>Reporte</th><th>Autor</th><th>Categoría</th><th>Prioridad</th><th>Estado</th><th>Fecha</th><th></th></tr>
                </thead>
                <tbody>
                  {pag.visibles.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>#{r.id}</td>
                      <td style={{ maxWidth: 320 }}>
                        <div className="small">{r.descripcion}</div>
                        <div className="small muted">
                          {r.evidencia ? '📎 con evidencia' : 'sin evidencia'}
                          {r.casoId ? (
                            <>
                              {' · '}
                              <button className="link-btn" onClick={() => navigate(`/admin/casos/${r.casoId}`)}>
                                caso #{r.casoId}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                      <td>{r.usuarioNombre}</td>
                      <td><Pill info={infoCategoria(r.categoria)} /></td>
                      <td><Pill info={infoPrioridad(r.prioridad)} /></td>
                      <td><Pill info={infoReporte(r.estado)} /></td>
                      <td className="muted small">{hace(r.fecha)}</td>
                      <td>
                        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                          {r.publicacionId && (
                            <button className="btn btn-danger-ghost btn-sm" onClick={() => moderar(r, 'PUBLICACION', 'OCULTAR')}>
                              Ocultar publicación
                            </button>
                          )}
                          {r.comentarioId && (
                            <button className="btn btn-danger-ghost btn-sm" onClick={() => moderar(r, 'COMENTARIO', 'ELIMINAR')}>
                              Eliminar comentario
                            </button>
                          )}
                          {r.estado === ESTADO_REPORTE.PENDIENTE ? (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => { setEnRevisar(r); setAccion(ACCIONES[0][0]); }}>
                                Resolver
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => descartar(r)}>Descartar</button>
                            </>
                          ) : (
                            <span className="small muted">{r.accion?.replace(/_/g, ' ') || '—'}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pagination pagina={pag.pagina} paginas={pag.paginas} onPagina={pag.setPagina} total={pag.total} />
        </div>
      )}

      <Modal
        abierto={!!enRevisar}
        onCerrar={() => setEnRevisar(null)}
        titulo={`Resolver reporte #${enRevisar?.id}`}
        acciones={
          <>
            <button className="btn btn-ghost" onClick={() => setEnRevisar(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={resolver}>Aplicar acción</button>
          </>
        }
      >
        <div className="field">
          <label>Acción a aplicar</label>
          <select className="input" value={accion} onChange={(e) => setAccion(e.target.value)}>
            {ACCIONES.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
          </select>
        </div>
        <p className="small muted">
          La acción quedará registrada en la auditoría y se notificará a los implicados cuando el
          backend esté conectado.
        </p>
      </Modal>
    </div>
  );
}
