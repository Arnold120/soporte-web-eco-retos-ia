import { useApp } from '../store/AppContext.jsx';
import Icon from './Icons.jsx';

const ICONO = { info: 'info', success: 'check', error: 'alert', warning: 'alert' };

export default function Toast() {
  const { notif } = useApp();
  if (!notif) return null;
  return (
    <div className={`toast toast-${notif.tipo}`} key={notif.id} role="status" aria-live="polite">
      <span className="toast-ico"><Icon name={ICONO[notif.tipo] ?? 'info'} size={17} /></span>
      <span>{notif.mensaje}</span>
    </div>
  );
}
