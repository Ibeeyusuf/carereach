import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { safeGetItem, safeRemoveItem, safeSetItem } from '@/src/services/safeStorage';

import { useMobileAuth } from './AuthContext';
import { WHO_VA_SCALE } from '../data/mock';
import { mobileApi } from '@/src/services/api';
import type { ConsultationRecord, Patient, PostOpRecord, SurgeryRecord, VaRecord } from '../types';

type PendingSyncOperation = {
  entity: 'PATIENT' | 'VISUAL_ACUITY' | 'CONSULTATION' | 'POST_OP';
  operation: 'UPSERT' | 'DELETE';
  recordId: string;
  clientUpdatedAt: string;
  record?: Record<string, unknown>;
  clientReference?: string;
};

type DataContextValue = {
  patients: Patient[];
  vaRecords: VaRecord[];
  consultations: ConsultationRecord[];
  surgeries: SurgeryRecord[];
  postOps: PostOpRecord[];
  isLoadingPatients: boolean;
  isSaving: boolean;
  isSyncing: boolean;
  outboxCount: number;
  lastSyncedAt: string | null;
  syncError: string | null;
  loadPatients: (params?: { q?: string }) => Promise<void>;
  addPatient: (patient: Omit<Patient, 'id' | 'patientCode' | 'createdAt' | 'centreCode' | 'centreName'>) => Promise<Patient>;
  loadVaRecords: (patientId: string) => Promise<void>;
  addVaRecord: (record: Omit<VaRecord, 'id' | 'recordedAt' | 'centreCode'>) => Promise<void>;
  loadConsultations: (patientId: string) => Promise<void>;
  addConsultation: (record: Omit<ConsultationRecord, 'id' | 'centreCode'>) => Promise<void>;
  loadSurgeries: (patientId: string) => Promise<void>;
  loadPostOps: (surgeryId: string) => Promise<void>;
  addPostOp: (record: Omit<PostOpRecord, 'id' | 'centreCode'>) => Promise<void>;
  syncNow: () => Promise<void>;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

const VA_SEVERITY_ORDER = WHO_VA_SCALE;
const OUTBOX_STORAGE_KEY_PREFIX = 'carereach_mobile_outbox';
const LAST_SYNC_STORAGE_KEY_PREFIX = 'carereach_mobile_last_sync';

function getVaSeverity(value: string): number {
  const idx = VA_SEVERITY_ORDER.findIndex((item) => item.toLowerCase() === value.toLowerCase());
  return idx === -1 ? VA_SEVERITY_ORDER.length : idx;
}

function isBelowSixByTwelve(value: string): boolean {
  return getVaSeverity(value) > getVaSeverity('6/12');
}

function isThreeSixtyOrWorse(value: string): boolean {
  return getVaSeverity(value) >= getVaSeverity('3/60');
}

function toSyncVaStage(stage: VaRecord['stage']): 'PRESENTING' | 'UNAIDED' | 'PINHOLE' | 'AIDED' {
  const map: Record<VaRecord['stage'], 'PRESENTING' | 'UNAIDED' | 'PINHOLE' | 'AIDED'> = {
    Presenting: 'PRESENTING',
    Unaided: 'UNAIDED',
    Pinhole: 'PINHOLE',
    Aided: 'AIDED',
  };
  return map[stage];
}

function toSyncPostOpStage(stage: PostOpRecord['stage']): 'DAY_1' | 'WEEK_1' | 'WEEK_5' {
  const map: Record<PostOpRecord['stage'], 'DAY_1' | 'WEEK_1' | 'WEEK_5'> = {
    'Day 1': 'DAY_1',
    'Week 1': 'WEEK_1',
    'Week 5': 'WEEK_5',
  };
  return map[stage];
}

function toSyncSex(sex: Patient['sex']): 'MALE' | 'FEMALE' {
  return sex === 'Male' ? 'MALE' : 'FEMALE';
}

function toSyncDisability(disability: Patient['disabilityType']): 'PHYSICAL' | 'HEARING' | 'VISUAL' | 'MENTAL' | 'NONE' {
  const map: Record<Patient['disabilityType'], 'PHYSICAL' | 'HEARING' | 'VISUAL' | 'MENTAL' | 'NONE'> = {
    Physical: 'PHYSICAL',
    Hearing: 'HEARING',
    Visual: 'VISUAL',
    Mental: 'MENTAL',
    None: 'NONE',
  };
  return map[disability];
}

function generateLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function MobileDataProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useMobileAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [surgeries, setSurgeries] = useState<SurgeryRecord[]>([]);
  const [vaRecords, setVaRecords] = useState<VaRecord[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [postOps, setPostOps] = useState<PostOpRecord[]>([]);
  const [pendingOperations, setPendingOperations] = useState<PendingSyncOperation[]>([]);

  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [storageHydrated, setStorageHydrated] = useState(false);

  const clearAll = () => {
    setPatients([]);
    setSurgeries([]);
    setVaRecords([]);
    setConsultations([]);
    setPostOps([]);
    setPendingOperations([]);
    setLastSyncedAt(null);
    setSyncError(null);
    setStorageHydrated(false);
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      clearAll();
      return;
    }

    void loadPatients();
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const hydrateSyncStorage = async () => {
      if (!user) return;
      const outboxKey = `${OUTBOX_STORAGE_KEY_PREFIX}:${user.id}`;
      const lastSyncKey = `${LAST_SYNC_STORAGE_KEY_PREFIX}:${user.id}`;

      try {
        const [rawOutbox, rawLastSync] = await Promise.all([
          safeGetItem(outboxKey),
          safeGetItem(lastSyncKey),
        ]);

        if (rawOutbox) {
          const parsed = JSON.parse(rawOutbox) as PendingSyncOperation[];
          if (Array.isArray(parsed)) {
            setPendingOperations(parsed);
          }
        }

        if (rawLastSync) {
          setLastSyncedAt(rawLastSync);
        }
      } catch {
        setPendingOperations([]);
        setLastSyncedAt(null);
      } finally {
        setStorageHydrated(true);
      }
    };

    if (isAuthenticated && user) {
      void hydrateSyncStorage();
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const persistSyncStorage = async () => {
      if (!user || !storageHydrated) return;
      const outboxKey = `${OUTBOX_STORAGE_KEY_PREFIX}:${user.id}`;
      const lastSyncKey = `${LAST_SYNC_STORAGE_KEY_PREFIX}:${user.id}`;

      try {
        await safeSetItem(outboxKey, JSON.stringify(pendingOperations));
        if (lastSyncedAt) {
          await safeSetItem(lastSyncKey, lastSyncedAt);
        } else {
          await safeRemoveItem(lastSyncKey);
        }
      } catch {
        // no-op
      }
    };

    void persistSyncStorage();
  }, [pendingOperations, lastSyncedAt, storageHydrated, user?.id]);

  const enqueueOperation = (op: PendingSyncOperation) => {
    setPendingOperations((prev) => [...prev, op]);
  };

  const loadPatients = async (params?: { q?: string }) => {
    if (!user) return;
    setIsLoadingPatients(true);
    try {
      const list = await mobileApi.patients.list({
        q: params?.q,
        centreId: user.role === 'Admin' ? undefined : user.centre.id,
        page: 1,
        limit: 50,
      });
      setPatients(list);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const addPatient = async (
    input: Omit<Patient, 'id' | 'patientCode' | 'createdAt' | 'centreCode' | 'centreName'>,
  ): Promise<Patient> => {
    setIsSaving(true);
    try {
      const created = await mobileApi.patients.create({
        firstName: input.firstName,
        surname: input.surname,
        age: input.age,
        sex: input.sex,
        phone: input.phone,
        lgaTown: input.lgaTown,
        state: input.state,
        disabilityType: input.disabilityType,
        outreachCentreName: input.outreachCentreName,
      });
      setPatients((prev) => [created, ...prev]);
      return created;
    } catch {
      if (!user) {
        throw new Error('Not authenticated');
      }
      const localPatient: Patient = {
        id: generateLocalId('local-patient'),
        patientCode: generateLocalId(`MF-${user.centre.code}`).toUpperCase(),
        firstName: input.firstName,
        surname: input.surname,
        age: input.age,
        sex: input.sex,
        phone: input.phone,
        lgaTown: input.lgaTown,
        state: input.state ?? '',
        outreachCentreName: input.outreachCentreName,
        disabilityType: input.disabilityType,
        createdAt: new Date().toISOString(),
        createdBy: input.createdBy,
        centreCode: user.centre.code,
        centreName: user.centre.name,
      };

      setPatients((prev) => [localPatient, ...prev]);
      enqueueOperation({
        entity: 'PATIENT',
        operation: 'UPSERT',
        recordId: localPatient.id,
        clientUpdatedAt: new Date().toISOString(),
        record: {
          patientCode: localPatient.patientCode,
          firstName: localPatient.firstName,
          surname: localPatient.surname,
          age: localPatient.age,
          phone: localPatient.phone,
          sex: toSyncSex(localPatient.sex),
          lgaTown: localPatient.lgaTown,
          state: localPatient.state,
          outreachCentreName: localPatient.outreachCentreName,
          disabilityType: toSyncDisability(localPatient.disabilityType),
          centreId: user.centre.id,
        },
      });
      return localPatient;
    } finally {
      setIsSaving(false);
    }
  };

  const loadVaRecords = async (patientId: string) => {
    const list = await mobileApi.visualAcuity.list(patientId);
    setVaRecords((prev) => [...prev.filter((item) => item.patientId !== patientId), ...list]);
  };

  const addVaRecord = async (record: Omit<VaRecord, 'id' | 'recordedAt' | 'centreCode'>) => {
    setIsSaving(true);
    try {
      const created = await mobileApi.visualAcuity.create(record.patientId, {
        stage: record.stage,
        rightEye: record.rightEye,
        leftEye: record.leftEye,
        reasonForPoorVision: record.reasonForPoorVision,
        notes: record.notes,
      });
      setVaRecords((prev) => [created, ...prev]);
    } catch {
      const localId = generateLocalId('local-va');
      const local: VaRecord = {
        id: localId,
        patientId: record.patientId,
        stage: record.stage,
        rightEye: record.rightEye,
        leftEye: record.leftEye,
        reasonForPoorVision: record.reasonForPoorVision,
        notes: record.notes,
        recordedAt: new Date().toISOString(),
        centreCode: user?.centre.code ?? '',
      };
      setVaRecords((prev) => [local, ...prev]);
      enqueueOperation({
        entity: 'VISUAL_ACUITY',
        operation: 'UPSERT',
        recordId: localId,
        clientUpdatedAt: new Date().toISOString(),
        record: {
          patientId: record.patientId,
          stage: toSyncVaStage(record.stage),
          rightEye: record.rightEye,
          leftEye: record.leftEye,
          reasonForPoorVision: record.reasonForPoorVision,
          notes: record.notes,
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadConsultations = async (patientId: string) => {
    const list = await mobileApi.consultations.list(patientId);
    setConsultations((prev) => [...prev.filter((item) => item.patientId !== patientId), ...list]);
  };

  const addConsultation = async (record: Omit<ConsultationRecord, 'id' | 'centreCode'>) => {
    setIsSaving(true);
    try {
      const created = await mobileApi.consultations.create(record.patientId, {
        consultationDate: record.consultationDate,
        healthPractitioner: record.healthPractitioner,
        chiefComplaint: record.chiefComplaint,
        historyOfPresentIllness: record.historyOfPresentIllness,
        anteriorSegment: record.anteriorSegment,
        posteriorSegment: record.posteriorSegment,
        diagnosis: record.diagnosis,
        treatmentPlan: record.treatmentPlan,
        surgeryRecommended: record.surgeryRecommended,
      });
      setConsultations((prev) => [created, ...prev]);
    } catch {
      const localId = generateLocalId('local-consult');
      const local: ConsultationRecord = {
        id: localId,
        patientId: record.patientId,
        consultationDate: record.consultationDate,
        healthPractitioner: record.healthPractitioner,
        chiefComplaint: record.chiefComplaint,
        historyOfPresentIllness: record.historyOfPresentIllness,
        anteriorSegment: record.anteriorSegment,
        posteriorSegment: record.posteriorSegment,
        diagnosis: record.diagnosis,
        treatmentPlan: record.treatmentPlan,
        surgeryRecommended: record.surgeryRecommended,
        centreCode: user?.centre.code ?? '',
      };
      setConsultations((prev) => [local, ...prev]);
      enqueueOperation({
        entity: 'CONSULTATION',
        operation: 'UPSERT',
        recordId: localId,
        clientUpdatedAt: new Date().toISOString(),
        record: {
          patientId: record.patientId,
          consultationDate: record.consultationDate,
          healthPractitioner: record.healthPractitioner,
          chiefComplaint: record.chiefComplaint,
          historyOfPresentIllness: record.historyOfPresentIllness,
          anteriorSegment: record.anteriorSegment,
          posteriorSegment: record.posteriorSegment,
          diagnosis: record.diagnosis,
          diagnosisItems: [record.diagnosis],
          treatmentPlan: record.treatmentPlan,
          surgeryRecommended: record.surgeryRecommended,
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const loadSurgeries = async (patientId: string) => {
    const list = await mobileApi.surgeries.listByPatient(patientId);
    setSurgeries((prev) => [...prev.filter((item) => item.patientId !== patientId), ...list]);
  };

  const loadPostOps = async (surgeryId: string) => {
    const list = await mobileApi.postOps.listBySurgery(surgeryId);
    setPostOps((prev) => [...prev.filter((item) => item.surgeryId !== surgeryId), ...list]);
  };

  const addPostOp = async (record: Omit<PostOpRecord, 'id' | 'centreCode'>) => {
    setIsSaving(true);
    try {
      const needPinhole = isBelowSixByTwelve(record.unaidedVA_Right) || isBelowSixByTwelve(record.unaidedVA_Left);
      const pinholeRight = needPinhole ? record.unaidedVA_Right : undefined;
      const pinholeLeft = needPinhole ? record.unaidedVA_Left : undefined;

      const needAided =
        (pinholeRight ? isBelowSixByTwelve(pinholeRight) : false) ||
        (pinholeLeft ? isBelowSixByTwelve(pinholeLeft) : false);
      const aidedRight = needAided ? pinholeRight : undefined;
      const aidedLeft = needAided ? pinholeLeft : undefined;

      const reasonRequired =
        isThreeSixtyOrWorse(record.unaidedVA_Right) || isThreeSixtyOrWorse(record.unaidedVA_Left);

      const created = await mobileApi.postOps.create(record.surgeryId, {
        stage: record.stage,
        followUpDate: record.followUpDate,
        unaidedVARight: record.unaidedVA_Right,
        unaidedVALeft: record.unaidedVA_Left,
        pinholeVARight: pinholeRight,
        pinholeVALeft: pinholeLeft,
        aidedVARight: aidedRight,
        aidedVALeft: aidedLeft,
        reasonForPoorVision: reasonRequired ? (record.notes ?? 'Not specified') : undefined,
        notes: record.notes,
      });
      setPostOps((prev) => [created, ...prev]);
    } catch {
      const surgery = surgeries.find((item) => item.id === record.surgeryId);
      const localId = generateLocalId('local-postop');
      const local: PostOpRecord = {
        id: localId,
        surgeryId: record.surgeryId,
        stage: record.stage,
        followUpDate: record.followUpDate,
        unaidedVA_Right: record.unaidedVA_Right,
        unaidedVA_Left: record.unaidedVA_Left,
        notes: record.notes,
        centreCode: user?.centre.code ?? '',
      };
      setPostOps((prev) => [local, ...prev]);
      enqueueOperation({
        entity: 'POST_OP',
        operation: 'UPSERT',
        recordId: localId,
        clientUpdatedAt: new Date().toISOString(),
        record: {
          patientId: surgery?.patientId,
          surgeryId: record.surgeryId,
          stage: toSyncPostOpStage(record.stage),
          followUpDate: record.followUpDate,
          unaidedVARight: record.unaidedVA_Right,
          unaidedVALeft: record.unaidedVA_Left,
          notes: record.notes,
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const syncNow = async () => {
    if (!user) return;
    setIsSyncing(true);
    setSyncError(null);

    try {
      if (pendingOperations.length > 0) {
        const requestId = `sync-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
        const pushResponse = await mobileApi.mobileSync.push({
          deviceId: `mobile-${user.id.slice(0, 8)}`,
          syncRequestId: requestId,
          lastPulledAt: lastSyncedAt ?? undefined,
          operations: pendingOperations,
        });

        const failedKeys = new Set<string>();
        for (const item of pushResponse?.results ?? []) {
          if (item.status === 'CONFLICT' || item.status === 'ERROR') {
            failedKeys.add(`${item.entity}:${item.operation}:${item.recordId}`);
          }
        }

        setPendingOperations((prev) =>
          prev.filter((op) => failedKeys.has(`${op.entity}:${op.operation}:${op.recordId}`)),
        );
      }

      const pull = await mobileApi.mobileSync.pull({
        since: lastSyncedAt ?? undefined,
        limit: 200,
      });
      const nextSince = pull?.nextSince ?? new Date().toISOString();
      setLastSyncedAt(nextSince);

      await loadPatients();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const value = useMemo<DataContextValue>(
    () => ({
      patients,
      vaRecords,
      consultations,
      surgeries,
      postOps,
      isLoadingPatients,
      isSaving,
      isSyncing,
      outboxCount: pendingOperations.length,
      lastSyncedAt,
      syncError,
      loadPatients,
      addPatient,
      loadVaRecords,
      addVaRecord,
      loadConsultations,
      addConsultation,
      loadSurgeries,
      loadPostOps,
      addPostOp,
      syncNow,
    }),
    [
      patients,
      vaRecords,
      consultations,
      surgeries,
      postOps,
      isLoadingPatients,
      isSaving,
      isSyncing,
      pendingOperations.length,
      lastSyncedAt,
      syncError,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useMobileData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useMobileData must be used within MobileDataProvider');
  }
  return ctx;
}

