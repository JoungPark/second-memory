import type { ExpoConfig, ConfigContext } from 'expo/config';

const config = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Second Memory',
  slug: 'second-memory',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  plugins: [
    'expo-dev-client',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME,
      },
    ],
  ],
  ios: {
    bundleIdentifier: 'com.secondmemory.mobile',
    googleServicesFile: './GoogleService-Info.plist',
    supportsTablet: true,
  },
  android: {
    package: 'com.secondmemory.mobile',
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
});

export default config;
