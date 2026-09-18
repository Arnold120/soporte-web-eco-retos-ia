import { useState } from 'react';
import { Avatar } from './ui.jsx';
import Markdown from './Markdown.jsx';
import { fmtFecha } from '../utils/format.js';
import { TIPO_REMITENTE } from '../utils/states.js';

function esVideo(a) {
  return a.tipo === 'video' || /\.(mp4|mov|webm|m4v)$/i.test(a.url || '');
}

function Adjuntos({ adjuntos = [] }) {
  const [ver, setVer] = useState(null);
  if (!adjuntos?.length) return null;
  return (
    <div className="attach-preview">
      {adjuntos.map((a, i) => (
        <div
          className="attach-thumb preview-lightbox"
          key={i}
          onClick={() => setVer(i)}
          title={a.nombre || 'Evidencia'}
        >
          {esVideo(a) ? (
            <span>▶ {a.nombre || 'video'}</span>
          ) : a.tipo === 'imagen' || a.url?.startsWith('data:image') ? (
            <img src={a.url} alt={a.nombre || ''} />
          ) : (
            <span>📄 {a.nombre || 'archivo'}</span>
          )}
        </div>
      ))}
      {ver !== null && (
        <div className="modal-overlay" onClick={() => setVer(null)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
            {esVideo(adjuntos[ver]) ? (
              <video
                src={adjuntos[ver].url}
                controls
                autoPlay
                style={{ width: '100%', maxHeight: '72vh', borderRadius: 12, background: '#000' }}
              />
            ) : (
              <img
                src={adjuntos[ver].url}
                alt={adjuntos[ver].nombre || ''}
                style={{ width: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: 12 }}
              />
            )}
            <div className="modal-actions">
              <span className="muted small">
                {adjuntos[ver].nombre} · {adjuntos[ver].tipo}
              </span>
              <button className="btn btn-primary btn-sm" onClick={() => setVer(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MessageBubble({ mensaje, vista = 'usuario' }) {
  const etiquetas =
    vista === 'admin'
      ? {
          [TIPO_REMITENTE.USUARIO]: { nombre: 'Usuario', cls: 'src-usuario' },
          [TIPO_REMITENTE.IA]: { nombre: 'IA de soporte', cls: 'src-ia' },
          [TIPO_REMITENTE.ADMIN]: { nombre: 'Tú (administrador)', cls: 'src-admin' },
        }
      : {
          [TIPO_REMITENTE.USUARIO]: { nombre: 'Tú', cls: 'src-usuario' },
          [TIPO_REMITENTE.IA]: { nombre: 'IA de soporte', cls: 'src-ia' },
          [TIPO_REMITENTE.ADMIN]: { nombre: 'Administrador', cls: 'src-admin' },
        };

  const etiq = etiquetas[mensaje.remitente] ?? etiquetas[TIPO_REMITENTE.USUARIO];
  const autor =
    mensaje.remitente === TIPO_REMITENTE.USUARIO
      ? 'usuario'
      : mensaje.remitente === TIPO_REMITENTE.ADMIN
        ? 'admin'
        : 'ia';

  return (
    <div className={`chat-item ${autor}`}>
      {autor !== 'usuario' && (
        <Avatar
          nombre={mensaje.remitente === TIPO_REMITENTE.IA ? 'Asistente Eco-Retos' : 'Admin'}
          size="sm"
        />
      )}
      <div className="bubble-body">
        <div className="chat-meta">
          <span className={`chat-src ${etiq.cls}`}>{etiq.nombre}</span>
          <span>{fmtFecha(mensaje.fecha)}</span>
        </div>
        <div className="bubble">
          <Markdown texto={mensaje.contenido} />
          <Adjuntos adjuntos={mensaje.adjuntos} />
        </div>
      </div>
    </div>
  );
}

export function TypingIndicator({ quien = 'IA de soporte' }) {
  return (
    <div className="chat-item ia">
      <Avatar nombre="Asistente Eco-Retos" size="sm" />
      <div className="bubble-body">
        <div className="chat-meta">
          <span className="chat-src src-ia">{quien}</span>
        </div>
        <div className="bubble typing">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export function FechaCentro({ fecha }) {
  return <div className="msg-date-center">{fmtFecha(fecha)}</div>;
}
