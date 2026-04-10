import type {
  Centre,
  ConsultationRecord,
  MobileUser,
  Patient,
  PostOpRecord,
  Role,
  SurgeryRecord,
  VaRecord,
} from '../types';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'https://carereach-data-system-architecture-api-production.up.railway.app/api/v1';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type ApiErrorPayload = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshRequest: Promise<string | null> | null = null;

const roleMapToApi: Record<Role, string> = {
  'Super Admin': 'SUPER_ADMIN',
  Admin: 'ADMIN',
  Doctor: 'DOCTOR',
  Surgeon: 'SURGEON',
  'Scrub Nurse': 'SCRUB_NURSE',
  Anesthetist: 'ANESTHETIST',
  'Data Entry': 'DATA_ENTRY',
};

const roleMapToUi: Record<string, Role> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  DOCTOR: 'Doctor',
  SURGEON: 'Surgeon',
  SCRUB_NURSE: 'Scrub Nurse',
  ANESTHETIST: 'Anesthetist',
  DATA_ENTRY: 'Data Entry',
};

const sexMapToUi: Record<string, 'Male' | 'Female'> = {
  MALE: 'Male',
  FEMALE: 'Female',
};

const disabilityMapToUi: Record<string, 'Physical' | 'Hearing' | 'Visual' | 'Mental' | 'None'> = {
  PHYSICAL: 'Physical',
  HEARING: 'Hearing',
  VISUAL: 'Visual',
  MENTAL: 'Mental',
  NONE: 'None',
};

const eyeMapToUi: Record<string, 'Right' | 'Left' | 'Both'> = {
  RIGHT: 'Right',
  LEFT: 'Left',
  BOTH: 'Both',
};

const stageMapToUi: Record<string, 'Presenting' | 'Unaided' | 'Pinhole' | 'Aided'> = {
  PRESENTING: 'Presenting',
  UNAIDED: 'Unaided',
  PINHOLE: 'Pinhole',
  AIDED: 'Aided',
};

const postOpStageMapToUi: Record<string, 'Day 1' | 'Week 1' | 'Week 5'> = {
  DAY_1: 'Day 1',
  WEEK_1: 'Week 1',
  WEEK_5: 'Week 5',
};

function parseApiError(payload: ApiErrorPayload | null, status: number): string {
  if (!payload) {
    return `Request failed with status ${status}`;
  }
  if (Array.isArray(payload.message)) {
    return payload.message.join(', ');
  }
  return payload.message ?? payload.error ?? `Request failed with status ${status}`;
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshRequest) {
    return refreshRequest;
  }
  if (!refreshToken) {
    return null;
  }

  refreshRequest = (async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearAuthTokens();
      return null;
    }

    const data = (await response.json()) as { accessToken: string; refreshToken?: string };
    accessToken = data.accessToken;
    if (data.refreshToken) {
      refreshToken = data.refreshToken;
    }
    return accessToken;
  })();

  try {
    return await refreshRequest;
  } finally {
    refreshRequest = null;
  }
}

async function apiRequest<T>(
  path: string,
  method: HttpMethod,
  body?: unknown,
  authenticated = true,
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {};
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (authenticated && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401 && authenticated && retry && refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiRequest<T>(path, method, body, authenticated, false);
      }
    }

    const errorPayload = await parseJsonSafe<ApiErrorPayload>(response);
    throw new Error(parseApiError(errorPayload, response.status));
  }

  const json = await parseJsonSafe<T>(response);
  return (json ?? ({} as T)) as T;
}

function mapUser(apiUser: {
  id: string;
  fullName: string;
  email: string;
  role: string;
  centre: Centre;
}): MobileUser {
  return {
    id: apiUser.id,
    name: apiUser.fullName,
    email: apiUser.email,
    role: roleMapToUi[apiUser.role] ?? 'Doctor',
    centre: apiUser.centre,
  };
}

function mapPatient(item: any): Patient {
  return {
    id: item.id,
    patientCode: item.patientCode,
    firstName: item.firstName,
    surname: item.surname,
    age: item.age,
    sex: sexMapToUi[item.sex] ?? 'Male',
    phone: item.phone,
    lgaTown: item.lgaTown,
    state: item.state ?? '',
    outreachCentreName: item.outreachCentreName ?? undefined,
    disabilityType: disabilityMapToUi[item.disabilityType] ?? 'None',
    createdAt: item.createdAt,
    createdBy: item.createdBy?.fullName ?? 'System',
    centreCode: item.centre?.code ?? '',
    centreName: item.centre?.name ?? undefined,
  };
}

function mapVa(item: any): VaRecord {
  return {
    id: item.id,
    patientId: item.patientId,
    stage: stageMapToUi[item.stage] ?? 'Presenting',
    rightEye: item.rightEye,
    leftEye: item.leftEye,
    reasonForPoorVision: item.reasonForPoorVision ?? undefined,
    notes: item.notes ?? undefined,
    recordedAt: item.recordedAt,
    centreCode: item.centre?.code ?? '',
  };
}

function mapConsultation(item: any): ConsultationRecord {
  return {
    id: item.id,
    patientId: item.patientId,
    consultationDate: item.consultationDate,
    healthPractitioner: item.healthPractitioner ?? 'Health Practitioner',
    anteriorSegment: item.anteriorSegment,
    posteriorSegment: item.posteriorSegment,
    surgeryRecommended: Boolean(item.surgeryRecommended),
    centreCode: item.centre?.code ?? '',
  };
}

function mapSurgery(item: any): SurgeryRecord {
  return {
    id: item.id,
    patientId: item.patientId,
    surgeryDate: item.surgeryDate,
    procedureType: item.surgeryType || item.procedureType,
    eyeOperated: eyeMapToUi[item.eyeOperated] ?? 'Right',
    centreCode: item.centre?.code ?? '',
  };
}

function mapPostOp(item: any): PostOpRecord {
  return {
    id: item.id,
    surgeryId: item.surgeryId,
    stage: postOpStageMapToUi[item.stage] ?? 'Day 1',
    followUpDate: item.followUpDate,
    unaidedVA_Right: item.unaidedVARight,
    unaidedVA_Left: item.unaidedVALeft,
    notes: item.notes ?? undefined,
    centreCode: item.centre?.code ?? '',
  };
}

export function setAuthTokens(nextAccessToken: string, nextRefreshToken: string): void {
  accessToken = nextAccessToken;
  refreshToken = nextRefreshToken;
}

export function clearAuthTokens(): void {
  accessToken = null;
  refreshToken = null;
}

export const mobileApi = {
  getBaseUrl: () => API_BASE_URL,

  auth: {
    async getLoginOptions(): Promise<{ signInAs: Role[]; catchmentAreas: Centre[] }> {
      const response = await apiRequest<{ signInAs: string[]; catchmentAreas: Centre[] }>(
        '/auth/login-options',
        'GET',
        undefined,
        false,
      );
      const normalizedRoles = response.signInAs
        .map((item) => {
          if (roleMapToUi[item]) return roleMapToUi[item];
          if (roleMapToApi[item as Role]) return roleMapToUi[roleMapToApi[item as Role]];
          return item as Role;
        })
        .filter((item): item is Role =>
          ['Super Admin', 'Admin', 'Doctor', 'Surgeon', 'Scrub Nurse', 'Anesthetist', 'Data Entry'].includes(item),
        );
      return {
        signInAs: normalizedRoles,
        catchmentAreas: response.catchmentAreas,
      };
    },

    async login(payload: {
      email: string;
      password: string;
      role: Role;
      centreId: string;
    }): Promise<{ user: MobileUser; accessToken: string; refreshToken: string }> {
      const response = await apiRequest<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; fullName: string; email: string; role: string; centre: Centre };
      }>('/auth/login', 'POST', {
        email: payload.email,
        password: payload.password,
        signInAs: payload.role,
        centreId: payload.centreId,
      }, false);

      setAuthTokens(response.accessToken, response.refreshToken);
      return { user: mapUser(response.user), accessToken: response.accessToken, refreshToken: response.refreshToken };
    },

    async logout(): Promise<void> {
      try {
        await apiRequest('/auth/logout', 'POST');
      } finally {
        clearAuthTokens();
      }
    },

    async refresh(): Promise<{ accessToken: string; refreshToken: string }> {
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      const response = await apiRequest<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        'POST',
        { refreshToken },
        false,
      );
      setAuthTokens(response.accessToken, response.refreshToken);
      return response;
    },
  },

  patients: {
    async list(params?: { q?: string; centreId?: string; page?: number; limit?: number }): Promise<Patient[]> {
      const search = new URLSearchParams();
      if (params?.q) search.set('q', params.q);
      if (params?.centreId) search.set('centreId', params.centreId);
      search.set('page', String(params?.page ?? 1));
      search.set('limit', String(params?.limit ?? 50));
      const response = await apiRequest<{ data: any[] }>(`/patients?${search.toString()}`, 'GET');
      return response.data.map(mapPatient);
    },

    async create(payload: {
      firstName: string;
      surname: string;
      age: number;
      sex: 'Male' | 'Female';
      phone: string;
      lgaTown: string;
      state?: string;
      outreachCentreName?: string;
      disabilityType?: 'Physical' | 'Hearing' | 'Visual' | 'Mental' | 'None';
    }): Promise<Patient> {
      const created = await apiRequest<any>('/patients', 'POST', payload);
      const full = await apiRequest<any>(`/patients/${created.id}`, 'GET');
      return mapPatient(full);
    },

    async createWithPhoto(payload: {
      firstName: string;
      surname: string;
      age: number;
      sex: 'Male' | 'Female';
      phone: string;
      lgaTown: string;
      state?: string;
      outreachCentreName?: string;
      disabilityType?: 'Physical' | 'Hearing' | 'Visual' | 'Mental' | 'None';
      photoUri: string;
      photoName?: string;
      photoType?: string;
    }): Promise<Patient> {
      const form = new FormData();
      form.append('firstName', payload.firstName);
      form.append('surname', payload.surname);
      form.append('age', String(payload.age));
      form.append('sex', payload.sex);
      form.append('phone', payload.phone);
      form.append('lgaTown', payload.lgaTown);
      if (payload.state) form.append('state', payload.state);
      if (payload.outreachCentreName) form.append('outreachCentreName', payload.outreachCentreName);
      if (payload.disabilityType) form.append('disabilityType', payload.disabilityType);
      form.append('photo', {
        uri: payload.photoUri,
        name: payload.photoName ?? 'patient-photo.jpg',
        type: payload.photoType ?? 'image/jpeg',
      } as unknown as Blob);

      const created = await apiRequest<any>('/patients', 'POST', form);
      const full = await apiRequest<any>(`/patients/${created.id}`, 'GET');
      return mapPatient(full);
    },

    async updateWithPhoto(
      patientId: string,
      payload: {
        phone?: string;
        photoUri?: string;
        photoName?: string;
        photoType?: string;
      },
    ): Promise<Patient> {
      const form = new FormData();
      if (payload.phone) form.append('phone', payload.phone);
      if (payload.photoUri) {
        form.append('photo', {
          uri: payload.photoUri,
          name: payload.photoName ?? 'patient-photo.jpg',
          type: payload.photoType ?? 'image/jpeg',
        } as unknown as Blob);
      }

      await apiRequest<any>(`/patients/${patientId}`, 'PATCH', form);
      const full = await apiRequest<any>(`/patients/${patientId}`, 'GET');
      return mapPatient(full);
    },
  },

  visualAcuity: {
    async list(patientId: string): Promise<VaRecord[]> {
      const response = await apiRequest<{ data: any[] }>(`/patients/${patientId}/visual-acuity?limit=50&page=1`, 'GET');
      return response.data.map(mapVa);
    },

    async create(patientId: string, payload: {
      stage: VaRecord['stage'];
      rightEye: string;
      leftEye: string;
      reasonForPoorVision?: string;
      notes?: string;
    }): Promise<VaRecord> {
      const created = await apiRequest<any>(`/patients/${patientId}/visual-acuity`, 'POST', payload);
      return mapVa(created);
    },
  },

  consultations: {
    async list(patientId: string): Promise<ConsultationRecord[]> {
      const response = await apiRequest<{ data: any[] }>(`/patients/${patientId}/consultations?limit=50&page=1`, 'GET');
      return response.data.map(mapConsultation);
    },

    async create(patientId: string, payload: {
      consultationDate: string;
      healthPractitioner?: string;
      anteriorSegment: string;
      posteriorSegment: string;
      surgeryRecommended: boolean;
    }): Promise<ConsultationRecord> {
      const created = await apiRequest<any>(`/patients/${patientId}/consultations`, 'POST', {
        ...payload,
      });
      return mapConsultation(created);
    },
  },

  surgeries: {
    async listByPatient(patientId: string): Promise<SurgeryRecord[]> {
      const response = await apiRequest<{ data: any[] }>(`/patients/${patientId}/surgeries?limit=50&page=1`, 'GET');
      return response.data.map(mapSurgery);
    },
  },

  postOps: {
    async listBySurgery(surgeryId: string): Promise<PostOpRecord[]> {
      const response = await apiRequest<{ data: any[] }>(`/surgeries/${surgeryId}/post-ops?limit=50&page=1`, 'GET');
      return response.data.map(mapPostOp);
    },

    async create(
      surgeryId: string,
      payload: {
        stage: PostOpRecord['stage'];
        followUpDate: string;
        unaidedVARight: string;
        unaidedVALeft: string;
        pinholeVARight?: string;
        pinholeVALeft?: string;
        aidedVARight?: string;
        aidedVALeft?: string;
        reasonForPoorVision?: string;
        notes?: string;
      },
    ): Promise<PostOpRecord> {
      const created = await apiRequest<any>(`/surgeries/${surgeryId}/post-ops`, 'POST', payload);
      return mapPostOp(created);
    },
  },

  centres: {
    async list(includeInactive = true): Promise<Array<{ id: string; code: string; name: string; isActive?: boolean }>> {
      const response = await apiRequest<{ data?: Array<{ id: string; code: string; name: string; isActive?: boolean }> }>(
        `/centres?includeInactive=${String(includeInactive)}`,
        'GET',
      );
      return response.data ?? [];
    },

    async create(payload: { code: string; name: string }) {
      return apiRequest<{ id: string; code: string; name: string; isActive: boolean }>('/centres', 'POST', payload);
    },

    async update(id: string, payload: { code?: string; name?: string; isActive?: boolean }) {
      return apiRequest<{ id: string; code: string; name: string; isActive: boolean }>(`/centres/${id}`, 'PATCH', payload);
    },

    async remove(id: string) {
      return apiRequest<{ message: string }>(`/centres/${id}`, 'DELETE');
    },
  },

  users: {
    async list(params?: { includeInactive?: boolean; page?: number; limit?: number }): Promise<any[]> {
      const search = new URLSearchParams();
      search.set('includeInactive', String(params?.includeInactive ?? true));
      search.set('page', String(params?.page ?? 1));
      search.set('limit', String(params?.limit ?? 50));
      const response = await apiRequest<{ data: any[] }>(`/users?${search.toString()}`, 'GET');
      return response.data;
    },

    async create(payload: {
      fullName: string;
      email: string;
      password: string;
      role: string;
      centreId?: string;
    }) {
      return apiRequest<any>('/users', 'POST', payload);
    },

    async update(
      id: string,
      payload: {
        fullName?: string;
        email?: string;
        password?: string;
        role?: string;
        centreId?: string;
        isActive?: boolean;
      },
    ) {
      return apiRequest<any>(`/users/${id}`, 'PATCH', payload);
    },

    async remove(id: string) {
      return apiRequest<{ message: string }>(`/users/${id}`, 'DELETE');
    },
  },

  drugs: {
    async list(params?: { q?: string; centreId?: string; page?: number; limit?: number; lowStockOnly?: boolean }) {
      const search = new URLSearchParams();
      if (params?.q) search.set('q', params.q);
      if (params?.centreId) search.set('centreId', params.centreId);
      search.set('page', String(params?.page ?? 1));
      search.set('limit', String(params?.limit ?? 50));
      if (params?.lowStockOnly) search.set('lowStockOnly', 'true');
      return apiRequest<{ data: any[]; pagination: any }>(`/drugs?${search.toString()}`, 'GET');
    },

    async create(payload: {
      centreId?: string;
      name: string;
      genericName: string;
      strength: string;
      form: 'EYE_DROPS' | 'EYE_OINTMENT' | 'TABLET' | 'CAPSULE' | 'INJECTION';
      currentStock: number;
      reorderLevel: number;
      expiryDate?: string;
    }) {
      return apiRequest<any>('/drugs', 'POST', payload);
    },

    async update(id: string, payload: Record<string, unknown>) {
      return apiRequest<any>(`/drugs/${id}`, 'PATCH', payload);
    },

    async remove(id: string) {
      return apiRequest<{ message: string }>(`/drugs/${id}`, 'DELETE');
    },
  },

  eyeglasses: {
    async listItems(params?: { q?: string; centreId?: string; page?: number; limit?: number; lowStockOnly?: boolean }) {
      const search = new URLSearchParams();
      if (params?.q) search.set('q', params.q);
      if (params?.centreId) search.set('centreId', params.centreId);
      search.set('page', String(params?.page ?? 1));
      search.set('limit', String(params?.limit ?? 50));
      if (params?.lowStockOnly) search.set('lowStockOnly', 'true');
      return apiRequest<{ data: any[]; pagination: any }>(`/eyeglasses/items?${search.toString()}`, 'GET');
    },

    async createItem(payload: {
      centreId?: string;
      type: 'READING' | 'DISTANCE' | 'BIFOCAL' | 'PROGRESSIVE' | 'SUNGLASSES_UV';
      description: string;
      powerRange?: string;
      currentStock: number;
      reorderLevel: number;
      unitCost?: number;
    }) {
      return apiRequest<any>('/eyeglasses/items', 'POST', payload);
    },

    async updateItem(id: string, payload: Record<string, unknown>) {
      return apiRequest<any>(`/eyeglasses/items/${id}`, 'PATCH', payload);
    },

    async removeItem(id: string) {
      return apiRequest<{ message: string }>(`/eyeglasses/items/${id}`, 'DELETE');
    },
  },

  masterData: {
    async listOptions(params: { category: string; includeInactive?: boolean }): Promise<any[]> {
      const search = new URLSearchParams();
      search.set('category', params.category);
      search.set('includeInactive', String(params.includeInactive ?? false));
      const response = await apiRequest<{ data?: any[]; items?: any[] }>(
        `/master-data/options?${search.toString()}`,
        'GET',
      );
      return response.data ?? response.items ?? [];
    },
  },

  mobileSync: {
    async pull(params?: { since?: string; limit?: number }): Promise<any> {
      const search = new URLSearchParams();
      if (params?.since) search.set('since', params.since);
      search.set('limit', String(params?.limit ?? 200));
      return apiRequest<any>(`/mobile-sync/pull?${search.toString()}`, 'GET');
    },

    async push(payload: {
      deviceId: string;
      syncRequestId: string;
      lastPulledAt?: string;
      operations: Array<{
        entity: string;
        operation: 'UPSERT' | 'DELETE';
        recordId: string;
        clientUpdatedAt: string;
        record?: Record<string, unknown>;
      }>;
    }): Promise<any> {
      return apiRequest<any>('/mobile-sync/push', 'POST', payload);
    },
  },
};

