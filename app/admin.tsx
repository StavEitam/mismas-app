import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthUser } from '../hooks/useAuthUser';
import {
  adminApproveTicket,
  adminCreateEvent,
  adminDenyTicket,
  adminGetLatestEvent,
  adminUpdateEvent,
  getPendingTicketsForEvent,
  getUser,
  ticketReferenceCode,
  type EventWithId,
  type TicketWithId,
} from '../lib/firestore';

type PendingTicket = TicketWithId & { guestName: string };

export default function AdminScreen() {
  const { user, loading: authLoading } = useAuthUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [event, setEvent] = useState<EventWithId | null>(null);
  const [pending, setPending] = useState<PendingTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingEvent, setSavingEvent] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Event form fields
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [checkInPin, setCheckInPin] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const me = await getUser(user.uid);
    setIsAdmin(!!me?.isAdmin);
    if (!me?.isAdmin) {
      setLoading(false);
      return;
    }
    const currentEvent = await adminGetLatestEvent();
    setEvent(currentEvent);
    if (currentEvent) {
      setName(currentEvent.name);
      setVenue(currentEvent.venue);
      setCheckInPin(currentEvent.checkInPin);
      setPaymentPhone(currentEvent.paymentPhone);
      const pendingTickets = await getPendingTicketsForEvent(currentEvent.id);
      const withNames = await Promise.all(
        pendingTickets.map(async (t): Promise<PendingTicket> => {
          const guest = await getUser(t.userId);
          return { ...t, guestName: guest?.displayName ?? 'Unknown guest' };
        })
      );
      setPending(withNames);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function handleSaveEvent() {
    setSavingEvent(true);
    try {
      if (event) {
        await adminUpdateEvent(event.id, { name, venue, checkInPin, paymentPhone });
      } else {
        // "Create" only ever shows when adminGetLatestEvent() found nothing
        // at all, so there's no existing event to collide with here.
        await adminCreateEvent({
          name,
          venue,
          date: new Date(),
          capacity: 100,
          status: 'upcoming',
          checkInPin,
          paymentPhone,
          revealed: false,
        });
      }
      await load();
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleApprove(ticketId: string) {
    setActioningId(ticketId);
    try {
      await adminApproveTicket(ticketId);
      setPending((p) => p.filter((t) => t.id !== ticketId));
    } finally {
      setActioningId(null);
    }
  }

  async function handleDeny(ticketId: string) {
    setActioningId(ticketId);
    try {
      await adminDenyTicket(ticketId);
      setPending((p) => p.filter((t) => t.id !== ticketId));
    } finally {
      setActioningId(null);
    }
  }

  async function handleToggleRevealed() {
    if (!event) return;
    await adminUpdateEvent(event.id, { revealed: !event.revealed });
    await load();
  }

  if (authLoading || loading) {
    return (
      <Screen>
        <ActivityIndicator color="#f2308c" />
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen>
        <Text style={styles.title}>Not available</Text>
        <Text style={styles.subtitle}>This screen is admin-only.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Admin</Text>

      <Text style={styles.sectionTitle}>Event</Text>
      <TextField label="Name" value={name} onChangeText={setName} />
      <TextField label="Venue" value={venue} onChangeText={setVenue} />
      <TextField
        label="Check-in PIN"
        value={checkInPin}
        onChangeText={(t) => setCheckInPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
      />
      <TextField label="Payment phone (Bit/PayBox)" value={paymentPhone} onChangeText={setPaymentPhone} />
      <PrimaryButton
        label={event ? 'Save event' : 'Create event'}
        onPress={handleSaveEvent}
        loading={savingEvent}
        disabled={!name || !venue || checkInPin.length !== 4 || !paymentPhone}
      />

      {event && (
        <PrimaryButton
          label={event.revealed ? 'Un-reveal' : 'Reveal attendees'}
          onPress={handleToggleRevealed}
        />
      )}

      <Text style={styles.sectionTitle}>
        Pending approvals {pending.length > 0 ? `(${pending.length})` : ''}
      </Text>
      {pending.length === 0 && <Text style={styles.subtitle}>Nothing pending right now.</Text>}
      {pending.map((t) => (
        <View key={t.id} style={styles.pendingRow}>
          <View style={styles.pendingInfo}>
            <Text style={styles.guestName}>{t.guestName}</Text>
            <Text style={styles.subtitle}>ref {ticketReferenceCode(t.id)}</Text>
          </View>
          <View style={styles.pendingActions}>
            <PrimaryButton
              label="Approve"
              onPress={() => handleApprove(t.id)}
              loading={actioningId === t.id}
              disabled={actioningId !== null && actioningId !== t.id}
            />
            <PrimaryButton
              label="Deny"
              onPress={() => handleDeny(t.id)}
              loading={actioningId === t.id}
              disabled={actioningId !== null && actioningId !== t.id}
            />
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 12 },
  subtitle: { fontSize: 13, color: '#c9b8e0' },
  guestName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e0f33',
    borderRadius: 12,
    padding: 12,
  },
  pendingInfo: { gap: 2 },
  pendingActions: { flexDirection: 'row', gap: 8 },
});
