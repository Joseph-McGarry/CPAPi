import React, { useEffect, useState } from 'react';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Slot } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Platform, useColorScheme, View, ActivityIndicator, Text } from 'react-native';
import { initDatabase, seedDefaults } from '../lib/db';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const scheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<null | string>(null);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await seedDefaults();
        if (Platform.OS === 'ios') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (e: any) {
        console.error('Boot error:', e);
        setBootError(String(e?.message || e));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        {bootError ? <Text style={{ marginTop: 12, color: 'crimson' }}>{bootError}</Text> : null}
      </View>
    );
  }

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
    </ThemeProvider>
  );
}
