import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text } from 'react-native';

import { useMobileAuth } from '../../src/context/AuthContext';
import { useMobileData } from '../../src/context/DataContext';
import { FacebookSavingOverlay } from '../../src/components/FacebookLoading';

export default function MobileTabsLayout() {
  const router = useRouter();
  const { logout, user } = useMobileAuth();
  const { isSaving } = useMobileData();
  const isSuperAdmin = user?.role === 'Super Admin';

  const onLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#ea580c',
          tabBarInactiveTintColor: '#9ca3af',
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { color: '#111827', fontWeight: '700' },
          tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 8 },
          headerRight: () => (
            <Pressable onPress={() => void onLogout()} style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ color: '#ea580c', fontWeight: '600' }}>Logout</Text>
            </Pressable>
          ),
          headerLeft: () => null,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: `Home${user ? ` - ${user.centre.code}` : ''}`,
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="patients"
          options={{
            title: 'Patients',
            tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
            href: isSuperAdmin ? null : undefined,
          }}
        />
        <Tabs.Screen
          name="register"
          options={{
            title: 'Register',
            tabBarIcon: ({ color, size }) => <Ionicons name="person-add-outline" size={size} color={color} />,
            href: isSuperAdmin ? null : undefined,
          }}
        />
        <Tabs.Screen
          name="va"
          options={{
            title: 'VA',
            tabBarIcon: ({ color, size }) => <Ionicons name="eye-outline" size={size} color={color} />,
            href: isSuperAdmin ? null : undefined,
          }}
        />
        <Tabs.Screen
          name="consult"
          options={{
            title: 'Consult',
            tabBarIcon: ({ color, size }) => <Ionicons name="medkit-outline" size={size} color={color} />,
            href: isSuperAdmin ? null : undefined,
          }}
        />
        <Tabs.Screen
          name="post-op"
          options={{
            title: 'Post-Op',
            tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" size={size} color={color} />,
            href: isSuperAdmin ? null : undefined,
          }}
        />
        <Tabs.Screen
          name="super-admin"
          options={{
            title: 'Super Admin',
            tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
            href: isSuperAdmin ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="super-admin-centres"
          options={{
            title: 'Centres',
            href: null,
          }}
        />
        <Tabs.Screen
          name="super-admin-admins"
          options={{
            title: 'Admins',
            href: null,
          }}
        />
        <Tabs.Screen
          name="super-admin-drugs"
          options={{
            title: 'Drugs',
            href: null,
          }}
        />
        <Tabs.Screen
          name="super-admin-glasses"
          options={{
            title: 'Glasses',
            href: null,
          }}
        />
      </Tabs>
      <FacebookSavingOverlay visible={isSaving} />
    </>
  );
}
