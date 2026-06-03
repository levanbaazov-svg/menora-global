# Menorah on phones — PWA + TestFlight

Two ways to get the app onto people's phones. Both run the **same** Next.js app.

## 1. PWA (works today, no app store)

The app is installable from the browser:

- **iPhone:** open the site in **Safari** → Share → **Add to Home Screen** → opens
  full-screen, no browser bar, with the menorah icon.
- **Android:** open in **Chrome** → it offers **Install app** (or ⋮ → Install).

Just share the production URL with rabbis/communities and they install in ~10s.
Updates are instant — deploy and everyone has the new version.

Implemented via `app/manifest.ts` (`/manifest.webmanifest`), generated icons
(`scripts/gen-icons.js`), and a minimal service worker (`public/sw.js`).

## 2. Native app → TestFlight / App Store (Capacitor)

The native app is a thin shell that loads the **live deployed site** in a
WebView (the app is SSR + auth, so it can't be a static export). Point it at prod
via `server.url` in `capacitor.config.ts` (defaults to the Vercel URL; override
with `CAP_SERVER_URL`).

### iOS → TestFlight
Requirements: macOS, Xcode, your Apple Developer account (you have it). Capacitor 8
uses Swift Package Manager — **no CocoaPods needed**.

```bash
npm run cap:sync          # sync web/config into the native project
npm run cap:ios           # opens ios/App/App.xcodeproj in Xcode
```
In Xcode:
1. Select the **App** target → **Signing & Capabilities** → choose your **Team**;
   set a unique **Bundle Identifier** (e.g. `com.menorahglobal.app`) — must match
   an App ID in your Apple Developer account (Xcode can auto-create it).
2. Set a Marketing Version + Build number.
3. **Product → Archive** → **Distribute App → TestFlight & App Store Connect** →
   upload.
4. In **App Store Connect → TestFlight**, add internal/external testers; they
   install via the **TestFlight** app.

### Android
```bash
npm run cap:android       # opens android/ in Android Studio
```
Build → Generate Signed Bundle/APK. Share the APK directly, or upload an AAB to
Google Play internal testing.

## Native Google sign-in (already wired in the app)

Google **blocks OAuth in embedded WebViews** ("disallowed_useragent"), so the
native shell can't use the web redirect. The app handles this automatically:

- **Web / PWA:** standard next-auth Google redirect (works as-is).
- **Native (iOS/Android):** `GoogleSignInButton` detects the native platform,
  calls the device Google SDK to get an **ID token**, and exchanges it via the
  `google-native` credentials provider (which verifies the token server-side).

The web bundle has **no** plugin dependency — the native plugin is reached at
runtime through Capacitor's `registerPlugin('GoogleAuth')`. You wire the native
side once, in the iOS/Android project only.

### One-time native setup

**1. Google Cloud Console — create an iOS OAuth client**
- APIs & Services → Credentials → *Create credentials → OAuth client ID* →
  **iOS**. Bundle ID = `com.menorahglobal.app` (must match the app).
- Copy the **iOS client ID** (`xxxxx.apps.googleusercontent.com`) and its
  **reversed client ID** (`com.googleusercontent.apps.xxxxx`).

**2. Vercel env**
- Set `GOOGLE_IOS_CLIENT_ID` = the iOS client ID. The `google-native` provider
  already accepts both the web and iOS client IDs as valid `aud`.

**3. Add a native Google plugin to the iOS project**
- Install a Capacitor-8-compatible Google auth plugin that registers as the
  `GoogleAuth` plugin, e.g.:
  ```bash
  npm i @codetrix-studio/capacitor-google-auth --legacy-peer-deps
  npx cap sync ios
  ```
  (The `--legacy-peer-deps` flag is only needed because the plugin's declared
  peer range predates Cap 8; the native code builds fine. If it fails to compile
  under SPM, swap in another `GoogleAuth`-registering plugin — the JS side needs
  no change.)

**4. iOS config — `ios/App/App/Info.plist`**
- Add the reversed client ID as a URL scheme:
  ```xml
  <key>CFBundleURLTypes</key>
  <array><dict><key>CFBundleURLSchemes</key>
    <array><string>com.googleusercontent.apps.YOUR_IOS_CLIENT_ID</string></array>
  </dict></array>
  ```
- Add the plugin's client-id config (under the `GoogleAuth` key, per the plugin
  README) — typically the **iOS client ID** as `iosClientId` (or in
  `capacitor.config.ts` under `plugins.GoogleAuth`), then `npx cap sync ios`.

**5. Rebuild** → Archive → TestFlight (steps above).

> For the very first demo, the **PWA** already gives full Google login with zero
> native setup — you can send the rabbi the link today and do the native client
> setup in parallel.

## Pre-release checklist
- [ ] Custom domain on the prod deploy (credibility) + Google OAuth redirect URI updated
- [ ] Rotate secrets (OpenAI / Hasura admin) before wide sharing
- [ ] Privacy Policy + Terms (App Store requires)
- [ ] Native Google OAuth: set `GOOGLE_IOS_CLIENT_ID`, add the iOS plugin +
      Info.plist URL scheme, `cap sync` (code is already wired — see above)
