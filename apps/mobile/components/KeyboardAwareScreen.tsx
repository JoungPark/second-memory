import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useKeyboardVerticalOffset } from '@/lib/useKeyboardVerticalOffset';

type KeyboardAwareScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function KeyboardAwareScreen({ children, style }: KeyboardAwareScreenProps) {
  const keyboardVerticalOffset = useKeyboardVerticalOffset();

  if (Platform.OS === 'android') {
    return <View style={[styles.container, style]}>{children}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});
