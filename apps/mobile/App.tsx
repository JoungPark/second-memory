import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SharedWelcome } from '@second-memory/ui';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mobile</Text>
      <SharedWelcome>
        {(message) => <Text style={styles.message}>{message}</Text>}
      </SharedWelcome>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  message: {
    color: '#3f3f46',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
