import { Pressable, StyleSheet, Text, View } from 'react-native';

type CheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  label: string;
};

export function Checkbox({ checked, onToggle, label }: CheckboxProps) {
  return (
    <Pressable onPress={onToggle} style={styles.row}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Text style={styles.check}>✓</Text>}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#c9b8e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  boxChecked: { backgroundColor: '#f2308c', borderColor: '#f2308c' },
  check: { color: '#12071f', fontWeight: '700', fontSize: 14 },
  label: { flex: 1, color: '#e6dcf2', fontSize: 14, lineHeight: 20 },
});
