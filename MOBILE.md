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

## ⚠️ Important: Google sign-in inside the native WebView

Google **blocks OAuth in embedded WebViews** ("disallowed_useragent"). So in the
plain Capacitor shell, the Google login button won't complete. Options:

- **For first TestFlight demos:** testers can use the **PWA** for full Google
  login, and the native shell to show the store/native experience; or
- **Proper fix (recommended before wide release):** add native Google sign-in —
  open auth in the system browser (ASWebAuthenticationSession via
  `@capacitor/browser`) or a native Google Sign-In plugin, and hand the result to
  next-auth via a deep link. This is a focused follow-up task (ask Claude to wire
  "native OAuth for Capacitor").

The PWA path has **no** such limitation — Google login works normally there.

## Pre-release checklist
- [ ] Custom domain on the prod deploy (credibility) + Google OAuth redirect URI updated
- [ ] Rotate secrets (OpenAI / Hasura admin) before wide sharing
- [ ] Privacy Policy + Terms (App Store requires)
- [ ] Native OAuth (for the App Store build)
