import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { casosMios } from '../../services/supportService.js';
import { Avatar, Pill, Cargando, ErrorBox } from '../../components/ui.jsx';
import Icon from '../../components/Icons.jsx';
import NotifBell from '../../components/NotifBell.jsx';
import ThemeToggle from '../../components/ThemeToggle.jsx';
import { infoCaso, CATEGORIA_CASO } from '../../utils/states.js';
import { fmtFecha, hace } from '../../utils/format.js';

const categorias = [
  [CATEGORIA_CASO.RETO, 'Retos y evidencias', 'star'],
  [CATEGORIA_CASO.CONTENIDO, 'Reportar contenido', 'flag'],
  [CATEGORIA_CASO.CUENTA, 'Cuenta y acceso', 'user'],
  [CATEGORIA_CASO.MONEDERO, 'Monedas / monedero', 'receipt'],
  [CATEGORIA_CASO.OTRO, 'Otro problema', 'info'],
];

const frecuentes = [
  { icono: 'image', titulo: 'No puedo subir mi evidencia', texto: 'Me sale un error al enviar la foto de mi reto.' },
  { icono: 'receipt', titulo: 'No me llegan las monedas', texto: 'Completé un reto y no se sumaron las monedas a mi monedero.' },
  { icono: 'flag', titulo: 'Reportar contenido', texto: 'Vi una publicación inapropiada en el muro comunitario.' },
  { icono: 'lock', titulo: 'Problema con mi cuenta', texto: 'No puedo iniciar sesión o cambiar mi correo.' },
];

export default function ChatNuevoPage() {
  const { sesion, salir, verNotif } = useApp();
  const navigate = useNavigate();
  const [categoria, setCategoria] = useState(CATEGORIA_CASO.RETO);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const { datos: historial, cargando, error, recargar } = useAsync(
    () => casosMios(sesion.usuario.id),
    [sesion.usuario.id],
  );

  const continuar = (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      verNotif('Escribe un resumen del problema (título).', 'error');
      return;
    }
    if (!descripcion.trim()) {
      verNotif('Describe brevemente qué ocurre.', 'error');
      return;
    }
    navigate('/soporte/terminos', {
      state: { borrador: { titulo: titulo.trim(), descripcion: descripcion.trim(), categoria } },
    });
  };

  const prellenar = (f) => {
    setTitulo(f.titulo);
    setDescripcion(f.texto);
    verNotif('Puedes editar el texto antes de continuar.', 'info');
  };

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
          <button className="btn btn-ghost btn-sm solo-desktop" onClick={() => navigate('/soporte/casos')}>
            Mis conversaciones
          </button>
          <Avatar nombre={sesion.usuario.nombreUsuario} size="sm" />
          <span className="solo-desktop">{sesion.usuario.nombreUsuario}</span>
          <button className="btn btn-ghost btn-sm" onClick={salir}>Salir</button>
        </div>
      </header>

      <div className="content">
        <div className="hero card card-pad">
          <h2 style={{ fontSize: 24 }}>¿En qué podemos ayudarte?</h2>
          <p className="hero-sub">
            Cuéntanos el problema. La IA te hará preguntas, pedirá evidencia si hace falta y, si el
            caso es importante, lo escalará a un administrador humano.
          </p>
        </div>

        <div className="detail-grid">
          <form className="card card-pad stack" onSubmit={continuar}>
            <b>Iniciar una nueva conversación</b>

            <div className="field">
              <label>Categoría del problema</label>
              <div className="chips">
                {categorias.map(([val, lbl, icono]) => (
                  <button
                    type="button"
                    key={val}
                    className={`chip ${categoria === val ? 'chip-on' : ''}`}
                    onClick={() => setCategoria(val)}
                  >
                    <Icon name={icono} size={14} /> {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="nuevo-titulo">Resumen del problema</label>
              <input
                id="nuevo-titulo"
                className="input"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. No puedo enviar la evidencia de mi reto"
                maxLength={120}
              />
            </div>

            <div className="field">
              <label htmlFor="nuevo-desc">Cuéntanos qué ocurrió</label>
              <textarea
                id="nuevo-desc"
                className="input"
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe lo que pasa, cuándo ocurrió y qué intentaste…"
                maxLength={600}
              />
            </div>

            <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
              Continuar a los términos
            </button>
          </form>

          <div className="stack">
            <div className="card card-pad">
              <b>Problemas frecuentes</b>
              <div className="stack mt" style={{ gap: 8 }}>
                {frecuentes.map((f) => (
                  <button type="button" key={f.titulo} className="frecuente" onClick={() => prellenar(f)}>
                    <span className="frecuente-ico"><Icon name={f.icono} size={18} /></span>
                    <span style={{ textAlign: 'left' }}>
                      <span className="frecuente-titulo">{f.titulo}</span>
                      <span className="frecuente-sub">{f.texto}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card card-pad">
              <b>¿Cómo funciona?</b>
              <ul className="lista-pasos">
                <li>La conversación se guarda para soporte y seguridad.</li>
                <li>La IA clasifica el problema y te hace preguntas.</li>
                <li>Adjunta fotos o videos cuando te los pida.</li>
                <li>Los casos importantes pasan a un administrador humano.</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <div className="between" style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: 16 }}>Historial de conversaciones</h3>
            {historial?.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/soporte/casos')}>
                Ver todas ({historial.length})
              </button>
            )}
          </div>

          {cargando && <Cargando texto="Cargando conversaciones…" />}
          <ErrorBox error={error} onReintentar={recargar} />

          {historial && historial.length === 0 && (
            <div className="card card-pad">
              <p className="muted small" style={{ margin: 0 }}>
                Aún no tienes conversaciones. Inicia la primera arriba.
              </p>
            </div>
          )}

          <div className="grid-cases">
            {(historial ?? []).slice(0, 4).map((c) => (
              <div
                className="card card-pad case-item"
                key={c.id}
                style={{ border: '1px solid var(--border)' }}
                onClick={() => navigate(`/soporte/casos/${c.id}`)}
              >
                <div style={{ width: '100%' }}>
                  <div className="case-item-title">
                    <span>#{c.id} {c.titulo}</span>
                    <Pill info={infoCaso(c.estado)} />
                  </div>
                  <div className="case-item-sub">
                    <span>{fmtFecha(c.fechaActualizacion)}</span>
                    <span>{hace(c.fechaActualizacion)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
