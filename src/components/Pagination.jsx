export default function Pagination({ pagina, paginas, onPagina, total = 0 }) {
  if (paginas <= 1) {
    return total > 0 ? <div className="paginacion"><span className="small muted">{total} registro(s)</span></div> : null;
  }
  return (
    <div className="paginacion">
      <button className="btn btn-ghost btn-sm" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}>
        ← Anterior
      </button>
      <span className="small muted">
        Página {pagina} de {paginas} · {total} registro(s)
      </span>
      <button className="btn btn-ghost btn-sm" disabled={pagina >= paginas} onClick={() => onPagina(pagina + 1)}>
        Siguiente →
      </button>
    </div>
  );
}
