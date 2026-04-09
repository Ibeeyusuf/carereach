import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FacebookCardSkeleton } from '../../src/components/FacebookLoading';
import { WHO_VA_SCALE } from '../../src/data/mock';
import { useMobileAuth } from '../../src/context/AuthContext';
import { useMobileData } from '../../src/context/DataContext';

export default function MobileVaScreen() {
  const { user } = useMobileAuth();
  const { patients, vaRecords, addVaRecord, loadVaRecords, isSaving } = useMobileData();

  const [patientId, setPatientId] = useState('');
  const [stage, setStage] = useState<'Presenting' | 'Unaided' | 'Pinhole' | 'Aided'>('Presenting');
  const [rightEye, setRightEye] = useState('');
  const [leftEye, setLeftEye] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    const run = async () => {
      setIsLoadingHistory(true);
      try {
        await loadVaRecords(patientId);
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

  const history = useMemo(() => vaRecords.filter((v) => v.patientId === patientId).slice(0, 6), [vaRecords, patientId]);

  const onSave = async () => {
    if (!patientId || !rightEye || !leftEye) {
      Alert.alert('Validation', 'Select patient and both eye values.');
      return;
    }

    try {
      await addVaRecord({
        patientId,
        stage,
        rightEye,
        leftEye,
        reasonForPoorVision: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setRightEye('');
      setLeftEye('');
      setReason('');
      setNotes('');
      Alert.alert('Saved', 'Visual acuity saved successfully.');
      setIsLoadingHistory(true);
      await loadVaRecords(patientId);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unable to save visual acuity.');
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

      <Text style={styles.section}>VA Stage</Text>
      <View style={styles.grid2}>
        {(['Presenting', 'Unaided', 'Pinhole', 'Aided'] as const).map((s) => (
          <Pressable key={s} onPress={() => setStage(s)} style={[styles.selectCard, stage === s && styles.selectCardActive]}>
            <Text style={[styles.selectText, stage === s && styles.selectTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Visual Acuity (WHO)</Text>
      <TextInput value={rightEye} onChangeText={setRightEye} placeholder={`Right eye e.g. ${WHO_VA_SCALE[0]}`} style={styles.input} />
      <TextInput value={leftEye} onChangeText={setLeftEye} placeholder={`Left eye e.g. ${WHO_VA_SCALE[3]}`} style={styles.input} />
      <TextInput value={reason} onChangeText={setReason} placeholder="Reason for poor vision (optional)" style={styles.input} />
      <TextInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" style={[styles.input, { height: 90 }]} multiline textAlignVertical="top" />

      <Pressable style={[styles.button, isSaving && styles.buttonDisabled]} onPress={onSave} disabled={isSaving}>
        <Text style={styles.buttonText}>{isSaving ? 'Saving...' : 'Save Visual Acuity'}</Text>
      </Pressable>

      <Text style={styles.section}>History</Text>
      {isLoadingHistory ? (
        <>
          <FacebookCardSkeleton />
          <FacebookCardSkeleton />
          <FacebookCardSkeleton />
        </>
      ) : history.length === 0 ? <Text style={styles.muted}>No VA history yet.</Text> : history.map((h) => (
        <View key={h.id} style={styles.historyCard}>
          <Text style={styles.historyTop}>{h.stage} - {new Date(h.recordedAt).toLocaleDateString()}</Text>
          <Text style={styles.historyMeta}>RE: {h.rightEye} - LE: {h.leftEye}</Text>
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
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectCard: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#fff' },
  selectCardActive: { borderColor: '#ea580c', backgroundColor: '#ea580c' },
  selectText: { fontWeight: '600', color: '#374151' },
  selectTextActive: { color: '#fff' },
  input: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', paddingHorizontal: 12, color: '#111827' },
  button: { marginTop: 8, backgroundColor: '#ea580c', borderRadius: 10, height: 46, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700' },
  muted: { color: '#6b7280' },
  historyCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 12, padding: 12 },
  historyTop: { color: '#c2410c', fontWeight: '700', fontSize: 12 },
  historyMeta: { marginTop: 4, color: '#374151' },
});
