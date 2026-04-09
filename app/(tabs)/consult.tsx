import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FacebookCardSkeleton } from '../../src/components/FacebookLoading';
import { useMobileAuth } from '../../src/context/AuthContext';
import { useMobileData } from '../../src/context/DataContext';

export default function MobileConsultScreen() {
  const { user } = useMobileAuth();
  const { patients, consultations, addConsultation, loadConsultations, isSaving } = useMobileData();

  const [patientId, setPatientId] = useState('');
  const [practitioner, setPractitioner] = useState('Ophthalmologist');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [history, setHistory] = useState('');
  const [anterior, setAnterior] = useState('');
  const [posterior, setPosterior] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [plan, setPlan] = useState('');
  const [surgeryRecommended, setSurgeryRecommended] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    const run = async () => {
      setIsLoadingHistory(true);
      try {
        await loadConsultations(patientId);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    void run();
  }, [patientId]);

  const scopedPatients = useMemo(() => {
    if (!user) return [];
    return user.role === 'Admin' ? patients : patients.filter((p) => p.centreCode === user.centre.code);
  }, [patients, user]);

  const patientHistory = useMemo(() => consultations.filter((c) => c.patientId === patientId).slice(0, 6), [consultations, patientId]);

  const onSave = async () => {
    if (!patientId || !chiefComplaint.trim() || !history.trim() || !anterior.trim() || !posterior.trim() || !diagnosis.trim() || !plan.trim()) {
      Alert.alert('Validation', 'Please complete required fields.');
      return;
    }

    try {
      await addConsultation({
        patientId,
        consultationDate: new Date().toISOString(),
        healthPractitioner: practitioner,
        chiefComplaint: chiefComplaint.trim(),
        historyOfPresentIllness: history.trim(),
        anteriorSegment: anterior.trim(),
        posteriorSegment: posterior.trim(),
        diagnosis: diagnosis.trim(),
        treatmentPlan: plan.trim(),
        surgeryRecommended,
      });

      setChiefComplaint('');
      setHistory('');
      setAnterior('');
      setPosterior('');
      setDiagnosis('');
      setPlan('');
      setSurgeryRecommended(false);
      Alert.alert('Saved', 'Consultation saved successfully.');
      setIsLoadingHistory(true);
      await loadConsultations(patientId);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unable to save consultation.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.section}>Select Patient</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {scopedPatients.map((p) => (
          <Pressable key={p.id} onPress={() => setPatientId(p.id)} style={[styles.pill, patientId === p.id && styles.pillActive]}>
            <Text style={[styles.pillText, patientId === p.id && styles.pillTextActive]}>{p.patientCode}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.section}>Practitioner</Text>
      <TextInput value={practitioner} onChangeText={setPractitioner} style={styles.input} />
      <TextInput value={chiefComplaint} onChangeText={setChiefComplaint} placeholder="Chief complaint" style={[styles.input, styles.textArea]} multiline textAlignVertical="top" />
      <TextInput value={history} onChangeText={setHistory} placeholder="History of present illness" style={[styles.input, styles.textArea]} multiline textAlignVertical="top" />
      <TextInput value={anterior} onChangeText={setAnterior} placeholder="Anterior segment" style={[styles.input, styles.textArea]} multiline textAlignVertical="top" />
      <TextInput value={posterior} onChangeText={setPosterior} placeholder="Posterior segment" style={[styles.input, styles.textArea]} multiline textAlignVertical="top" />
      <TextInput value={diagnosis} onChangeText={setDiagnosis} placeholder="Diagnosis" style={[styles.input, styles.textArea]} multiline textAlignVertical="top" />
      <TextInput value={plan} onChangeText={setPlan} placeholder="Treatment plan" style={[styles.input, styles.textArea]} multiline textAlignVertical="top" />

      <Pressable onPress={() => setSurgeryRecommended((v) => !v)} style={[styles.toggleCard, surgeryRecommended && styles.toggleCardActive]}>
        <Text style={[styles.toggleTitle, surgeryRecommended && styles.toggleTitleActive]}>Recommend Surgery</Text>
        <Text style={[styles.toggleMeta, surgeryRecommended && styles.toggleMetaActive]}>{surgeryRecommended ? 'Yes' : 'No'}</Text>
      </Pressable>

      <Pressable style={[styles.button, isSaving && styles.buttonDisabled]} onPress={onSave} disabled={isSaving}><Text style={styles.buttonText}>{isSaving ? 'Saving...' : 'Save Consultation'}</Text></Pressable>

      <Text style={styles.section}>Consultation History</Text>
      {isLoadingHistory ? (
        <>
          <FacebookCardSkeleton />
          <FacebookCardSkeleton />
          <FacebookCardSkeleton />
        </>
      ) : patientHistory.length === 0 ? <Text style={styles.muted}>No history yet.</Text> : patientHistory.map((r) => (
        <View key={r.id} style={styles.historyCard}>
          <Text style={styles.historyTop}>{new Date(r.consultationDate).toLocaleDateString()}</Text>
          <Text style={styles.historyMeta}>{r.diagnosis}</Text>
          {r.surgeryRecommended ? <Text style={styles.tag}>Surgery Recommended</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f9fafb' },
  container: { padding: 16, gap: 10, paddingBottom: 28 },
  section: { marginTop: 6, fontSize: 14, fontWeight: '700', color: '#111827' },
  row: { gap: 8 },
  pill: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  pillActive: { borderColor: '#fb923c', backgroundColor: '#fff7ed' },
  pillText: { color: '#4b5563', fontSize: 12, fontWeight: '600' },
  pillTextActive: { color: '#c2410c' },
  input: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  textArea: { minHeight: 80 },
  toggleCard: { borderWidth: 1, borderColor: '#fed7aa', backgroundColor: '#fff7ed', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between' },
  toggleCardActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  toggleTitle: { color: '#9a3412', fontWeight: '700' },
  toggleTitleActive: { color: '#fff' },
  toggleMeta: { color: '#9a3412' },
  toggleMetaActive: { color: '#fff' },
  button: { marginTop: 8, backgroundColor: '#ea580c', borderRadius: 10, height: 46, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700' },
  muted: { color: '#6b7280' },
  historyCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 12, padding: 12 },
  historyTop: { color: '#6b7280', fontSize: 12 },
  historyMeta: { marginTop: 4, color: '#111827', fontWeight: '600' },
  tag: { marginTop: 6, alignSelf: 'flex-start', color: '#c2410c', backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, fontSize: 11, fontWeight: '700' },
});
