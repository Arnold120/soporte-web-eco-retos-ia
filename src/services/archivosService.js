/**
 * Subida de adjuntos del chat.
 *
 * - MODO REAL: sube el archivo con POST /api/Imagenes (multipart, campo "archivo")
 *   y devuelve { url, tipo, nombre }. El backend ya soporta imágenes (8 MB) y
 *   videos (100 MB).
 * - MODO DEMO: convierte el archivo a data-URL para previsualizarlo sin backend.
 */
import { DEMO_MODE, ENDPOINTS } from '../api/config.js';
import { subirArchivoMultipart } from '../api/httpClient.js';

export const TAMANO_MAX_IMAGEN = 8 * 1024 * 1024;
export const TAMANO_MAX_VIDEO = 100 * 1024 * 1024;

/** Lee un archivo local como data-URL (previsualización en demo). */
export function leerArchivoLocal(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        url: reader.result,
        tipo: file.type.startsWith('image/')
          ? 'imagen'
          : file.type.startsWith('video/')
            ? 'video'
            : 'archivo',
        nombre: file.name,
      });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Valida el archivo según los límites reales del backend. */
export function validarAdjunto(file) {
  const esVideo = file.type.startsWith('video/');
  const max = esVideo ? TAMANO_MAX_VIDEO : TAMANO_MAX_IMAGEN;
  if (file.size > max) {
    throw new Error(
      esVideo
        ? `El video "${file.name}" supera 100 MB.`
        : `La imagen "${file.name}" supera 8 MB.`,
    );
  }
  return esVideo ? 'video' : 'imagen';
}

/** Sube un adjunto y devuelve { url, tipo, nombre } listo para el mensaje. */
export async function subirAdjunto(file) {
  validarAdjunto(file);
  if (DEMO_MODE) return leerArchivoLocal(file);

  const r = await subirArchivoMultipart(ENDPOINTS.imagenes.subir, file);
  const datos = r.data ?? {};
  return {
    url: datos.url ?? datos.Url,
    tipo: (datos.tipo ?? datos.Tipo ?? 'imagen').toLowerCase(),
    nombre: file.name,
  };
}
