import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthUser } from '../hooks/useAuthUser';
import { getEvent, getMyLatestTicket, setCheckedIn, type TicketWithId } from '../lib/firestore';
import { colors, typography } from '../theme';

type Step = 'loading' | 'no-ticket' | 'not-approved' | 'denied' | 'pin' | 'done';

export default function CheckInScreen() {
  const { user, loading: authLoading } = useAuthUser();
  const [step, setStep] = useState<Step>('loading');
  const [ticket, setTicket] = useState<TicketWithId | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const myTicket = await getMyLatestTicket(user.uid);
    if (!myTicket) {
      setStep('no-ticket');
      return;
    }
    setTicket(myTicket);
    if (myTicket.checkedIn) {
      setStep('done');
    } else if (myTicket.approvalStatus === 'denied') {
      setStep('denied');
    } else if (myTicket.approvalStatus === 'approved') {
      setStep('pin');
    } else {
      setStep('not-approved');
    }
  }, [user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function handlePinSubmit() {
    if (!ticket) return;
    setSubmitting(true);
    setPinError(null);
    try {
      const freshEvent = await getEvent(ticket.eventId);
      if (freshEvent?.checkInPin === pin) {
        await setCheckedIn(ticket.id);
        setStep('done');
      } else {
        setPinError("That code doesn't match, check the sign and try again.");
      }
    } catch {
      setPinError('Something went wrong, give it another try.');
    } finally {
      setSubmitting(false);
    }
  }

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

  if (step === 'not-approved') {
    return (
      <Screen>
        <Text style={styles.title}>Almost there</Text>
        <Text style={styles.subtitle}>
          Your spot is still pending confirmation. Check the Event screen for payment details.
        </Text>
      </Screen>
    );
  }

  if (step === 'denied') {
    return (
      <Screen>
        <Text style={styles.title}>Not confirmed this time</Text>
        <Text style={styles.subtitle}>Reach out to MISMAS directly if you think this is a mistake.</Text>
      </Screen>
    );
  }

  if (step === 'pin') {
    return (
      <Screen>
        <Text style={styles.title}>You made it 🎉</Text>
        <Text style={styles.subtitle}>
          Enter tonight's code from the sign at the door.
        </Text>
        <TextField
          label="4-digit code"
          value={pin}
          onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="0000"
          style={styles.pinInput}
        />
        {pinError && <Text style={styles.error}>{pinError}</Text>}
        <PrimaryButton
          label="Check in"
          onPress={handlePinSubmit}
          disabled={pin.length !== 4}
          loading={submitting}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>You're all set 🎉</Text>
      <Text style={styles.subtitle}>
        Have a great night, everyone's revealed once the party wraps.
      </Text>
      <PrimaryButton label="Check the reveal" onPress={() => router.push('/reveal')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontFamily: typography.display, color: colors.textPrimary },
  subtitle: { fontSize: 14, fontFamily: typography.bodyRegular, color: colors.textSecondary },
  error: { color: colors.error, fontSize: 13, fontFamily: typography.bodyRegular },
  pinInput: {
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 8,
    fontFamily: typography.display,
    color: colors.accent,
  },
});
