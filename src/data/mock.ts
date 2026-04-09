import type { Centre, Patient, Role, SurgeryRecord } from '../types';

export const LOGIN_ROLES: Role[] = ['Admin', 'Doctor', 'Surgeon', 'Scrub Nurse', 'Anesthetist'];

export const CENTRES: Centre[] = [
  { id: 'c1', code: 'MIN', name: 'Minna Catchment' },
  { id: 'c2', code: 'KNT', name: 'Kontagora Catchment' },
  { id: 'c3', code: 'BDA', name: 'Bida Catchment' },
];

export const WHO_VA_SCALE: string[] = [
  '6/6',
  '6/9',
  '6/12',
  '6/18',
  '6/24',
  '6/36',
  '6/60',
  '3/60',
  '<3/60 - CF',
  'HM',
  'PL',
  'NPL',
  'Unable to determine',
];

export const seedPatients: Patient[] = [
  {
    id: 'p1',
    patientCode: 'MF-MIN-000001',
    firstName: 'Amina',
    surname: 'Bello',
    age: 58,
    sex: 'Female',
    phone: '08012345678',
    lgaTown: 'Minna',
    state: 'Niger',
    outreachCentreName: 'Mainstream Foundation',
    disabilityType: 'None',
    createdAt: new Date().toISOString(),
    createdBy: 'Admin User',
    centreCode: 'MIN',
  },
];

export const seedSurgeries: SurgeryRecord[] = [
  {
    id: 's1',
    patientId: 'p1',
    surgeryDate: new Date().toISOString(),
    procedureType: 'SICS + PCIOL',
    eyeOperated: 'Right',
    centreCode: 'MIN',
  },
];
