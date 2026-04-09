import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FacebookCardSkeleton } from '../../src/components/FacebookLoading';
import { useMobileAuth } from '../../src/context/AuthContext';
import { useMobileData } from '../../src/context/DataContext';

export default function MobilePatientsScreen() {
  const { user } = useMobileAuth();
  const { patients, loadPatients, isLoadingPatients } = useMobileData();
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    void loadPatients();
  }, []);

  const scopedPatients = useMemo(() => {
    if (!user) return [];
    const scoped = user.role === 'Admin' || user.role === 'Super Admin'
      ? patients
      : patients.filter((p) => p.centreCode === user.centre.code);
    const q = query.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter((p) => {
      const name = `${p.firstName} ${p.surname}`.toLowerCase();
      return name.includes(q) || p.patientCode.toLowerCase().includes(q) || p.phone.includes(q);
    });
  }, [patients, query, user]);

  const onSearch = async (text: string) => {
    setQuery(text);
    await loadPatients({ q: text.trim() || undefined });
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#9ca3af" />
        <TextInput
          value={query}
          onChangeText={onSearch}
          placeholder="Search by name, patient ID or phone"
          style={styles.searchInput}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {isLoadingPatients ? (
        <>
          {Array.from({ length: 6 }).map((_, idx) => (
            <FacebookCardSkeleton key={`patient-skeleton-${idx}`} />
          ))}
        </>
      ) : scopedPatients.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>No patients found</Text></View>
      ) : (
        scopedPatients.map((p) => {
          const expanded = expandedId === p.id;
          return (
            <Pressable key={p.id} style={styles.card} onPress={() => setExpandedId(expanded ? null : p.id)}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.firstName} {p.surname}</Text>
                  <Text style={styles.code}>{p.patientCode}</Text>
                  <Text style={styles.meta}>{p.age}y - {p.sex}</Text>
                </View>
                <Ionicons name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} color="#9ca3af" />
              </View>

              {expanded ? (
                <View style={styles.expanded}>
                  <Text style={styles.item}>Phone: {p.phone}</Text>
                  <Text style={styles.item}>Location: {p.lgaTown}, {p.state}</Text>
                  <Text style={styles.item}>Centre: {p.centreName ?? p.centreCode}</Text>
                  <Text style={styles.item}>Registered by: {p.createdBy}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f9fafb' },
  container: { padding: 16, gap: 10, paddingBottom: 28 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 14, padding: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  name: { fontWeight: '800', color: '#111827', fontSize: 16 },
  code: { marginTop: 4, color: '#c2410c', fontFamily: 'monospace', fontSize: 12 },
  meta: { marginTop: 2, color: '#6b7280', fontSize: 12 },
  expanded: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8, gap: 4 },
  item: { fontSize: 13, color: '#4b5563' },
  empty: { padding: 18, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#f3f4f6' },
  emptyTitle: { color: '#6b7280', textAlign: 'center', fontWeight: '600' },
});
