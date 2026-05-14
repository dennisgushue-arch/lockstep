# Creative Launch SOP: Idea to Live Campaign (1-Page Checklist)

**Purpose:** Quick reference for launching one creative from concept through live deployment. Use alongside LOCKSTEP_PRESS_KIT.md for naming conventions and copy templates.

---

## Pre-Launch Checklist (Do Once Per Campaign Season)

- [ ] Campaign name finalized: `LKS_[PLATFORM]_[OBJECTIVE]_[GEO]_[AUDIENCE]_[DATE]`
- [ ] Ad set names finalized: `LKS_[PLATFORM]_[OBJECTIVE]_[AUDIENCE]_[PLACEMENT]_[OPTIMIZATION]`
- [ ] Trafficking sheet created with all campaign/ad set/ad name fields
- [ ] Budget allocation approved and assigned to campaign
- [ ] Landing page URL confirmed and working

---

## Stage 1: Ideation & Brief (Owner: Growth/Brand Lead | Timeline: 1–2 days)

- [ ] Creative concept approved (hook, visual approach, CTA)
- [ ] Copy variant selected from press kit or draft new copy
- [ ] Assign **Creative ID**: `LKS_[CHANNEL]_[OBJECTIVE]_[NUMBER]` (e.g., `LKS_TT_PERF_02`)
- [ ] Set initial status: `Draft` in tracking sheet
- [ ] Assign owner (designer/videographer/copywriter)

---

## Stage 2: Creative Development (Owner: Design/Content Team | Timeline: 3–7 days)

- [ ] Create asset using approved copy and visual direction
- [ ] Export drafts with version naming: `[CREATIVE_ID]_v1_[variant].[ext]`
  - Example: `LKS_TT_PERF_02_v1_hookA.mp4`
- [ ] Add captions/text overlays matching on-screen text pack
- [ ] Proof all CTAs, links, and messaging for accuracy
- [ ] Save to correct folder: `creative/edit/` (work-in-progress) or `creative/final/` (drafts ready for review)

---

## Stage 3: Internal Review (Owner: Stakeholder | Timeline: 1–2 days)

- [ ] Update status: `In Review`
- [ ] Share asset with review group (Slack, drive link, or platform preview)
- [ ] Collect feedback on:
  - Copy clarity and brand alignment
  - Visual quality and on-brand appearance
  - CTA clarity and destination
  - Compliance/legal check if needed
- [ ] Log feedback in tracking sheet `Notes` field
- [ ] Make revisions if needed; increment version: `_v2_`

---

## Stage 4: Approval & Sign-Off (Owner: Stakeholder Lead | Timeline: 1 day)

- [ ] Copy is final and matches press kit or approved variant
- [ ] Visual is final and brand-approved
- [ ] CTA text is correct (Install, Download, Learn More, etc.)
- [ ] Destination URL is correct and working
- [ ] Update status: `Approved`
- [ ] Update `Current Version` field in tracking sheet

---

## Stage 5: Asset Export & Trafficking (Owner: Growth/Ops | Timeline: 1 day)

- [ ] Export final asset with correct naming: `[CREATIVE_ID]_v[X]_master.[ext]`
  - Examples: `LKS_TT_PERF_02_v1_master.mp4`, `LKS_IG_BRAND_02_v1_thumbA.png`
- [ ] Move to `creative/final/` folder
- [ ] Generate UTM-tagged destination URL using template:

  ```text
  ?utm_source=[platform]&utm_medium=paid_social&utm_campaign=lks_[...campaign name...]&utm_content=lks_[creative_id]_v[X]_master&utm_term=lks_[...adset name...]
  ```

- [ ] Upload asset to ad platform (TikTok/Instagram/YouTube)
- [ ] Create ad in platform with exact name: `[CREATIVE_ID]_v[X]_master`
- [ ] Set destination URL to UTM-tagged link
- [ ] Attach to correct ad set: `LKS_[PLATFORM]_[OBJECTIVE]_[AUDIENCE]_[PLACEMENT]_[OPTIMIZATION]`

---

## Stage 6: Launch (Owner: Growth Lead | Timeline: 1 day)

- [ ] Budget is allocated to campaign and ad set
- [ ] Daily budget cap is correct
- [ ] All targeting (audience, geo, placement) is correct in platform
- [ ] Ad set optimization goal matches objective (`CPA`, `CPI`, `VTR`, etc.)
- [ ] Schedule or set go-live date in platform
- [ ] Update status in tracking sheet: `Live`
- [ ] Update `Launch Date` field to today's date

---

## Stage 7: Monitoring & Iteration (Owner: Growth Lead | Ongoing)

**Daily during first 48 hours:**

- [ ] Check spend pacing (should be roughly even across day)
- [ ] Check hold rate and CTR (are creatives being watched/clicked?)
- [ ] Spot-check comments for negative feedback

**After 2–3 days of data:**

- [ ] Compare CPI/CPA/VTR against benchmarks
- [ ] If performing: keep running and increase budget
- [ ] If underperforming: pause or test new hook variant

**Iteration rule:** If testing a different hook/variant, create new version:

- `[CREATIVE_ID]_v2_hookB` (not a new creative ID)
- Update tracking sheet: `Current Version` to `v2`, increment `Last Updated`
- Keep all versions in tracking sheet for performance comparison

**End-of-life:** When creative is no longer competitive:

- [ ] Update status: `Paused` or `Archived`
- [ ] Add performance summary to `Notes` (e.g., "Paused after 2 weeks, CPI $2.10")

---

## Quick Reference

### Creative ID Format

- Channels: `TT` (TikTok), `IG` (Instagram Reels), `YT` (YouTube Shorts)
- Objectives: `PERF` (Performance), `BRAND` (Brand)
- Examples: `LKS_TT_PERF_02`, `LKS_IG_BRAND_01`

### File Naming Format

- Variants: `master`, `hookA`, `hookB`, `cut15`, `cut30`, `thumbA`, `captions`
- Examples: `LKS_TT_PERF_02_v1_master.mp4`, `LKS_IG_BRAND_01_v2_thumbA.png`

### Status Values

- `Draft` → `In Review` → `Approved` → `Live` → `Paused` / `Archived`

### Tracking Sheet Columns

- Creative ID | Status | Owner | Current Version | Last Updated | Launch Date | Notes

---

**Questions?** Reference [LOCKSTEP_PRESS_KIT.md](LOCKSTEP_PRESS_KIT.md) for full naming conventions, copy templates, and UTM examples.
