import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useMobileAuth } from '../src/context/AuthContext';
import type { Role } from '../src/types';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginOptions, loadLoginOptions, isAuthLoading } = useMobileAuth();

  const [email, setEmail] = useState('admin@carereach.org');
  const [password, setPassword] = useState('Admin@1234');
  const [role, setRole] = useState<Role>('Admin');
  const [centreId, setCentreId] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loginOptions.centres.length) {
      void loadLoginOptions();
      return;
    }

    if (!centreId || !loginOptions.centres.some((centre) => centre.id === centreId)) {
      setCentreId(loginOptions.centres[0].id);
    }

    if (!loginOptions.roles.includes(role)) {
      setRole(loginOptions.roles[0] ?? 'Admin');
    }
  }, [loginOptions.centres, loginOptions.roles]);

  const selectedCentreLabel = useMemo(
    () => loginOptions.centres.find((centre) => centre.id === centreId)?.name ?? 'Select Centre',
    [loginOptions.centres, centreId],
  );

  const onSubmit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter email and password.');
      return;
    }
    if (!centreId) {
      setError('Please select a catchment area.');
      return;
    }

    try {
      await login({
        email: email.trim(),
        password,
        role,
        centreId,
      });
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <View style={styles.logoBox}>
            <Ionicons name="eye-outline" size={34} color="#fff" />
          </View>
          <Text style={styles.title}>MESL Outreach</Text>
          <Text style={styles.subtitle}>Eye Care Outreach Management System</Text>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="staff@mesl.org"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.label}>Sign in as</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleRow}>
                {loginOptions.roles.filter((item) => item !== 'Data Entry').map((item) => {
                  const selected = item === role;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setRole(item)}
                      style={[styles.pill, selected && styles.pillActive]}>
                      <Text style={[styles.pillText, selected && styles.pillTextActive]}>{item}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.col}>
              <Text style={styles.label}>Catchment Area</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleRow}>
                {loginOptions.centres.map((centre) => {
                  const selected = centre.id === centreId;
                  return (
                    <Pressable
                      key={centre.id}
                      onPress={() => setCentreId(centre.id)}
                      style={[styles.pill, selected && styles.pillActive]}>
                      <Text style={[styles.pillText, selected && styles.pillTextActive]}>{centre.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.centrePreview}>{selectedCentreLabel}</Text>
            </View>
          </View>

          <View style={styles.rowBetween}>
            <Pressable onPress={() => setRememberMe((prev) => !prev)} style={styles.rowInline}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]} />
              <Text style={styles.checkboxLabel}>Remember me</Text>
            </Pressable>
            <Text style={styles.forgot}>Forgot password?</Text>
          </View>

          <Pressable style={styles.submitBtn} onPress={onSubmit} disabled={isAuthLoading}>
            <Text style={styles.submitText}>{isAuthLoading ? 'Signing in...' : 'Sign in'}</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>© 2026 MESL. All rights reserved.</Text>
        <Text style={styles.footer}>MESL Outreach v2.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { padding: 16, paddingTop: 42, paddingBottom: 32 },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoBox: {
    height: 64,
    width: 64,
    borderRadius: 16,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 36, fontWeight: '800', color: '#0f172a' },
  subtitle: { marginTop: 8, fontSize: 16, color: '#4b5563' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    padding: 16,
    gap: 8,
  },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, marginBottom: 6 },
  errorText: { color: '#b91c1c', fontSize: 12, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginTop: 6 },
  inputWrap: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    marginTop: 6,
    marginBottom: 6,
    justifyContent: 'center',
  },
  inputIcon: { position: 'absolute', left: 12 },
  input: { paddingLeft: 38, paddingRight: 12, fontSize: 14, color: '#111827' },
  twoCol: { gap: 10 },
  col: { marginTop: 2 },
  roleRow: { marginTop: 6 },
  pill: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  pillActive: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  pillText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  pillTextActive: { color: '#c2410c' },
  centrePreview: { marginTop: 6, fontSize: 12, color: '#6b7280' },
  rowBetween: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowInline: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { height: 16, width: 16, borderRadius: 4, borderWidth: 1, borderColor: '#9ca3af', marginRight: 8 },
  checkboxActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  checkboxLabel: { fontSize: 14, color: '#111827' },
  forgot: { fontSize: 14, color: '#ea580c', fontWeight: '500' },
  submitBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { textAlign: 'center', marginTop: 14, color: '#6b7280', fontSize: 12 },
});
