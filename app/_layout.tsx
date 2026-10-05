import '../global.css';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { Redirect, Stack, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator, View } from 'react-native';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

// Web では expo-secure-store が使えないため、tokenCache を渡さず Clerk の Cookie 管理に任せる
const tokenCache =
  process.env.EXPO_OS === 'web'
    ? undefined
    : {
        async getToken(key: string) {
          return SecureStore.getItemAsync(key);
        },
        async saveToken(key: string, value: string) {
          return SecureStore.setItemAsync(key, value);
        },
        async clearToken(key: string) {
          return SecureStore.deleteItemAsync(key);
        },
      };

function InitialLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();

  // 認証状態のロード待ち
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  const inAuthGroup = segments[0] === '(auth)';
  const inTabsGroup = segments[0] === '(tabs)';

  // ログイン済み → 認証グループにいる場合はタブへ
  if (isSignedIn && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  // 未ログイン → タブグループにいる場合はログインへ
  if (!isSignedIn && inTabsGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  // 未ログイン + どこにもいない場合もログインへ
  if (!isSignedIn && !inAuthGroup && !inTabsGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0B0E' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="book/[id]"
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <InitialLayout />
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
