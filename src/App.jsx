import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from './store/AppContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import TerminosPage from './pages/chat/TerminosPage.jsx';
import ChatNuevoPage from './pages/chat/ChatNuevoPage.jsx';
import ChatCasoPage from './pages/chat/ChatCasoPage.jsx';
import MisCasosPage from './pages/chat/MisCasosPage.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminCasos from './pages/admin/AdminCasos.jsx';
import AdminCasoDetail from './pages/admin/AdminCasoDetail.jsx';
import AdminReportes from './pages/admin/AdminReportes.jsx';
import AdminEvidencias from './pages/admin/AdminEvidencias.jsx';
import AdminAdmins from './pages/admin/AdminAdmins.jsx';
import AdminAuditoria from './pages/admin/AdminAuditoria.jsx';
import AdminConfig from './pages/admin/AdminConfig.jsx';
import Toast from './components/Toast.jsx';

function RequireAuth({ children }) {
  const { sesion } = useApp();
  return sesion ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const { sesion, esAdmin } = useApp();
  if (!sesion) return <Navigate to="/login" replace />;
  return esAdmin ? children : <Navigate to="/soporte" replace />;
}

/** Redirigir por rol tras el login. */
function Home() {
  const { esAdmin } = useApp();
  return esAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/soporte" replace />;
}

export default function App() {
  const { sesion } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Si la sesión se cierra, volver al login.
  useEffect(() => {
    if (!sesion && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [sesion, location.pathname, navigate]);

  return (
    <>
      <Toast />
      <Routes>
        <Route path="/login" element={sesion ? <Home /> : <LoginPage />} />
        <Route path="/" element={<Home />} />

        {/* Zona de soporte (usuario) */}
        <Route
          path="/soporte"
          element={
            <RequireAuth>
              <ChatNuevoPage />
            </RequireAuth>
          }
        />
        <Route
          path="/soporte/terminos"
          element={
            <RequireAuth>
              <TerminosPage />
            </RequireAuth>
          }
        />
        <Route
          path="/soporte/casos"
          element={
            <RequireAuth>
              <MisCasosPage />
            </RequireAuth>
          }
        />
        <Route
          path="/soporte/casos/:id"
          element={
            <RequireAuth>
              <ChatCasoPage />
            </RequireAuth>
          }
        />

        {/* Panel de administración */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="casos" element={<AdminCasos />} />
          <Route path="casos/:id" element={<AdminCasoDetail />} />
          <Route path="reportes" element={<AdminReportes />} />
          <Route path="evidencias" element={<AdminEvidencias />} />
          <Route path="administradores" element={<AdminAdmins />} />
          <Route path="auditoria" element={<AdminAuditoria />} />
          <Route path="configuracion" element={<AdminConfig />} />
        </Route>

        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}