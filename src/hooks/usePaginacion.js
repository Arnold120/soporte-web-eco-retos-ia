import { useEffect, useMemo, useState } from 'react';

/** Paginación en memoria para tablas y listas. */
export function usePaginacion(lista = [], porPagina = 10) {
  const [pagina, setPagina] = useState(1);
  const total = lista.length;
  const paginas = Math.max(1, Math.ceil(total / porPagina));

  useEffect(() => {
    if (pagina > paginas) setPagina(1);
  }, [paginas, pagina]);

  const visibles = useMemo(
    () => lista.slice((pagina - 1) * porPagina, pagina * porPagina),
    [lista, pagina, porPagina],
  );

  return { pagina, setPagina, paginas, visibles, total, porPagina };
}
