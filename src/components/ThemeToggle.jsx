import { useApp } from '../store/AppContext.jsx';
import Icon from './Icons.jsx';

export default function ThemeToggle({ className = '' }) {
  const { tema, alternarTema } = useApp();
  const oscuro = tema === 'dark';
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-icon ${className}`}
      onClick={alternarTema}
      title={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      aria-label="Cambiar tema"
    >
      <Icon name={oscuro ? 'sun' : 'moon'} size={17} />
    </button>
  );
}
