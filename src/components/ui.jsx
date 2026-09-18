import { useState } from 'react';
import { colorDeTexto, iniciales } from '../utils/format.js';
import { resolverUrlArchivo, esVideoUrl } from '../utils/mediaUrl.js';
import Icon from './Icons.jsx';

export function Avatar({ nombre = '?', size, className = '' }) {
  const cls = ['avatar', size === 'sm' && 'sm', size === 'lg' && 'lg', className].filter(Boolean).join(' ');
  return (
    <span className={cls} style={{ background: colorDeTexto(nombre) }}>
      {iniciales(nombre)}
    </span>
  );
}

export function Pill({ info }) {
  if (!info) return null;
  return (
    <span className={`pill c-${info.color}`}>
      <span className="pill-dot" />
      {info.etiqueta}
    </span>
  );
}

export function StatCard({ icono, valor, etiqueta, color = 'slate', onClick }) {
  return (
    <div className={`card stat ${onClick ? 'row-click' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      <span className="stat-ico" style={{ background: `var(--primary-050)`, color: 'var(--primary)' }}>
        {icono}
      </span>
      <div>
        <div className="stat-num">{valor}</div>
        <div className="stat-lbl">{etiqueta}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icono = 'folder', titulo = 'Sin datos', texto = 'No hay elementos que mostrar.' }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        {typeof icono === 'string' ? <Icon name={icono} size={26} /> : icono}
      </div>
      <b>{titulo}</b>
      <p className="muted small">{texto}</p>
    </div>
  );
}

/** Indicador visual de elemento nuevo, sin emojis. */
export function NewBadge({ texto = 'Nuevo' }) {
  return <span className="badge-nuevo">{texto}</span>;
}

/**
 * Miniatura de un adjunto (imagen o video) con manejo de archivos no
 * disponibles. Nunca usa el nombre del archivo como sustituto de la imagen.
 */
export function MiniaturaMedia({ adjunto = {}, onAbrir, size = 92 }) {
  const [rota, setRota] = useState(false);
  const url = resolverUrlArchivo(adjunto.url);
  const video = adjunto.tipo === 'video' || esVideoUrl(url);

  return (
    <button
      type="button"
      className={`media-thumb ${rota ? 'roto' : ''}`}
      style={{ width: size, height: size }}
      onClick={onAbrir}
      title={video ? 'Ver video' : rota ? 'Archivo no disponible' : 'Ampliar imagen'}
    >
      {video ? (
        <span className="media-thumb-video"><Icon name="play" size={Math.max(16, size / 4)} /></span>
      ) : rota ? (
        <span className="media-error-mini" title="Archivo no disponible">
          <Icon name="image" size={Math.max(14, size / 5)} />
        </span>
      ) : (
        <img src={url} alt={adjunto.nombre || 'Evidencia'} loading="lazy" onError={() => setRota(true)} />
      )}
    </button>
  );
}

export function Modal({ abierto, onCerrar, titulo, children, acciones }) {
  if (!abierto) return null;
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {titulo && <div className="modal-head">{titulo}</div>}
        <div className="modal-body">{children}</div>
        {acciones && <div className="modal-actions">{acciones}</div>}
      </div>
    </div>
  );
}

export function Campo({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function BtnLink({ to, children, className = 'btn btn-primary' }) {
  return (
    <a href={to} className={className} style={{ width: '100%', textAlign: 'center' }}>
      {children}
    </a>
  );
}

export function Lightbox({ urls = [], inicial = 0, onCerrar }) {
  const [idx, setIdx] = useState(inicial);
  const [fallo, setFallo] = useState({});
  if (urls.length === 0) return null;

  const actual = urls[idx] ?? {};
  const url = resolverUrlArchivo(actual.url);
  const video = actual.tipo === 'video' || esVideoUrl(url);
  const hayFallo = fallo[idx] === true;

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
        {video ? (
          <video
            key={url}
            src={url}
            controls
            autoPlay
            style={{ width: '100%', maxHeight: '70vh', borderRadius: 12, background: '#000' }}
            onError={() => setFallo((f) => ({ ...f, [idx]: true }))}
          />
        ) : hayFallo ? (
          <div className="media-error">
            <Icon name="image" size={30} />
            <b>El archivo no está disponible</b>
            <span className="small muted">La imagen no pudo cargarse desde el servidor.</span>
            <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noopener noreferrer">
              Abrir enlace directo
            </a>
          </div>
        ) : (
          <img
            key={url}
            src={url}
            alt={actual.nombre || 'Evidencia'}
            style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '12px' }}
            onError={() => setFallo((f) => ({ ...f, [idx]: true }))}
          />
        )}

        <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
          <span className="muted small ellipsis">
            {actual.nombre || 'Evidencia'} · {idx + 1}/{urls.length}
          </span>
          <div className="row">
            {urls.length > 1 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setIdx((i) => (i + 1) % urls.length)}>
                Siguiente
              </button>
            )}
            <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noopener noreferrer">
              Tamaño completo
            </a>
            <button className="btn btn-primary btn-sm" onClick={onCerrar}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="cargando">
      <span className="spinner" />
      <span className="small muted">{texto}</span>
    </div>
  );
}

export function ErrorBox({ error, onReintentar }) {
  if (!error) return null;
  return (
    <div className="card card-pad" style={{ borderColor: 'rgba(198,40,40,.35)', background: 'var(--card)' }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="error-ico"><Icon name="alert" size={22} /></span>
        <div style={{ flex: 1 }}>
          <b>No se pudieron cargar los datos</b>
          <p className="small muted" style={{ margin: '4px 0 10px' }}>
            {error.message || 'Error inesperado.'}
          </p>
          {onReintentar && (
            <button className="btn btn-ghost btn-sm" onClick={onReintentar}>Reintentar</button>
          )}
        </div>
      </div>
    </div>
  );
}