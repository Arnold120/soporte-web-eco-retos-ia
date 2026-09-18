import { useEffect, useState } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { usePaginacion } from '../../hooks/usePaginacion.js';
import { evidenciasAdmin, decidirEvidencia } from '../../services/supportService.js';
import { Pill, EmptyState, Modal, Lightbox, Cargando, ErrorBox } from '../../components/ui.jsx';
import Pagination from '../../components/Pagination.jsx';
import { infoEvidencia, ESTADO_EVIDENCIA } from '../../utils/states.js';
import { fmtFecha } from '../../utils/format.js';
import { exportarCsv } from '../../utils/exportCsv.js';

export default function AdminEvidencias() {
  const { confirmar, verNotif } = useApp();
  const [estado, setEstado] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [lb, setLb] = useState(null);

  const { datos, cargando, error, recargar } = useAsync(
    () => evidenciasAdmin({ estado }),
    [estado],
  );

  useEffect(() => {
    document.addEventListener('er.ui:refresh', recargar);
    return () => document.removeEventListener('er.ui:refresh', recargar);
  }, [recargar]);

  const pag = usePaginacion(datos ?? [], 10);

  const aprobar = async (ev) => {
    const ok = await confirmar({
      titulo: 'Aprobar evidencia',
      mensaje: `Se aprobará la evidencia de "${ev.reto}" y se acreditarán las monedas correspondientes.`,
      textoBoton: 'Aprobar',
    });
    if (!ok) return;
    try {
      await decidirEvidencia(ev.id, 'COMPLETADO');
      verNotif('Evidencia aprobada.', 'success');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo aprobar.', 'error');
    }
  };

  const confirmarRechazo = async () => {
    try {
      await decidirEvidencia(rejectModal.id, 'RECHAZADO', motivo.trim());
      setRejectModal(null);
      setMotivo('');
      verNotif('Evidencia rechazada; el usuario recibirá el motivo.', 'info');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo rechazar.', 'error');
    }
  };

  const exportar = () => {
    exportarCsv('evidencias', datos ?? [], [
      { etiqueta: 'ID', clave: 'id' },
      { etiqueta: 'Usuario', clave: 'usuario' },
      { etiqueta: 'Reto', clave: 'reto' },
      { etiqueta: 'Tipo', clave: 'tipo' },
      { etiqueta: 'Estado', clave: 'estado' },
      { etiqueta: 'Revisado por', clave: 'admin' },
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
            Revisión de evidencias enviadas por los usuarios para validar la finalización de retos.
          </p>
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={recargar}>↻</button>
          <button className="btn btn-ghost btn-sm" onClick={exportar} disabled={!datos?.length}>⬇ Exportar CSV</button>
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

      {cargando && <Cargando texto="Cargando evidencias…" />}
      <ErrorBox error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div className="card">
          <div className="tbl-wrap">
            {pag.total === 0 ? (
              <EmptyState icono="🗂️" titulo="Sin evidencias" texto="No hay evidencias con los filtros actuales." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>ID</th><th>Usuario</th><th>Reto</th><th>Evidencia</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr>
                </thead>
                <tbody>
                  {pag.visibles.map((ev) => (
                    <tr key={ev.id}>
                      <td style={{ fontWeight: 700 }}>#{ev.id}</td>
                      <td>{ev.usuario}</td>
                      <td style={{ maxWidth: 220 }} className="small">{ev.reto}</td>
                      <td>
                        <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                          {(ev.evidencias || []).slice(0, 3).map((adj, i) => (
                            <span
                              key={i}
                              className="attach-thumb preview-lightbox"
                              onClick={() => setLb(ev.evidencias)}
                              style={{ width: 40, height: 40, flex: 'none' }}
                            >
                              {adj.tipo === 'video' ? (
                                <span>▶</span>
                              ) : (
                                <img src={adj.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                              )}
                            </span>
                          ))}
                          <span className="small muted">{ev.tipo}</span>
                        </div>
                      </td>
                      <td className="muted small">{fmtFecha(ev.fecha)}</td>
                      <td><Pill info={infoEvidencia(ev.estado)} /></td>
                      <td>
                        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                          {ev.estado === ESTADO_EVIDENCIA.EN_REVISION && (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => aprobar(ev)}>Aprobar</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setRejectModal(ev); setMotivo(ev.motivoRechazo || ''); }}>
                                Rechazar
                              </button>
                            </>
                          )}
                          {ev.estado === ESTADO_EVIDENCIA.COMPLETADO && <span className="small muted">por {ev.admin || '—'}</span>}
                          {ev.motivoRechazo && (
                            <span className="small muted" title={ev.motivoRechazo}>
                              Motivo: {ev.motivoRechazo.slice(0, 36)}…
                            </span>
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
        <p className="small muted">El usuario recibirá el motivo del rechazo y podrá enviar una nueva evidencia.</p>
        <div className="field">
          <label>Motivo del rechazo (se comunicará al usuario)</label>
          <textarea
            className="input"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Explica por qué la evidencia no cumple…"
          />
        </div>
      </Modal>

      {lb && <Lightbox urls={lb} onCerrar={() => setLb(null)} />}
    </div>
  );
}
