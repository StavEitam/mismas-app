import { Image, StyleSheet, Text, View } from 'react-native';

type AvatarProps = {
  displayName: string;
  photoUrl?: string | null;
  size?: number;
};

const BRAND_COLORS = ['#f2308c', '#7b2ff7', '#2fbef2', '#f2a12f'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length];
}

/**
 * Renders users.photoUrl (set only if the guest registered with one) or a
 * branded initial-on-color fallback — never a blank/gray placeholder. Used
 * on the Reveal screen so every attendee looks intentional.
 */
export function Avatar({ displayName, photoUrl, size = 64 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[styles.image, dimension]} />;
  }

  const initial = displayName.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.fallback, dimension, { backgroundColor: colorForName(displayName) }]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: '#1e0f33' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '800' },
});
