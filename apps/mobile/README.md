# @second-memory/mobile

Expo mobile client for Second Memory. Uses a development build (`expo-dev-client`) for native modules such as Google Sign-In.

## Prerequisites

- Node.js 22.13+ (required by Expo SDK 57)
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

## Release build: install on Android device (USB)

Use this when you want a release APK on a physical device (e.g. Galaxy) without going through the Play Store.

**Prerequisites:** USB debugging enabled on the device, `adb` on your PATH, Android SDK / Gradle set up.

From the repository root:

```bash
# 1. Generate native Android project (if ios/ and android/ are missing or stale)
pnpm --filter @second-memory/mobile prebuild

# 2. Build release APK
cd apps/mobile/android
./gradlew assembleRelease

# 3. Install on connected device
adb install app/build/outputs/apk/release/app-release.apk
```

Notes:

- `prebuild` in this repo runs `expo prebuild --clean` (wipes and regenerates `android/`).
- If install fails because the app is already installed, use `adb install -r app/build/outputs/apk/release/app-release.apk`.
- For day-to-day dev, prefer `pnpm --filter @second-memory/mobile android` (debug build + Metro).

## EAS Build (cloud)

Build and distribute the app with [Expo Application Services (EAS)](https://docs.expo.dev/eas/). Run all `eas` commands from `apps/mobile`.

### Prerequisites

- An [Expo account](https://expo.dev/signup)
- `eas-cli` (use via `pnpm exec eas` — no global install required)

This project is already linked to EAS (`extra.eas.projectId` in `app.config.ts`).

### One-time setup

1. **Log in to Expo**

   ```bash
   cd apps/mobile
   pnpm exec eas login
   ```

2. **Place Firebase config files locally** (for uploading to EAS — not committed to git):

   ```text
   apps/mobile/google-services.json
   apps/mobile/GoogleService-Info.plist
   ```

3. **Upload Firebase files as EAS file environment variables**

   EAS Build only uploads git-tracked files. Because these are gitignored, upload them as secrets instead. `app.config.ts` reads them via `GOOGLE_SERVICES_JSON` and `GOOGLE_SERVICES_PLIST` at build time.

   ```bash
   pnpm exec eas env:create --environment preview --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
   pnpm exec eas env:create --environment preview --name GOOGLE_SERVICES_PLIST --type file --value ./GoogleService-Info.plist
   pnpm exec eas env:create --environment production --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
   pnpm exec eas env:create --environment production --name GOOGLE_SERVICES_PLIST --type file --value ./GoogleService-Info.plist
   ```

4. **Set environment variables for each EAS environment**

   Cloud builds cannot reach `localhost`. Set your deployed API URLs and Firebase/OAuth values for `preview` and `production`:

   ```bash
   pnpm exec eas env:create --environment production --name EXPO_PUBLIC_MEMORY_API_URL --value https://your-memory-api.example.com
   pnpm exec eas env:create --environment production --name EXPO_PUBLIC_ASK_API_URL --value https://your-ask-api.example.com
   # Repeat for all EXPO_PUBLIC_* vars listed in .env.example
   ```

   List configured variables: `pnpm exec eas env:list`

5. **Configure signing credentials** (prompted automatically on first build, or run manually):

   ```bash
   pnpm exec eas credentials
   ```

### Build profiles

Profiles are defined in `eas.json`:

| Profile       | Use case                                     | Distribution |
| ------------- | -------------------------------------------- | ------------ |
| `development` | Dev client for internal testing              | internal     |
| `preview`     | Install on physical devices (TestFlight-like) | internal     |
| `production`  | App Store / Play Store submission            | store        |

### Run a build

From `apps/mobile`:

```bash
# Internal test build — good first smoke test (APK on Android)
pnpm exec eas build --profile preview --platform android

# iOS internal build
pnpm exec eas build --profile preview --platform ios

# Store-ready build (AAB on Android, IPA on iOS)
pnpm exec eas build --profile production --platform all

# Dev client build
pnpm exec eas build --profile development --platform ios
pnpm exec eas build --profile development --platform android
```

From the repo root:

```bash
pnpm --filter @second-memory/mobile exec eas build --profile preview --platform android
```

Monitor builds at [expo.dev](https://expo.dev) or with:

```bash
pnpm exec eas build:list
```

When a build finishes, EAS provides a download link (or QR code for internal installs).

### Submit to stores

After a successful `production` build:

```bash
pnpm exec eas submit --profile production --platform ios
pnpm exec eas submit --profile production --platform android
```

### Monorepo notes

- `eas.json` lives in `apps/mobile/` — always run EAS commands from that directory.
- Keep `pnpm-lock.yaml` and `pnpm-workspace.yaml` committed at the repo root; EAS uses them to detect the pnpm monorepo and install workspace dependencies (`@second-memory/ui`, etc.).
- Local `.env` is not uploaded to EAS. Use `eas env:create` or `eas env:pull` for cloud build variables.

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

EAS commands (run from `apps/mobile`):

| Command | Description |
| ------- | ----------- |
| `pnpm exec eas build --profile preview --platform android` | Internal Android build |
| `pnpm exec eas build --profile production --platform all` | Store-ready build |
| `pnpm exec eas submit --profile production --platform ios` | Submit to App Store |
| `pnpm exec eas build:list` | List recent builds |

## Environment Variables

All public config uses the `EXPO_PUBLIC_` prefix (see `.env.example`):

| Variable                              | Purpose                                      |
| ------------------------------------- | -------------------------------------------- |
| `EXPO_PUBLIC_FIREBASE_*`              | Firebase client config                       |
| `EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID`  | Google OAuth web client ID for Firebase Auth |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`    | Google OAuth iOS client ID                   |
| `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`   | Reversed iOS URL scheme for Google Sign-In   |
| `EXPO_PUBLIC_MEMORY_API_URL`          | Memory service base URL                      |
| `EXPO_PUBLIC_ASK_API_URL`             | Ask service base URL                         |

For EAS cloud builds, set these via `eas env:create` (see [EAS Build](#eas-build-cloud)). For local dev, use `apps/mobile/.env`.

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
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)
- [Expo dev client](https://docs.expo.dev/develop/development-builds/introduction/)
- [React Native Google Sign-In](https://react-native-google-signin.github.io/docs/)
- Monorepo layout: [`docs/architecture/v1-monorepo-structure.md`](../../docs/architecture/v1-monorepo-structure.md)
