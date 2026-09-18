import { useEffect, useMemo, useState } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { usePaginacion } from '../../hooks/usePaginacion.js';
import { auditoria } from '../../services/supportService.js';
import { EmptyState, Pill, Cargando, ErrorBox } from '../../components/ui.jsx';
import Icon from '../../components/Icons.jsx';
import Pagination from '../../components/Pagination.jsx';
import { hace, fmtFechaHora } from '../../utils/format.js';
import { exportarCsv } from '../../utils/exportCsv.js';

const COLOR_ACCION = (accion = '') => {
  if (accion.startsWith('RESOLVER') || accion === 'APROBAR_EVIDENCIA') return 'success';
  if (accion.startsWith('ESCALAR') || accion.startsWith('CREAR')) return 'amber';
  if (accion.includes('RECHAZAR') || accion.includes('BLOQUEAR') || accion.includes('DESCARTAR')) return 'error';
  return 'info';
};

const TIPOS = ['SupportCase', 'Denuncia', 'UsuarioReto', 'Usuario'];

export default function AdminAuditoria() {
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState('');
  const [actor, setActor] = useState('');

  const { datos, cargando, error, recargar } = useAsync(() => auditoria(), []);

  useEffect(() => {
    document.addEventListener('er.ui:refresh', recargar);
    return () => document.removeEventListener('er.ui:refresh', recargar);
  }, [recargar]);

  const filtrados = useMemo(() => {
    let lista = datos ?? [];
    if (tipo) lista = lista.filter((r) => r.entidadTipo === tipo);
    if (actor) lista = lista.filter((r) => (r.actor || '').toLowerCase().includes(actor.toLowerCase()));
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      lista = lista.filter(
        (r) =>
          (r.accion || '').toLowerCase().includes(term) ||
          (r.actor || '').toLowerCase().includes(term) ||
          (r.motivo || '').toLowerCase().includes(term) ||
          String(r.entidadId).includes(term),
      );
    }
    return lista;
  }, [datos, q, tipo, actor]);

  const pag = usePaginacion(filtrados, 15);

  const exportar = () => {
    exportarCsv('auditoria', filtrados, [
      { etiqueta: 'Fecha', valor: (r) => fmtFechaHora(r.fecha) },
      { etiqueta: 'Actor', clave: 'actor' },
      { etiqueta: 'Acción', clave: 'accion' },
      { etiqueta: 'Entidad', valor: (r) => `${r.entidadTipo} #${r.entidadId}` },
      { etiqueta: 'Estado anterior', clave: 'estadoAnterior' },
      { etiqueta: 'Estado nuevo', clave: 'estadoNuevo' },
      { etiqueta: 'Motivo', clave: 'motivo' },
    ]);
  };

  return (
    <div className="stack">
      <div className="between">
        <div>
          <h2>Auditoría de acciones</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Registro de las acciones relevantes del soporte (humano e IA).
          </p>
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={recargar} title="Actualizar ahora"><Icon name="refresh" size={16} /></button>
          <button className="btn btn-ghost btn-sm" onClick={exportar} disabled={filtrados.length === 0}>
            <Icon name="download" size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="card card-pad">
        <div className="filter-bar">
          <select className="input" style={{ width: 160 }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todas las entidades</option>
            {TIPOS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <input
            className="input"
            style={{ width: 160 }}
            placeholder="Actor (admin, IA…)"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          />
          <input
            className="input"
            style={{ width: 240, marginLeft: 'auto' }}
            placeholder="Filtrar por acción, motivo o id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {cargando && <Cargando texto="Cargando auditoría…" />}
      <ErrorBox error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div className="card">
          <div className="tbl-wrap">
            {pag.total === 0 ? (
              <EmptyState icono="receipt" titulo="Sin registros" texto="No hay acciones con esos filtros." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Fecha</th><th>Actor</th><th>Acción</th><th>Entidad</th><th>Cambio de estado</th><th>Motivo / detalle</th></tr>
                </thead>
                <tbody>
                  {pag.visibles.map((r) => (
                    <tr key={r.id}>
                      <td className="muted small" title={fmtFechaHora(r.fecha)}>{hace(r.fecha)}</td>
                      <td>
                        <span className={r.actor === 'IA' ? 'chat-src src-ia' : 'chat-src src-admin'}>{r.actor}</span>
                      </td>
                      <td><Pill info={{ etiqueta: r.accion, color: COLOR_ACCION(r.accion) }} /></td>
                      <td className="small">{r.entidadTipo} #{r.entidadId}</td>
                      <td className="small muted">
                        {r.estadoAnterior && <span className="kline">{r.estadoAnterior}</span>}
                        {r.estadoNuevo && (
                          <>
                            <span className="kline"> → </span>
                            <span className="kline">{r.estadoNuevo}</span>
                          </>
                        )}
                      </td>
                      <td className="small">{r.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Pagination pagina={pag.pagina} paginas={pag.paginas} onPagina={pag.setPagina} total={pag.total} porPagina={15} />
        </div>
      )}
    </div>
  );
}
