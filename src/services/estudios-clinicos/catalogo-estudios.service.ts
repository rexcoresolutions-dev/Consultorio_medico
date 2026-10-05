import axiosInstance from '../../api/axios.config';

export type CatalogoEstudio = {
  id?: number;
  clave: string;
  nombre: string;
  personalizado?: boolean;
};

const unwrap = (response: any) => response?.data?.data ?? response?.data ?? response;

export const catalogoEstudiosService = {
  async list(): Promise<CatalogoEstudio[]> {
    const response = await axiosInstance.get('/catalogo-estudios');
    return unwrap(response) ?? [];
  },
  async create(input: Pick<CatalogoEstudio, 'clave' | 'nombre'>): Promise<CatalogoEstudio> {
    const response = await axiosInstance.post('/catalogo-estudios', input);
    return unwrap(response);
  },
};
