import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { casosAdmin } from '../../services/supportService.js';
import { useAsync } from '../../hooks/useAsync.js';
import { usePaginacion } from '../../hooks/usePaginacion.js';
import { Pill, EmptyState, Cargando, ErrorBox } from '../../components/ui.jsx';
import Pagination from '../../components/Pagination.jsx';
import {
  infoCaso,
  infoPrioridad,
  infoCategoria,
  ESTADO_CASO,
  PRIORIDAD,
  CATEGORIA_CASO,
} from '../../utils/states.js';
import { fmtFecha } from '../../utils/format.js';
import { exportarCsv } from '../../utils/exportCsv.js';

const FILTROS_ESTADO = [
  ['Todos', null],
  ['Nuevos', [ESTADO_CASO.NUEVO, ESTADO_CASO.IA_ATENDIENDO]],
  ['Escalados', [ESTADO_CASO.ESCALADO]],
  ['En atención', [ESTADO_CASO.ASIGNADO, ESTADO_CASO.EN_REVISION]],
  ['Resueltos', [ESTADO_CASO.RESUELTO, ESTADO_CASO.RESUELTO_POR_IA]],
  ['Cerrados', [ESTADO_CASO.CERRADO]],
];

export default function AdminCasos() {
  const navigate = useNavigate();
  const [estados, setEstados] = useState(null);
  const [prioridad, setPrioridad] = useState('');
  const [categoria, setCategoria] = useState('');
  const [q, setQ] = useState('');

  const { datos, cargando, error, recargar } = useAsync(
    () => casosAdmin({ estados, prioridad: prioridad || undefined, categoria: categoria || undefined, q }),
    [estados, prioridad, categoria, q],
  );

  useEffect(() => {
    document.addEventListener('er.ui:refresh', recargar);
    return () => document.removeEventListener('er.ui:refresh', recargar);
  }, [recargar]);

  const lista = useMemo(() => datos ?? [], [datos]);
  const pag = usePaginacion(lista, 10);

  const exportar = () => {
    exportarCsv('casos_soporte', lista, [
      { etiqueta: 'ID', clave: 'id' },
      { etiqueta: 'Título', clave: 'titulo' },
      { etiqueta: 'Usuario', clave: 'usuarioNombre' },
      { etiqueta: 'Categoría', clave: 'categoria' },
      { etiqueta: 'Prioridad', clave: 'prioridad' },
      { etiqueta: 'Estado', clave: 'estado' },
      { etiqueta: 'Motivo escalamiento', clave: 'motivoEscalamiento' },
      { etiqueta: 'Creado', valor: (c) => fmtFecha(c.fechaCreacion) },
      { etiqueta: 'Actualizado', valor: (c) => fmtFecha(c.fechaActualizacion) },
    ]);
  };

  return (
    <div className="stack">
      <div className="between">
        <div>
          <h2>Casos</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Conversaciones del soporte con IA y administradores.
          </p>
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={recargar}>↻</button>
          <button className="btn btn-ghost btn-sm" onClick={exportar} disabled={lista.length === 0}>
            ⬇ Exportar CSV
          </button>
        </div>
      </div>

      <div className="card card-pad">
        <div className="filter-bar">
          {FILTROS_ESTADO.map(([lbl, val]) => (
            <button
              key={lbl}
              className={`btn btn-sm ${estados === val ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setEstados(val)}
            >
              {lbl}
            </button>
          ))}
          <select className="input" style={{ width: 145 }} value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
            <option value="">Prioridad</option>
            {Object.values(PRIORIDAD).map((p) => <option key={p} value={p}>{infoPrioridad(p).etiqueta}</option>)}
          </select>
          <select className="input" style={{ width: 150 }} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Categoría</option>
            {Object.values(CATEGORIA_CASO).map((c) => <option key={c} value={c}>{infoCategoria(c).etiqueta}</option>)}
          </select>
          <input
            className="input"
            style={{ width: 220, marginLeft: 'auto' }}
            placeholder="Buscar (id, título, usuario)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {cargando && <Cargando texto="Cargando casos…" />}
      <ErrorBox error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div className="card">
          <div className="tbl-wrap">
            {lista.length === 0 ? (
              <EmptyState icono="🎫" titulo="Sin casos" texto="No hay casos con los filtros actuales." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th><th>Título / problema</th><th>Usuario</th><th>Categoría</th>
                    <th>Prioridad</th><th>Estado</th><th>Admin</th><th>Actualización</th>
                  </tr>
                </thead>
                <tbody>
                  {pag.visibles.map((c) => (
                    <tr className="row-click" key={c.id} onClick={() => navigate(`/admin/casos/${c.id}`)}>
                      <td style={{ fontWeight: 700 }}>#{c.id}</td>
                      <td style={{ maxWidth: 300 }}>
                        <div style={{ fontWeight: 700 }} className="ellipsis">{c.titulo}</div>
                        <div className="small muted">{c.descripcion}</div>
                      </td>
                      <td>{c.usuarioNombre}</td>
                      <td><Pill info={infoCategoria(c.categoria)} /></td>
                      <td><Pill info={infoPrioridad(c.prioridad)} /></td>
                      <td><Pill info={infoCaso(c.estado)} /></td>
                      <td className="small">{c.adminId || c.adminNombre ? (c.adminNombre ?? 'Asignado') : '—'}</td>
                      <td className="muted small">{fmtFecha(c.fechaActualizacion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pagination pagina={pag.pagina} paginas={pag.paginas} onPagina={pag.setPagina} total={pag.total} />
        </div>
      )}
    </div>
  );
}
