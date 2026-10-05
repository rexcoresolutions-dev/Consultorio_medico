import { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { notasService } from '../services/notas-evolucion/notas-evolucion.service';

export function useCie10Catalog() {
  const [term, setTerm] = useState('');
  const [catalogo, setCatalogo] = useState<{ clave: string; nombre: string; diagnostico: string }[]>([]);
  const sequence = useRef(0);
  useEffect(() => {
    const current = ++sequence.current;
    const timer = window.setTimeout(() => {
      notasService.search(term).then(result => {
        if (current === sequence.current) setCatalogo(result.results.map(d => ({ clave: d.catalogKey, nombre: d.nombre, diagnostico: d.nombre })));
      }).catch(() => { if (current === sequence.current) message.error('No se pudo cargar el catálogo CIE-10.'); });
    }, 300);
    return () => { window.clearTimeout(timer); sequence.current++; };
  }, [term]);
  return { catalogo, buscar: setTerm };
}
