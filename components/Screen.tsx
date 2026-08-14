import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

/**
 * Shared page wrapper: scrollable, keyboard-safe, consistent padding/background.
 * Real MISMAS theming (colors/type/motion) arrives in Phase 5 — this is just
 * the structural shell so Phase 3/4 screens don't each reinvent it.
 */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: 24,
    gap: 16,
  },
});
