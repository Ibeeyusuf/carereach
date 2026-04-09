import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useMobileAuth } from '../../src/context/AuthContext';

export default function SuperAdminMenuScreen() {
  const router = useRouter();
  const { user } = useMobileAuth();

  if (user?.role !== 'Super Admin') {
    return (
      <View style={styles.centered}>
        <Text style={styles.denied}>Super admin access only.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Super Admin</Text>
      <Text style={styles.subtitle}>Manage each resource on its own screen.</Text>

      <Pressable style={styles.card} onPress={() => router.push('/(tabs)/super-admin-centres')}>
        <Text style={styles.cardTitle}>Centres</Text>
        <Text style={styles.cardMeta}>List, create, update and deactivate centres.</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push('/(tabs)/super-admin-admins')}>
        <Text style={styles.cardTitle}>Admins</Text>
        <Text style={styles.cardMeta}>List, create, update and deactivate admins.</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push('/(tabs)/super-admin-drugs')}>
        <Text style={styles.cardTitle}>Drugs</Text>
        <Text style={styles.cardMeta}>List, create, update and delete drugs.</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => router.push('/(tabs)/super-admin-glasses')}>
        <Text style={styles.cardTitle}>Glasses</Text>
        <Text style={styles.cardMeta}>List, create, update and delete eyeglasses items.</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 14, gap: 12, paddingBottom: 30 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  denied: { color: '#991b1b', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { color: '#6b7280', marginTop: 2, marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 4,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#9a3412' },
  cardMeta: { fontSize: 13, color: '#6b7280' },
});
