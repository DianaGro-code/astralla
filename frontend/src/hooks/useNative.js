import { Capacitor } from '@capacitor/core';

export function useNative() {
  return Capacitor.isNativePlatform();
}
