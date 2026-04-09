import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useMobileAuth } from '../../src/context/AuthContext';
import { mobileApi } from '../../src/services/api';

type CentreItem = { id: string; code: string; name: string; isActive?: boolean };

export default function SuperAdminCentresScreen() {
  const { user } = useMobileAuth();
  const isSuperAdmin = user?.role === 'Super Admin';

  const [items, setItems] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState('');
  const [editingName, setEditingName] = useState('');

  const loadItems = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      setItems(await mobileApi.centres.list(true));
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to load centres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [isSuperAdmin]);

  const onCreate = async () => {
    if (!code.trim() || !name.trim()) {
      Alert.alert('Validation', 'Code and name are required.');
      return;
    }
    await mobileApi.centres.create({ code: code.trim().toUpperCase(), name: name.trim() });
    setCode('');
    setName('');
    await loadItems();
  };

  const onUpdate = async () => {
    if (!editingId) return;
    await mobileApi.centres.update(editingId, {
      code: editingCode.trim().toUpperCase(),
      name: editingName.trim(),
    });
    setEditingId(null);
    await loadItems();
  };

  const onDelete = async (id: string) => {
    await mobileApi.centres.remove(id);
    await loadItems();
  };

  if (!isSuperAdmin) {
    return <View style={styles.centered}><Text style={styles.denied}>Super admin access only.</Text></View>;
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Centres</Text>
        <Pressable style={styles.refreshBtn} onPress={() => void loadItems()}>
          <Text style={styles.refreshText}>{loading ? 'Refreshing...' : 'Refresh'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create Centre</Text>
        <TextInput style={styles.input} placeholder="Code" value={code} onChangeText={setCode} />
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        <Pressable style={styles.actionBtn} onPress={() => void onCreate()}><Text style={styles.actionText}>Create</Text></Pressable>
      </View>

      {editingId ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Update Centre</Text>
          <TextInput style={styles.input} placeholder="Code" value={editingCode} onChangeText={setEditingCode} />
          <TextInput style={styles.input} placeholder="Name" value={editingName} onChangeText={setEditingName} />
          <View style={styles.row}>
            <Pressable style={styles.secondaryBtn} onPress={() => setEditingId(null)}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
            <Pressable style={styles.actionBtnSmall} onPress={() => void onUpdate()}><Text style={styles.actionText}>Save</Text></Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Centres List</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.code} - {item.name}</Text>
              <Text style={styles.itemMeta}>{item.isActive ? 'Active' : 'Inactive'}</Text>
            </View>
            <Pressable
              style={styles.editBtn}
              onPress={() => {
                setEditingId(item.id);
                setEditingCode(item.code);
                setEditingName(item.name);
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
  row: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  actionBtn: { backgroundColor: '#ea580c', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  actionBtnSmall: { backgroundColor: '#ea580c', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  secondaryText: { color: '#111827', fontWeight: '700' },
  listItem: { flexDirection: 'row', gap: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8, marginTop: 2 },
  itemTitle: { color: '#111827', fontWeight: '700', fontSize: 13 },
  itemMeta: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  editBtn: { backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  editText: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },
  deleteBtn: { backgroundColor: '#fee2e2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  deleteText: { color: '#b91c1c', fontWeight: '700', fontSize: 12 },
});
