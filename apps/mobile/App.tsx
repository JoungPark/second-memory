import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppContent } from '@/components/AppContent';
import { MobileAuthProvider } from '@/components/MobileAuthProvider';

export default function App() {
  return (
    <MobileAuthProvider>
      <SafeAreaProvider>
        <View style={styles.container}>
          <View style={styles.content}>
            <AppContent />
          </View>
          <StatusBar style="auto" />
        </View>
      </SafeAreaProvider>
    </MobileAuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  content: {
    flex: 1,
  },
});
