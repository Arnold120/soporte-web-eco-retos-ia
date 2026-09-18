import { useApp } from '../store/AppContext.jsx';

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
      {oscuro ? '☀️' : '🌙'}
    </button>
  );
}
