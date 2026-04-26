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

## Screenshot system (pixel-level, conversion-first)

### Core principle

Every screenshot must answer:

**What happens if I don't follow through?**

### Canvas specs

- iOS (primary): `1290 × 2796 px` (iPhone 14/15 Pro Max)
- Android (safe cross-platform): `1242 × 2688 px`

### Global design system

Background:

- Black: `#000000`

Cards:

- Dark: `#0A0A0A`
- Border: `#1F1F1F`

Primary colors:

- Red (pressure): `#DC2626`
- White (action): `#FFFFFF`
- Gray text: `#A1A1AA`

Typography:

- Headline: `80–100px`, bold, uppercase for key lines
- Subtext: `36–44px`, medium, gray

Universal layout structure for every frame:

1. Top text group (dominant)
2. Centered app UI mockup
3. Optional subtext line

### Screenshot set (7 total)

1. **HOOK**
   - Headline: `YOU SAID YOU WOULD`
   - Sub: `Nothing happens when you don't follow through`
   - Visual: blurred phone UI background + faint red glow

2. **CAPTURE**
   - Headline: `Say it once`
   - Sub: `Stop repeating it in your head`
   - Visual: input screen with `I need to...` filled

3. **TRANSFORM**
   - Headline: `We turn it real`
   - Sub: `Clear action. Real deadline.`
   - Visual: action card example (`Run 5 minutes`, `Today 7 PM`, `5 credits`)

4. **STAKE**
   - Headline: `Put something on the line`
   - Sub: `Follow through—or lose it`
   - Visual: credits-at-risk UI with restrained red emphasis

5. **PRESSURE**
   - Headline: `Now it costs you`
   - Sub: `This is where most people quit`
   - Visual: countdown + `You're at risk`

6. **FAILURE (CRITICAL)**
   - Headline: `YOU DIDN'T DO IT`
   - Sub: `That's the truth`
   - Visual: red-leaning result state with score drop indicator

7. **RECOVERY / IDENTITY**
   - Headline: `Recover immediately`
   - Sub: `Your word starts to mean something`
   - Visual: recovery pact + identity score rising

### Ready-to-copy Figma text layer pack (Frame 1–7)

Use this block verbatim when creating text layers in Figma.

```text
Frame 1 — Hook
TOP_HEADLINE: YOU SAID YOU WOULD
SUBTEXT: Nothing happens when you don't follow through

Frame 2 — Capture
TOP_HEADLINE: Say it once
SUBTEXT: Stop repeating it in your head

Frame 3 — Transform
TOP_HEADLINE: We turn it real
SUBTEXT: Clear action. Real deadline.

Frame 4 — Stake
TOP_HEADLINE: Put something on the line
SUBTEXT: Follow through—or lose it

Frame 5 — Pressure
TOP_HEADLINE: Now it costs you
SUBTEXT: This is where most people quit

Frame 6 — Failure
TOP_HEADLINE: YOU DIDN'T DO IT
SUBTEXT: That's the truth

Frame 7 — Recovery
TOP_HEADLINE: Recover immediately
SUBTEXT: Your word starts to mean something
```

Optional text-layer naming convention per frame:

- `TOP_HEADLINE`
- `SUBTEXT`

### A/B copy variant pack (tone test)

Use one full tone set at a time when testing. Do not mix A and B in the same screenshot run.

```text
Variant A (Harsher)

Frame 1 — Hook
TOP_HEADLINE: YOU SAID YOU WOULD
SUBTEXT: Nothing changes if you keep breaking your word

Frame 2 — Capture
TOP_HEADLINE: Say it once
SUBTEXT: Stop hiding behind intentions

Frame 3 — Transform
TOP_HEADLINE: We make it concrete
SUBTEXT: Action. Deadline. No excuses.

Frame 4 — Stake
TOP_HEADLINE: Put it at risk
SUBTEXT: Follow through—or pay for it

Frame 5 — Pressure
TOP_HEADLINE: Time is running out
SUBTEXT: This is where promises collapse

Frame 6 — Failure
TOP_HEADLINE: YOU DIDN'T DO IT
SUBTEXT: This is the cost of avoidance

Frame 7 — Recovery
TOP_HEADLINE: Recover now
SUBTEXT: Rebuild trust with one real win
```

```text
Variant B (Softer)

Frame 1 — Hook
TOP_HEADLINE: YOU SAID YOU WOULD
SUBTEXT: Most goals fade without accountability

Frame 2 — Capture
TOP_HEADLINE: Say it once
SUBTEXT: Turn a repeated thought into a real commitment

Frame 3 — Transform
TOP_HEADLINE: We turn it real
SUBTEXT: Clear action. Real deadline.

Frame 4 — Stake
TOP_HEADLINE: Put something on the line
SUBTEXT: Follow through with real accountability

Frame 5 — Pressure
TOP_HEADLINE: Now it counts
SUBTEXT: This is where consistency is built

Frame 6 — Failure
TOP_HEADLINE: YOU DIDN'T DO IT
SUBTEXT: See the result clearly and move forward

Frame 7 — Recovery
TOP_HEADLINE: Recover immediately
SUBTEXT: Your word starts to mean something
```

Testing note:

- Start with `Variant B` for broad-market fit.
- Test `Variant A` if you want stronger qualification and higher-intent users.

### App Store A/B experiment template

Use this before launching any screenshot variant test.

```text
Experiment name:
Platform:
Storefront / Locale:
Date range:
Owner:

Hypothesis:
If we change [control screenshot set] to [variant screenshot set],
then [primary metric] will improve because [reason].

Control (A):
Variant (B):

Primary metric:
- Product page conversion rate (impressions -> first installs)

Secondary metrics:
- Absolute first installs
- Day 1 retention (if available)
- Rating volume / average rating (watch for quality drift)

Minimum duration:
- 14 days minimum
- At least one full weekday + weekend cycle

Minimum sample:
- >= 1,000 product page visitors per variant
   (or run longer until stable)

Decision rule:
- Ship variant if:
   1) Primary metric improves by >= 8% relative lift, and
   2) No meaningful drop in Day 1 retention (<= 3% relative decline), and
   3) No negative rating trend.

Stop / no-ship rule:
- Do not ship if confidence is low due to sample size,
   or if conversion gain comes with clear quality decline.

Result summary:
- Winner:
- Relative lift:
- Tradeoffs observed:
- Final decision:
- Next test to run:
```

### Design rules

1. **Big text > UI**: message leads, interface supports.
2. **One idea per screen**: no mixed concepts.
3. **Contrast discipline**: use red sparingly for impact.
4. **Show outcome**: don't hide failure; make consequence visible.

### Psychology flow

1. You're lying to yourself
2. Say it
3. We fix it
4. You commit
5. Pressure hits
6. You fail (or don't)
7. You recover

### Figma build structure

Create frames in order:

- Frame 1 — Hook
- Frame 2 — Capture
- Frame 3 — Transform
- Frame 4 — Stake
- Frame 5 — Pressure
- Frame 6 — Failure
- Frame 7 — Recovery

Inside each frame:

- Top text group
- Centered phone mockup
- Optional subtext

### Export settings

- PNG
- 100% quality
- No compression artifacts

Most apps show features. This set should show **truth + consequence**.

## Listing copy templates (ready to customize)

Replace bracketed placeholders before submitting.

### iOS subtitle template

Turn intentions into accountable action.

### Google Play short description template

You either follow through — or you don't. Lockstep makes it real.

### Full description template (App Store + Play)

Lockstep is for the things you keep saying you'll do and still haven't done.

You admit the drift. Lockstep turns it into a concrete pact with a deadline, proof requirement, and consequence. When the deadline gets close, pressure shows up. If you miss, the result is explicit. Then recovery starts immediately.

### Positioning block (required)

#### NOT A HABIT TRACKER

This is not motivation.
This is not reminders.

This is consequence-based follow-through.

Category to own: **Accountability with consequences**.

Key features:

- Turn vague intentions into concrete actions
- Lock a pact with stake, deadline, proof, and consequence
- Get pressure notifications before failure, not friendly reminders
- See missed outcomes clearly and start recovery immediately
- Build momentum until your word starts to mean something

Why people use Lockstep:

- Less explaining, more commitment
- Clear consequences instead of vague motivation
- A fast first win that gets you into motion

Keyword guidance (subtle use in natural language):

- accountability
- discipline
- productivity
- habit tracker

Use those words sparingly and naturally. Never make the listing read like keyword stuffing.

## Review prompt rules

Ask for an app review only after:

1. **First completion**
   - Prompt: *Did you actually follow through because of Lockstep?*
2. **3+ streak**
   - Prompt: *Your word is starting to mean something. Rate Lockstep?*
3. **Recovery success**
   - Prompt: *You recovered. That matters.*

Do **not** ask:

- on open
- randomly
- too early

Use native review APIs where available:

- iOS: `SKStoreReviewController`
- Android: Play In-App Review API

## First Win Guarantee

First-time users should complete something inside **2 hours**.

Force:

- tiny pact
- short deadline
- low stake

The first loop should feel concrete, immediate, and impossible to hide from.

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

## CI: signed Android AAB (GitHub Actions)

A GitHub Actions workflow now exists at:

- `.github/workflows/android-release-aab.yml`

It builds a **signed** Android App Bundle (`.aab`) without committing signing files to the repository.

### Triggers

- Manual run: **Actions → Android Signed AAB → Run workflow**
- Automatic on GitHub release publish (`release.published`)

### Required GitHub repository secrets

- `ANDROID_KEYSTORE_BASE64` — base64-encoded upload keystore file
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

### Output

- Uploaded workflow artifact: `signed-aab`
- AAB path in build job: `android/app/build/outputs/bundle/release/*.aab`
- On release-triggered runs, the AAB is also attached to the GitHub Release.

### Finding the `.aab` to upload to Google Play

- Local build output path: `android/app/build/outputs/bundle/release/app-release.aab`
- Dev container/Codespace note: Google Play Console file picker only sees files on your local computer.
- Dev container/Codespace flow: download `app-release.aab` from the workspace first, then upload that downloaded file in Play Console.
- CI flow: download artifact `signed-aab` from the workflow run, unzip it, then upload `app-release.aab`.

### Security notes

- Keystore material is restored from secrets at runtime only.
- The keystore file is removed in a cleanup step at the end of the workflow.
- Local signing files remain gitignored (`android/signing/*` secrets are not committed).
