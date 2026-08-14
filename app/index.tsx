import { Redirect } from 'expo-router';

// Landing route. Real logic (route to Register vs Event based on auth state)
// arrives in Phase 3; for now this just proves the navigation shell works.
export default function Index() {
  return <Redirect href="/register" />;
}
