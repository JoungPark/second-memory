import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEventListener } from 'react-native';

export function useKeyboardBottomInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const onShow: KeyboardEventListener = (event) => {
      setInset(event.endCoordinates.height);
    };
    const onHide: KeyboardEventListener = () => {
      setInset(0);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, onShow);
    const hideSubscription = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return inset;
}
