import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#12071f' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#12071f' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Register' }} />
      <Stack.Screen name="event" options={{ title: 'Event & Ticket' }} />
      <Stack.Screen name="check-in" options={{ title: 'Check-In' }} />
      <Stack.Screen name="reveal" options={{ title: 'Reveal' }} />
      <Stack.Screen name="admin" options={{ title: 'Admin' }} />
    </Stack>
  );
}
