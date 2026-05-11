// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Slot } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Platform, useColorScheme, View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { initDatabase, seedDefaults } from '../lib/db';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const scheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        await seedDefaults();
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (e: unknown) {
        console.error('Boot error:', e);
        setBootError(e instanceof Error ? e.message : String(e));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        {bootError ? <Text style={{ marginTop: 12, color: 'crimson' }}>{bootError}</Text> : null}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" translucent backgroundColor="transparent" />
        <Slot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
