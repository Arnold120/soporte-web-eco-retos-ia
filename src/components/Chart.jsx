/** Gráfico de barras simple en CSS (sin dependencias). */
export function BarChart({ datos = [], color = 'var(--primary)', alto = 130, sufijo = '' }) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <div className="chart" style={{ height: alto + 34 }}>
      {datos.map((d, i) => {
        const altura = Math.round((d.valor / maximo) * alto);
        return (
          <div className="chart-col" key={i} title={`${d.etiqueta}: ${d.valor}${sufijo}`}>
            <span className="chart-valor">{d.valor > 0 ? d.valor : ''}</span>
            <div className="chart-barra" style={{ height: Math.max(altura, d.valor > 0 ? 6 : 2), background: color }} />
            <span className="chart-label">{d.etiqueta}</span>
          </div>
        );
      })}
    </div>
  );
}
