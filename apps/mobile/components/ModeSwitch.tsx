import type { AppMode } from '@second-memory/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ModeSwitchProps = {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
};

export function ModeSwitch({ mode, onModeChange }: ModeSwitchProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.option, mode === 'self-talk' && styles.optionActive]}
        onPress={() => onModeChange('self-talk')}
      >
        <Text
          style={[
            styles.optionText,
            mode === 'self-talk' && styles.optionTextActive,
          ]}
        >
          Self-talk
        </Text>
      </Pressable>
      <Pressable
        style={[styles.option, mode === 'ask' && styles.optionActive]}
        onPress={() => onModeChange('ask')}
      >
        <Text
          style={[
            styles.optionText,
            mode === 'ask' && styles.optionTextActive,
          ]}
        >
          Ask
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 4,
  },
  option: {
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717a',
  },
  optionTextActive: {
    color: '#18181b',
  },
});
