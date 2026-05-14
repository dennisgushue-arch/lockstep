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

### Screenshot set (5 total)

> **Positioning principle**: sell the pain and the promise first. Pressure comes after trust.

1. **HOOK**
   - Headline: `Stop breaking promises to yourself`
   - Sub: `The app that turns "I should" into real commitments`
   - Visual: hero black screen + white headline, faint red glow accent

2. **CAPTURE**
   - Headline: `Turn "I should" into one small action`
   - Sub: `Say it once. Do it once. Build from there.`
   - Visual: input screen with example commitment filled in

3. **REMINDERS**
   - Headline: `Get reminders before you slip`
   - Sub: `Stay on track before the deadline hits`
   - Visual: notification/reminder UI, clean dark card

4. **PROGRESS**
   - Headline: `Build your follow-through score`
   - Sub: `Every completed commitment raises your credibility`
   - Visual: momentum screen with rising score/streak indicator

5. **RECOVERY**
   - Headline: `Missed? Recover with one small win`
   - Sub: `You don't lose everything. One pact gets you back.`
   - Visual: recovery pact screen, green accent, identity score recovering

### Ready-to-copy Figma text layer pack (Frame 1–7)

Use this block verbatim when creating text layers in Figma.

```text
Frame 1 — Hook
TOP_HEADLINE: Stop breaking promises to yourself
SUBTEXT: The app that turns "I should" into real commitments

Frame 2 — Capture
TOP_HEADLINE: Turn "I should" into one small action
SUBTEXT: Say it once. Do it once. Build from there.

Frame 3 — Reminders
TOP_HEADLINE: Get reminders before you slip
SUBTEXT: Stay on track before the deadline hits

Frame 4 — Progress
TOP_HEADLINE: Build your follow-through score
SUBTEXT: Every completed commitment raises your credibility

Frame 5 — Recovery
TOP_HEADLINE: Missed? Recover with one small win
SUBTEXT: You don't lose everything. One pact gets you back.
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

## App Store preview video storyboard (10–15s, mute-first)

### Goal

Hook → Show mechanism → Show consequence → Show recovery

No narration required. Video must work with sound off.

### Timeline (12–14 seconds)

#### 0.0–1.5s — Hook

On-screen text (big):

- `YOU SAID YOU WOULD`

Subtext (small):

- `Nothing happens when you don't follow through`

Visual:

- Black background
- Subtle red pulse/glow
- Slight shake for tension

#### 1.5–3.0s — Capture

On-screen text:

- `Say it once`

Visual:

- Phone UI with user typing: `I need to work out`
- Blinking cursor for realism

#### 3.0–5.0s — Transform

On-screen text:

- `We turn it real`

Visual:

- Card animates in with: `Run for 5 minutes`, `Today 7:00 PM`, `5 credits at risk`, `Proof: Photo`
- Smooth upward motion + slight snap

#### 5.0–6.5s — Commit

On-screen text:

- `Lock it in`

Visual:

- Big button tap: `PROVE YOU MEAN IT`
- Quick haptic-style flash

#### 6.5–8.5s — Pressure

On-screen text:

- `Now it costs you`

Visual:

- Countdown: `30 minutes left`
- Red highlight appears
- Slight screen zoom-in

#### 8.5–10.0s — Failure (critical)

On-screen text (very large):

- `YOU DIDN'T DO IT`

Subtext:

- `That's a fact`

Visual:

- Red overlay
- Score drops (example: `78 → 74`)
- Quick downward motion

#### 10.0–12.0s — Recovery

On-screen text:

- `Recover immediately`

Visual:

- Recovery card: `Send one message`, `Next 2 hours`
- Button pulse

#### 12.0–14.0s — Identity close

On-screen text:

- `Your word becomes real`

Subtext:

- `Follow through—or lose`

Visual:

- Momentum screen
- Score ticking upward slightly
- Clean fade out

### Shot list (quick handoff)

1. Hook title on black with red pulse
2. Capture input typing state
3. Transform card reveal
4. Commitment CTA tap
5. Pressure countdown close-up
6. Failure impact frame (red + score drop)
7. Recovery action card pulse
8. Momentum close + identity line

### Visual style

Colors:

- Black background
- White text
- Red for pressure moments only

Motion:

- Fast cuts (1–2s per scene)
- Subtle zooms
- Light shake on failure
- Snap transitions for decisions

UI treatment:

- Slight glow around key elements
- Minimal blur behind focus cards

### Audio (optional, still mute-safe)

If audio is enabled, keep it subtle:

- Typing click
- Button tap
- Low bass hit on `YOU DIDN'T DO IT`
- Light rising tone on recovery

### Psychology flow (what this must force)

1. Recognition (`that's me`)
2. Clarity (system understood instantly)
3. Tension (stakes + timer)
4. Consequence (failure shown)
5. Redemption (recovery exists)

### Avoid

- Mandatory voiceover
- Slow pacing
- Feature explanations
- Too many screens
- Soft motivational tone

### Export settings (video)

- Length: `12–15s`
- Format: `MP4`
- Resolution: `1080 × 1920` (portrait)
- FPS: `30`
- Bitrate: high (store will re-compress)

### Build stack (fastest)

- Figma (frames)
- CapCut or After Effects (animation)
- Export and upload

### CapCut edit script (frame-by-frame, ready to execute)

Project setup:

- Canvas: `9:16` (portrait)
- Resolution: `1080 × 1920`
- FPS: `30`
- Duration target: `13.5s` (acceptable range `12–15s`)
- Background base: `#000000`

Text presets (create once, reuse):

- `Headline_L`:
  - Font weight: bold
  - Case: uppercase (where specified)
  - Size: `130–160` (scene-dependent)
  - Color: `#FFFFFF`
  - Shadow: black `35%`, blur `8`, y-offset `4`
- `Sub_M`:
  - Size: `52–64`
  - Color: `#A1A1AA`
  - Line height: `105–110%`

Global motion defaults:

- Entrance transition between shots: `0.10–0.18s` (`Fade` or `Flash` only)
- Push/zoom keyframes: ease out
- Keep all shot lengths between `1.3–2.0s`

#### Shot 1 — Hook (`0.0–1.5s`)

On-screen text:

- Headline: `YOU SAID YOU WOULD`
- Sub: `Nothing happens when you don't follow through`

CapCut actions:

- Add black solid background clip (`1.5s`)
- Add red ambient overlay (ellipse or vignette)
  - Color: `#DC2626`
  - Opacity animation: `8% → 15% → 8%`
- Apply shake (very subtle)
  - Speed: low
  - Strength: `5–8`
- Text in/out animation:
  - In: `Fade In` `0.15s`
  - Out: `Fade Out` `0.10s`

#### Shot 2 — Capture (`1.5–3.0s`)

On-screen text:

- `Say it once`

CapCut actions:

- Use phone UI capture screen image/video
- Add typed text reveal: `I need to work out` (Typewriter: `0.9s`; cursor blink: `2 Hz` equivalent, or manual opacity keyframes)
- Camera keyframe zoom: `100% → 104%`
- Transition from Shot 1: `Flash` `0.12s`

#### Shot 3 — Transform (`3.0–5.0s`)

On-screen text:

- `We turn it real`

Card content:

- `Run for 5 minutes`
- `Today 7:00 PM`
- `5 credits at risk`
- `Proof: Photo`

CapCut actions:

- Animate card from Y `+120px` to `0px`
- Add slight overshoot keyframe: `0px → -8px → 0px`
- Add card glow (white `10–12%` opacity)
- Transition from Shot 2: `Fade` `0.12s`

#### Shot 4 — Commit (`5.0–6.5s`)

On-screen text:

- `Lock it in`

Button text in UI:

- `PROVE YOU MEAN IT`

CapCut actions:

- Tap ripple on button at `5.7s`
- Screen flash overlay at tap: white overlay `0% → 20% → 0%` in `0.12s`
- Optional micro-zoom punch: `102% → 100%` over `0.20s`
- Transition from Shot 3: `Flash` `0.10s`

#### Shot 5 — Pressure (`6.5–8.5s`)

On-screen text:

- `Now it costs you`

Countdown text in UI:

- `30 minutes left`

CapCut actions:

- Animate countdown opacity `0% → 100%`
- Add red edge glow/vignette (opacity: `0% → 18%`)
- Slow zoom-in: `100% → 106%`
- Transition from Shot 4: `Fade` `0.12s`

#### Shot 6 — Failure (critical) (`8.5–10.0s`)

On-screen text (very large):

- `YOU DIDN'T DO IT`
- Sub: `That's a fact`

UI cue:

- Score drop: `78 → 74`

CapCut actions:

- Add red full-screen overlay:
  - Opacity spike `0% → 28% → 12%`
- Add downward impact motion:
  - Position Y: `0 → +22px`
  - Duration: `0.18s`
- Apply brief shake (stronger than Shot 1):
  - Strength: `12–16`
  - Duration: `0.20s`
- Transition from Shot 5: `Flash` `0.10s`

#### Shot 7 — Recovery (`10.0–12.0s`)

On-screen text:

- `Recover immediately`

Recovery card copy:

- `Send one message`
- `Next 2 hours`

CapCut actions:

- Pulse CTA button twice (scale `100% → 106% → 100%`, repeat x2)
- Reduce red overlay to neutral by `10.8s`
- Add soft glow to recovery card (`8–10%`)
- Transition from Shot 6: `Fade` `0.15s`

#### Shot 8 — Identity close (`12.0–14.0s`)

On-screen text:

- `Your word becomes real`
- Sub: `Follow through—or lose`

CapCut actions:

- Show momentum screen with slight upward score tick
- Gentle zoom-out: `102% → 100%`
- Final fade to black in last `0.30s`
- Transition from Shot 7: `Fade` `0.15s`

### Audio map (optional, keep mix low)

- `1.9s`: typing click (light)
- `5.7s`: button tap
- `8.6s`: low bass hit on failure
- `10.3s`: soft rising tone for recovery

Mix guidance:

- Keep peaks below `-6 dB`
- Leave dynamic room for store recompression
- If in doubt, mute-safe first

### Final QC checklist (before export)

- [ ] Every scene reads clearly with audio off
- [ ] Main headline readable within `0.5s`
- [ ] Red only appears in pressure/failure moments
- [ ] Total duration stays within `12–15s`
- [ ] No scene exceeds `2.0s`
- [ ] Export verified at `1080 × 1920`, `30fps`, MP4

### Figma handoff template (1:1 with CapCut shots)

Use this exact naming contract so the editor can import assets in order with zero guesswork.

#### Page structure

- Page name: `App Store Video v1`
- Sections: `00_Global_Styles`, `01_Shots_Export`, `02_Text_Alt_Variants` (optional)

#### Global style tokens (Figma Styles)

- Color / `BG_Black` = `#000000`
- Color / `Text_White` = `#FFFFFF`
- Color / `Text_Gray` = `#A1A1AA`
- Color / `Pressure_Red` = `#DC2626`
- Effect / `Glow_Subtle`
- Effect / `Shadow_Headline`
- Text / `Headline_L`
- Text / `Sub_M`

#### Frame naming convention

Pattern:

- `S##_Name_[start-end]`

Example:

- `S01_Hook_[0.0-1.5]`

Use these exact frame names:

- `S01_Hook_[0.0-1.5]`
- `S02_Capture_[1.5-3.0]`
- `S03_Transform_[3.0-5.0]`
- `S04_Commit_[5.0-6.5]`
- `S05_Pressure_[6.5-8.5]`
- `S06_Failure_[8.5-10.0]`
- `S07_Recovery_[10.0-12.0]`
- `S08_Identity_[12.0-14.0]`

#### Layer naming convention (inside every frame)

Required top-level layers:

- `BG_Base`
- `FX_Overlay`
- `UI_Device`
- `TXT_Headline`
- `TXT_Sub`
- `FX_Action`
- `SAFE_Guide` (optional, non-export)

Optional per-scene helper layers:

- `UI_Card`
- `UI_Button`
- `UI_Countdown`
- `UI_Score`
- `FX_Glow`
- `FX_Shake_Ref`

#### Export contract (critical)

Export each shot frame as a PNG sequence source (single still per shot unless animating in CapCut):

- Preset: `@1x PNG`
- Size: `1080 × 1920`
- File names must match frame names exactly.

Expected exported files:

- `S01_Hook_[0.0-1.5].png`
- `S02_Capture_[1.5-3.0].png`
- `S03_Transform_[3.0-5.0].png`
- `S04_Commit_[5.0-6.5].png`
- `S05_Pressure_[6.5-8.5].png`
- `S06_Failure_[8.5-10.0].png`
- `S07_Recovery_[10.0-12.0].png`
- `S08_Identity_[12.0-14.0].png`

#### Text mapping table (Figma → CapCut)

Use this as the handoff source of truth:

- `S01_Hook_[0.0-1.5]` → `TXT_Headline: YOU SAID YOU WOULD` | `TXT_Sub: Nothing happens when you don't follow through`
- `S02_Capture_[1.5-3.0]` → `TXT_Headline: Say it once` | `TXT_Sub: (optional blank)`
- `S03_Transform_[3.0-5.0]` → `TXT_Headline: We turn it real` | `TXT_Sub: (optional blank)`
- `S04_Commit_[5.0-6.5]` → `TXT_Headline: Lock it in` | `TXT_Sub: (optional blank)`
- `S05_Pressure_[6.5-8.5]` → `TXT_Headline: Now it costs you` | `TXT_Sub: (optional blank)`
- `S06_Failure_[8.5-10.0]` → `TXT_Headline: YOU DIDN'T DO IT` | `TXT_Sub: That's a fact`
- `S07_Recovery_[10.0-12.0]` → `TXT_Headline: Recover immediately` | `TXT_Sub: (optional blank)`
- `S08_Identity_[12.0-14.0]` → `TXT_Headline: Your word becomes real` | `TXT_Sub: Follow through—or lose`

#### Quick handoff checklist (design → editor)

- [ ] All 8 frames named with `S##_Name_[start-end]`
- [ ] Layer names follow `BG_`, `UI_`, `TXT_`, `FX_`
- [ ] Text styles use `Headline_L` and `Sub_M`
- [ ] Exported PNG files match frame names exactly
- [ ] CapCut timeline shots map 1:1 with exported files
- [ ] Designer includes one screenshot of layer tree for `S01` as reference

### CapCut import checklist (copy-paste, <10 min assembly)

Use this block as the editor runbook.

#### 1) Media bin import order (exact)

Import these assets in this order:

1. `S01_Hook_[0.0-1.5].png`
2. `S02_Capture_[1.5-3.0].png`
3. `S03_Transform_[3.0-5.0].png`
4. `S04_Commit_[5.0-6.5].png`
5. `S05_Pressure_[6.5-8.5].png`
6. `S06_Failure_[8.5-10.0].png`
7. `S07_Recovery_[10.0-12.0].png`
8. `S08_Identity_[12.0-14.0].png`

Optional overlays/SFX imports:

- `SFX_typing_click.wav`
- `SFX_button_tap.wav`
- `SFX_bass_hit.wav`
- `SFX_rise_tone.wav`

#### 2) Timeline project settings

- Ratio: `9:16`
- Resolution: `1080 × 1920`
- FPS: `30`
- Audio sample rate: `48kHz`
- Target duration: `14.0s`

#### 3) Clip duration map (exact)

Set still durations to:

- `S01_Hook_[0.0-1.5]` → `1.5s`
- `S02_Capture_[1.5-3.0]` → `1.5s`
- `S03_Transform_[3.0-5.0]` → `2.0s`
- `S04_Commit_[5.0-6.5]` → `1.5s`
- `S05_Pressure_[6.5-8.5]` → `2.0s`
- `S06_Failure_[8.5-10.0]` → `1.5s`
- `S07_Recovery_[10.0-12.0]` → `2.0s`
- `S08_Identity_[12.0-14.0]` → `2.0s`

Total: `14.0s`

#### 4) Transition map (shot-to-shot)

Apply transitions in this exact sequence:

- `S01 → S02`: `Flash` `0.12s`
- `S02 → S03`: `Fade` `0.12s`
- `S03 → S04`: `Flash` `0.10s`
- `S04 → S05`: `Fade` `0.12s`
- `S05 → S06`: `Flash` `0.10s`
- `S06 → S07`: `Fade` `0.15s`
- `S07 → S08`: `Fade` `0.15s`

#### 5) Effect checklist by shot

- `S01`: red ambient pulse + subtle shake
- `S02`: typewriter reveal + micro zoom-in
- `S03`: card rise + slight overshoot
- `S04`: tap ripple + white flash punch
- `S05`: red edge vignette + slow zoom-in
- `S06`: red impact overlay + stronger shake + score drop cue
- `S07`: CTA pulse x2 + recovery glow
- `S08`: gentle zoom-out + end fade to black

#### 6) Audio placement map (optional)

- `1.9s` → typing click
- `5.7s` → button tap
- `8.6s` → low bass hit
- `10.3s` → rising recovery tone

Audio mix guardrails:

- Peak max: `-6 dB`
- Keep voiceover off by default
- Final pass must still read perfectly muted

#### 7) Export checklist (final)

- [ ] Duration between `12–15s` (target `14.0s`)
- [ ] Text readable at mobile size in first `0.5s` of each shot
- [ ] Red accents only in pressure/failure beats
- [ ] No shot exceeds `2.0s`
- [ ] Export preset: `MP4`, `1080 × 1920`, `30fps`, high bitrate
- [ ] Preview once on phone before store upload

### Versioning + handoff protocol (multi-editor safe)

Use this protocol for every revision so changes stay traceable and reversible.

#### Naming convention

Use semantic, date-stamped version labels:

- `ASV_v1.0_YYYY-MM-DD` (initial approved cut)
- `ASV_v1.1_YYYY-MM-DD` (copy/timing tweaks, same concept)
- `ASV_v2.0_YYYY-MM-DD` (new concept or major restructuring)

Working files:

- Figma: `Lockstep_AppStoreVideo_ASV_vX.Y_YYYY-MM-DD.fig`
- CapCut project: `Lockstep_ASV_vX.Y_YYYY-MM-DD.capcut`
- Export: `lockstep_asv_vX.Y_YYYY-MM-DD.mp4`

#### Revision categories

- `Patch (v1.0 → v1.1)`: text edits, small timing tweaks (`<= 0.3s`), transition polish
- `Minor (v1.1 → v1.2)`: visual style updates, pacing refinements, SFX/music adjustment
- `Major (v1.x → v2.0)`: new storyline, reordered shots, different emotional arc

#### Change log template (required each version)

Copy/paste this block into your production notes:

```text
Version: ASV_vX.Y_YYYY-MM-DD
Editor:
Designer:

What changed:
-
-

Why it changed:
-

Impact expected:
-

Risks / watchouts:
-

Replaces:
Approver:
Approval date:
```

#### Approval gates (must pass in order)

Gate 1 — Creative QA (Designer + PM):

- [ ] Story arc preserved: hook → mechanism → consequence → recovery
- [ ] Copy matches approved script exactly
- [ ] Visual hierarchy is readable on mobile

Gate 2 — Technical QA (Editor):

- [ ] Duration in `12–15s` window
- [ ] Export format/spec correct (`MP4`, `1080×1920`, `30fps`)
- [ ] Audio peaks below `-6 dB` (if audio enabled)

Gate 3 — Product QA (Founder/Owner):

- [ ] Message lands without narration (mute-safe)
- [ ] Consequence moment is unmistakable (`YOU DIDN'T DO IT`)
- [ ] Recovery moment is clear and immediate

#### Handoff package checklist (editor → reviewer)

- [ ] Current `mp4` export
- [ ] CapCut project file
- [ ] Figma source link/file
- [ ] Changelog entry (completed template)
- [ ] One-line summary of what changed vs previous version

#### Rollback rule

If a new version underperforms or introduces ambiguity, rollback to the last approved major/minor baseline:

- Preferred rollback target: latest `ASV_v1.x` with full gate approvals.

Keep the previous approved file untouched; never overwrite historical exports.

### Positioning note

Most app videos show:

- features
- UI
- benefits

This one must show:

- truth
- pressure
- consequence

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
- [ ] Detection smoke test passes: `pnpm smoke:detection`.
- [ ] Store screenshots reflect current UI (not older branding).
- [ ] Listing text and in-app behavior are fully consistent.
- [ ] Legal URLs are live and publicly reachable.
- [ ] Support email is monitored.
- [ ] All required forms completed with final answers.

## Release flow (recommended)

1. `pnpm smoke:detection`
2. `pnpm screenshots:play`
3. `pnpm mobile:build`
4. Open native IDE (Xcode/Android Studio)
5. Run on physical device
6. Create release build (AAB/IPA)
7. Upload to TestFlight / Internal Testing
8. Fix review feedback
9. Submit for production review

### Required order for release assets

- Always run `pnpm smoke:detection` before generating release screenshots.
- Always generate screenshots (`pnpm screenshots:play`) before creating final AAB/IPA artifacts.
- If smoke test fails, do not proceed to screenshots or release bundles.

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
