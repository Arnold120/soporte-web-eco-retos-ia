import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carga datos asíncronos con estado de carga/error y recarga manual.
 * Uso: const { datos, cargando, error, recargar } = useAsync(() => servicio(), [deps]);
 */
export function useAsync(fn, deps = []) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const idRef = useRef(0);

  const ejecutar = useCallback(async () => {
    const id = ++idRef.current;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      const datos = await fn();
      if (id === idRef.current) setEstado({ datos, cargando: false, error: null });
      return datos;
    } catch (error) {
      if (id === idRef.current) setEstado((e) => ({ ...e, cargando: false, error }));
      throw error;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    ejecutar().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejecutar]);

  // La recarga manual nunca lanza: el error queda en `error` para la UI.
  const recargar = useCallback(() => ejecutar().catch(() => {}), [ejecutar]);

  return { ...estado, recargar };
}
