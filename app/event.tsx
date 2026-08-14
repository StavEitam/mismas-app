import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../components/Screen';
import { Checkbox } from '../components/Checkbox';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthUser } from '../hooks/useAuthUser';
import {
  createTicket,
  getMyTicketForEvent,
  getUpcomingEvent,
  type EventWithId,
  type TicketWithId,
} from '../lib/firestore';

export default function EventScreen() {
  const { user, loading: authLoading } = useAuthUser();
  const [event, setEvent] = useState<EventWithId | null>(null);
  const [ticket, setTicket] = useState<TicketWithId | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [consentChecked, setConsentChecked] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const currentEvent = await getUpcomingEvent();
      setEvent(currentEvent);
      if (currentEvent) {
        const myTicket = await getMyTicketForEvent(user.uid, currentEvent.id);
        setTicket(myTicket);
      }
    } catch {
      setError('Could not load the event right now — pull to refresh in a bit.');
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // Re-check ticket state whenever this screen regains focus (e.g. coming
  // back from Check-In), so status stays current without a manual refresh.
  useFocusEffect(
    useCallback(() => {
      if (user) load();
    }, [user, load])
  );

  async function handleReserve() {
    if (!user || !event) return;
    setPurchasing(true);
    setError(null);
    try {
      const ticketId = await createTicket(user.uid, event.id, consentChecked);
      setTicket({
        id: ticketId,
        userId: user.uid,
        eventId: event.id,
        purchaseStatus: 'paid',
        consentAccepted: consentChecked,
        checkedIn: false,
        checkedInAt: null,
        selfieUrl: null,
      });
    } catch {
      setError("Couldn't reserve your spot — give it another try.");
    } finally {
      setPurchasing(false);
    }
  }

  if (authLoading || dataLoading) {
    return (
      <Screen>
        <ActivityIndicator color="#f2308c" />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <Text style={styles.title}>Nothing on the calendar yet</Text>
        <Text style={styles.subtitle}>Check back soon — MISMAS nights get announced here first.</Text>
      </Screen>
    );
  }

  if (ticket) {
    return (
      <Screen>
        <Text style={styles.title}>You're in ✅</Text>
        <Text style={styles.eventName}>{event.name}</Text>
        <Text style={styles.subtitle}>
          {event.venue} · {formatDate(event.date)}
        </Text>
        <Text style={styles.ticketNote}>
          Hold tight — your check-in PIN will be on a sign at the door the night of.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{event.name}</Text>
      <Text style={styles.subtitle}>
        {event.venue} · {formatDate(event.date)}
      </Text>

      <Checkbox
        checked={consentChecked}
        onToggle={() => setConsentChecked((c) => !c)}
        label="I accept the terms, cancellation policy, and media consent for this event."
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton
        label="Reserve my spot"
        onPress={handleReserve}
        disabled={!consentChecked}
        loading={purchasing}
      />
      <Text style={styles.paymentNote}>
        Payment is coordinated directly with MISMAS (Bit/PayBox) — this reserves your spot.
      </Text>
    </Screen>
  );
}

function formatDate(value: unknown): string {
  const d = (value as { toDate?: () => Date })?.toDate?.() ?? (value as Date);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  eventName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 14, color: '#c9b8e0' },
  ticketNote: { fontSize: 14, color: '#e6dcf2', marginTop: 8 },
  paymentNote: { fontSize: 12, color: '#8a7aa3', textAlign: 'center' },
  error: { color: '#ff8ba7', fontSize: 13 },
});
