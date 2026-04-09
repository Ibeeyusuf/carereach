import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useMobileAuth } from '../../src/context/AuthContext';
import { useMobileData } from '../../src/context/DataContext';
import { mobileApi } from '../../src/services/api';

export default function MobileRegisterScreen() {
  const { user } = useMobileAuth();
  const { addPatient, isSaving } = useMobileData();

  const [centres, setCentres] = useState<{ id: string; code: string; name: string }[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState('');
  const [showCentreOptions, setShowCentreOptions] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'Male' | 'Female'>('Male');
  const [phone, setPhone] = useState('');
  const [lgaTown, setLgaTown] = useState('');
  const [state, setState] = useState('Niger');
  const [disabilityType, setDisabilityType] = useState<'Physical' | 'Hearing' | 'Visual' | 'Mental' | 'None'>('None');

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<string>('image/jpeg');

  const [modalOpen, setModalOpen] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{ patientCode: string; name: string } | null>(null);

  const selectedCentreName = useMemo(
    () => centres.find((centre) => centre.id === selectedCentreId)?.name ?? '',
    [centres, selectedCentreId],
  );

  useEffect(() => {
    const loadCentres = async () => {
      try {
        const dbCentres = await mobileApi.centres.list(true);
        setCentres(dbCentres);
        if (dbCentres.length) {
          const defaultCentre = dbCentres.find((c) => c.id === user?.centre.id) ?? dbCentres[0];
          setSelectedCentreId(defaultCentre.id);
        }
      } catch (error) {
        Alert.alert('Warning', error instanceof Error ? error.message : 'Unable to load centres');
      }
    };

    void loadCentres();
  }, [user?.centre.id]);

  const onTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.72,
      exif: false,
    });

    if (result.canceled || !result.assets.length) return;

    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setPhotoType(asset.mimeType ?? 'image/jpeg');
  };

  const onSubmit = async () => {
    if (!user) return;
    if (!firstName.trim() || !surname.trim() || !age || !phone.trim() || !lgaTown.trim() || !selectedCentreName) {
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
        outreachCentreName: selectedCentreName,
        createdBy: user.name,
        photoUri: photoUri ?? undefined,
        photoType: photoType ?? 'image/jpeg',
        photoName: `patient-${Date.now()}.jpg`,
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
      setPhotoUri(null);
      setPhotoType('image/jpeg');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unable to register patient.');
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>Register Patient</Text>

        <View style={styles.photoCard}>
          <Text style={styles.label}>Patient Photograph (Optional)</Text>
          <View style={styles.photoRow}>
            {photoUri ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <Pressable style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person-outline" size={24} color="#9ca3af" />
                <Text style={styles.photoPlaceholderText}>No photo</Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 8 }}>
              <Pressable style={styles.photoBtn} onPress={() => void onTakePhoto()}>
                <Ionicons name="camera-outline" size={16} color="#c2410c" />
                <Text style={styles.photoBtnText}>Take Photo</Text>
              </Pressable>
              <Text style={styles.photoHint}>Camera snap only. Image is compressed before upload.</Text>
            </View>
          </View>
        </View>

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

        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Outreach Centre Name</Text>
          <Pressable style={styles.selectBtn} onPress={() => setShowCentreOptions((prev) => !prev)}>
            <Text style={styles.selectBtnText}>{selectedCentreName || 'Select Outreach Centre'}</Text>
            <Text style={styles.selectChevron}>{showCentreOptions ? '▲' : '▼'}</Text>
          </Pressable>
          {showCentreOptions ? (
            <View style={styles.selectList}>
              {centres.map((centre) => {
                const selected = centre.id === selectedCentreId;
                return (
                  <Pressable
                    key={centre.id}
                    style={[styles.selectOption, selected && styles.selectOptionActive]}
                    onPress={() => {
                      setSelectedCentreId(centre.id);
                      setShowCentreOptions(false);
                    }}>
                    <Text style={[styles.selectOptionText, selected && styles.selectOptionTextActive]}>
                      {centre.code} - {centre.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

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

function Input({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  editable?: boolean;
}) {
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

function PillSelect({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
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
  photoCard: {
    borderWidth: 1,
    borderColor: '#f3f4f6',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoPreviewWrap: { position: 'relative' },
  photoPreview: { width: 86, height: 86, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: { marginTop: 4, color: '#9ca3af', fontSize: 11 },
  photoBtn: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fdba74',
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  photoBtnText: { color: '#c2410c', fontWeight: '700', fontSize: 13 },
  photoHint: { color: '#9ca3af', fontSize: 11 },
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
  selectBtn: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectBtnText: { color: '#111827', fontSize: 14, flex: 1, paddingRight: 8 },
  selectChevron: { color: '#6b7280', fontSize: 12 },
  selectList: { marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' },
  selectOption: { paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  selectOptionActive: { backgroundColor: '#fff7ed' },
  selectOptionText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  selectOptionTextActive: { color: '#9a3412' },
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
