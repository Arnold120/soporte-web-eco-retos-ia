import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  login,
  cerrarSesion,
  entrarDemo,
  sesionGuardada,
  loginConToken,
  loginConCodigo,
} from '../services/authService.js';
import { Modal } from '../components/ui.jsx';

const AppContext = createContext(null);
const TEMA_KEY = 'er_tema';

export function AppProvider({ children }) {
  const [sesion, setSesion] = useState(() => sesionGuardada());
  const [notif, setNotif] = useState(null);
  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem(TEMA_KEY) || 'light';
    } catch {
      return 'light';
    }
  });
  const [confirmacion, setConfirmacion] = useState(null);
  const notifTimer = useRef(null);

  /* Tema claro/oscuro persistente. */
  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try {
      localStorage.setItem(TEMA_KEY, tema);
    } catch {
      /* almacenamiento no disponible */
    }
  }, [tema]);

  const alternarTema = useCallback(() => {
    setTema((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  const verNotif = useCallback((mensaje, tipo = 'info') => {
    clearTimeout(notifTimer.current);
    setNotif({ mensaje, tipo, id: Date.now() });
    notifTimer.current = setTimeout(() => setNotif(null), 4200);
  }, []);

  /* Eventos globales: refresco de datos, sesión expirada y multi-pestaña. */
  useEffect(() => {
    const onDb = () => document.dispatchEvent(new Event('er.ui:refresh'));
    const onExpired = () => {
      cerrarSesion();
      setSesion(null);
      verNotif('Tu sesión expiró. Inicia sesión de nuevo.', 'error');
    };
    const onStorage = (e) => {
      if (e.key === null || e.key === 'er_sesion_v1') setSesion(sesionGuardada());
      if (e.key === null || String(e.key).startsWith('er_soporte_db')) {
        document.dispatchEvent(new Event('er.ui:refresh'));
      }
    };
    window.addEventListener('er.db:change', onDb);
    window.addEventListener('er.session:expired', onExpired);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('er.db:change', onDb);
      window.removeEventListener('er.session:expired', onExpired);
      window.removeEventListener('storage', onStorage);
    };
  }, [verNotif]);

  const acceder = useCallback(async (correo, contrasena) => {
    const s = await login({ correo, contrasena });
    setSesion(s);
    return s;
  }, []);

  const accederDemo = useCallback(async (tipo) => {
    const s = await entrarDemo(tipo);
    setSesion(s);
    return s;
  }, []);

  const accederConToken = useCallback(async (token) => {
    const s = await loginConToken(token);
    if (s) setSesion(s);
    return s;
  }, []);

  const accederConCodigo = useCallback(async (codigo) => {
    const s = await loginConCodigo(codigo);
    if (s) setSesion(s);
    return s;
  }, []);

  const salir = useCallback(() => {
    cerrarSesion();
    setSesion(null);
  }, []);

  /** Muestra un diálogo de confirmación y resuelve true/false. */
  const confirmar = useCallback((opciones = {}) => {
    return new Promise((resolve) => {
      setConfirmacion({
        titulo: '¿Estás seguro?',
        mensaje: '',
        textoBoton: 'Confirmar',
        peligro: false,
        ...opciones,
        resolver: resolve,
      });
    });
  }, []);

  const responderConfirmacion = (valor) => {
    confirmacion?.resolver?.(valor);
    setConfirmacion(null);
  };

  const esAdmin = useMemo(
    () => sesion?.usuario?.roles?.includes('ADMIN') ?? false,
    [sesion],
  );

  const value = useMemo(
    () => ({
      sesion,
      esAdmin,
      acceder,
      accederDemo,
      accederConToken,
      accederConCodigo,
      salir,
      notif,
      verNotif,
      tema,
      alternarTema,
      confirmar,
    }),
    [sesion, esAdmin, acceder, accederDemo, accederConToken, accederConCodigo, salir, notif, verNotif, tema, alternarTema, confirmar],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <Modal
        abierto={!!confirmacion}
        onCerrar={() => responderConfirmacion(false)}
        titulo={confirmacion?.titulo}
        acciones={
          <>
            <button className="btn btn-ghost" onClick={() => responderConfirmacion(false)}>
              Cancelar
            </button>
            <button
              className={`btn ${confirmacion?.peligro ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => responderConfirmacion(true)}
            >
              {confirmacion?.textoBoton}
            </button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-2)' }}>{confirmacion?.mensaje}</p>
      </Modal>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider');
  return ctx;
}
