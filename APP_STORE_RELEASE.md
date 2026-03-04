# Lockstep Mobile App Store Release Guide

This project is now wired for native packaging via Capacitor so you can submit to:

- Apple App Store (iOS)
- Google Play Store (Android)

## What was added

- Capacitor config (`capacitor.config.ts`)
- Mobile scripts in `package.json`
- PWA manifest + service worker (`client/public/manifest.webmanifest`, `client/public/sw.js`)
- Web metadata for installability in `client/index.html`
- Legal starter pages:
  - `/privacy.html`
  - `/terms.html`

## One-time setup

1. Install dependencies:
   - `pnpm install`
2. Build web assets and sync Capacitor:
   - `pnpm mobile:build`
3. Add native projects:
   - `pnpm mobile:add:ios`
   - `pnpm mobile:add:android`

## Required native permissions

### iOS (`ios/App/App/Info.plist`)

Add:

- `NSMicrophoneUsageDescription`: “Lockstep uses your microphone so you can record commitment voice notes.”

If camera/photos are later used, add those descriptions as well.

### Android (`android/app/src/main/AndroidManifest.xml`)

Ensure this permission exists:

- `<uses-permission android:name="android.permission.RECORD_AUDIO" />`

## Build and open native projects

- iOS: `pnpm mobile:open:ios`
- Android: `pnpm mobile:open:android`

Then archive/sign in Xcode and Android Studio.

## Store checklist

Before submission, make sure you complete all of the below:

- [ ] Replace placeholder app icons/splash assets with production artwork.
- [ ] Replace legal templates (`privacy.html`, `terms.html`) with final legal text.
- [ ] Verify microphone permission strings are accurate and user-friendly.
- [ ] Ensure a production API/Supabase environment is configured.
- [ ] Remove debug/test routes or gate them behind admin/development flags.
- [ ] Test sign-in, recording, upload, and payments on real devices.
- [ ] Add account deletion instructions inside app and in store listing.
- [ ] Complete App Privacy (Apple) and Data Safety (Google Play) forms.

## Store submission asset checklist

Use this as your final handoff checklist for App Store Connect and Google Play Console.

### Brand + metadata

- [ ] Final app name (consistent with bundle display name).
- [ ] Subtitle (iOS) and short description (Android).
- [ ] Full description (platform-specific version).
- [ ] Primary category + secondary category (if used).
- [ ] Keywords (iOS) / tags (Android).
- [ ] Support URL.
- [ ] Privacy policy URL.
- [ ] Terms URL.
- [ ] Marketing website URL (optional but recommended).

### Visual assets

- [ ] App icon set finalized (iOS + Android).
- [ ] Feature graphic (Google Play).
- [ ] Splash/launch screen assets finalized.
- [ ] Screenshot set for all required device classes.
- [ ] Optional preview video recorded and uploaded.

### Compliance + trust

- [ ] Account deletion flow documented in-app and in listing text.
- [ ] Permission explanations match actual usage (microphone).
- [ ] Data collection disclosures match actual behavior.
- [ ] Age rating questionnaire completed.
- [ ] Content rights confirmed for all visuals, fonts, and media.

## Screenshot plan (recommended set)

Create 6–8 screenshots per platform in this sequence:

1. **Value proposition** — Dashboard with active pacts.
2. **Commitment creation** — Capture / lock-in flow.
3. **Voice commitment** — Voice note recording + extraction result.
4. **Accountability moment** — Timeline/history showing outcomes.
5. **Connected context** — Sources/calendar connections.
6. **Reflection/check-in** — Journal/check-in flow.
7. **Credits/payments** (if enabled in release build).
8. **Settings/privacy** — user controls and account options.

Notes:

- Keep copy readable at phone size.
- Keep one message per screenshot.
- Avoid placeholder/mock nonsense data in final captures.
- Use consistent device frame style across all images.

## Listing copy templates (ready to customize)

Replace bracketed placeholders before submitting.

### iOS subtitle template

Turn intentions into accountable action.

### Google Play short description template

Create real commitments, track outcomes, and stay accountable.

### Full description template (App Store + Play)

Lockstep helps you turn intentions into measurable commitments.

Create pacts with clear deadlines, track completion, and review your accountability history over time. Voice notes and connected context make it easier to commit to what is actually realistic.

Key features:
- Create deadline-based commitments
- Track completed, active, and missed pacts
- Record voice notes and extract commitment intent
- Review history and check-ins to maintain momentum
- Manage settings, privacy controls, and account preferences

Why people use Lockstep:
- Less vague planning, more follow-through
- Clear record of promises and outcomes
- Friction-light flow from intent to action

Permissions:
- Microphone: used only when you choose to record voice notes.

Support:
- Website: [https://your-domain.com]
- Support: [support@your-domain.com]
- Privacy policy: [https://your-domain.com/privacy]

## ASO keyword starter list

Use as a seed list and refine with your audience language:

- accountability
- habit tracker
- commitment tracker
- goal tracking
- productivity
- self improvement
- daily check-in
- reflection journal
- focus goals
- consistency

## Final pre-submit quality gate

- [ ] Production build uses no debug/test routes.
- [ ] Store screenshots reflect current UI (not older branding).
- [ ] Listing text and in-app behavior are fully consistent.
- [ ] Legal URLs are live and publicly reachable.
- [ ] Support email is monitored.
- [ ] All required forms completed with final answers.

## Release flow (recommended)

1. `pnpm mobile:build`
2. Open native IDE (Xcode/Android Studio)
3. Run on physical device
4. Create release build (AAB/IPA)
5. Upload to TestFlight / Internal Testing
6. Fix review feedback
7. Submit for production review

---

If you want, the next step is to auto-generate a CI release workflow (GitHub Actions) for Android AAB and iOS archive artifacts.
