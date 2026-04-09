import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useMobileAuth } from '../../src/context/AuthContext';
import { useMobileData } from '../../src/context/DataContext';

export default function MobileRegisterScreen() {
  const { user } = useMobileAuth();
  const { addPatient, isSaving } = useMobileData();

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female'>('Male');
  const [phone, setPhone] = useState('');
  const [lgaTown, setLgaTown] = useState('');
  const [state, setState] = useState('Niger');
  const [disabilityType, setDisabilityType] = useState<'Physical' | 'Hearing' | 'Visual' | 'Mental' | 'None'>('None');
  const [modalOpen, setModalOpen] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ patientCode: string; name: string } | null>(null);

  const onSubmit = async () => {
    if (!user) return;
    if (!firstName.trim() || !surname.trim() || !age || !phone.trim() || !lgaTown.trim()) {
      Alert.alert('Validation', 'Please complete all required fields.');
      return;
    }

    try {
      const created = await addPatient({
        firstName: firstName.trim(),
        surname: surname.trim(),
        age: Number(age),
        sex,
        phone: phone.trim(),
        lgaTown: lgaTown.trim(),
        state: state.trim(),
        disabilityType,
        outreachCentreName: user.centre.name,
        createdBy: user.name,
      });

      setCreatedInfo({ patientCode: created.patientCode, name: `${created.firstName} ${created.surname}` });
      setModalOpen(true);

      setFirstName('');
      setSurname('');
      setAge('');
      setSex('Male');
      setPhone('');
      setLgaTown('');
      setState('Niger');
      setDisabilityType('None');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unable to register patient.');
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>Register Patient</Text>

        <Input label="First Name" value={firstName} onChangeText={setFirstName} />
        <Input label="Surname" value={surname} onChangeText={setSurname} />
        <Input label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" />

        <View style={styles.twoCol}>
          <PillSelect
            label="Sex"
            options={['Male', 'Female']}
            selected={sex}
            onSelect={(v) => setSex(v as 'Male' | 'Female')}
          />
          <PillSelect
            label="Disability"
            options={['None', 'Physical', 'Hearing', 'Visual', 'Mental']}
            selected={disabilityType}
            onSelect={(v) => setDisabilityType(v as 'Physical' | 'Hearing' | 'Visual' | 'Mental' | 'None')}
          />
        </View>

        <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label="LGA / Town" value={lgaTown} onChangeText={setLgaTown} />
        <Input label="State" value={state} onChangeText={setState} />

        <Input label="Catchment Area" value={user?.centre.name ?? ''} editable={false} />

        <Pressable style={[styles.submit, isSaving && styles.submitDisabled]} onPress={onSubmit} disabled={isSaving}>
          <Text style={styles.submitText}>{isSaving ? 'Saving...' : 'Register Patient'}</Text>
        </Pressable>
      </View>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.okCircle}><Ionicons name="checkmark" size={20} color="#16a34a" /></View>
              <Text style={styles.modalTitle}>Patient Registered</Text>
            </View>
            <Text style={styles.modalText}>{createdInfo?.name}</Text>
            <Text style={styles.modalId}>Patient ID: {createdInfo?.patientCode}</Text>
            <Pressable style={styles.closeBtn} onPress={() => setModalOpen(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Input({ label, ...props }: { label: string; value: string; onChangeText?: (v: string) => void; keyboardType?: 'default' | 'number-pad' | 'phone-pad'; editable?: boolean }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, props.editable === false && styles.inputDisabled]}
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}

function PillSelect({ label, options, selected, onSelect }: { label: string; options: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((o) => (
          <Pressable key={o} onPress={() => onSelect(o)} style={[styles.pill, selected === o && styles.pillActive]}>
            <Text style={[styles.pillText, selected === o && styles.pillTextActive]}>{o}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f9fafb' },
  container: { padding: 16, paddingBottom: 36 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', padding: 14 },
  heading: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 10 },
  label: { fontSize: 13, color: '#4b5563', fontWeight: '600', marginBottom: 6 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    color: '#111827',
  },
  inputDisabled: { backgroundColor: '#f3f4f6', color: '#6b7280' },
  twoCol: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pill: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  pillActive: { borderColor: '#fb923c', backgroundColor: '#fff7ed' },
  pillText: { color: '#4b5563', fontWeight: '600', fontSize: 12 },
  pillTextActive: { color: '#c2410c' },
  submit: { marginTop: 8, height: 46, borderRadius: 10, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center' },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: 16, backgroundColor: '#fff', padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  okCircle: { height: 32, width: 32, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalText: { marginTop: 16, color: '#111827', fontWeight: '600' },
  modalId: { marginTop: 8, color: '#c2410c', fontWeight: '700' },
  closeBtn: { marginTop: 20, alignSelf: 'flex-end', backgroundColor: '#ea580c', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
  closeBtnText: { color: '#fff', fontWeight: '700' },
});
