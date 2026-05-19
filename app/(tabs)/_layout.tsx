import { Stack } from 'expo-router';

export default function TabsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '本棚' }} />
      <Stack.Screen name="search" options={{ title: '書籍検索' }} />
    </Stack>
  );
}
