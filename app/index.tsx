import { ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { Screen } from '../components/Screen';
import { useAuthUser } from '../hooks/useAuthUser';

export default function Index() {
  const { user, loading } = useAuthUser();

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color="#f2308c" />
      </Screen>
    );
  }

  return <Redirect href={user ? '/event' : '/register'} />;
}
