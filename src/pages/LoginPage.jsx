import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';
import { DEMO_MODE, API_BASE_URL, SUPPORT_NAME } from '../api/config.js';
import ThemeToggle from '../components/ThemeToggle.jsx';

function mensajeDeError(err) {
  if (!err) return 'No se pudo iniciar sesión.';
  if (err.status === 0) {
    return `${err.message} Si estás usando el backend en ngrok, recuerda que debe permitir CORS.`;
  }
  if (err.status === 401) return 'Correo o contraseña incorrectos.';
  if (err.status === 403) return err.message || 'Tu cuenta está inactiva. Contacta con soporte.';
  return err.message || 'No se pudo iniciar sesión.';
}

export default function LoginPage() {
  const { acceder, accederDemo, accederConToken, accederConCodigo, verNotif } = useApp();
  const [params] = useSearchParams();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const autoHecho = useRef(false);

  /* SSO desde la app: ?codigo= (un solo uso, recomendado) o ?token=JWT (respaldo).
     El parámetro se elimina de la URL inmediatamente para no dejarlo en el historial. */
  useEffect(() => {
    const codigo = params.get('codigo');
    const token = params.get('token');
    if ((!codigo && !token) || autoHecho.current) return;
    autoHecho.current = true;
    try {
      window.history.replaceState({}, '', window.location.pathname);
    } catch {
      /* entorno sin history */
    }
    (async () => {
      setCargando(true);
      try {
        if (codigo) {
          const s = await accederConCodigo(codigo);
          if (s) verNotif(`Bienvenido(a), ${s.usuario.nombreUsuario}`, 'success');
          else setError('El código expiró o ya fue usado. Inicia sesión manualmente.');
        } else {
          const s = await accederConToken(token);
          if (s) verNotif(`Bienvenido(a), ${s.usuario.nombreUsuario}`, 'success');
          else setError('El enlace de acceso expiró o no es válido. Inicia sesión manualmente.');
        }
      } catch (e) {
        setError(mensajeDeError(e));
      } finally {
        setCargando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!correo.trim() || !contrasena) {
      setError('Escribe tu correo y contraseña.');
      return;
    }
    setCargando(true);
    try {
      await acceder(correo, contrasena);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  };

  const demo = async (tipo) => {
    setError('');
    setCargando(true);
    try {
      await accederDemo(tipo);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-brand">
        <div>
          <div className="row" style={{ gap: 10 }}>
            <span className="logo-badge logo-login">☘</span>
            <div>
              <b>Eco-Retos</b>
              <div className="small" style={{ color: '#cde9cd' }}>{SUPPORT_NAME}</div>
            </div>
          </div>
          <h1 style={{ marginTop: 54 }}>Pequeñas acciones, grandes cambios.</h1>
          <p>
            Centro de atención asistido por IA: reporta problemas, adjunta evidencias y habla
            con un administrador cuando sea necesario.
          </p>
          <ul className="auth-features">
            <li>🤖 Respuestas inmediatas de la IA</li>
            <li>📎 Envía imágenes y videos como evidencia</li>
            <li>🛡️ Escalamiento a un administrador humano</li>
          </ul>
        </div>
        <div className="small" style={{ color: '#cde9cd' }}>
          {DEMO_MODE ? 'MODO DEMOSTRACIÓN · datos locales' : `Conectado a ${API_BASE_URL || 'la API'}`}
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-box">
          <div className="between" style={{ marginBottom: 6 }}>
            <h2 style={{ fontSize: 22 }}>Bienvenido(a)</h2>
            <ThemeToggle />
          </div>
          <p className="muted small" style={{ marginTop: 0 }}>
            Inicia sesión para continuar con soporte.
          </p>

          {error && (
            <div className="alert-error" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={enviar} className="stack">
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="login-correo">Correo</label>
              <input
                id="login-correo"
                className="input"
                type="email"
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tucorreo@eco-retos.test"
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="login-pass">Contraseña</label>
              <div className="input-pass">
                <input
                  id="login-pass"
                  className="input"
                  type={verPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="pass-toggle"
                  onClick={() => setVerPass((v) => !v)}
                  aria-label={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {verPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button className="btn btn-primary" disabled={cargando} style={{ width: '100%', marginTop: 6 }}>
              {cargando ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="between" style={{ margin: '20px 0 8px' }}>
            <span className="small muted">o entra directo como:</span>
          </div>
          <div className="stack">
            <button className="btn btn-ghost" onClick={() => demo('ESTUDIANTE')} disabled={cargando}>
              👤 Estudiante demo (maria.lopez)
            </button>
            <button className="btn btn-ghost" onClick={() => demo('ADMIN')} disabled={cargando}>
              🛡️ Administrador demo (admin)
            </button>
          </div>
          {DEMO_MODE ? (
            <p className="small muted mt" style={{ textAlign: 'center' }}>
              Admin de referencia: <b>admin@gmai.com</b> / <b>admin123</b> · rol ADMIN
            </p>
          ) : (
            <p className="small muted mt" style={{ textAlign: 'center' }}>
              Usa tu cuenta de Eco-Retos. El mismo usuario y contraseña de la app.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
