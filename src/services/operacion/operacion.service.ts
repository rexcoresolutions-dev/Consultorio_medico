import api from '../../api/axios.config';

export const apiData = async <T>(request: Promise<{ data: { data: T } }>): Promise<T> => (await request).data.data;
export const documentosService = {
  list: (pacienteId?: number) => apiData<any[]>(api.get('/documentos-clinicos', { params: { pacienteId } })),
  create: (tipo: string, pacienteId: number, datos: unknown) => apiData<any>(api.post('/documentos-clinicos', { tipo, pacienteId, datos })),
};
export const farmacoService = {
  get: () => apiData<any>(api.get('/farmacovigilancia/archivo')),
  save: (data: { name: string; type: string; size: number; dataUrl: string }) => apiData<any>(api.put('/farmacovigilancia/archivo', data)),
  remove: () => api.delete('/farmacovigilancia/archivo'),
};
export async function allPages<T>(fetchPage: (page: number) => Promise<{ data: T[]; meta?: { totalPages?: number } }>): Promise<T[]> {
  const first = await fetchPage(1);
  const rows = [...first.data];
  for (let page = 2; page <= (first.meta?.totalPages ?? 1); page++) rows.push(...(await fetchPage(page)).data);
  return rows;
}
