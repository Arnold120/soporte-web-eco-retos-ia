import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../store/AppContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import {
  obtenerCaso,
  casosMios,
  mensajesDe,
  enviarMensajeUsuario,
  marcarLeidos,
} from '../../services/supportService.js';
import { subirAdjunto } from '../../services/archivosService.js';
import { DEMO_MODE } from '../../api/config.js';
import { MessageBubble, TypingIndicator } from '../../components/ChatParts.jsx';
import { Avatar, Pill, Cargando, ErrorBox } from '../../components/ui.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';
import { infoCaso, TIPO_REMITENTE } from '../../utils/states.js';
import { fmtFecha, fmtFechaHora } from '../../utils/format.js';

export default function ChatCasoPage() {
  const { sesion, salir, verNotif } = useApp();
  const { id } = useParams();
  const navigate = useNavigate();

  const [caso, setCaso] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [texto, setTexto] = useState('');
  const [adjuntos, setAdjuntos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const threadRef = useRef(null);
  const fileRef = useRef(null);

  const misCasos = useAsync(() => casosMios(sesion.usuario.id), [sesion.usuario.id]);

  const cargarCaso = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setCargando(true);
      setErrorCarga(null);
      try {
        const [c, m] = await Promise.all([obtenerCaso(id), mensajesDe(id)]);
        setCaso(c);
        setMensajes(m);
        marcarLeidos(id).catch(() => {});
      } catch (e) {
        if (!silencioso) setErrorCarga(e);
      } finally {
        if (!silencioso) setCargando(false);
      }
    },
    [id],
  );

  useEffect(() => {
    cargarCaso();
  }, [cargarCaso]);

  /* En modo real, refresco cada 12 s para ver respuestas del administrador. */
  useEffect(() => {
    if (DEMO_MODE) return undefined;
    const timer = setInterval(() => cargarCaso(true), 12000);
    return () => clearInterval(timer);
  }, [cargarCaso]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensajes, escribiendo]);

  if (!caso && !cargando) {
    return (
      <div className="content">
        <ErrorBox error={errorCarga ?? new Error('Caso no encontrado')} onReintentar={() => cargarCaso()} />
      </div>
    );
  }

  if (!caso) {
    return <div className="content"><Cargando texto="Abriendo conversación…" /></div>;
  }

  const cerrarMenu = () => setMenuAbierto(false);

  const enviar = async (textoDirecto) => {
    const contenido = (textoDirecto ?? texto).trim();
    if (!contenido && adjuntos.length === 0) return;
    setEscribiendo(true);
    try {
      const res = await enviarMensajeUsuario(caso.id, { contenido, adjuntos });
      setMensajes(res.mensajes);
      setCaso(res.caso);
      misCasos.recargar?.();
      if (res.caso?.estado === 'ESCALADO') {
        verNotif('La IA escaló tu caso a un administrador humano.', 'info');
      }
    } catch (e) {
      verNotif(e.message || 'No se pudo enviar el mensaje.', 'error');
    } finally {
      setEscribiendo(false);
      setTexto('');
      setAdjuntos([]);
    }
  };

  const seleccionarArchivos = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setSubiendo(true);
    for (const f of files.slice(0, Math.max(0, 4 - adjuntos.length))) {
      try {
        const adj = await subirAdjunto(f);
        setAdjuntos((prev) => [...prev, adj]);
      } catch (err) {
        verNotif(err.message || 'No se pudo adjuntar el archivo.', 'error');
      }
    }
    setSubiendo(false);
  };

  const ultimoIA = [...mensajes].reverse().find((m) => m.remitente === TIPO_REMITENTE.IA);
  const sugerencias =
    ultimoIA?.sugerencias?.length && caso.estado !== 'CERRADO' ? ultimoIA.sugerencias : [];

  const usarSugerencia = (s) => {
    const limpio = s.replace(/^[^\p{L}\d]+/u, '').trim();
    if (/adjuntar|captura/i.test(limpio) && fileRef.current) {
      fileRef.current.click();
      return;
    }
    enviar(limpio);
  };

  return (
    <div className="chat-shell">
      {menuAbierto && <div className="side-backdrop" onClick={cerrarMenu} />}

      <aside className={`chat-side ${menuAbierto ? 'abierta' : ''}`}>
        <div className="chat-side-head">
          <div className="row" style={{ gap: 8 }}>
            <span className="logo-badge logo-side">☘</span>
            <b>Mis casos</b>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/soporte')}>
            Nuevo
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {(misCasos.datos ?? []).map((c) => (
            <div
              key={c.id}
              className={`case-item ${c.id === caso.id ? 'active' : ''}`}
              onClick={() => {
                cerrarMenu();
                navigate(`/soporte/casos/${c.id}`);
              }}
            >
              <Avatar nombre={c.usuarioNombre} size="sm" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="case-item-title">
                  <span className="ellipsis">{c.titulo}</span>
                </div>
                <div className="case-item-sub">
                  <span>{fmtFecha(c.fechaActualizacion)}</span>
                  <Pill info={infoCaso(c.estado)} />
                </div>
              </div>
            </div>
          ))}
          {(misCasos.datos ?? []).length === 0 && (
            <p className="small muted" style={{ padding: 14 }}>Sin conversaciones todavía.</p>
          )}
        </div>
        <div className="chat-side-foot">
          <span className="small muted ellipsis">{caso.nombreUsuario ?? sesion.usuario.nombreUsuario}</span>
          <button className="btn btn-ghost btn-sm" onClick={salir}>Salir</button>
        </div>
      </aside>

      <main className="chat-main">
        <div className="topbar topbar-chat">
          <button className="menu-btn btn btn-ghost btn-sm" onClick={() => setMenuAbierto((v) => !v)} aria-label="Abrir conversaciones">
            ☰
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="row" style={{ gap: 8 }}>
              <b className="ellipsis">#{caso.id} {caso.titulo}</b>
              <Pill info={infoCaso(caso.estado)} />
            </div>
            <div className="small muted ellipsis">
              Iniciado {fmtFechaHora(caso.fechaCreacion)} · Soporte Eco-Retos
            </div>
          </div>
          <div className="topbar-user" style={{ marginLeft: 'auto' }}>
            <ThemeToggle />
            <button className="btn btn-ghost btn-sm solo-desktop" onClick={() => navigate('/soporte')}>
              + Nuevo caso
            </button>
          </div>
        </div>

        {caso.motivoEscalamiento && !caso.resolucion && (
          <div className="banner-escalado">
            🚨 Este caso fue escalado a un administrador humano. Te responderán por aquí.
          </div>
        )}
        {caso.resolucion && (
          <div className="banner-resuelto">
            ✅ Solución: {caso.resolucion}
          </div>
        )}

        <div className="chat-thread" ref={threadRef}>
          <div className="msg-date-center">Conversación #{caso.id}</div>
          {cargando && <Cargando texto="Cargando mensajes…" />}
          {mensajes.map((m) => (
            <MessageBubble key={m.id} mensaje={m} />
          ))}
          {escribiendo && <TypingIndicator />}
        </div>

        {sugerencias.length > 0 && !escribiendo && (
          <div className="sugerencias">
            {sugerencias.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => usarSugerencia(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          className="chat-inputbar"
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          {adjuntos.length > 0 && (
            <div className="adjuntos-pendientes">
              {adjuntos.map((a, i) => (
                <span key={i} className="attach-chip">
                  {a.tipo === 'imagen' && (
                    <img src={a.url} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover' }} />
                  )}
                  {a.tipo === 'video' ? '🎬 ' : ''}
                  {a.nombre}
                  <button
                    type="button"
                    onClick={() => setAdjuntos((prev) => prev.filter((_, j) => j !== i))}
                    style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 15 }}
                    aria-label={`Quitar ${a.nombre}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <label className="attach-btn" title="Adjuntar imagen o video">
            {subiendo ? '⏳' : '📎'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={seleccionarArchivos}
            />
          </label>
          <textarea
            id="chat-texto"
            placeholder="Escribe tu mensaje… (Enter para enviar)"
            rows={1}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
          />
          <button className="btn btn-primary btn-icon" title="Enviar" disabled={escribiendo || subiendo}>
            ➤
          </button>
        </form>
      </main>
    </div>
  );
}
