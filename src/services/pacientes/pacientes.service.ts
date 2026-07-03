import axiosInstance from '../../api/axios.config';

export interface PacienteData {
  id?: number;

  sucursal_id?: number;
  sucursalId?: number;

  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;

  fecha_nacimiento?: string;
  sexo?: string;
  tipo_sangre?: string;

  curp?: string;
  curp_generico?: string;
  lugar_origen?: string;
  pais_nacimiento?: string;
  estado_civil?: string;
  escolaridad?: string;
  ocupacion?: string;

  telefono?: string;
  celular?: string;
  correo?: string;

  numero_expediente?: string;

  entidad?: string;
  municipio?: string;
  codigo_postal?: string;
  colonia?: string;
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;

  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

class PacientesService {
  private readonly basePath = '/pacientes';
  private readonly usuariosMePath = '/usuarios/me';

  private normalizeArray(responseData: any): any[] {
    const data =
      responseData?.data?.data ||
      responseData?.data?.items ||
      responseData?.data ||
      responseData?.items ||
      responseData;

    return Array.isArray(data) ? data : [];
  }

  private getResponseData(responseData: any): any {
    return (
      responseData?.data?.data ||
      responseData?.data?.paciente ||
      responseData?.data?.result ||
      responseData?.data ||
      responseData?.paciente ||
      responseData?.result ||
      responseData
    );
  }

  private normalizePaciente(paciente: any): PacienteData {
    return {
      id: paciente?.id,

      sucursal_id: paciente?.sucursal_id ?? paciente?.sucursalId,
      sucursalId: paciente?.sucursalId ?? paciente?.sucursal_id,

      nombre: paciente?.nombre || '',

      primer_apellido:
        paciente?.primer_apellido ||
        paciente?.primerApellido ||
        '',

      segundo_apellido:
        paciente?.segundo_apellido ||
        paciente?.segundoApellido ||
        '',

      fecha_nacimiento:
        paciente?.fecha_nacimiento ||
        paciente?.fechaNacimiento ||
        '',

      sexo: paciente?.sexo || '',

      tipo_sangre:
        paciente?.tipo_sangre ||
        paciente?.tipoSangre ||
        '',

      curp: paciente?.curp || '',

      curp_generico:
        paciente?.curp_generico ||
        paciente?.curpGenerico ||
        '',

      lugar_origen:
        paciente?.lugar_origen ||
        paciente?.lugarOrigen ||
        '',

      pais_nacimiento:
        paciente?.pais_nacimiento ||
        paciente?.paisNacimiento ||
        '',

      estado_civil:
        paciente?.estado_civil ||
        paciente?.estadoCivil ||
        '',

      escolaridad: paciente?.escolaridad || '',
      ocupacion: paciente?.ocupacion || '',

      telefono: paciente?.telefono || '',
      celular: paciente?.celular || '',
      correo: paciente?.correo || '',

      numero_expediente:
        paciente?.numero_expediente ||
        paciente?.numeroExpediente ||
        '',

      entidad: paciente?.entidad || '',
      municipio: paciente?.municipio || '',

      codigo_postal:
        paciente?.codigo_postal ||
        paciente?.codigoPostal ||
        '',

      colonia: paciente?.colonia || '',
      calle: paciente?.calle || '',

      numero_exterior:
        paciente?.numero_exterior ||
        paciente?.numeroExterior ||
        '',

      numero_interior:
        paciente?.numero_interior ||
        paciente?.numeroInterior ||
        '',

      activo: paciente?.activo === true || paciente?.activo === 1,

      created_at: paciente?.created_at || paciente?.createdAt,
      updated_at: paciente?.updated_at || paciente?.updatedAt,
    };
  }

  private async getSucursalIdFromMe(): Promise<number | null> {
    try {
      const response = await axiosInstance.get(this.usuariosMePath);

      const user =
        response.data?.data ||
        response.data?.user ||
        response.data?.usuario ||
        response.data;

      const sucursalId = Number(
        user?.sucursalId ??
          user?.sucursal_id ??
          null,
      );

      return Number.isFinite(sucursalId) && sucursalId > 0
        ? sucursalId
        : null;
    } catch (error) {
      console.error('Error obteniendo sucursal del usuario:', error);
      return null;
    }
  }

  private addField(payload: any, key: string, value: any) {
    if (value === undefined || value === null) return;

    if (typeof value === 'string') {
      const cleanValue = value.trim();

      if (cleanValue !== '') {
        payload[key] = cleanValue;
      }

      return;
    }

    payload[key] = value;
  }

  private buildPayload(data: any): any {
    const payload: any = {};

    const sucursalId = Number(data.sucursal_id ?? data.sucursalId);

    if (Number.isFinite(sucursalId) && sucursalId > 0) {
      payload.sucursalId = sucursalId;
    }

    this.addField(payload, 'nombre', data.nombre);

    this.addField(
      payload,
      'primerApellido',
      data.primer_apellido ?? data.primerApellido,
    );

    this.addField(
      payload,
      'segundoApellido',
      data.segundo_apellido ?? data.segundoApellido,
    );

    this.addField(
      payload,
      'fechaNacimiento',
      data.fecha_nacimiento ?? data.fechaNacimiento,
    );

    this.addField(payload, 'sexo', data.sexo);

    this.addField(
      payload,
      'tipoSangre',
      data.tipo_sangre ?? data.tipoSangre,
    );

    this.addField(
      payload,
      'curp',
      String(data.curp ?? '').trim().toUpperCase(),
    );

    this.addField(
      payload,
      'curpGenerico',
      String(data.curp_generico ?? data.curpGenerico ?? '').trim().toUpperCase(),
    );

    this.addField(
      payload,
      'lugarOrigen',
      data.lugar_origen ?? data.lugarOrigen,
    );

    this.addField(
      payload,
      'paisNacimiento',
      data.pais_nacimiento ?? data.paisNacimiento ?? 'Mexico',
    );

    this.addField(
      payload,
      'estadoCivil',
      data.estado_civil ?? data.estadoCivil,
    );

    this.addField(payload, 'escolaridad', data.escolaridad);
    this.addField(payload, 'ocupacion', data.ocupacion);
    this.addField(payload, 'telefono', data.telefono);
    this.addField(payload, 'celular', data.celular);
    this.addField(payload, 'correo', data.correo);

    this.addField(payload, 'entidad', data.entidad);
    this.addField(payload, 'municipio', data.municipio);

    this.addField(
      payload,
      'codigoPostal',
      data.codigo_postal ?? data.codigoPostal,
    );

    this.addField(payload, 'colonia', data.colonia);
    this.addField(payload, 'calle', data.calle);

    this.addField(
      payload,
      'numeroExterior',
      data.numero_exterior ?? data.numeroExterior,
    );

    this.addField(
      payload,
      'numeroInterior',
      data.numero_interior ?? data.numeroInterior,
    );

    return payload;
  }

  async getPacientes(): Promise<PacienteData[]> {
    const response = await axiosInstance.get(this.basePath, {
      params: {
        page: 1,
        limit: 100,
      },
    });

    const pacientes = this.normalizeArray(response.data);

    return pacientes.map((paciente) => this.normalizePaciente(paciente));
  }

  async getPacienteById(id: number): Promise<PacienteData> {
    const response = await axiosInstance.get(`${this.basePath}/${id}`);

    const paciente = this.getResponseData(response.data);

    return this.normalizePaciente(paciente);
  }

  async createPaciente(data: any): Promise<PacienteData> {
    const sucursalId =
      data.sucursal_id ||
      data.sucursalId ||
      (await this.getSucursalIdFromMe());

    if (!sucursalId) {
      throw new Error('No se pudo obtener la sucursal del usuario');
    }

    const payload = this.buildPayload({
      ...data,
      sucursalId,
    });

    console.log('BODY REAL ENVIADO A /pacientes:', payload);

    const response = await axiosInstance.post(this.basePath, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const paciente = this.getResponseData(response.data);

    return this.normalizePaciente(paciente);
  }

  async updatePaciente(
    id: number,
    data: Partial<PacienteData>,
  ): Promise<PacienteData> {
    const payload = this.buildPayload(data);

    const response = await axiosInstance.patch(
      `${this.basePath}/${id}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const paciente = this.getResponseData(response.data);

    return this.normalizePaciente(paciente);
  }

  async deletePaciente(id: number): Promise<void> {
    await axiosInstance.delete(`${this.basePath}/${id}`);
  }

  async getAuditoriaPaciente(id: number): Promise<any[]> {
    const response = await axiosInstance.get(
      `${this.basePath}/${id}/auditoria`,
    );

    return this.normalizeArray(response.data);
  }
}

export default new PacientesService();