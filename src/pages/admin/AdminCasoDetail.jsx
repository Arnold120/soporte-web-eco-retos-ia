import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../store/AppContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import {
  obtenerCaso,
  mensajesDe,
  responderComoAdmin,
  asignarCaso,
  cambiarEstadoCaso,
  cambiarPrioridadCaso,
  cambiarCategoriaCaso,
  resolverCaso,
  cerrarCaso,
  agregarNotasCaso,
  adminsLista,
  auditoria,
  marcarLeidos,
} from '../../services/supportService.js';
import { subirAdjunto } from '../../services/archivosService.js';
import { MessageBubble, TypingIndicator } from '../../components/ChatParts.jsx';
import { Pill, Modal, Cargando, ErrorBox } from '../../components/ui.jsx';
import {
  infoCaso,
  infoCategoria,
  infoPrioridad,
  ESTADO_CASO,
  PRIORIDAD,
  CATEGORIA_CASO,
  FLUJO_CASO,
} from '../../utils/states.js';
import { fmtFechaHora, hace } from '../../utils/format.js';

export default function AdminCasoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirmar, verNotif } = useApp();

  const { datos, cargando, error, recargar } = useAsync(
    async () => {
      const [caso, mensajes, admins, audit] = await Promise.all([
        obtenerCaso(id),
        mensajesDe(id),
        adminsLista(),
        auditoria(),
      ]);
      marcarLeidos(id).catch(() => {});
      return { caso, mensajes, admins, audit };
    },
    [id],
  );

  const [texto, setTexto] = useState('');
  const [adjuntos, setAdjuntos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [nuevaNota, setNuevaNota] = useState('');
  const [modalResolver, setModalResolver] = useState(false);
  const [resolucion, setResolucion] = useState('');
  const [modalEstado, setModalEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState(ESTADO_CASO.ESCALADO);
  const threadRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    document.addEventListener('er.ui:refresh', recargar);
    return () => document.removeEventListener('er.ui:refresh', recargar);
  }, [recargar]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [datos?.mensajes]);

  const auditCaso = useMemo(
    () => (datos?.audit ?? []).filter((a) => (a.entidadTipo === 'SupportCase' && Number(a.entidadId) === Number(id)) || a.casoId === Number(id)).slice(0, 8),
    [datos, id],
  );

  if (cargando) return <Cargando texto="Cargando caso…" />;
  if (error) return <ErrorBox error={error} onReintentar={recargar} />;
  if (!datos?.caso) return <ErrorBox error={new Error('Caso no encontrado')} onReintentar={recargar} />;

  const caso = datos.caso;
  const mensajes = datos.mensajes ?? [];
  const admins = datos.admins ?? [];
  const posicionActual = FLUJO_CASO.indexOf(caso.estado);
  const cerrado = caso.estado === ESTADO_CASO.CERRADO;

  const ejecutar = async (accion, exito) => {
    try {
      await accion();
      if (exito) verNotif(exito, 'success');
      await recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo completar la acción.', 'error');
    }
  };

  const responder = async (e) => {
    e.preventDefault();
    if (!texto.trim() && adjuntos.length === 0) return;
    setEnviando(true);
    await ejecutar(() => responderComoAdmin(caso.id, texto.trim(), adjuntos));
    setTexto('');
    setAdjuntos([]);
    setEnviando(false);
  };

  const adjuntar = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    for (const f of files.slice(0, Math.max(0, 4 - adjuntos.length))) {
      try {
        const adj = await subirAdjunto(f);
        setAdjuntos((prev) => [...prev, adj]);
      } catch (err) {
        verNotif(err.message || 'No se pudo adjuntar.', 'error');
      }
    }
  };

  const cerrar = async () => {
    const ok = await confirmar({
      titulo: 'Cerrar caso',
      mensaje: 'El caso quedará cerrado. ¿Deseas continuar?',
      textoBoton: 'Cerrar caso',
      peligro: true,
    });
    if (ok) ejecutar(() => cerrarCaso(caso.id), 'Caso cerrado.');
  };

  return (
    <div className="stack">
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/admin/casos')}>
        ← Volver a casos
      </button>

      <div className="detail-grid">
        <div className="card chat-card">
          <div className="card-pad" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="between" style={{ alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 17 }}>#{caso.id} {caso.titulo}</h3>
                  <Pill info={infoCaso(caso.estado)} />
                  <Pill info={infoPrioridad(caso.prioridad)} />
                  <Pill info={infoCategoria(caso.categoria)} />
                </div>
                <p className="muted small" style={{ margin: '6px 0 0' }}>
                  {caso.usuarioNombre} · iniciado {fmtFechaHora(caso.fechaCreacion)}
                </p>
              </div>
              {caso.motivoEscalamiento && (
                <div className="alerta-escalado">
                  <b className="small">Motivo del escalamiento</b>
                  <p className="small" style={{ margin: '4px 0 0' }}>{caso.motivoEscalamiento}</p>
                </div>
              )}
            </div>
          </div>

          <div className="chat-thread" ref={threadRef}>
            {mensajes.map((m) => (
              <MessageBubble key={m.id} mensaje={m} vista="admin" />
            ))}
            {enviando && <TypingIndicator quien="Administrador" />}
          </div>

          <form className="chat-inputbar" onSubmit={responder}>
            {adjuntos.length > 0 && (
              <div className="adjuntos-pendientes">
                {adjuntos.map((a, i) => (
                  <span key={i} className="attach-chip">
                    {a.nombre}
                    <button
                      type="button"
                      onClick={() => setAdjuntos((prev) => prev.filter((_, j) => j !== i))}
                      style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--danger)' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <label className="attach-btn" title="Adjuntar archivo">
              📎
              <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={adjuntar} />
            </label>
            <textarea
              rows={1}
              placeholder={cerrado ? 'Caso cerrado: puedes reabrirlo cambiando el estado' : 'Escribe tu respuesta al usuario…'}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  responder(e);
                }
              }}
              disabled={cerrado}
            />
            <button className="btn btn-primary btn-icon" disabled={enviando || cerrado}>➤</button>
          </form>
        </div>

        <div className="stack">
          <div className="card card-pad">
            <b>Progreso del caso</b>
            <div className="status-stepper mt">
              {FLUJO_CASO.map((est, i) => (
                <span key={est} className={`step ${i < posicionActual ? 'done' : ''} ${i === posicionActual ? 'now' : ''}`}>
                  {infoCaso(est).etiqueta}
                </span>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <b>Datos</b>
            <div className="kgrid mt">
              <div className="kbox"><div className="k">Usuario</div><div className="v">{caso.usuarioNombre}</div></div>
              <div className="kbox"><div className="k">Prioridad</div><div className="v">{infoPrioridad(caso.prioridad).etiqueta}</div></div>
              <div className="kbox"><div className="k">Categoría</div><div className="v">{infoCategoria(caso.categoria).etiqueta}</div></div>
              <div className="kbox"><div className="k">Creado</div><div className="v">{hace(caso.fechaCreacion)}</div></div>
              <div className="kbox"><div className="k">Consentimiento</div><div className="v">✔ Aceptado</div></div>
              <div className="kbox"><div className="k">Cierre</div><div className="v">{caso.fechaCierre ? hace(caso.fechaCierre) : '—'}</div></div>
            </div>
          </div>

          <div className="card card-pad">
            <b>Acciones</b>

            <div className="field mt">
              <label>Asignar a administrador</label>
              <select
                className="input"
                defaultValue={caso.adminId ?? ''}
                onChange={(e) => {
                  const idAdmin = e.target.value;
                  const admin = admins.find((a) => String(a.id) === idAdmin);
                  if (!admin) return;
                  ejecutar(() => asignarCaso(caso.id, admin.nombre, admin.id), `Asignado a ${admin.nombre}.`);
                }}
              >
                <option value="">Sin asignar</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre} {a.estado !== 'ACTIVO' ? '(inactivo)' : ''}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Prioridad</label>
              <select
                className="input"
                value={caso.prioridad}
                onChange={(e) => ejecutar(() => cambiarPrioridadCaso(caso.id, e.target.value), 'Prioridad actualizada.')}
              >
                {Object.values(PRIORIDAD).map((p) => <option key={p} value={p}>{infoPrioridad(p).etiqueta}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Categoría</label>
              <select
                className="input"
                value={caso.categoria}
                onChange={(e) => ejecutar(() => cambiarCategoriaCaso(caso.id, e.target.value), 'Categoría actualizada.')}
              >
                {Object.values(CATEGORIA_CASO).map((c) => <option key={c} value={c}>{infoCategoria(c).etiqueta}</option>)}
              </select>
            </div>

            <button className="btn btn-ghost mt" onClick={() => { setNuevoEstado(caso.estado); setModalEstado(true); }}>
              Cambiar estado…
            </button>
            {!cerrado && caso.estado !== ESTADO_CASO.RESUELTO && (
              <button className="btn btn-primary mt" onClick={() => setModalResolver(true)}>
                Marcar como resuelto
              </button>
            )}
            {!cerrado && (
              <button className="btn btn-danger-ghost mt" onClick={cerrar}>Cerrar caso</button>
            )}
          </div>

          <div className="card card-pad">
            <b>Notas internas</b>
            <p className="small muted" style={{ whiteSpace: 'pre-wrap', minHeight: 20 }}>
              {caso.notasInternas || 'Sin notas.'}
            </p>
            <textarea
              className="input"
              rows={2}
              placeholder="Agrega una nota interna…"
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
            />
            <button
              className="btn btn-ghost btn-sm mt"
              onClick={() => {
                if (!nuevaNota.trim()) return;
                ejecutar(() => agregarNotasCaso(caso.id, nuevaNota.trim()), 'Nota guardada.');
                setNuevaNota('');
              }}
            >
              Guardar nota
            </button>
          </div>

          {auditCaso.length > 0 && (
            <div className="card card-pad">
              <b>Historial del caso</b>
              <ul className="timeline mt">
                {auditCaso.map((a) => (
                  <li key={a.id}>
                    <div className="timeline-title">{a.accion}</div>
                    <div className="timeline-sub">{a.actor} · {a.motivo}</div>
                    <div className="timeline-sub">{hace(a.fecha)}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <Modal
        abierto={modalEstado}
        onCerrar={() => setModalEstado(false)}
        titulo="Cambiar estado del caso"
        acciones={
          <>
            <button className="btn btn-ghost" onClick={() => setModalEstado(false)}>Cancelar</button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setModalEstado(false);
                ejecutar(() => cambiarEstadoCaso(caso.id, nuevoEstado), 'Estado actualizado.');
              }}
            >
              Guardar
            </button>
          </>
        }
      >
        <div className="field">
          <label>Estado</label>
          <select className="input" value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)}>
            {Object.values(ESTADO_CASO).map((e) => <option key={e} value={e}>{infoCaso(e).etiqueta}</option>)}
          </select>
          {nuevoEstado === ESTADO_CASO.ESCALADO && <p className="small muted mt">El caso vuelve a la bandeja de escalados.</p>}
        </div>
      </Modal>

      <Modal
        abierto={modalResolver}
        onCerrar={() => setModalResolver(false)}
        titulo="Resolver caso"
        acciones={
          <>
            <button className="btn btn-ghost" onClick={() => setModalResolver(false)}>Cancelar</button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setModalResolver(false);
                ejecutar(() => resolverCaso(caso.id, resolucion.trim(), 'Admin'), 'Caso resuelto.');
              }}
            >
              Resolver caso
            </button>
          </>
        }
      >
        <div className="field">
          <label>Solución que se comunicará al usuario</label>
          <textarea
            className="input"
            rows={4}
            placeholder="Explica al usuario la solución…"
            value={resolucion}
            onChange={(e) => setResolucion(e.target.value)}
          />
        </div>
        <p className="small muted">El usuario recibirá una notificación de "caso resuelto".</p>
      </Modal>
    </div>
  );
}
