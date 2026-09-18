import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { iniciarCaso, configuracionSoporte } from '../../services/supportService.js';
import { Cargando } from '../../components/ui.jsx';
import Icon from '../../components/Icons.jsx';

export default function TerminosPage() {
  const { sesion, verNotif } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const borrador = location.state?.borrador ?? null;
  const [acepta, setAcepta] = useState(false);
  const [cargando, setCargando] = useState(false);
  const { datos: config, cargando: cargandoConfig } = useAsync(() => configuracionSoporte(), []);

  const versionTerminos = config?.TerminosVersion ?? config?.terminosVersion ?? 'v1';
  const textoTerminos = config?.TerminosTexto ?? config?.terminosTexto ?? config?.terminosSoporte ?? '';

  const continuar = async () => {
    if (!acepta || !borrador) return;
    setCargando(true);
    try {
      const caso = await iniciarCaso(sesion.usuario, { ...borrador, terminosVersion: versionTerminos });
      verNotif('Conversación iniciada. La IA te atenderá en un momento.', 'success');
      navigate(`/soporte/casos/${caso.id}`, { replace: true });
    } catch (e) {
      verNotif(e.message || 'No se pudo iniciar la conversación.', 'error');
      setCargando(false);
    }
  };

  if (!borrador) {
    return (
      <div className="terms-wrap">
        <div className="terms-box card card-pad">
          <p className="muted small">
            No hay ninguna conversación en preparación. Vuelve al centro de soporte e inicia una.
          </p>
          <button className="btn btn-primary mt" onClick={() => navigate('/soporte')}>
            Volver a soporte
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="terms-wrap">
      <div className="terms-box">
        <div className="card card-pad stack" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 12 }}>
            <span className="logo-badge logo-top"><Icon name="leaf" size={20} /></span>
            <div>
              <h2 style={{ fontSize: 19 }}>Términos del servicio de soporte</h2>
              <p className="muted small" style={{ margin: '2px 0 0' }}>Antes de iniciar la conversación</p>
            </div>
          </div>

          <div className="terms-content">
            {cargandoConfig && <Cargando texto="Cargando términos…" />}
            {config && (
              <>
                <p>{textoTerminos}</p>
                <p>
                  Al continuar aceptas que la información que compartas (mensajes, imágenes y
                  evidencias) podrá ser consultada por el equipo de administración y utilizada
                  exclusivamente para resolver tu problema, mantener la seguridad de la comunidad y
                  generar reportes estadísticos sin datos personales.
                </p>
                <p className="muted small">
                  La IA de soporte no realiza acciones administrativas sobre otros usuarios ni elimina
                  contenido: solo clasifica, atiende y escala los casos a un administrador humano.
                </p>
                <p className="muted small">Versión de los términos: {versionTerminos}</p>
              </>
            )}
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={acepta}
              onChange={(e) => setAcepta(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--primary)', marginTop: 1 }}
            />
            <span>He leído y acepto los términos.</span>
          </label>

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => navigate(-1)} disabled={cargando}>
              Volver
            </button>
            <button className="btn btn-primary" onClick={continuar} disabled={!acepta || cargando || cargandoConfig}>
              {cargando ? 'Preparando…' : 'Aceptar y continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
