import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePaginacion } from '../../hooks/usePaginacion.js';
import { useNuevosIds } from '../../hooks/useNuevosIds.js';
import {
  evidenciasAdmin,
  decidirEvidencia,
  analizarEvidenciaAdmin,
} from '../../services/supportService.js';
import { Pill, EmptyState, Modal, Lightbox, Cargando, ErrorBox, NewBadge, MiniaturaMedia } from '../../components/ui.jsx';
import Icon from '../../components/Icons.jsx';
import Pagination from '../../components/Pagination.jsx';
import { infoEvidencia, ESTADO_EVIDENCIA } from '../../utils/states.js';
import { fmtFecha, fmtFechaHora } from '../../utils/format.js';
import { exportarCsv } from '../../utils/exportCsv.js';

const TIPOS_EVIDENCIA = {
  FOTO: 'Fotografía',
  GALERIA: 'Fotografía (galería)',
  VIDEO: 'Video',
  TEXTO: 'Texto',
  CANTIDAD: 'Cantidad',
  RESPUESTA: 'Respuesta',
};

function listaRequisitos(texto) {
  if (!texto) return [];
  try {
    const datos = JSON.parse(texto);
    if (Array.isArray(datos)) return datos.map((r) => (typeof r === 'string' ? r : r?.nombre ?? JSON.stringify(r)));
  } catch {
    /* no es JSON: se muestra como texto */
  }
  return [String(texto)];
}

function Miniaturas({ adjuntos = [], onAbrir, size = 44 }) {
  if (adjuntos.length === 0) return <span className="small muted">Sin archivos</span>;
  return (
    <div className="media-grid compacta">
      {adjuntos.map((a, i) => (
        <MiniaturaMedia
          key={`${a.url}-${i}`}
          adjunto={a}
          size={size}
          onAbrir={() => onAbrir(adjuntos, i)}
        />
      ))}
    </div>
  );
}

export default function AdminEvidencias() {
  const { confirmar, verNotif } = useApp();
  const [estado, setEstado] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [lb, setLb] = useState(null);
  const [analisis, setAnalisis] = useState({});
  const [analizando, setAnalizando] = useState(null);

  const { datos, cargando, actualizando, error, recargar } = useAsync(
    () => evidenciasAdmin({ estado }),
    [estado],
  );

  useEffect(() => {
    document.addEventListener('er.ui:refresh', recargar);
    return () => document.removeEventListener('er.ui:refresh', recargar);
  }, [recargar]);

  const nuevos = useNuevosIds(datos);
  const pag = usePaginacion(datos ?? [], 10);

  const aprobar = async (ev) => {
    const ok = await confirmar({
      titulo: 'Aprobar evidencia',
      mensaje: `Se aprobará la evidencia de "${ev.reto}" del usuario ${ev.usuario} y se le notificará la decisión.`,
      textoBoton: 'Aprobar',
    });
    if (!ok) return;
    try {
      await decidirEvidencia(ev.id, 'COMPLETADO');
      verNotif('Evidencia aprobada. El usuario recibió la notificación.', 'success');
      setDetalle(null);
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo aprobar.', 'error');
    }
  };

  const confirmarRechazo = async () => {
    if (!motivo.trim()) {
      verNotif('El motivo del rechazo es obligatorio.', 'error');
      return;
    }
    try {
      await decidirEvidencia(rejectModal.id, 'RECHAZADO', motivo.trim());
      setRejectModal(null);
      setMotivo('');
      setDetalle(null);
      verNotif('Evidencia rechazada; el usuario recibió el motivo.', 'info');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo rechazar.', 'error');
    }
  };

  const ejecutarAnalisis = async (ev) => {
    setAnalizando(ev.id);
    try {
      const resultado = await analizarEvidenciaAdmin(ev.id);
      setAnalisis((a) => ({ ...a, [ev.id]: resultado }));
    } catch (e) {
      verNotif(e.message || 'No se pudo analizar la evidencia.', 'error');
    } finally {
      setAnalizando(null);
    }
  };

  const panelIA = (ev) => {
    const a = analisis[ev.id] || ev.evaluacionIA || null;
    if (!a) {
      return (
        <p className="small muted" style={{ margin: '6px 0 0' }}>
          Aún no hay evaluación de IA para esta evidencia. Puedes solicitarla; la decisión final siempre es tuya.
        </p>
      );
    }
    return (
      <div className="ia-panel">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Icon name="cpu" size={16} />
          <b className="small">Evaluación de IA</b>
          <span className={`pill ${a.cumple ? 'c-success' : 'c-error'}`}>{a.cumple ? 'Cumple' : 'No cumple'}</span>
          <span className="small muted">Confianza {a.confianza ?? 0}%</span>
          {a.requiereRevisionHumana && <span className="pill c-warning">Requiere revisión humana</span>}
        </div>
        <div className="barra-confianza" aria-hidden="true">
          <span style={{ width: `${Math.max(0, Math.min(100, Number(a.confianza) || 0))}%` }} />
        </div>
        <p className="small" style={{ margin: '8px 0 4px' }}>{a.motivo}</p>
        {a.elementosFaltantes?.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <b className="small">Elementos faltantes</b>
            <ul className="lista-faltantes">
              {a.elementosFaltantes.map((f, i) => <li key={i} className="small">{f}</li>)}
            </ul>
          </div>
        )}
        {a.observaciones && <p className="small muted" style={{ margin: '6px 0 0' }}>{a.observaciones}</p>}
        <p className="small muted" style={{ margin: '6px 0 0' }}>
          Proveedor: {a.proveedor === 'ia' ? 'IA' : 'reglas automáticas'} · La IA no aprueba ni rechaza por sí sola.
        </p>
      </div>
    );
  };

  const exportar = () => {
    exportarCsv('evidencias', datos ?? [], [
      { etiqueta: 'ID', clave: 'id' },
      { etiqueta: 'Usuario', clave: 'usuario' },
      { etiqueta: 'Correo', clave: 'usuarioCorreo' },
      { etiqueta: 'Reto', clave: 'reto' },
      { etiqueta: 'Tipo de evidencia', clave: 'retoTipoEvidencia' },
      { etiqueta: 'Estado', clave: 'estado' },
      { etiqueta: 'Motivo rechazo', clave: 'motivoRechazo' },
      { etiqueta: 'Fecha', valor: (e) => fmtFecha(e.fecha) },
    ]);
  };

  return (
    <div className="stack">
      <div className="between">
        <div>
          <h2>Evidencias de retos</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Validación de evidencias con asistencia de IA{actualizando ? ' · actualizando…' : ''}. La aprobación o el
            rechazo final siempre los realiza el administrador.
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
          {[[null, 'Todas'], [ESTADO_EVIDENCIA.EN_REVISION, 'Pendientes'], [ESTADO_EVIDENCIA.COMPLETADO, 'Aprobadas'], [ESTADO_EVIDENCIA.RECHAZADO, 'Rechazadas']].map(([val, lbl]) => (
            <button key={lbl} className={`btn btn-sm ${estado === val ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setEstado(val)}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {cargando && !datos && <Cargando texto="Cargando evidencias…" />}
      <ErrorBox error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div className="card">
          <div className="tbl-wrap">
            {pag.total === 0 ? (
              <EmptyState icono="folder" titulo="Sin evidencias" texto="No hay evidencias con los filtros actuales." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th><th>Usuario</th><th>Reto</th><th>Evidencia</th><th>IA</th>
                    <th>Fecha</th><th>Estado</th><th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pag.visibles.map((ev) => {
                    const resultado = analisis[ev.id] || ev.evaluacionIA;
                    return (
                      <tr key={ev.id} className={nuevos.has(ev.id) ? 'fila-nueva' : ''}>
                        <td style={{ fontWeight: 700 }}>
                          #{ev.id}
                          {nuevos.has(ev.id) && <NewBadge />}
                        </td>
                        <td>
                          <div>{ev.usuario}</div>
                          <div className="small muted ellipsis">{ev.usuarioCorreo || '—'}</div>
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          <div className="small">{ev.reto}</div>
                          <div className="small muted">{TIPOS_EVIDENCIA[ev.retoTipoEvidencia] ?? ev.retoTipoEvidencia ?? '—'}</div>
                        </td>
                        <td style={{ maxWidth: 240 }}>
                          <Miniaturas adjuntos={ev.evidencias} onAbrir={(urls, inicial) => setLb({ urls, inicial })} />
                          {ev.texto && <div className="small muted ellipsis" title={ev.texto}>{ev.texto}</div>}
                        </td>
                        <td>
                          {resultado ? (
                            <Pill info={resultado.cumple
                              ? { etiqueta: `Cumple ${resultado.confianza ?? 0}%`, color: 'success' }
                              : { etiqueta: `No cumple ${resultado.confianza ?? 0}%`, color: 'error' }} />
                          ) : (
                            <span className="small muted">Sin analizar</span>
                          )}
                        </td>
                        <td className="muted small">{fmtFecha(ev.fecha)}</td>
                        <td><Pill info={infoEvidencia(ev.estado)} /></td>
                        <td>
                          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setDetalle(ev)}>
                              <Icon name="eye" size={15} /> Ver
                            </button>
                            {ev.estado === ESTADO_EVIDENCIA.EN_REVISION && (
                              <>
                                <button className="btn btn-primary btn-sm" onClick={() => aprobar(ev)}>Aprobar</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setRejectModal(ev); setMotivo(ev.motivoRechazo || ''); }}>
                                  Rechazar
                                </button>
                              </>
                            )}
                            {ev.estado === ESTADO_EVIDENCIA.COMPLETADO && <span className="small muted">Aprobada</span>}
                            {ev.estado === ESTADO_EVIDENCIA.RECHAZADO && ev.motivoRechazo && (
                              <span className="small muted" title={ev.motivoRechazo}>
                                {ev.motivoRechazo.slice(0, 30)}{ev.motivoRechazo.length > 30 ? '…' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <Pagination pagina={pag.pagina} paginas={pag.paginas} onPagina={pag.setPagina} total={pag.total} />
        </div>
      )}

      {/* Detalle con datos del reto, usuario, evidencia y evaluación de IA */}
      <Modal
        abierto={!!detalle}
        onCerrar={() => setDetalle(null)}
        titulo={`Evidencia #${detalle?.id}`}
        acciones={
          <>
            <button className="btn btn-ghost" onClick={() => setDetalle(null)}>Cerrar</button>
            {detalle?.estado === ESTADO_EVIDENCIA.EN_REVISION && (
              <>
                <button className="btn btn-primary" onClick={() => aprobar(detalle)}>Aprobar reto</button>
                <button className="btn btn-danger" onClick={() => { setRejectModal(detalle); setMotivo(''); }}>
                  Rechazar reto
                </button>
              </>
            )}
          </>
        }
      >
        {detalle && (
          <div className="stack" style={{ gap: 14 }}>
            <div>
              <b className="small">Datos del reto</b>
              <div className="kgrid mt">
                <div className="kbox"><div className="k">Nombre</div><div className="v">{detalle.reto}</div></div>
                <div className="kbox"><div className="k">Tipo de evidencia requerida</div><div className="v">{TIPOS_EVIDENCIA[detalle.retoTipoEvidencia] ?? detalle.retoTipoEvidencia ?? '—'}</div></div>
                <div className="kbox"><div className="k">Objetivo de cantidad</div><div className="v">{detalle.retoCantidadObjetivo ?? 'No aplica'}</div></div>
                <div className="kbox"><div className="k">Fecha de envío</div><div className="v">{fmtFechaHora(detalle.fechaCompletado || detalle.fecha)}</div></div>
              </div>
              {detalle.retoDescripcion && (
                <p className="small" style={{ margin: '8px 0 0' }}><b>Descripción: </b>{detalle.retoDescripcion}</p>
              )}
              {detalle.retoInstrucciones && (
                <p className="small" style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}><b>Instrucciones: </b>{detalle.retoInstrucciones}</p>
              )}
              {listaRequisitos(detalle.retoRequisitos).length > 0 && (
                <>
                  <b className="small" style={{ display: 'block', marginTop: 8 }}>Requisitos</b>
                  <ul className="lista-faltantes">
                    {listaRequisitos(detalle.retoRequisitos).map((r, i) => <li key={i} className="small">{r}</li>)}
                  </ul>
                </>
              )}
            </div>

            <div>
              <b className="small">Datos del usuario</b>
              <div className="kgrid mt">
                <div className="kbox"><div className="k">Nombre</div><div className="v">{detalle.usuario}</div></div>
                <div className="kbox"><div className="k">Correo</div><div className="v ellipsis">{detalle.usuarioCorreo || '—'}</div></div>
                <div className="kbox"><div className="k">ID de usuario</div><div className="v">#{detalle.usuarioId}</div></div>
              </div>
            </div>

            <div>
              <b className="small">Evidencia enviada</b>
              <p className="small contenido-cita" style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>
                {detalle.texto || 'Sin texto en la evidencia.'}
              </p>
              <div style={{ marginTop: 8 }}>
                <Miniaturas adjuntos={detalle.evidencias} onAbrir={(urls, inicial) => setLb({ urls, inicial })} />
              </div>
            </div>

            <div className="ia-panel-host">
              <div className="between">
                <b className="small">Evaluación de IA</b>
                <button className="btn btn-ghost btn-sm" onClick={() => ejecutarAnalisis(detalle)} disabled={analizando === detalle.id}>
                  <Icon name="cpu" size={15} />
                  {analizando === detalle.id ? ' Analizando…' : ' Analizar con IA'}
                </button>
              </div>
              {panelIA(detalle)}
            </div>

            <div>
              <b className="small">Decisión administrativa</b>
              <div className="kgrid mt">
                <div className="kbox"><div className="k">Estado</div><div className="v">{infoEvidencia(detalle.estado).etiqueta}</div></div>
                <div className="kbox"><div className="k">Puntos otorgados</div><div className="v">{detalle.puntosObtenidos}</div></div>
              </div>
              {detalle.motivoRechazo && (
                <p className="small" style={{ margin: '8px 0 0' }}><b>Motivo del rechazo: </b>{detalle.motivoRechazo}</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Rechazo con motivo obligatorio */}
      <Modal
        abierto={!!rejectModal}
        onCerrar={() => setRejectModal(null)}
        titulo={`Rechazar evidencia #${rejectModal?.id}`}
        acciones={
          <>
            <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Cancelar</button>
            <button className="btn btn-danger" onClick={confirmarRechazo} disabled={!motivo.trim()}>
              Confirmar rechazo
            </button>
          </>
        }
      >
        <p className="small muted">
          El usuario recibirá una notificación con este motivo y podrá enviar una nueva evidencia.
        </p>
        <div className="field">
          <label>Motivo del rechazo (obligatorio)</label>
          <textarea
            className="input"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Explica exactamente qué falta o por qué no corresponde al reto."
          />
        </div>
      </Modal>

      {lb && <Lightbox urls={lb.urls} inicial={lb.inicial} onCerrar={() => setLb(null)} />}
    </div>
  );
}
