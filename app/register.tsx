import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { registerWithEmail, signInWithEmail } from '../lib/auth';
import { colors, spacing, typography } from '../theme';

export default function RegisterScreen() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    email.trim().length > 3 &&
    password.length >= 6 &&
    (mode === 'signin' || displayName.trim().length > 0);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        await registerWithEmail(email.trim(), password, displayName.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
      router.replace('/event');
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>
        {mode === 'signup' ? "You're in for tonight 🎉" : 'Welcome back'}
      </Text>
      <Text style={styles.subtitle}>
        {mode === 'signup'
          ? 'Quick sign up, no swiping, no profiles to perfect.'
          : 'Sign back in to grab your ticket.'}
      </Text>

      {mode === 'signup' && (
        <TextField
          label="Your name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          placeholder="What should we call you?"
        />
      )}
      <TextField
        label="Email or phone"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="At least 6 characters"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton
        label={mode === 'signup' ? "Let's go" : 'Sign in'}
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={loading}
      />

      <Text
        style={styles.switchMode}
        onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
      >
        {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Sign up'}
      </Text>
    </Screen>
  );
}

function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code.includes('email-already-in-use')) return "That email's already registered, try signing in instead.";
  if (code.includes('invalid-email')) return "That doesn't look like a valid email.";
  if (code.includes('weak-password')) return 'Password needs to be at least 6 characters.';
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return "That password doesn't match.";
  if (code.includes('user-not-found')) return "Couldn't find that account, check your email or sign up.";
  return 'Something went wrong, give it another try.';
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontFamily: typography.display, color: colors.textPrimary },
  subtitle: { fontSize: 14, fontFamily: typography.bodyRegular, color: colors.textSecondary, marginBottom: spacing.xs },
  error: { color: colors.error, fontSize: 13, fontFamily: typography.bodyRegular },
  switchMode: { color: colors.brand, textAlign: 'center', marginTop: spacing.xs, fontSize: 14, fontFamily: typography.body },
});
