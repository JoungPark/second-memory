# @second-memory/mobile

Expo mobile client for Second Memory. Uses a development build (`expo-dev-client`) for native modules such as Google Sign-In.

## Prerequisites

- Node.js 20+
- pnpm 9+ (from the monorepo root)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (optional; scripts use `npx expo`)
- For device builds:
  - **iOS:** Xcode and CocoaPods
  - **Android:** Android Studio and an emulator or physical device

## Getting Started

From the repository root:

```bash
pnpm install
```

Copy environment variables and fill in Firebase / Google OAuth values:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Download platform config files from the [Firebase console](https://console.firebase.google.com/) and place them in `apps/mobile/`:

- `GoogleService-Info.plist` (iOS)
- `google-services.json` (Android)

These paths are referenced in `app.config.ts`.

## Development

Run the Metro bundler with the dev client:

```bash
# from repo root
pnpm --filter @second-memory/mobile dev

# or from apps/mobile
pnpm dev
```

Build and run on a simulator or device (generates native projects under `ios/` and `android/`):

```bash
pnpm --filter @second-memory/mobile ios
pnpm --filter @second-memory/mobile android
```

Regenerate native projects from scratch when `app.config.ts`, plugins, or native dependencies change:

```bash
pnpm --filter @second-memory/mobile prebuild
```

`expo run:ios` and `expo run:android` prebuild automatically on first run, but `--clean` removes existing `ios/` and `android/` folders first — useful after config changes or when native builds behave unexpectedly.

Or start from the monorepo dev task runner:

```bash
pnpm dev
```

## Scripts

| Script    | Description                                      |
| --------- | ------------------------------------------------ |
| `dev`     | Start Expo with dev client                       |
| `ios`     | Build and run on iOS                             |
| `android` | Build and run on Android                         |
| `prebuild`| Regenerate `ios/` and `android/` from Expo config |
| `web`     | Start Expo web preview                           |
| `build`   | Export production bundles for all platforms      |
| `lint`    | Run ESLint                                       |
| `test`    | Placeholder (Expo test setup not yet added)    |

## Environment Variables

All public config uses the `EXPO_PUBLIC_` prefix (see `.env.example`):

| Variable                              | Purpose                                      |
| ------------------------------------- | -------------------------------------------- |
| `EXPO_PUBLIC_FIREBASE_*`              | Firebase client config                       |
| `EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID`  | Google OAuth web client ID for Firebase Auth |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`    | Google OAuth iOS client ID                   |
| `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`   | Reversed iOS URL scheme for Google Sign-In   |

Do not commit `.env` or Firebase service files with real credentials.

## Project Structure

```text
apps/mobile/
  App.tsx                 # Root screen
  app.config.ts           # Expo config (bundle IDs, plugins)
  components/             # Mobile-specific UI (auth wrapper, login)
  lib/firebase/           # Firebase init and Google Sign-In
  assets/                 # App icons and splash images
```

Shared auth UI and providers live in `@second-memory/ui`. Mobile wires platform-specific Firebase and Google Sign-In through `MobileAuthProvider`.

## Learn More

- [Expo documentation](https://docs.expo.dev/)
- [Expo dev client](https://docs.expo.dev/develop/development-builds/introduction/)
- [React Native Google Sign-In](https://react-native-google-signin.github.io/docs/)
- Monorepo layout: [`docs/architecture/v1-monorepo-structure.md`](../../docs/architecture/v1-monorepo-structure.md)
