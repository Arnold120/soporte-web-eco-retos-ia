import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePaginacion } from '../../hooks/usePaginacion.js';
import { useNuevosIds } from '../../hooks/useNuevosIds.js';
import {
  reportesAdmin,
  resolverReporteAdmin,
  descartarReporteAdmin,
  moderarContenido,
  analizarReporteAdmin,
} from '../../services/supportService.js';
import { Pill, EmptyState, Modal, Lightbox, Cargando, ErrorBox, NewBadge, MiniaturaMedia } from '../../components/ui.jsx';
import Icon from '../../components/Icons.jsx';
import Pagination from '../../components/Pagination.jsx';
import { infoReporte, infoPrioridad, infoCategoria, ESTADO_REPORTE } from '../../utils/states.js';
import { fmtFecha, fmtFechaHora, hace } from '../../utils/format.js';
import { exportarCsv } from '../../utils/exportCsv.js';

const ACCIONES = [
  ['ADVERTENCIA', 'Enviar advertencia al autor'],
  ['RETIRAR_PUBLICACION', 'Ocultar el contenido reportado'],
  ['BLOQUEAR', 'Suspender la publicación'],
  ['BLOQUEAR_USUARIO', 'Escalar a revisión de cuenta'],
  ['NOTA', 'Solo nota interna'],
];

function MediaPreview({ reporte, onAbrir }) {
  const imagenes = [];
  if (reporte.contenidoImagen) imagenes.push({ url: reporte.contenidoImagen, tipo: 'imagen', nombre: 'Imagen de la publicación' });
  (reporte.contenidoMultimedia ?? []).forEach((a) => imagenes.push(a));

  if (imagenes.length === 0) {
    return <p className="small muted" style={{ margin: 0 }}>El contenido reportado no incluye archivos multimedia.</p>;
  }

  return (
    <div className="media-grid">
      {imagenes.map((a, i) => (
        <MiniaturaMedia
          key={`${a.url}-${i}`}
          adjunto={a}
          size={92}
          onAbrir={() => onAbrir(imagenes, i)}
        />
      ))}
    </div>
  );
}

export default function AdminReportes() {
  const navigate = useNavigate();
  const { confirmar, verNotif } = useApp();
  const [estado, setEstado] = useState(null);
  const [q, setQ] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [enRevisar, setEnRevisar] = useState(null);
  const [accion, setAccion] = useState(ACCIONES[0][0]);
  const [motivoResolucion, setMotivoResolucion] = useState('');
  const [descartando, setDescartando] = useState(null);
  const [motivoDescarte, setMotivoDescarte] = useState('');
  const [analisis, setAnalisis] = useState({});
  const [analizando, setAnalizando] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  const { datos, cargando, actualizando, error, recargar } = useAsync(
    () => reportesAdmin({ estado }),
    [estado],
  );

  useEffect(() => {
    document.addEventListener('er.ui:refresh', recargar);
    return () => document.removeEventListener('er.ui:refresh', recargar);
  }, [recargar]);

  const pendientes = useMemo(() => (datos ?? []).filter((r) => r.estado === ESTADO_REPORTE.PENDIENTE).length, [datos]);
  const nuevos = useNuevosIds(datos);

  /* El filtro de texto se aplica en el cliente para no repetir peticiones. */
  const filtrados = useMemo(() => {
    const lista = datos ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return lista;
    return lista.filter((r) =>
      [r.usuarioNombre, r.usuarioCorreo, r.descripcion, r.motivo, r.contenidoAutorNombre, r.contenidoTexto, String(r.id)]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(term)),
    );
  }, [datos, q]);

  const pag = usePaginacion(filtrados, 10);

  const resolver = async () => {
    if (!motivoResolucion.trim()) {
      verNotif('El motivo de la decisión es obligatorio.', 'error');
      return;
    }
    try {
      await resolverReporteAdmin(enRevisar.id, accion, 'Admin', motivoResolucion.trim());
      setEnRevisar(null);
      setMotivoResolucion('');
      verNotif('Reporte resuelto y registrado en auditoría.', 'success');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo resolver el reporte.', 'error');
    }
  };

  const descartar = async () => {
    if (!motivoDescarte.trim()) {
      verNotif('Indica el motivo por el que el reporte no tiene fundamento.', 'error');
      return;
    }
    try {
      await descartarReporteAdmin(descartando.id, 'Admin', motivoDescarte.trim());
      setDescartando(null);
      setMotivoDescarte('');
      verNotif('Reporte descartado y conservado para auditoría.', 'success');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo descartar.', 'error');
    }
  };

  const moderar = async (r, objetivo, accionModerar) => {
    const id = objetivo === 'PUBLICACION' ? r.publicacionId : r.comentarioId;
    if (!id) return;
    const esOcultar = accionModerar === 'OCULTAR';
    const ok = await confirmar({
      titulo: esOcultar ? 'Ocultar contenido' : 'Ocultar contenido',
      mensaje: objetivo === 'PUBLICACION'
        ? `La publicación #${id} dejará de ser visible en la app, pero se conserva en la base de datos con su evidencia. El autor recibirá una notificación con la advertencia.`
        : `El comentario #${id} dejará de ser visible en la app, pero se conserva en la base de datos. El autor recibirá una notificación con la advertencia.`,
      textoBoton: 'Ocultar',
      peligro: true,
    });
    if (!ok) return;
    try {
      await moderarContenido({
        objetivo,
        id,
        accion: esOcultar ? 'OCULTAR' : accionModerar,
        motivo: `Reporte #${r.id}: ${r.motivo || r.descripcion || 'incumplimiento de reglas'}`.slice(0, 480),
        reporteId: r.id,
      });
      verNotif('Contenido oculto. Acción registrada en auditoría y notificada al autor.', 'success');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo aplicar la acción.', 'error');
    }
  };

  const ejecutarAnalisis = async (r) => {
    setAnalizando(r.id);
    try {
      const resultado = await analizarReporteAdmin(r.id);
      setAnalisis((a) => ({ ...a, [r.id]: resultado }));
    } catch (e) {
      verNotif(e.message || 'No se pudo analizar el reporte.', 'error');
    } finally {
      setAnalizando(null);
    }
  };

  const exportar = () => {
    exportarCsv('reportes', datos ?? [], [
      { etiqueta: 'ID', clave: 'id' },
      { etiqueta: 'Reportado por', clave: 'usuarioNombre' },
      { etiqueta: 'Autor del contenido', clave: 'contenidoAutorNombre' },
      { etiqueta: 'Tipo de contenido', clave: 'contenidoTipo' },
      { etiqueta: 'Motivo', clave: 'motivo' },
      { etiqueta: 'Descripción', clave: 'descripcion' },
      { etiqueta: 'Estado', clave: 'estado' },
      { etiqueta: 'Acción', clave: 'accion' },
      { etiqueta: 'Administrador', clave: 'adminNombre' },
      { etiqueta: 'Resolución', clave: 'motivoResolucion' },
      { etiqueta: 'Fecha', valor: (r) => fmtFecha(r.fecha) },
    ]);
  };

  const panelAnalisis = (r) => {
    const a = analisis[r.id] || null;
    if (!a) return null;
    return (
      <div className="ia-panel">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Icon name="cpu" size={16} />
          <b className="small">Evaluación de IA</b>
          <span className={`pill ${a.posibleContenidoAdultos ? 'c-error' : 'c-info'}`}>
            {a.recomendacion?.replace(/_/g, ' ')}
          </span>
          <span className="small muted">Confianza {a.confianza ?? 0}%</span>
          {a.requiereRevisionHumana && <span className="pill c-warning">Requiere revisión humana</span>}
        </div>
        <p className="small" style={{ margin: '8px 0 4px' }}>{a.motivo}</p>
        {a.observaciones && <p className="small muted" style={{ margin: 0 }}>{a.observaciones}</p>}
        <p className="small muted" style={{ margin: '6px 0 0' }}>
          Proveedor: {a.proveedor === 'ia' ? 'IA' : 'reglas automáticas'}
        </p>
      </div>
    );
  };

  return (
    <div className="stack">
      <div className="between">
        <div>
          <h2>Reportes de contenido</h2>
          <p className="muted small" style={{ margin: 0 }}>
            {pendientes} pendiente(s) · moderación asistida por IA{actualizando ? ' · actualizando…' : ''}.
          </p>
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={recargar} title="Actualizar ahora">
            <Icon name="refresh" size={16} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportar} disabled={!datos?.length}>
            <Icon name="download" size={16} /> Exportar CSV
          </button>
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

      {cargando && !datos && <Cargando texto="Cargando reportes…" />}
      <ErrorBox error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div className="card">
          <div className="tbl-wrap">
            {pag.total === 0 ? (
              <EmptyState icono="flag" titulo="Sin reportes" texto="No hay reportes con los filtros actuales." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th><th>Reporte</th><th>Reportado por</th><th>Autor del contenido</th>
                    <th>Tipo</th><th>Prioridad</th><th>Estado</th><th>Fecha</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {pag.visibles.map((r) => (
                    <tr key={r.id} className={nuevos.has(r.id) ? 'fila-nueva' : ''}>
                      <td style={{ fontWeight: 700 }}>
                        #{r.id}
                        {nuevos.has(r.id) && <NewBadge />}
                      </td>
                      <td style={{ maxWidth: 320 }}>
                        <div className="small">{r.descripcion || r.motivo}</div>
                        <div className="small muted">
                          {r.motivo ? `Motivo: ${r.motivo}` : 'Sin motivo indicado'}
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
                      <td className="small">{r.contenidoAutorNombre || '—'}</td>
                      <td className="small">{r.contenidoTipo ?? (r.tipo === 'SOPORTE' ? 'Caso' : '—')}</td>
                      <td><Pill info={infoPrioridad(r.prioridad)} /></td>
                      <td><Pill info={infoReporte(r.estado)} /></td>
                      <td className="muted small">{hace(r.fecha)}</td>
                      <td>
                        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => setDetalle(r)}>
                            <Icon name="eye" size={15} /> Ver
                          </button>
                          {r.tipo === 'SOPORTE' ? (
                            r.casoId ? (
                              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/casos/${r.casoId}`)}>
                                Abrir caso
                              </button>
                            ) : null
                          ) : r.estado === ESTADO_REPORTE.PENDIENTE ? (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => { setEnRevisar(r); setAccion(ACCIONES[0][0]); setMotivoResolucion(''); }}>
                                Resolver
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setDescartando(r); setMotivoDescarte(''); }}>
                                Descartar
                              </button>
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

      {/* Detalle completo del reporte */}
      <Modal
        abierto={!!detalle}
        onCerrar={() => setDetalle(null)}
        titulo={`Reporte #${detalle?.id}`}
        acciones={<button className="btn btn-primary" onClick={() => setDetalle(null)}>Cerrar</button>}
      >
        {detalle && (
          <div className="stack" style={{ gap: 14 }}>
            <div className="kgrid">
              <div className="kbox"><div className="k">Reportado por</div><div className="v">{detalle.usuarioNombre}</div></div>
              <div className="kbox"><div className="k">Correo</div><div className="v ellipsis">{detalle.usuarioCorreo || '—'}</div></div>
              <div className="kbox"><div className="k">Fecha del reporte</div><div className="v">{fmtFechaHora(detalle.fecha)}</div></div>
              <div className="kbox"><div className="k">Motivo</div><div className="v">{detalle.motivo || '—'}</div></div>
              <div className="kbox"><div className="k">Tipo de contenido</div><div className="v">{detalle.contenidoTipo ?? (detalle.tipo === 'SOPORTE' ? 'Caso de soporte' : '—')}</div></div>
              <div className="kbox"><div className="k">ID del contenido</div><div className="v">{detalle.contenidoId ?? detalle.casoId ?? '—'}</div></div>
            </div>

            <div>
              <b className="small">Descripción del reporte</b>
              <p className="small" style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{detalle.descripcion || 'Sin descripción.'}</p>
            </div>

            {detalle.contenidoAutorNombre && (
              <div className="kgrid">
                <div className="kbox"><div className="k">Autor del contenido</div><div className="v">{detalle.contenidoAutorNombre}</div></div>
                <div className="kbox"><div className="k">Correo del autor</div><div className="v ellipsis">{detalle.contenidoAutorCorreo || '—'}</div></div>
                <div className="kbox"><div className="k">Estado del contenido</div><div className="v">{detalle.contenidoEstado || '—'}</div></div>
                <div className="kbox"><div className="k">Enlace</div><div className="v">{detalle.enlace ? <a href={detalle.enlace} target="_blank" rel="noopener noreferrer">Abrir enlace<Icon name="external" size={13} /></a> : '—'}</div></div>
              </div>
            )}

            {detalle.contenidoTexto && (
              <div>
                <b className="small">Contenido reportado</b>
                <p className="small contenido-cita" style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{detalle.contenidoTexto}</p>
              </div>
            )}

            {detalle.contenidoTipo === 'PUBLICACION' && (
              <div>
                <b className="small">Multimedia del contenido</b>
                <MediaPreview reporte={detalle} onAbrir={(urls, inicial) => setLightbox({ urls, inicial })} />
              </div>
            )}

            {detalle.evidenciaUrl && (
              <div>
                <b className="small">Evidencia adjunta</b>
                <div className="row" style={{ gap: 8, marginTop: 4 }}>
                  <a className="btn btn-ghost btn-sm" href={detalle.evidenciaUrl} target="_blank" rel="noopener noreferrer">
                    <Icon name="external" size={14} /> Abrir evidencia
                  </a>
                </div>
              </div>
            )}

            {detalle.tipo !== 'SOPORTE' && (
              <div className="ia-panel-host">
                <div className="between">
                  <b className="small">Análisis del reporte con IA</b>
                  <button className="btn btn-ghost btn-sm" onClick={() => ejecutarAnalisis(detalle)} disabled={analizando === detalle.id}>
                    <Icon name="cpu" size={15} />
                    {analizando === detalle.id ? ' Analizando…' : ' Analizar con IA'}
                  </button>
                </div>
                {panelAnalisis(detalle) ?? (
                  <p className="small muted" style={{ margin: '6px 0 0' }}>
                    La IA puede recomendar ocultar y advertir o descartar, pero la decisión final es del administrador.
                  </p>
                )}
              </div>
            )}

            {(detalle.estado === ESTADO_REPORTE.RESUELTA || detalle.estado === ESTADO_REPORTE.DESCARTADA) && (
              <div className="resolucion-panel">
                <b className="small">Resolución administrativa</b>
                <div className="kgrid mt">
                  <div className="kbox"><div className="k">Estado</div><div className="v">{infoReporte(detalle.estado).etiqueta}</div></div>
                  <div className="kbox"><div className="k">Acción</div><div className="v">{detalle.accion?.replace(/_/g, ' ') || '—'}</div></div>
                  <div className="kbox"><div className="k">Administrador</div><div className="v">{detalle.adminNombre || `#${detalle.adminId ?? '—'}`}</div></div>
                  <div className="kbox"><div className="k">Fecha</div><div className="v">{detalle.fechaResolucion ? fmtFechaHora(detalle.fechaResolucion) : '—'}</div></div>
                </div>
                <p className="small" style={{ margin: '8px 0 0' }}>{detalle.motivoResolucion || 'Sin motivo registrado.'}</p>
              </div>
            )}

            {detalle.tipo !== 'SOPORTE' && detalle.estado === ESTADO_REPORTE.PENDIENTE && (detalle.publicacionId || detalle.comentarioId) && (
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {detalle.publicacionId && (
                  <button className="btn btn-danger-ghost btn-sm" onClick={() => { moderar(detalle, 'PUBLICACION', 'OCULTAR'); setDetalle(null); }}>
                    Ocultar publicación
                  </button>
                )}
                {detalle.comentarioId && (
                  <button className="btn btn-danger-ghost btn-sm" onClick={() => { moderar(detalle, 'COMENTARIO', 'OCULTAR'); setDetalle(null); }}>
                    Ocultar comentario
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Resolver reporte: motivo obligatorio */}
      <Modal
        abierto={!!enRevisar}
        onCerrar={() => setEnRevisar(null)}
        titulo={`Resolver reporte #${enRevisar?.id}`}
        acciones={
          <>
            <button className="btn btn-ghost" onClick={() => setEnRevisar(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={resolver} disabled={!motivoResolucion.trim()}>Aplicar acción</button>
          </>
        }
      >
        <div className="field">
          <label>Acción a aplicar</label>
          <select className="input" value={accion} onChange={(e) => setAccion(e.target.value)}>
            {ACCIONES.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Motivo de la decisión (obligatorio)</label>
          <textarea
            className="input"
            rows={3}
            value={motivoResolucion}
            onChange={(e) => setMotivoResolucion(e.target.value)}
            placeholder="Explica la decisión; quedará en auditoría y se conservará con el reporte."
          />
        </div>
        <p className="small muted">
          La acción queda registrada en auditoría con administrador, fecha y motivo. El contenido no se elimina:
          se oculta y se conserva la evidencia.
        </p>
      </Modal>

      {/* Descartar reporte: motivo obligatorio */}
      <Modal
        abierto={!!descartando}
        onCerrar={() => setDescartando(null)}
        titulo={`Descartar reporte #${descartando?.id}`}
        acciones={
          <>
            <button className="btn btn-ghost" onClick={() => setDescartando(null)}>Cancelar</button>
            <button className="btn btn-danger" onClick={descartar} disabled={!motivoDescarte.trim()}>Descartar reporte</button>
          </>
        }
      >
        <p className="small muted">
          El reporte se marcará como descartado, se conservará para auditoría y no se aplicarán acciones sobre el contenido.
        </p>
        <div className="field">
          <label>Motivo por el que no tiene fundamento (obligatorio)</label>
          <textarea
            className="input"
            rows={3}
            value={motivoDescarte}
            onChange={(e) => setMotivoDescarte(e.target.value)}
            placeholder="Explica por qué el reporte no procede."
          />
        </div>
      </Modal>

      {lightbox && (
        <Lightbox urls={lightbox.urls} inicial={lightbox.inicial} onCerrar={() => setLightbox(null)} />
      )}
    </div>
  );
}
