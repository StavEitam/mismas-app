import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../theme';

type AvatarProps = {
  displayName: string;
  photoUrl?: string | null;
  size?: number;
};

/**
 * Renders users.photoUrl (set only if the guest registered with one) or a
 * branded MISMAS fallback — brand-orange fill, cream initial, thin
 * sunburst-yellow ring — never a blank/gray placeholder. Used on the Reveal
 * screen so every attendee looks intentional and unmistakably on-brand.
 */
export function Avatar({ displayName, photoUrl, size = 64 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[styles.image, dimension]} />;
  }

  const initial = displayName.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.ring, dimension, { borderRadius: size / 2 + 3 }]}>
      <View style={[styles.fallback, dimension]}>
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surface },
  ring: {
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: colors.cream, fontFamily: typography.display },
});
