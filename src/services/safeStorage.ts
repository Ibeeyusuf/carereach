import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map<string, string>();
let canUseNativeStorage: boolean | null = null;

async function probeNativeStorage(): Promise<boolean> {
  if (canUseNativeStorage !== null) {
    return canUseNativeStorage;
  }

  try {
    await AsyncStorage.getItem('__carereach_probe__');
    canUseNativeStorage = true;
  } catch {
    canUseNativeStorage = false;
  }

  return canUseNativeStorage;
}

export async function safeGetItem(key: string): Promise<string | null> {
  if (await probeNativeStorage()) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      // fallback to memory store
    }
  }
  return memoryStore.get(key) ?? null;
}

export async function safeSetItem(key: string, value: string): Promise<void> {
  if (await probeNativeStorage()) {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // fallback to memory store
    }
  }
  memoryStore.set(key, value);
}

export async function safeRemoveItem(key: string): Promise<void> {
  if (await probeNativeStorage()) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // continue with memory fallback
    }
  }
  memoryStore.delete(key);
}

