import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Height of AuthenticatedView chrome above the screen content (title, header, mode switch, gaps).
const AUTHENTICATED_CHROME_HEIGHT = 194;
// Extra breathing room above the keyboard on iOS.
const IOS_KEYBOARD_EXTRA_OFFSET = 24;

export function useKeyboardVerticalOffset(): number {
  const insets = useSafeAreaInsets();

  if (Platform.OS !== 'ios') {
    return 0;
  }

  return insets.top + AUTHENTICATED_CHROME_HEIGHT + IOS_KEYBOARD_EXTRA_OFFSET;
}
