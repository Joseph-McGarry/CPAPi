import React, { useEffect, useState } from 'react';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Slot } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Platform, useColorScheme, View, ActivityIndicator } from 'react-native';
import { initDatabase, seedDefaults } from '../../lib/db';

// Show alerts when a notification fires in foreground
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

  useEffect(() => {
    (async () => {
      await initDatabase();
      await seedDefaults(); // insert the 5 supplies if missing
      if (Platform.OS === 'ios') {
        await Notifications.requestPermissionsAsync();
      }
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
    </ThemeProvider>
  );
}
