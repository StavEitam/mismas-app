import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { BounceIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Screen } from '../components/Screen';
import { Avatar } from '../components/Avatar';
import { useAuthUser } from '../hooks/useAuthUser';
import {
  getCheckedInTicketsForEvent,
  getEvent,
  getMyLatestTicket,
  getUser,
  type Event,
} from '../lib/firestore';
import { colors, spacing, typography } from '../theme';

type Attendee = {
  userId: string;
  displayName: string;
  photoUrl: string | null;
};

type Step = 'loading' | 'no-ticket' | 'waiting' | 'revealed';

export default function RevealScreen() {
  const { user, loading: authLoading } = useAuthUser();
  const [step, setStep] = useState<Step>('loading');
  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const myTicket = await getMyLatestTicket(user.uid);
    if (!myTicket) {
      setStep('no-ticket');
      return;
    }
    const myEvent = await getEvent(myTicket.eventId);
    setEvent(myEvent);
    if (!myEvent?.revealed) {
      setStep('waiting');
      return;
    }
    const tickets = await getCheckedInTicketsForEvent(myTicket.eventId);
    const people = await Promise.all(
      tickets.map(async (t): Promise<Attendee> => {
        const u = await getUser(t.userId);
        return {
          userId: t.userId,
          displayName: u?.displayName ?? 'A MISMAS guest',
          photoUrl: u?.photoUrl ?? null,
        };
      })
    );
    setAttendees(people);
    setStep('revealed');
  }, [user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (authLoading || step === 'loading') {
    return (
      <Screen>
        <ActivityIndicator color={colors.brand} />
      </Screen>
    );
  }

  if (step === 'no-ticket') {
    return (
      <Screen>
        <Text style={styles.title}>No ticket yet</Text>
        <Text style={styles.subtitle}>Grab your spot on the Event screen first.</Text>
      </Screen>
    );
  }

  if (step === 'waiting') {
    return (
      <Screen>
        <Text style={styles.title}>Not revealed yet</Text>
        <Text style={styles.subtitle}>
          Check back after {event?.name ?? 'the event'} wraps to see who else was there.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Animated.Text entering={BounceIn.duration(700)} style={styles.title}>
        Who was there tonight 🎉
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(150)} style={styles.subtitle}>
        {attendees.length} {attendees.length === 1 ? 'person' : 'people'} checked in
      </Animated.Text>
      <FlatList
        data={attendees}
        keyExtractor={(item) => item.userId}
        numColumns={3}
        columnWrapperStyle={styles.row}
        scrollEnabled={false}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={ZoomIn.delay(250 + index * 80).springify().damping(11).stiffness(140)}
            style={styles.attendee}
          >
            <Avatar displayName={item.displayName} photoUrl={item.photoUrl} size={72} />
            <Text style={styles.name} numberOfLines={1}>
              {item.displayName}
            </Text>
          </Animated.View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontFamily: typography.display, color: colors.textPrimary },
  subtitle: { fontSize: 14, fontFamily: typography.bodyRegular, color: colors.textSecondary, marginBottom: spacing.xs },
  row: { justifyContent: 'space-between', marginBottom: spacing.md },
  attendee: { alignItems: 'center', width: '30%', gap: spacing.xs + 2 },
  name: { color: colors.textSecondary, fontSize: 12, fontFamily: typography.bodyRegular },
});
