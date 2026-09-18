import { Fragment } from 'react';

/**
 * Mini-render de markdown seguro (sin dangerouslySetInnerHTML).
 * Soporta: **negrita**, *cursiva*, `código`, [texto](url), URLs y listas.
 */
function inline(texto, keyBase) {
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+)/g;
  const partes = String(texto).split(regex).filter((p) => p !== '');
  return partes.map((p, i) => {
    const key = `${keyBase}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={key}>{p.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(p)) return <em key={key}>{p.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(p)) return <code key={key}>{p.slice(1, -1)}</code>;
    const enlace = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (enlace) {
      return (
        <a key={key} href={enlace[2]} target="_blank" rel="noreferrer">
          {enlace[1]}
        </a>
      );
    }
    if (/^https?:\/\//.test(p)) {
      return (
        <a key={key} href={p} target="_blank" rel="noreferrer">
          {p}
        </a>
      );
    }
    return <Fragment key={key}>{p}</Fragment>;
  });
}

export default function Markdown({ texto = '' }) {
  const bloques = [];
  let lista = null;

  const cerrarLista = () => {
    if (lista) {
      bloques.push(lista);
      lista = null;
    }
  };

  String(texto)
    .split('\n')
    .forEach((linea) => {
      const ul = linea.match(/^\s*[-*]\s+(.*)$/);
      const ol = linea.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ul) {
        if (!lista || lista.tipo !== 'ul') {
          cerrarLista();
          lista = { tipo: 'ul', items: [] };
        }
        lista.items.push(ul[1]);
        return;
      }
      if (ol) {
        if (!lista || lista.tipo !== 'ol') {
          cerrarLista();
          lista = { tipo: 'ol', items: [] };
        }
        lista.items.push(ol[1]);
        return;
      }
      cerrarLista();
      if (linea.trim() === '') return;
      bloques.push({ tipo: 'p', texto: linea });
    });
  cerrarLista();

  return (
    <div className="md">
      {bloques.map((b, i) => {
        if (b.tipo === 'ul') {
          return (
            <ul key={i}>
              {b.items.map((it, j) => (
                <li key={j}>{inline(it, `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (b.tipo === 'ol') {
          return (
            <ol key={i}>
              {b.items.map((it, j) => (
                <li key={j}>{inline(it, `${i}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        return <p key={i}>{inline(b.texto, i)}</p>;
      })}
    </div>
  );
}
