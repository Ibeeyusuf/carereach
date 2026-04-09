import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FacebookSkeleton } from '../../src/components/FacebookLoading';
import { useMobileAuth } from '../../src/context/AuthContext';
import { useMobileData } from '../../src/context/DataContext';

export default function MobileHomeScreen() {
  const router = useRouter();
  const { user } = useMobileAuth();
  const { patients, postOps, isLoadingPatients, syncNow, isSyncing, outboxCount, lastSyncedAt, syncError } = useMobileData();

  const stats = useMemo(() => {
    if (!user) return { total: 0, today: 0, pending: 0 };
    const scoped = user.role === 'Admin' ? patients : patients.filter((p) => p.centreCode === user.centre.code);
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = scoped.filter((p) => p.createdAt.slice(0, 10) === today).length;
    const scopedPost = postOps.filter((p) => p.centreCode === user.centre.code);
    const pending = scopedPost.filter((p) => p.stage !== 'Week 5').length;
    return { total: scoped.length, today: todayCount, pending };
  }, [patients, postOps, user]);

  const actions = user?.role === 'Super Admin'
    ? [{ label: 'Super Admin Panel', icon: 'settings-outline' as const, route: '/(tabs)/super-admin' }]
    : [
        { label: 'Register Patient', icon: 'person-add-outline' as const, route: '/(tabs)/register' },
        { label: 'Search Patient', icon: 'search-outline' as const, route: '/(tabs)/patients' },
        { label: 'Visual Acuity', icon: 'eye-outline' as const, route: '/(tabs)/va' },
        { label: 'Consultation', icon: 'medkit-outline' as const, route: '/(tabs)/consult' },
        { label: 'Post-Op Follow-up', icon: 'pulse-outline' as const, route: '/(tabs)/post-op' },
      ];

  const onSync = async () => {
    try {
      await syncNow();
      Alert.alert('Sync complete', 'Mobile data has been synchronized with the server.');
    } catch (error) {
      Alert.alert('Sync failed', error instanceof Error ? error.message : 'Unable to sync now.');
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View>
        <Text style={styles.greet}>Hello, {user?.name}</Text>
        <Text style={styles.meta}>{user?.role} - {user?.centre.name}</Text>
      </View>

      <View style={styles.syncCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.syncTitle}>Offline Sync</Text>
          <Text style={styles.syncMeta}>Outbox: {outboxCount} pending</Text>
          <Text style={styles.syncMeta}>Last sync: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}</Text>
          {syncError ? <Text style={styles.syncError}>{syncError}</Text> : null}
        </View>
        <Pressable style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]} onPress={onSync} disabled={isSyncing}>
          <Text style={styles.syncBtnText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
        </Pressable>
      </View>

      {isLoadingPatients ? (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}><FacebookSkeleton height={12} width="55%" /><View style={{ height: 10 }} /><FacebookSkeleton height={30} width="35%" /></View>
          <View style={styles.statCard}><FacebookSkeleton height={12} width="35%" /><View style={{ height: 10 }} /><FacebookSkeleton height={30} width="28%" /></View>
          <View style={[styles.statCard, styles.warningCard]}><FacebookSkeleton height={12} width="48%" /><View style={{ height: 10 }} /><FacebookSkeleton height={30} width="30%" /></View>
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statLabel}>Total Patients</Text><Text style={styles.statValue}>{stats.total}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>Today</Text><Text style={[styles.statValue, { color: '#ea580c' }]}>{stats.today}</Text></View>
          <View style={[styles.statCard, styles.warningCard]}><Text style={styles.statLabel}>Pending Post-Ops</Text><Text style={styles.statValue}>{stats.pending}</Text></View>
        </View>
      )}

      <View>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {actions.map((action) => (
            <Pressable key={action.label} onPress={() => router.push(action.route as never)} style={styles.actionCard}>
              <View style={styles.actionIconWrap}><Ionicons name={action.icon} size={22} color="#fff" /></View>
              <Text style={styles.actionText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f9fafb' },
  container: { padding: 16, gap: 18, paddingBottom: 36 },
  greet: { fontSize: 24, fontWeight: '800', color: '#111827' },
  meta: { marginTop: 4, color: '#6b7280' },
  syncCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncTitle: { fontSize: 15, fontWeight: '800', color: '#9a3412' },
  syncMeta: { marginTop: 2, fontSize: 12, color: '#6b7280' },
  syncError: { marginTop: 4, fontSize: 12, color: '#b91c1c' },
  syncBtn: { backgroundColor: '#ea580c', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  syncBtnDisabled: { opacity: 0.7 },
  syncBtnText: { color: '#fff', fontWeight: '700' },
  statsGrid: { gap: 10 },
  statCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f3f4f6' },
  warningCard: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  statLabel: { fontSize: 12, textTransform: 'uppercase', color: '#6b7280', fontWeight: '600' },
  statValue: { marginTop: 6, fontSize: 26, fontWeight: '800', color: '#111827' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10 },
  actionGrid: { gap: 10 },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconWrap: { height: 40, width: 40, borderRadius: 20, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center' },
  actionText: { fontWeight: '700', color: '#111827' },
});
