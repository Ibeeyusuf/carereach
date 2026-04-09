import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useMobileAuth } from '../src/context/AuthContext';

export default function EntryPage() {
  const { isAuthenticated, isSessionHydrating } = useMobileAuth();

  if (isSessionHydrating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/login'} />;
}
