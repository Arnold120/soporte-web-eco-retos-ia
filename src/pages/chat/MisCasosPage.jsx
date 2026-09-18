import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { casosMios } from '../../services/supportService.js';
import { Pill, EmptyState, Cargando, ErrorBox } from '../../components/ui.jsx';
import Icon from '../../components/Icons.jsx';
import NotifBell from '../../components/NotifBell.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';
import { infoCaso, ESTADO_CASO } from '../../utils/states.js';
import { fmtFechaHora, hace } from '../../utils/format.js';

const FILTROS = [
  ['Todas', null],
  ['Abiertas', ['NUEVO', 'IA_ATENDIENDO', 'EN_REVISION', 'ESCALADO', 'ASIGNADO']],
  ['Escaladas', ['ESCALADO', 'ASIGNADO']],
  ['Resueltas', [ESTADO_CASO.RESUELTO, ESTADO_CASO.RESUELTO_POR_IA]],
  ['Cerradas', [ESTADO_CASO.CERRADO]],
];

export default function MisCasosPage() {
  const { sesion, salir } = useApp();
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState(null);
  const [q, setQ] = useState('');

  const { datos, cargando, error, recargar } = useAsync(
    () => casosMios(sesion.usuario.id),
    [sesion.usuario.id],
  );

  const casos = useMemo(() => {
    let lista = datos ?? [];
    if (filtro) lista = lista.filter((c) => filtro.includes(c.estado));
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      lista = lista.filter(
        (c) =>
          c.titulo?.toLowerCase().includes(term) ||
          c.descripcion?.toLowerCase().includes(term) ||
          String(c.id).includes(term),
      );
    }
    return lista;
  }, [datos, filtro, q]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="topbar">
        <div className="row" style={{ gap: 10 }}>
          <span className="logo-badge logo-top"><Icon name="leaf" size={20} /></span>
          <div>
            <b>Centro de soporte</b>
            <div className="small muted">Eco-Retos</div>
          </div>
        </div>
        <div className="topbar-user">
          <NotifBell usuarioId={sesion.usuario.id} />
          <ThemeToggle />
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/soporte')}>
            Nueva conversación
          </button>
          <button className="btn btn-ghost btn-sm" onClick={salir}>Salir</button>
        </div>
      </header>

      <div className="content">
        <div className="between" style={{ marginBottom: 16 }}>
          <div>
            <h2>Mi historial de conversaciones</h2>
            <p className="muted small" style={{ margin: 0 }}>
              {datos?.length ?? 0} conversación(es) · sigue el estado en tiempo real.
            </p>
          </div>
        </div>

        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="filter-bar">
            {FILTROS.map(([lbl, val]) => (
              <button
                key={lbl}
                className={`btn btn-sm ${filtro === val ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFiltro(val)}
              >
                {lbl}
              </button>
            ))}
            <input
              className="input"
              style={{ width: 240, marginLeft: 'auto' }}
              placeholder="Buscar conversación…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {cargando && <Cargando texto="Cargando conversaciones…" />}
        <ErrorBox error={error} onReintentar={recargar} />

        {!cargando && !error && casos.length === 0 && (
          <div className="card card-pad">
            <EmptyState
              icono="chat"
              titulo="Sin conversaciones"
              texto={q || filtro ? 'No hay coincidencias con el filtro.' : 'Inicia tu primera conversación de soporte.'}
            />
          </div>
        )}

        <div className="grid-cases">
          {casos.map((c) => (
            <div
              className="card card-pad"
              key={c.id}
              onClick={() => navigate(`/soporte/casos/${c.id}`)}
              role="button"
              style={{ cursor: 'pointer' }}
            >
              <div className="between">
                <b>#{c.id}</b>
                <Pill info={infoCaso(c.estado)} />
              </div>
              <p style={{ fontWeight: 700, margin: '8px 0 4px' }}>{c.titulo}</p>
              <p className="muted small" style={{ margin: 0 }}>{c.descripcion}</p>
              <p className="small muted" style={{ margin: '10px 0 0' }}>
                Última actividad: {fmtFechaHora(c.fechaActualizacion)} · {hace(c.fechaActualizacion)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
