import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useMobileAuth } from '../../src/context/AuthContext';
import { mobileApi } from '../../src/services/api';

type CentreItem = { id: string; code: string; name: string };
type AdminItem = { id: string; fullName: string; email: string; role: string; centreId?: string; centre?: { name: string } };

export default function SuperAdminAdminsScreen() {
  const { user } = useMobileAuth();
  const isSuperAdmin = user?.role === 'Super Admin';

  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Admin@1234');
  const [centreId, setCentreId] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingEmail, setEditingEmail] = useState('');
  const [editingCentreId, setEditingCentreId] = useState('');

  const centreNameById = useMemo(() => new Map(centres.map((c) => [c.id, `${c.code} - ${c.name}`])), [centres]);

  const loadItems = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const [usersList, centresList] = await Promise.all([
        mobileApi.users.list({ includeInactive: true, page: 1, limit: 100 }),
        mobileApi.centres.list(true),
      ]);
      setAdmins(usersList.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'));
      setCentres(centresList);
      if (!centreId && centresList[0]?.id) setCentreId(centresList[0].id);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to load admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [isSuperAdmin]);

  const onCreate = async () => {
    if (!fullName.trim() || !email.trim() || !password || !centreId) {
      Alert.alert('Validation', 'Name, email, password and centre are required.');
      return;
    }
    await mobileApi.users.create({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      role: 'ADMIN',
      centreId,
    });
    setFullName('');
    setEmail('');
    setPassword('Admin@1234');
    await loadItems();
  };

  const onUpdate = async () => {
    if (!editingId) return;
    await mobileApi.users.update(editingId, {
      fullName: editingName.trim(),
      email: editingEmail.trim(),
      centreId: editingCentreId.trim(),
    });
    setEditingId(null);
    await loadItems();
  };

  const onDelete = async (id: string) => {
    await mobileApi.users.remove(id);
    await loadItems();
  };

  if (!isSuperAdmin) {
    return <View style={styles.centered}><Text style={styles.denied}>Super admin access only.</Text></View>;
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Admins</Text>
        <Pressable style={styles.refreshBtn} onPress={() => void loadItems()}>
          <Text style={styles.refreshText}>{loading ? 'Refreshing...' : 'Refresh'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create Admin</Text>
        <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} />
        <TextInput style={styles.input} placeholder="Centre ID" value={centreId} onChangeText={setCentreId} />
        <Text style={styles.hint}>{centreNameById.get(centreId) ?? 'Unknown centre ID'}</Text>
        <Pressable style={styles.actionBtn} onPress={() => void onCreate()}><Text style={styles.actionText}>Create</Text></Pressable>
      </View>

      {editingId ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Update Admin</Text>
          <TextInput style={styles.input} placeholder="Full name" value={editingName} onChangeText={setEditingName} />
          <TextInput style={styles.input} placeholder="Email" value={editingEmail} onChangeText={setEditingEmail} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Centre ID" value={editingCentreId} onChangeText={setEditingCentreId} />
          <Text style={styles.hint}>{centreNameById.get(editingCentreId) ?? 'Unknown centre ID'}</Text>
          <View style={styles.row}>
            <Pressable style={styles.secondaryBtn} onPress={() => setEditingId(null)}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
            <Pressable style={styles.actionBtnSmall} onPress={() => void onUpdate()}><Text style={styles.actionText}>Save</Text></Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Admins List</Text>
        {admins.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.fullName} ({item.role})</Text>
              <Text style={styles.itemMeta}>{item.email}</Text>
              <Text style={styles.itemMeta}>{item.centre?.name ?? centreNameById.get(item.centreId ?? '') ?? item.centreId ?? ''}</Text>
            </View>
            <Pressable
              style={styles.editBtn}
              onPress={() => {
                setEditingId(item.id);
                setEditingName(item.fullName);
                setEditingEmail(item.email);
                setEditingCentreId(item.centreId ?? '');
              }}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.deleteBtn} onPress={() => void onDelete(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 14, gap: 12, paddingBottom: 30 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  denied: { color: '#991b1b', fontWeight: '700' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  refreshBtn: { backgroundColor: '#1f2937', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  refreshText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#9a3412' },
  input: { height: 42, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, color: '#111827' },
  hint: { color: '#6b7280', fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  actionBtn: { backgroundColor: '#ea580c', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  actionBtnSmall: { backgroundColor: '#ea580c', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  secondaryText: { color: '#111827', fontWeight: '700' },
  listItem: { flexDirection: 'row', gap: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8, marginTop: 2 },
  itemTitle: { color: '#111827', fontWeight: '700', fontSize: 13 },
  itemMeta: { color: '#6b7280', fontSize: 12, marginTop: 1 },
  editBtn: { backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  editText: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },
  deleteBtn: { backgroundColor: '#fee2e2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  deleteText: { color: '#b91c1c', fontWeight: '700', fontSize: 12 },
});
