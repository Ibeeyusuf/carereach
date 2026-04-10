export type Role = 'Super Admin' | 'Admin' | 'Doctor' | 'Surgeon' | 'Scrub Nurse' | 'Anesthetist' | 'Data Entry';

export interface Centre {
  id: string;
  code: string;
  name: string;
}

export interface MobileUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  centre: Centre;
}

export interface Patient {
  id: string;
  patientCode: string;
  firstName: string;
  surname: string;
  age: number;
  sex: 'Male' | 'Female';
  phone: string;
  lgaTown: string;
  state: string;
  outreachCentreName?: string;
  disabilityType: 'Physical' | 'Hearing' | 'Visual' | 'Mental' | 'None';
  createdAt: string;
  createdBy: string;
  centreCode: string;
  centreName?: string;
}

export interface VaRecord {
  id: string;
  patientId: string;
  stage: 'Presenting' | 'Unaided' | 'Pinhole' | 'Aided';
  rightEye: string;
  leftEye: string;
  reasonForPoorVision?: string;
  notes?: string;
  recordedAt: string;
  centreCode: string;
}

export interface ConsultationRecord {
  id: string;
  patientId: string;
  consultationDate: string;
  healthPractitioner: string;
  anteriorSegment: string;
  posteriorSegment: string;
  surgeryRecommended: boolean;
  centreCode: string;
}

export interface SurgeryRecord {
  id: string;
  patientId: string;
  surgeryDate: string;
  procedureType: string;
  eyeOperated: 'Right' | 'Left' | 'Both';
  centreCode: string;
}

export interface PostOpRecord {
  id: string;
  surgeryId: string;
  stage: 'Day 1' | 'Week 1' | 'Week 5';
  followUpDate: string;
  unaidedVA_Right: string;
  unaidedVA_Left: string;
  notes?: string;
  centreCode: string;
}
