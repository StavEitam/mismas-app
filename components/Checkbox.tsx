import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../theme';

type CheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  label: string;
};

export function Checkbox({ checked, onToggle, label }: CheckboxProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.25, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 250 })
    );
  }, [checked, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable onPress={onToggle} style={styles.row}>
      <Animated.View style={[styles.box, checked && styles.boxChecked, animatedStyle]}>
        {checked && <Text style={styles.check}>✓</Text>}
      </Animated.View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2 },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.sm - 2,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  boxChecked: { backgroundColor: colors.brand, borderColor: colors.brand },
  check: { color: colors.textOnBrand, fontFamily: typography.heading, fontSize: 14 },
  label: { flex: 1, color: colors.textPrimary, fontSize: 14, lineHeight: 20, fontFamily: typography.bodyRegular },
});
