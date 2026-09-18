import { useEffect, useState } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { adminsLista, crearAdmin, activarAdmin, quitarAdmin } from '../../services/supportService.js';
import { DEMO_MODE } from '../../api/config.js';
import { Avatar, Pill, Modal, EmptyState, Cargando, ErrorBox } from '../../components/ui.jsx';
import { fmtFecha } from '../../utils/format.js';

export default function AdminAdmins() {
  const { sesion, confirmar, verNotif } = useApp();
  const [modal, setModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [creada, setCreada] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const { datos, cargando, error, recargar } = useAsync(() => adminsLista(), []);

  useEffect(() => {
    document.addEventListener('er.ui:refresh', recargar);
    return () => document.removeEventListener('er.ui:refresh', recargar);
  }, [recargar]);

  const guardarNuevo = async () => {
    if (!nombre.trim() && !correo.trim()) {
      verNotif('Completa el correo del nuevo administrador.', 'error');
      return;
    }
    setOcupado(true);
    try {
      const res = await crearAdmin({
        nombre: nombre.trim(),
        correo: correo.trim(),
        contrasena: contrasena.trim() || undefined,
      });
      if (!res?.admin) {
        verNotif('Ese correo ya es administrador o no se pudo crear.', 'error');
        return;
      }
      setModal(false);
      setNombre('');
      setCorreo('');
      setContrasena('');
      setCreada(res);
      verNotif(res.usuarioExistente ? 'Rol ADMIN asignado al usuario existente.' : 'Administrador creado.', 'success');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo agregar (¿correo duplicado?).', 'error');
    } finally {
      setOcupado(false);
    }
  };

  const alternar = async (a) => {
    const desactivar = a.estado === 'ACTIVO';
    const ok = await confirmar({
      titulo: desactivar ? 'Desactivar administrador' : 'Activar administrador',
      mensaje: desactivar
        ? `${a.nombre} no podrá iniciar sesión hasta que se reactive.`
        : `${a.nombre} podrá volver a iniciar sesión.`,
      textoBoton: desactivar ? 'Desactivar' : 'Activar',
      peligro: desactivar,
    });
    if (!ok) return;
    try {
      await activarAdmin(a.id, !desactivar);
      verNotif('Estado actualizado.', 'success');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo actualizar.', 'error');
    }
  };

  const quitar = async (a) => {
    const ok = await confirmar({
      titulo: 'Quitar rol ADMIN',
      mensaje: `${a.nombre} (${a.correo}) dejará de tener acceso al panel administrativo. Su cuenta de usuario se conserva.`,
      textoBoton: 'Quitar ADMIN',
      peligro: true,
    });
    if (!ok) return;
    try {
      await quitarAdmin(a.id);
      verNotif('Rol ADMIN retirado.', 'success');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo quitar el rol.', 'error');
    }
  };

  return (
    <div className="stack">
      <div className="between">
        <div>
          <h2>Administradores</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Usuarios reales de Eco-Retos con rol <b>ADMIN</b> (fuente: backend y base de datos).
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nuevo administrador</button>
      </div>

      <div className="card card-pad">
        <p className="small muted" style={{ margin: 0 }}>
          El acceso al panel siempre lo valida el backend con el JWT y el rol ADMIN. Si a un usuario
          se le quita el rol aquí, pierde el acceso automáticamente (sin recompilar la web).
        </p>
      </div>

      {cargando && <Cargando texto="Cargando administradores…" />}
      <ErrorBox error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div className="card">
          <div className="tbl-wrap">
            {(datos ?? []).length === 0 ? (
              <EmptyState icono="🛡️" titulo="Sin administradores" />
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Admin</th><th>Correo</th><th>Estado</th><th>Alta</th><th>Última actividad</th><th></th></tr>
                </thead>
                <tbody>
                  {(datos ?? []).map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          <Avatar nombre={a.nombre} size="sm" />
                          <b>{a.nombre}</b>
                          {a.id === sesion.usuario.id && <span className="pill c-info">Tú</span>}
                        </div>
                      </td>
                      <td className="small">{a.correo}</td>
                      <td>
                        <Pill
                          info={
                            a.estado === 'ACTIVO'
                              ? { etiqueta: 'Activo', color: 'success' }
                              : { etiqueta: 'Inactivo', color: 'muted' }
                          }
                        />
                      </td>
                      <td className="muted small">{fmtFecha(a.fechaCreacion)}</td>
                      <td className="muted small">{a.ultimaActividad ? fmtFecha(a.ultimaActividad) : '—'}</td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          <button
                            className={a.estado === 'ACTIVO' ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'}
                            onClick={() => alternar(a)}
                          >
                            {a.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                          </button>
                          {a.id !== sesion.usuario.id && (
                            <button className="btn btn-danger-ghost btn-sm" onClick={() => quitar(a)}>
                              Quitar ADMIN
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <Modal
        abierto={modal}
        onCerrar={() => setModal(false)}
        titulo="Nuevo administrador"
        acciones={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={guardarNuevo} disabled={ocupado}>
              {ocupado ? 'Guardando…' : 'Agregar'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Correo del usuario</label>
          <input
            className="input"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="admin@eco-retos.test"
          />
        </div>
        <div className="field">
          <label>Nombre de usuario (si es nuevo)</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="usuario.admin" />
        </div>
        <div className="field">
          <label>Contraseña temporal (opcional)</label>
          <input
            className="input"
            type="text"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="Si se deja vacío, el backend genera una"
          />
        </div>
        <p className="small muted">
          Si el usuario ya existe, solo se le asigna el rol ADMIN. Si no existe, se crea la cuenta
          completa (perfil, progreso, jardín y monedero) y se le asigna ADMIN. Toda acción queda en auditoría.
        </p>
      </Modal>

      <Modal
        abierto={!!creada}
        onCerrar={() => setCreada(null)}
        titulo="Administrador registrado"
        acciones={<button className="btn btn-primary" onClick={() => setCreada(null)}>Entendido</button>}
      >
        <p className="small" style={{ marginTop: 0 }}>
          {creada?.usuarioExistente
            ? 'Se asignó el rol ADMIN al usuario existente.'
            : 'Se creó la cuenta y se asignó el rol ADMIN.'}
        </p>
        {creada?.contrasenaTemporal && (
          <div className="card card-pad" style={{ background: 'var(--card-2)' }}>
            <b className="small">Contraseña temporal (cópiala ahora)</b>
            <p style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 18, margin: '8px 0 0' }}>
              {creada.contrasenaTemporal}
            </p>
          </div>
        )}
        {DEMO_MODE && <p className="small muted">En modo demo no se crean credenciales reales.</p>}
      </Modal>
    </div>
  );
}
