import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificacionesDe, marcarLeida, marcarTodasLeidas } from '../services/notificacionesService.js';
import { DEMO_MODE } from '../api/config.js';
import { hace } from '../utils/format.js';

const ICONO = {
  SOPORTE: '💬',
  CASO_ESCALADO: '🚨',
  CASO_ASIGNADO: '👨‍💼',
  CASO_RESUELTO: '✅',
  RETO_APROBADO: '🎉',
  RETO_RECHAZADO: '⚠️',
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
      /* sin conexión: se reintenta al refrescar */
    }
  }, [usuarioId]);

  useEffect(() => {
    cargar();
    document.addEventListener('er.ui:refresh', cargar);
    const timer = DEMO_MODE ? null : setInterval(cargar, 25000);
    return () => {
      document.removeEventListener('er.ui:refresh', cargar);
      if (timer) clearInterval(timer);
    };
  }, [cargar]);

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
    if (n.referenciaTipo === 'CASO' && n.referenciaId) {
      navigate(esAdmin ? `/admin/casos/${n.referenciaId}` : `/soporte/casos/${n.referenciaId}`);
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
        🔔
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
                <span className="notif-ico">{ICONO[n.tipo] ?? '🔔'}</span>
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
