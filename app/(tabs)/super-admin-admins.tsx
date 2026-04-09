import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useMobileAuth } from '../../src/context/AuthContext';
import { mobileApi } from '../../src/services/api';
import type { Role } from '../../src/types';

type CentreItem = { id: string; code: string; name: string };
type UserItem = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  centreId?: string;
  centre?: { name: string; code?: string };
};

const ROLE_OPTIONS: Role[] = [
  'Super Admin',
  'Admin',
  'Doctor',
  'Surgeon',
  'Scrub Nurse',
  'Anesthetist',
  'Data Entry',
];

const roleToApi: Record<Role, string> = {
  'Super Admin': 'SUPER_ADMIN',
  Admin: 'ADMIN',
  Doctor: 'DOCTOR',
  Surgeon: 'SURGEON',
  'Scrub Nurse': 'SCRUB_NURSE',
  Anesthetist: 'ANESTHETIST',
  'Data Entry': 'DATA_ENTRY',
};

function mapApiRoleToUi(role: string): Role {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'ADMIN':
      return 'Admin';
    case 'DOCTOR':
      return 'Doctor';
    case 'SURGEON':
      return 'Surgeon';
    case 'SCRUB_NURSE':
      return 'Scrub Nurse';
    case 'ANESTHETIST':
      return 'Anesthetist';
    case 'DATA_ENTRY':
      return 'Data Entry';
    default:
      return 'Doctor';
  }
}

export default function SuperAdminAdminsScreen() {
  const { user } = useMobileAuth();
  const isSuperAdmin = user?.role === 'Super Admin';

  const [users, setUsers] = useState<UserItem[]>([]);
  const [centres, setCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Admin@1234');
  const [centreId, setCentreId] = useState('');
  const [role, setRole] = useState<Role>('Admin');
  const [showCentreOptions, setShowCentreOptions] = useState(false);
  const [showRoleOptions, setShowRoleOptions] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingEmail, setEditingEmail] = useState('');
  const [editingCentreId, setEditingCentreId] = useState('');
  const [editingRole, setEditingRole] = useState<Role>('Admin');
  const [editingShowCentreOptions, setEditingShowCentreOptions] = useState(false);
  const [editingShowRoleOptions, setEditingShowRoleOptions] = useState(false);

  const centreNameById = useMemo(() => new Map(centres.map((c) => [c.id, `${c.code} - ${c.name}`])), [centres]);
  const selectedCentreLabel = centreNameById.get(centreId) ?? 'Select centre';
  const editingCentreLabel = centreNameById.get(editingCentreId) ?? 'Select centre';

  const loadItems = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const [usersList, centresList] = await Promise.all([
        mobileApi.users.list({ includeInactive: true, page: 1, limit: 100 }),
        mobileApi.centres.list(true),
      ]);
      setUsers(usersList);
      setCentres(centresList);
      if (!centreId && centresList[0]?.id) setCentreId(centresList[0].id);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to load users');
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
      role: roleToApi[role],
      centreId,
    });
    setFullName('');
    setEmail('');
    setPassword('Admin@1234');
    setRole('Admin');
    await loadItems();
  };

  const onUpdate = async () => {
    if (!editingId) return;
    const isSelfSuperAdminEdit = user?.role === 'Super Admin' && user?.id === editingId;
    await mobileApi.users.update(editingId, {
      fullName: editingName.trim(),
      email: editingEmail.trim(),
      centreId: editingCentreId.trim(),
      ...(isSelfSuperAdminEdit ? {} : { role: roleToApi[editingRole] }),
    });
    setEditingId(null);
    await loadItems();
  };

  const onDelete = async (id: string) => {
    if (user?.id === id) {
      Alert.alert('Not allowed', 'You cannot deactivate your own account.');
      return;
    }
    await mobileApi.users.remove(id);
    await loadItems();
  };

  if (!isSuperAdmin) {
    return <View style={styles.centered}><Text style={styles.denied}>Super admin access only.</Text></View>;
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Users</Text>
        <Pressable style={styles.refreshBtn} onPress={() => void loadItems()}>
          <Text style={styles.refreshText}>{loading ? 'Refreshing...' : 'Refresh'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create User</Text>
        <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} />

        <Text style={styles.fieldLabel}>Role</Text>
        <Pressable style={styles.selectBtn} onPress={() => setShowRoleOptions((prev) => !prev)}>
          <Text style={styles.selectBtnText}>{role}</Text>
          <Text style={styles.selectChevron}>{showRoleOptions ? '^' : 'v'}</Text>
        </Pressable>
        {showRoleOptions ? (
          <View style={styles.selectList}>
            {ROLE_OPTIONS.map((opt) => {
              const selected = opt === role;
              return (
                <Pressable
                  key={opt}
                  style={[styles.selectOption, selected && styles.selectOptionActive]}
                  onPress={() => {
                    setRole(opt);
                    setShowRoleOptions(false);
                  }}>
                  <Text style={[styles.selectOptionText, selected && styles.selectOptionTextActive]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>Centre</Text>
        <Pressable style={styles.selectBtn} onPress={() => setShowCentreOptions((prev) => !prev)}>
          <Text style={styles.selectBtnText}>{selectedCentreLabel}</Text>
          <Text style={styles.selectChevron}>{showCentreOptions ? '^' : 'v'}</Text>
        </Pressable>
        {showCentreOptions ? (
          <View style={styles.selectList}>
            {centres.map((centre) => {
              const selected = centre.id === centreId;
              return (
                <Pressable
                  key={centre.id}
                  style={[styles.selectOption, selected && styles.selectOptionActive]}
                  onPress={() => {
                    setCentreId(centre.id);
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

        <Pressable style={styles.actionBtn} onPress={() => void onCreate()}><Text style={styles.actionText}>Create</Text></Pressable>
      </View>

      {editingId ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Update User</Text>
          <TextInput style={styles.input} placeholder="Full name" value={editingName} onChangeText={setEditingName} />
          <TextInput style={styles.input} placeholder="Email" value={editingEmail} onChangeText={setEditingEmail} autoCapitalize="none" />

          <Text style={styles.fieldLabel}>Role</Text>
          <Pressable
            style={[styles.selectBtn, user?.id === editingId && styles.selectBtnDisabled]}
            onPress={() => {
              if (user?.id === editingId) {
                Alert.alert('Role Locked', 'Super Admin cannot change their own role.');
                return;
              }
              setEditingShowRoleOptions((prev) => !prev);
            }}>
            <Text style={styles.selectBtnText}>{editingRole}</Text>
            <Text style={styles.selectChevron}>{editingShowRoleOptions ? '^' : 'v'}</Text>
          </Pressable>
          {editingShowRoleOptions ? (
            <View style={styles.selectList}>
              {ROLE_OPTIONS.map((opt) => {
                const selected = opt === editingRole;
                return (
                  <Pressable
                    key={opt}
                    style={[styles.selectOption, selected && styles.selectOptionActive]}
                    onPress={() => {
                      setEditingRole(opt);
                      setEditingShowRoleOptions(false);
                    }}>
                    <Text style={[styles.selectOptionText, selected && styles.selectOptionTextActive]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Centre</Text>
          <Pressable style={styles.selectBtn} onPress={() => setEditingShowCentreOptions((prev) => !prev)}>
            <Text style={styles.selectBtnText}>{editingCentreLabel}</Text>
            <Text style={styles.selectChevron}>{editingShowCentreOptions ? '^' : 'v'}</Text>
          </Pressable>
          {editingShowCentreOptions ? (
            <View style={styles.selectList}>
              {centres.map((centre) => {
                const selected = centre.id === editingCentreId;
                return (
                  <Pressable
                    key={centre.id}
                    style={[styles.selectOption, selected && styles.selectOptionActive]}
                    onPress={() => {
                      setEditingCentreId(centre.id);
                      setEditingShowCentreOptions(false);
                    }}>
                    <Text style={[styles.selectOptionText, selected && styles.selectOptionTextActive]}>
                      {centre.code} - {centre.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {user?.id === editingId ? (
            <Text style={styles.hint}>Super Admin role cannot be changed on your own account.</Text>
          ) : null}

          <View style={styles.row}>
            <Pressable style={styles.secondaryBtn} onPress={() => setEditingId(null)}><Text style={styles.secondaryText}>Cancel</Text></Pressable>
            <Pressable style={styles.actionBtnSmall} onPress={() => void onUpdate()}><Text style={styles.actionText}>Save</Text></Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Users List</Text>
        {users.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.fullName} ({mapApiRoleToUi(item.role)})</Text>
              <Text style={styles.itemMeta}>{item.email}</Text>
              <Text style={styles.itemMeta}>
                {item.centre?.name ?? centreNameById.get(item.centreId ?? '') ?? item.centreId ?? ''}
              </Text>
            </View>
            <Pressable
              style={styles.editBtn}
              onPress={() => {
                setEditingId(item.id);
                setEditingName(item.fullName);
                setEditingEmail(item.email);
                setEditingCentreId(item.centreId ?? '');
                setEditingRole(mapApiRoleToUi(item.role));
              }}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
            <Pressable
              style={[styles.deleteBtn, user?.id === item.id && styles.deleteBtnDisabled]}
              onPress={() => void onDelete(item.id)}>
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
  fieldLabel: { color: '#374151', fontSize: 13, fontWeight: '600' },
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
  deleteBtnDisabled: { opacity: 0.5 },
  deleteText: { color: '#b91c1c', fontWeight: '700', fontSize: 12 },
  selectBtn: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  selectBtnDisabled: { opacity: 0.6 },
  selectBtnText: { color: '#111827', fontSize: 14, flex: 1, paddingRight: 8 },
  selectChevron: { color: '#6b7280', fontSize: 12 },
  selectList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  selectOption: { paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  selectOptionActive: { backgroundColor: '#fff7ed' },
  selectOptionText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  selectOptionTextActive: { color: '#9a3412' },
});

