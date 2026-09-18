import { useEffect, useState } from 'react';
import { useApp } from '../../store/AppContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { adminsLista, crearAdmin, activarAdmin } from '../../services/supportService.js';
import { Avatar, Pill, Modal, EmptyState, Cargando, ErrorBox } from '../../components/ui.jsx';
import { fmtFecha } from '../../utils/format.js';

export default function AdminAdmins() {
  const { confirmar, verNotif } = useApp();
  const [modal, setModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');

  const { datos, cargando, error, recargar } = useAsync(() => adminsLista(), []);

  useEffect(() => {
    document.addEventListener('er.ui:refresh', recargar);
    return () => document.removeEventListener('er.ui:refresh', recargar);
  }, [recargar]);

  const guardarNuevo = async () => {
    if (!nombre.trim() || !correo.trim()) {
      verNotif('Completa el nombre y el correo.', 'error');
      return;
    }
    try {
      await crearAdmin({ nombre: nombre.trim(), correo: correo.trim() });
      setNombre('');
      setCorreo('');
      setModal(false);
      verNotif('Administrador agregado.', 'success');
      recargar();
    } catch (e) {
      verNotif(e.message || 'No se pudo agregar (¿correo duplicado?).', 'error');
    }
  };

  const alternar = async (a) => {
    const desactivar = a.estado === 'ACTIVO';
    const ok = await confirmar({
      titulo: desactivar ? 'Desactivar administrador' : 'Activar administrador',
      mensaje: desactivar
        ? `${a.nombre} perderá acceso al panel hasta que se reactive.`
        : `${a.nombre} recuperará acceso al panel de administración.`,
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

  return (
    <div className="stack">
      <div className="between">
        <div>
          <h2>Administradores</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Personas con acceso al panel de moderación y soporte.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nuevo administrador</button>
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
                      <td className="muted small">{fmtFecha(a.ultimaActividad)}</td>
                      <td>
                        <button
                          className={a.estado === 'ACTIVO' ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'}
                          onClick={() => alternar(a)}
                        >
                          {a.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                        </button>
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
            <button className="btn btn-primary" onClick={guardarNuevo}>Agregar</button>
          </>
        }
      >
        <div className="field">
          <label>Nombre de usuario</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="usuario.admin" />
        </div>
        <div className="field">
          <label>Correo</label>
          <input className="input" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="admin@eco-retos.test" />
        </div>
        <p className="small muted">
          En modo demo se crea localmente. Con el backend conectado se usará el endpoint de
          administradores.
        </p>
      </Modal>
    </div>
  );
}
