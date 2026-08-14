import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../components/Screen';
import { Checkbox } from '../components/Checkbox';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthUser } from '../hooks/useAuthUser';
import {
  createTicket,
  getMyTicketForEvent,
  getUpcomingEvent,
  ticketReferenceCode,
  type EventWithId,
  type TicketWithId,
} from '../lib/firestore';
import { colors, spacing, typography } from '../theme';

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
      setError('Could not load the event right now, pull to refresh in a bit.');
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // Re-check ticket state whenever this screen regains focus (e.g. coming
  // back from Check-In, or an admin approving/denying while the guest waits),
  // so status stays current without a manual refresh.
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
        approvalStatus: 'pending',
        consentAccepted: consentChecked,
        checkedIn: false,
        checkedInAt: null,
      });
    } catch {
      setError("Couldn't reserve your spot, give it another try.");
    } finally {
      setPurchasing(false);
    }
  }

  if (authLoading || dataLoading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.brand} />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <Text style={styles.title}>Nothing on the calendar yet</Text>
        <Text style={styles.subtitle}>Check back soon, MISMAS nights get announced here first.</Text>
      </Screen>
    );
  }

  if (ticket?.approvalStatus === 'denied') {
    return (
      <Screen>
        <Text style={styles.title}>Not confirmed this time</Text>
        <Text style={styles.eventName}>{event.name}</Text>
        <Text style={styles.subtitle}>
          {event.venue} · {formatDate(event.date)}
        </Text>
        <Text style={styles.ticketNote}>
          Your spot wasn't confirmed. Reach out to MISMAS directly if you think this is a
          mistake or need help sorting out payment.
        </Text>
      </Screen>
    );
  }

  if (ticket?.approvalStatus === 'pending') {
    return (
      <Screen>
        <Text style={styles.title}>Reservation received 🎉</Text>
        <Text style={styles.eventName}>{event.name}</Text>
        <Text style={styles.subtitle}>
          {event.venue} · {formatDate(event.date)}
        </Text>
        <Text style={styles.ticketNote}>
          Send payment to <Text style={styles.paymentPhone}>{event.paymentPhone}</Text> via
          Bit or PayBox, and add{' '}
          <Text style={styles.paymentPhone}>{ticketReferenceCode(ticket.id)}</Text> in the
          payment note so we can match it to your spot. We'll confirm once it's in.
        </Text>
      </Screen>
    );
  }

  if (ticket?.approvalStatus === 'approved') {
    return (
      <Screen>
        <Text style={styles.title}>You're in ✅</Text>
        <Text style={styles.eventName}>{event.name}</Text>
        <Text style={styles.subtitle}>
          {event.venue} · {formatDate(event.date)}
        </Text>
        <Text style={styles.ticketNote}>
          Hold tight, your check-in PIN will be on a sign at the door the night of.
        </Text>
        <PrimaryButton label="I'm at the door" onPress={() => router.push('/check-in')} />
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
        Payment happens directly with MISMAS (Bit/PayBox). Reserving sends your spot for
        approval.
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
  title: { fontSize: 26, fontFamily: typography.display, color: colors.textPrimary },
  eventName: { fontSize: 20, fontFamily: typography.heading, color: colors.textPrimary },
  subtitle: { fontSize: 14, fontFamily: typography.bodyRegular, color: colors.textSecondary },
  ticketNote: { fontSize: 14, fontFamily: typography.bodyRegular, color: colors.textPrimary, marginTop: spacing.xs },
  paymentPhone: { fontFamily: typography.heading, color: colors.accent },
  paymentNote: { fontSize: 12, fontFamily: typography.bodyRegular, color: colors.textSecondary, textAlign: 'center' },
  error: { color: colors.error, fontSize: 13, fontFamily: typography.bodyRegular },
});
