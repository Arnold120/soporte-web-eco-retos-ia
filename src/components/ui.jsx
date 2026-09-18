import { useState } from 'react';
import { colorDeTexto, iniciales } from '../utils/format.js';

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

export function EmptyState({ icono = '📭', titulo = 'Sin datos', texto = 'No hay elementos que mostrar.' }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icono}</div>
      <b>{titulo}</b>
      <p className="muted small">{texto}</p>
    </div>
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
  if (urls.length === 0) return null;
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <img src={urls[idx]?.url} alt={urls[idx]?.nombre || ''} style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '12px' }} />
        <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
          <span className="muted small">
            {urls[idx]?.nombre} · {idx + 1}/{urls.length}
          </span>
          <div className="row">
            {urls.length > 1 && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setIdx((i) => (i + 1) % urls.length)}>Siguiente</button>
              </>
            )}
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
        <span style={{ fontSize: 22 }}>⚠️</span>
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