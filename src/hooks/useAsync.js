import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carga datos asíncronos con estado de carga/error y recarga.
 *
 * Importante para la actualización automática: las recargas posteriores son
 * SILENCIOSAS. Mantienen `datos` en pantalla (sin spinner ni desmontaje), de
 * modo que el refresco no destruye el estado del administrador, los filtros ni
 * el caso que está viendo. El indicador está en `actualizando`.
 *
 * Uso: const { datos, cargando, actualizando, error, recargar } = useAsync(fn, [deps]);
 */
export function useAsync(fn, deps = []) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, actualizando: false, error: null });
  const idRef = useRef(0);
  const datosRef = useRef(null);

  const ejecutar = useCallback(async ({ silencioso = true } = {}) => {
    const id = ++idRef.current;
    const hayDatos = datosRef.current !== null;

    if (hayDatos || silencioso) {
      setEstado((e) => ({ ...e, actualizando: true }));
    } else {
      setEstado((e) => ({ ...e, cargando: true, error: null }));
    }

    try {
      const datos = await fn();
      if (id === idRef.current) {
        datosRef.current = datos;
        setEstado({ datos, cargando: false, actualizando: false, error: null });
      }
      return datos;
    } catch (error) {
      if (id === idRef.current) {
        setEstado((e) => ({
          ...e,
          cargando: false,
          actualizando: false,
          error: e.datos === null ? error : e.error,
        }));
      }
      throw error;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    datosRef.current = null;
    ejecutar({ silencioso: false }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejecutar]);

  // La recarga manual nunca lanza: el error queda en `error` para la UI.
  const recargar = useCallback(() => ejecutar({ silencioso: true }).catch(() => {}), [ejecutar]);

  return { ...estado, recargar };
}
