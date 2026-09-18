import { useEffect, useRef } from 'react';

/**
 * Sondeo periódico seguro para el panel administrativo.
 *
 * - No lanza peticiones si la anterior sigue en curso (sin duplicados).
 * - Se pausa cuando la pestaña está en segundo plano.
 * - Reintenta al volver a la pestaña.
 * - Intervalo configurable (por defecto 8 s).
 */
export function usePolling(fn, { intervaloMs = 8000, activo = true } = {}) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!activo) return undefined;
    let cancelado = false;
    let enCurso = false;

    const ejecutar = async () => {
      if (cancelado || enCurso) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      enCurso = true;
      try {
        await fnRef.current();
      } catch {
        /* el sondeo nunca interrumpe al administrador */
      } finally {
        enCurso = false;
      }
    };

    const intervalo = setInterval(ejecutar, Math.max(4000, intervaloMs));
    ejecutar();

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') ejecutar();
    };
    document.addEventListener('visibilitychange', alCambiarVisibilidad);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    };
  }, [activo, intervaloMs]);
}
