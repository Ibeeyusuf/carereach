import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useMobileAuth } from '../../src/context/AuthContext';
import { mobileApi } from '../../src/services/api';

type CentreItem = { id: string; code: string; name: string };
type GlassesItem = { id: string; description: string; type: string; currentStock: number; reorderLevel: number; centreId: string };

export default function SuperAdminGlassesScreen() {
  const { user } = useMobileAuth();
  const isSuperAdmin = user?.role === 'Super Admin';

  const [items, setItems] = useState<GlassesItem[]>([]);
  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [centreId, setCentreId] = useState('');
  const [description, setDescription] = useState('');
  const [currentStock, setCurrentStock] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('0');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState('0');
  const [editingReorder, setEditingReorder] = useState('0');

  const centreNameById = useMemo(() => new Map(centres.map((c) => [c.id, `${c.code} - ${c.name}`])), [centres]);

  const loadItems = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const [glassesList, centresList] = await Promise.all([
        mobileApi.eyeglasses.listItems({ page: 1, limit: 100 }),
        mobileApi.centres.list(true),
      ]);
      setItems(glassesList.data ?? []);
      setCentres(centresList);
      if (!centreId && centresList[0]?.id) setCentreId(centresList[0].id);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to load eyeglasses items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [isSuperAdmin]);

  const onCreate = async () => {
    if (!centreId || !description.trim()) {
      Alert.alert('Validation', 'Centre and description are required.');
      return;
    }
    await mobileApi.eyeglasses.createItem({
      centreId,
      type: 'READING',
      description: description.trim(),
      currentStock: Number(currentStock) || 0,
      reorderLevel: Number(reorderLevel) || 0,
    });
    setDescription('');
    setCurrentStock('0');
    setReorderLevel('0');
    await loadItems();
  };

  const onUpdate = async () => {
    if (!editingId) return;
    await mobileApi.eyeglasses.updateItem(editingId, {
      currentStock: Number(editingStock) || 0,
      reorderLevel: Number(editingReorder) || 0,
    });
    setEditingId(null);
    await loadItems();
  };

  const onDelete = async (id: string) => {
    await mobileApi.eyeglasses.removeItem(id);
    await loadItems();
  };

  if (!isSuperAdmin) {
    return <View style={styles.centered}><Text style={styles.denied}>Super admin access only.</Text></View>;
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Glasses</Text>
        <Pressable style={styles.refreshBtn} onPress={() => void loadItems()}>
          <Text style={styles.refreshText}>{loading ? 'Refreshing...' : 'Refresh'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create Eyeglasses Item</Text>
        <TextInput style={styles.input} placeholder="Centre ID" value={centreId} onChangeText={setCentreId} />
        <Text style={styles.hint}>{centreNameById.get(centreId) ?? 'Unknown centre ID'}</Text>
        <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} />
        <TextInput style={styles.input} placeholder="Current stock" value={currentStock} onChangeText={setCurrentStock} keyboardType="number-pad" />
        <TextInput style={styles.input} placeholder="Reorder level" value={reorderLevel} onChangeText={setReorderLevel} keyboardType="number-pad" />
        <Pressable style={styles.actionBtn} onPress={() => void onCreate()}><Text style={styles.actionText}>Create</Text></Pressable>
      </View>

      {editingId ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Update Eyeglasses Stock</Text>
          <TextInput style={styles.input} placeholder="Current stock" value={editingStock} onChangeText={setEditingStock} keyboardType="number-pad" />
          <TextInput style={styles.input} placeholder="Reorder level" value={editingReorder} onChangeText={setEditingReorder} keyboardType="number-pad" />
          <View style={styles.row}>
            <Pressable style={styles.secondaryBtn} onPress={() => setEditingId(null)}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
            <Pressable style={styles.actionBtnSmall} onPress={() => void onUpdate()}><Text style={styles.actionText}>Save</Text></Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Eyeglasses List</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.description} ({item.type})</Text>
              <Text style={styles.itemMeta}>{centreNameById.get(item.centreId) ?? item.centreId}</Text>
              <Text style={styles.itemMeta}>Stock: {item.currentStock} | Reorder: {item.reorderLevel}</Text>
            </View>
            <Pressable
              style={styles.editBtn}
              onPress={() => {
                setEditingId(item.id);
                setEditingStock(String(item.currentStock));
                setEditingReorder(String(item.reorderLevel));
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
