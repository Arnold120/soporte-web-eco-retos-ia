import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificacionesDe, marcarLeida, marcarTodasLeidas } from '../services/notificacionesService.js';
import { usePolling } from '../hooks/usePolling.js';
import Icon from './Icons.jsx';
import { hace } from '../utils/format.js';

const ICONO = {
  SOPORTE: 'chat',
  CASO_ESCALADO: 'alert',
  CASO_ASIGNADO: 'user',
  CASO_RESUELTO: 'check',
  RETO_APROBADO: 'check',
  RETO_RECHAZADO: 'alert',
  NUEVO_REPORTE: 'flag',
  CONTENIDO: 'shield',
  PUBLICACION: 'image',
  COMENTARIO: 'chat',
};

export default function NotifBell({ usuarioId, esAdmin = false }) {
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  const cajaRef = useRef(null);

  const cargar = useCallback(async () => {
    try {
      setItems(await notificacionesDe(usuarioId));
    } catch {
      /* sin conexión: se reintenta en el siguiente sondeo */
    }
  }, [usuarioId]);

  useEffect(() => {
    document.addEventListener('er.ui:refresh', cargar);
    return () => document.removeEventListener('er.ui:refresh', cargar);
  }, [cargar]);

  /* Sondeo propio de notificaciones (20 s), pausado en segundo plano.
     La primera consulta la realiza el propio hook al montar. */
  usePolling(cargar, { intervaloMs: 20000 });

  useEffect(() => {
    const fuera = (e) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const noLeidas = items.filter((n) => !n.leida).length;

  const marcarTodas = async () => {
    await marcarTodasLeidas(usuarioId);
    cargar();
  };

  const abrirItem = async (n) => {
    if (!n.leida) await marcarLeida(n.id, usuarioId);
    setAbierto(false);
    cargar();

    const tipo = String(n.referenciaTipo ?? '').toUpperCase();
    const id = n.referenciaId;
    if (!id) return;
    if (tipo === 'SUPPORTCASE' || tipo === 'CASO') {
      navigate(esAdmin ? `/admin/casos/${id}` : `/soporte/casos/${id}`);
    } else if (tipo === 'REPORTE') {
      navigate(esAdmin ? '/admin/reportes' : '/soporte');
    } else if (tipo === 'PUBLICACION') {
      navigate(esAdmin ? '/admin/reportes' : '/soporte');
    } else if (tipo === 'USUARIO_RETO') {
      navigate(esAdmin ? '/admin/evidencias' : '/soporte');
    }
  };

  return (
    <div className="notif-wrap" ref={cajaRef}>
      <button
        type="button"
        className="btn btn-ghost btn-icon notif-btn"
        onClick={() => setAbierto((v) => !v)}
        aria-label={`Notificaciones${noLeidas ? ` (${noLeidas} sin leer)` : ''}`}
      >
        <Icon name="bell" size={18} />
        {noLeidas > 0 && <span className="notif-badge">{noLeidas > 9 ? '9+' : noLeidas}</span>}
      </button>

      {abierto && (
        <div className="notif-panel card">
          <div className="notif-head">
            <b>Notificaciones</b>
            {noLeidas > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={marcarTodas}>
                Marcar leídas
              </button>
            )}
          </div>
          <div className="notif-list">
            {items.length === 0 && <p className="small muted" style={{ padding: 14, margin: 0 }}>Sin notificaciones.</p>}
            {items.slice(0, 12).map((n) => (
              <button
                type="button"
                key={n.id}
                className={`notif-item ${n.leida ? '' : 'no-leida'}`}
                onClick={() => abrirItem(n)}
              >
                <span className="notif-ico"><Icon name={ICONO[n.tipo] ?? 'bell'} size={16} /></span>
                <span style={{ minWidth: 0, textAlign: 'left' }}>
                  <span className="notif-titulo">{n.titulo}</span>
                  <span className="notif-msg">{n.mensaje}</span>
                  <span className="notif-fecha">{hace(n.fecha)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
