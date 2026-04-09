import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FacebookCardSkeleton } from '../../src/components/FacebookLoading';
import { useMobileAuth } from '../../src/context/AuthContext';
import { useMobileData } from '../../src/context/DataContext';

export default function MobilePostOpScreen() {
  const { user } = useMobileAuth();
  const { patients, surgeries, postOps, addPostOp, loadSurgeries, loadPostOps, isSaving } = useMobileData();

  const [patientId, setPatientId] = useState('');
  const [surgeryId, setSurgeryId] = useState('');
  const [stage, setStage] = useState<'Day 1' | 'Week 1' | 'Week 5'>('Day 1');
  const [followUpDate, setFollowUpDate] = useState(new Date().toISOString().slice(0, 10));
  const [vaRight, setVaRight] = useState('');
  const [vaLeft, setVaLeft] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoadingSurgery, setIsLoadingSurgery] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    const run = async () => {
      setIsLoadingSurgery(true);
      try {
        await loadSurgeries(patientId);
      } finally {
        setIsLoadingSurgery(false);
      }
    };
    void run();
  }, [patientId]);

  useEffect(() => {
    if (!surgeryId) return;
    const run = async () => {
      setIsLoadingHistory(true);
      try {
        await loadPostOps(surgeryId);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    void run();
  }, [surgeryId]);

  const scopedPatients = useMemo(() => {
    if (!user) return [];
    return user.role === 'Admin' || user.role === 'Super Admin'
      ? patients
      : patients.filter((p) => p.centreCode === user.centre.code);
  }, [patients, user]);

  const patientSurgeries = useMemo(() => surgeries.filter((s) => s.patientId === patientId), [surgeries, patientId]);
  const history = useMemo(() => postOps.filter((p) => p.surgeryId === surgeryId).slice(0, 6), [postOps, surgeryId]);

  const onSave = async () => {
    if (!patientId || !surgeryId || !followUpDate || !vaRight || !vaLeft) {
      Alert.alert('Validation', 'Complete patient, surgery, date and VA fields.');
      return;
    }

    try {
      await addPostOp({
        surgeryId,
        stage,
        followUpDate,
        unaidedVA_Right: vaRight,
        unaidedVA_Left: vaLeft,
        notes: notes.trim() || undefined,
      });
      setVaRight('');
      setVaLeft('');
      setNotes('');
      Alert.alert('Saved', 'Post-op record saved.');
      setIsLoadingHistory(true);
      await loadPostOps(surgeryId);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unable to save post-op record.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.section}>Select Patient</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {scopedPatients.map((p) => (
          <Pressable key={p.id} onPress={() => { setPatientId(p.id); setSurgeryId(''); }} style={[styles.pill, patientId === p.id && styles.pillActive]}>
            <Text style={[styles.pillText, patientId === p.id && styles.pillTextActive]}>{p.patientCode}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.section}>Select Surgery</Text>
      {isLoadingSurgery ? (
        <FacebookCardSkeleton />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {patientSurgeries.map((s) => (
            <Pressable key={s.id} onPress={() => setSurgeryId(s.id)} style={[styles.pill, surgeryId === s.id && styles.pillActive]}>
              <Text style={[styles.pillText, surgeryId === s.id && styles.pillTextActive]}>{s.procedureType}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Text style={styles.section}>Stage</Text>
      <View style={styles.row}>
        {(['Day 1', 'Week 1', 'Week 5'] as const).map((s) => (
          <Pressable key={s} onPress={() => setStage(s)} style={[styles.pill, stage === s && styles.pillActive]}>
            <Text style={[styles.pillText, stage === s && styles.pillTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput value={followUpDate} onChangeText={setFollowUpDate} placeholder="YYYY-MM-DD" style={styles.input} />
      <TextInput value={vaRight} onChangeText={setVaRight} placeholder="Unaided VA Right" style={styles.input} />
      <TextInput value={vaLeft} onChangeText={setVaLeft} placeholder="Unaided VA Left" style={styles.input} />
      <TextInput value={notes} onChangeText={setNotes} placeholder="Notes" style={[styles.input, { height: 90 }]} multiline textAlignVertical="top" />

      <Pressable style={[styles.button, isSaving && styles.buttonDisabled]} onPress={onSave} disabled={isSaving}><Text style={styles.buttonText}>{isSaving ? 'Saving...' : 'Save Post-Op Record'}</Text></Pressable>

      <Text style={styles.section}>Timeline</Text>
      {isLoadingHistory ? (
        <>
          <FacebookCardSkeleton />
          <FacebookCardSkeleton />
        </>
      ) : history.length === 0 ? <Text style={styles.muted}>No follow-up records yet.</Text> : history.map((h) => (
        <View key={h.id} style={styles.historyCard}>
          <Text style={styles.historyTop}>{h.stage} - {new Date(h.followUpDate).toLocaleDateString()}</Text>
          <Text style={styles.historyMeta}>RE: {h.unaidedVA_Right} - LE: {h.unaidedVA_Left}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f9fafb' },
  container: { padding: 16, gap: 10, paddingBottom: 28 },
  section: { marginTop: 6, fontSize: 14, fontWeight: '700', color: '#111827' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  pillActive: { borderColor: '#fb923c', backgroundColor: '#fff7ed' },
  pillText: { color: '#4b5563', fontSize: 12, fontWeight: '600' },
  pillTextActive: { color: '#c2410c' },
  input: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  button: { marginTop: 8, backgroundColor: '#ea580c', borderRadius: 10, height: 46, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700' },
  muted: { color: '#6b7280' },
  historyCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 12, padding: 12 },
  historyTop: { color: '#c2410c', fontSize: 12, fontWeight: '700' },
  historyMeta: { marginTop: 4, color: '#374151' },
});
