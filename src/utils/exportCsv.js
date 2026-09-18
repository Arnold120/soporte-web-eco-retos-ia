/** Exportación de tablas a CSV (compatible con Excel: BOM + ';'). */

function celda(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor).replace(/"/g, '""');
  return `"${texto}"`;
}

/**
 * @param {string} nombreArchivo sin extensión
 * @param {Array<object>} filas
 * @param {Array<{clave:string, etiqueta:string}>} columnas
 */
export function exportarCsv(nombreArchivo, filas, columnas) {
  const encabezado = columnas.map((c) => celda(c.etiqueta)).join(';');
  const cuerpo = filas.map((fila) =>
    columnas
      .map((c) => {
        const valor = typeof c.valor === 'function' ? c.valor(fila) : fila[c.clave];
        return celda(valor);
      })
      .join(';'),
  );
  const contenido = `\uFEFF${[encabezado, ...cuerpo].join('\r\n')}`;

  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${nombreArchivo}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
