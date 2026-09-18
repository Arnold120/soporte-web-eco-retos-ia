import { useState } from 'react';
import { Avatar } from './ui.jsx';
import Icon from './Icons.jsx';
import Markdown from './Markdown.jsx';
import { fmtFecha } from '../utils/format.js';
import { TIPO_REMITENTE } from '../utils/states.js';
import { resolverUrlArchivo, esVideoUrl } from '../utils/mediaUrl.js';

function esVideo(a) {
  return a.tipo === 'video' || esVideoUrl(a.url);
}

function Adjuntos({ adjuntos = [] }) {
  const [ver, setVer] = useState(null);
  const [rotos, setRotos] = useState({});
  if (!adjuntos?.length) return null;

  const actual = ver !== null ? adjuntos[ver] : null;
  const urlActual = actual ? resolverUrlArchivo(actual.url) : '';

  return (
    <div className="attach-preview">
      {adjuntos.map((a, i) => (
        <div
          className={`attach-thumb preview-lightbox ${rotos[i] ? 'roto' : ''}`}
          key={i}
          onClick={() => setVer(i)}
          title={a.nombre || 'Evidencia'}
        >
          {esVideo(a) ? (
            <span className="media-thumb-video"><Icon name="play" size={18} /></span>
          ) : a.tipo === 'imagen' || String(a.url).startsWith('data:image') ? (
            rotos[i] ? (
              <span className="media-error-mini"><Icon name="image" size={16} /></span>
            ) : (
              <img src={resolverUrlArchivo(a.url)} alt={a.nombre || ''} onError={() => setRotos((r) => ({ ...r, [i]: true }))} />
            )
          ) : (
            <span><Icon name="paperclip" size={16} /> {a.nombre || 'archivo'}</span>
          )}
        </div>
      ))}

      {actual && (
        <div className="modal-overlay" onClick={() => setVer(null)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
            {esVideo(actual) ? (
              <video
                key={urlActual}
                src={urlActual}
                controls
                autoPlay
                style={{ width: '100%', maxHeight: '72vh', borderRadius: 12, background: '#000' }}
              />
            ) : rotos[ver] ? (
              <div className="media-error">
                <Icon name="image" size={30} />
                <b>El archivo no está disponible</b>
                <span className="small muted">La imagen no pudo cargarse desde el servidor.</span>
                <a className="btn btn-ghost btn-sm" href={urlActual} target="_blank" rel="noopener noreferrer">
                  Abrir enlace directo
                </a>
              </div>
            ) : (
              <img
                key={urlActual}
                src={urlActual}
                alt={actual.nombre || ''}
                style={{ width: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: 12 }}
                onError={() => setRotos((r) => ({ ...r, [ver]: true }))}
              />
            )}
            <div className="modal-actions">
              <span className="muted small ellipsis">
                {actual.nombre} · {actual.tipo}
              </span>
              <a className="btn btn-ghost btn-sm" href={urlActual} target="_blank" rel="noopener noreferrer">
                Tamaño completo
              </a>
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
