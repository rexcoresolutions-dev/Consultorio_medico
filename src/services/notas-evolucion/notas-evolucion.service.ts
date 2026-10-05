import api from '../../api/axios.config';
import { apiData, allPages } from '../operacion/operacion.service';
export const notasService = {
  create: (data: unknown) => apiData<any>(api.post('/notas-evolucion', data)),
  update: (id: string, data: unknown) => apiData<any>(api.patch('/notas-evolucion/' + id, data)),
  list: (pacienteId?: number) => allPages<any>(page => apiData(api.get('/notas-evolucion', { params: { pacienteId, page, limit: 100 } }))),
  search: (term: string) => apiData<{ results: { id: number; catalogKey: string; nombre: string; text: string }[] }>(api.get('/cie10', { params: { term, limit: 50 } })),
};
