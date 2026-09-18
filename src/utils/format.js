/** Utilidades de formato (fechas, relativo, monedas, ids). */

export function fmtFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function fmtFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function hace(iso) {
  if (!iso) return '—';
  const dif = Date.now() - new Date(iso).getTime();
  const min = Math.floor(dif / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 30) return `hace ${dias} d`;
  return fmtFecha(iso);
}

let seq = 1000;
export function nextId() {
  seq += 1;
  return seq;
}

/** Placeholder de imagen offline: SVG con color e inicial. */
export function placeholderImg(texto = 'Evidencia', color = '#2E7D32') {
  const textoFinal = String(texto).slice(0, 2).toUpperCase();
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='${color}'/>` +
      `<text x='50%' y='50%' font-family='Arial' font-size='90' fill='white' text-anchor='middle' dominant-baseline='middle'>${textoFinal}</text></svg>`,
  )}`;
}

export function iniciales(nombre = '?') {
  const partes = String(nombre).trim().split(/\s+/);
  return (partes[0]?.[0] ?? '?') + (partes[1]?.[0] ?? '').toUpperCase();
}

export function colorDeTexto(texto = 'A') {
  const paleta = ['#2E7D32', '#00695C', '#283593', '#6A1B9A', '#B71C1C', '#006064', '#4E342E', '#37474F'];
  let suma = 0;
  for (let i = 0; i < texto.length; i += 1) suma += texto.charCodeAt(i);
  return paleta[suma % paleta.length];
}