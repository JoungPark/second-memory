import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#18181b',
  },
  content: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
