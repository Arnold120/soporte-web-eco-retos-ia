import { useApp } from '../store/AppContext.jsx';

const ICONO = { info: 'ℹ️', success: '✅', error: '⛔', warning: '⚠️' };

export default function Toast() {
  const { notif } = useApp();
  if (!notif) return null;
  return (
    <div className={`toast toast-${notif.tipo}`} key={notif.id} role="status" aria-live="polite">
      <span className="toast-ico">{ICONO[notif.tipo] ?? 'ℹ️'}</span>
      <span>{notif.mensaje}</span>
    </div>
  );
}
