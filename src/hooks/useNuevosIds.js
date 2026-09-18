import { useEffect, useRef, useState } from 'react';

/**
 * Detecta los IDs que aparecieron después de la primera carga para
 * resaltarlos visualmente como nuevos. La marca se quita sola.
 */
export function useNuevosIds(lista, { getId = (x) => x?.id, duracionMs = 60000 } = {}) {
  const vistosRef = useRef(null);
  const [nuevos, setNuevos] = useState(() => new Set());

  useEffect(() => {
    if (!lista) return;
    const ids = lista.map(getId).filter((id) => id !== undefined && id !== null);
    if (vistosRef.current === null) {
      vistosRef.current = new Set(ids);
      return;
    }
    const detectados = ids.filter((id) => !vistosRef.current.has(id));
    if (detectados.length === 0) return;

    detectados.forEach((id) => vistosRef.current.add(id));
    setNuevos((s) => {
      const siguiente = new Set(s);
      detectados.forEach((id) => siguiente.add(id));
      return siguiente;
    });

    const temporizador = setTimeout(() => {
      setNuevos((s) => {
        const siguiente = new Set(s);
        detectados.forEach((id) => siguiente.delete(id));
        return siguiente;
      });
    }, duracionMs);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista]);

  return nuevos;
}
