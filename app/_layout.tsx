import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { MobileAuthProvider } from '../src/context/AuthContext';
import { MobileDataProvider } from '../src/context/DataContext';

export default function RootLayout() {
  return (
    <MobileAuthProvider>
      <MobileDataProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="dark" />
      </MobileDataProvider>
    </MobileAuthProvider>
  );
}
