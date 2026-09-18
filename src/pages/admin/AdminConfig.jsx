import { useState } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { configuracionSoporte, guardarConfiguracion } from '../../services/supportService.js';
import { resetDb } from '../../api/mockDb.js';
import { DEMO_MODE, API_BASE_URL, IS_NGROK, AUTH_BASE } from '../../api/config.js';
import { Cargando, ErrorBox } from '../../components/ui.jsx';
import Icon from '../../components/Icons.jsx';

export default function AdminConfig() {
  const { sesion, verNotif, confirmar } = useApp();
  const { datos, cargando, error, recargar } = useAsync(() => configuracionSoporte(), []);
  const [terminos, setTerminos] = useState(null);
  const [advertencia, setAdvertencia] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [prueba, setPrueba] = useState(null);
  const [probando, setProbando] = useState(false);

  const cfg = datos ?? {};
  const valorTerminos = terminos ?? cfg.TerminosTexto ?? cfg.terminosTexto ?? cfg.terminosSoporte ?? '';
  const valorAdvertencia = advertencia ?? cfg.AdvertenciaContenido ?? cfg.advertenciaContenido ?? '';

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarConfiguracion({
        TerminosTexto: valorTerminos.trim(),
        AdvertenciaContenido: valorAdvertencia.trim(),
        TerminosVersion: cfg.TerminosVersion ?? cfg.terminosVersion ?? 'v1',
      });
      verNotif('Configuración guardada.', 'success');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo guardar.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const reiniciar = async () => {
    const ok = await confirmar({
      titulo: 'Restablecer datos demo',
      mensaje: 'Se borrarán los casos, mensajes y cambios locales. ¿Continuar?',
      textoBoton: 'Restablecer',
      peligro: true,
    });
    if (!ok) return;
    resetDb();
    window.location.reload();
  };

  /** Prueba de conectividad + CORS contra el backend real (sin cerrar sesión). */
  const probarConexion = async () => {
    if (!API_BASE_URL) {
      setPrueba({ ok: false, texto: 'No hay VITE_API_BASE_URL configurada.' });
      return;
    }
    setProbando(true);
    setPrueba(null);
    try {
      const res = await fetch(`${API_BASE_URL}${AUTH_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(IS_NGROK ? { 'ngrok-skip-browser-warning': 'true' } : {}),
        },
        body: JSON.stringify({ correo: 'ping@test.invalid', contrasena: 'ping' }),
      });
      // Cualquier respuesta HTTP (incluido 401/400) demuestra backend + CORS OK.
      if (res.status === 401 || res.status === 400 || res.ok) {
        setPrueba({
          ok: true,
          texto: `Backend accesible y CORS permitido (HTTP ${res.status}). Listo para conectar.`,
        });
      } else {
        setPrueba({ ok: false, texto: `El backend respondió HTTP ${res.status}. Revisa la consola del servidor.` });
      }
    } catch {
      setPrueba({
        ok: false,
        texto:
          'No se pudo alcanzar el backend. Causas típicas: servidor apagado, ngrok caído o CORS no configurado.',
      });
    } finally {
      setProbando(false);
    }
  };

  if (cargando) return <Cargando texto="Cargando configuración…" />;
  if (error) return <ErrorBox error={error} onReintentar={recargar} />;

  return (
    <div className="stack">
      <div>
        <h2>Configuración</h2>
        <p className="muted small" style={{ margin: 0 }}>
          Textos configurables y estado de conexión del soporte.
        </p>
      </div>

      <div className="detail-grid">
        <div className="card card-pad stack">
          <b>Configuración de soporte</b>
          <div className="field">
            <label>Términos del servicio de soporte</label>
            <textarea className="input" rows={4} value={valorTerminos} onChange={(e) => setTerminos(e.target.value)} />
          </div>
          <div className="field">
            <label>Texto de advertencia por contenido inapropiado</label>
            <textarea className="input" rows={4} value={valorAdvertencia} onChange={(e) => setAdvertencia(e.target.value)} />
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        <div className="stack">
          <div className="card card-pad">
            <b>Estado de conexión</b>
            <div className="kgrid mt">
              <div className="kbox">
                <div className="k">Modo</div>
                <div className="v">{DEMO_MODE ? 'DEMO (local)' : 'REAL'}</div>
              </div>
              <div className="kbox">
                <div className="k">API</div>
                <div className="v ellipsis" title={API_BASE_URL || 'sin configurar'}>
                  {API_BASE_URL || 'sin configurar'}
                </div>
              </div>
              <div className="kbox">
                <div className="k">ngrok</div>
                <div className="v">{IS_NGROK ? 'Sí (header automático)' : 'No'}</div>
              </div>
              <div className="kbox">
                <div className="k">Sesión</div>
                <div className="v ellipsis">{sesion?.usuario?.nombreUsuario} · {sesion?.usuario?.roles?.join(', ')}</div>
              </div>
            </div>

            <button className="btn btn-ghost mt" onClick={probarConexion} disabled={probando}>
              <Icon name="plug" size={16} /> {probando ? ' Probando…' : ' Probar conexión con el backend'}
            </button>
            {prueba && (
              <p className={`small mt row ${prueba.ok ? 'texto-ok' : 'texto-error'}`} style={{ marginBottom: 0, gap: 6, alignItems: 'center' }}>
                <Icon name={prueba.ok ? 'check' : 'alert'} size={15} />
                {prueba.texto}
              </p>
            )}
          </div>

          <div className="card card-pad">
            <b>Modo demostración</b>
            <p className="muted small" style={{ lineHeight: 1.6 }}>
              En producción la app funciona con <code>VITE_DEMO_MODE=false</code> y todos los datos
              (casos, reportes, evidencias, notificaciones y administradores) provienen del backend real.
              Los datos demo solo viven en el navegador y no afectan a la base de datos.
            </p>
            <button className="btn btn-danger-ghost" onClick={reiniciar}>Restablecer datos demo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
