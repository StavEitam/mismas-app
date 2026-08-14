import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

type TextFieldProps = TextInputProps & {
  label: string;
};

export function TextField({ label, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#8a7aa3"
        style={[styles.input, style]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { color: '#c9b8e0', fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: '#1e0f33',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3a2657',
  },
});
