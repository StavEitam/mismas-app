# MISMAS MVP Product & Technical Spec (Version 1.0)

**Date:** 2026-08-14
**Status:** Finalized for build
**Scale target:** 100-200 concurrent users per event
**Design principle:** Ship the smallest app that gets strangers talking face-to-face. Every mechanic below is deliberately borrowed from a proven, low-infrastructure app pattern (see Section 6) rather than invented from scratch — nothing here requires real-time infra, a custom admin system, or a cloud bill beyond Firebase's free tier at this scale.

---

## 1. MVP Feature List (Guest-Facing — 3-4 Screens Total)

This is the entire guest-facing scope for launch:

1. **Register** — Email/phone + name + photo. (Instagram OAuth optional add-on, not a blocker.)
2. **Event & Ticket** — View the current event, accept terms/consent, buy a ticket.
3. **Check-In** — 4-digit daily PIN check-in, with an optional Selfie Check-in step (see Section 3).
4. **Reveal** — Post-event screen showing everyone who checked in.

No live in-app features during the event itself. No chat. No matching. No admin app. That's the whole build.

---

## 2. Batch Over Real-Time (inspired by Timeleft)

**Principle:** Nothing in this MVP runs on live/real-time infrastructure (no WebSockets, no live-sync matching engine, no persistent connections). Every dynamic behavior is either:
- **A basic boolean/timestamp flip** on an existing document (e.g. `checkedIn: true`, `revealAt` reached), or
- **A scheduled batch job** (a Cloud Function on a timer, or one triggered manually by whoever runs the door) that runs once, not continuously.

**Concretely for this MVP:**
- Check-in = a single field update on the guest's `ticket` document (triggered by PIN entry — see Section 3). No real-time listener required to make it "work" — the reveal screen just re-queries when opened.
- The attendee reveal unlocks **only** via a manual flip of `event.revealed = true` in the Firestore console — see Section 4 for why this is deliberately manual-only, not time-based.
- **Any future matchmaking/grouping logic (e.g. the Fact-Grouping idea) must be built as a scheduled batch job that runs once before the event**, following the Timeleft pattern — never as live, per-action matching logic. This is a standing architectural rule for this product, not just an MVP shortcut.

---

## 3. PIN Check-In with Optional Selfie (inspired by IRL)

**Primary check-in must never create a bottleneck at the door, but must confirm the guest is physically on-site.** The MVP default is a **daily 4-digit PIN**: a single PIN is generated per event and displayed on a physical sign at the venue (visible only to people actually there). The guest opens their ticket screen, enters the 4-digit PIN, and check-in confirms instantly. This is deliberately simpler than QR scanning (no camera permission, no scan-alignment friction, nothing for door staff to operate) while still requiring physical presence — a guest can't check in from home without knowing tonight's PIN. Entering the correct PIN flips `checkedIn = true` immediately.

**Immediately after primary check-in, an optional "Selfie Check-in" prompt appears:** guests can snap a quick selfie to share their current vibe alongside their entry on the retroactive attendee list. This is:
- **Entirely optional** — skippable with one tap, never blocks or delays entry.
- **Technically trivial** — a photo upload to Firebase Storage plus a `selfieUrl` field on the same ticket document already being flipped. No new subsystem.
- **The engagement layer**, not the access layer — it's what makes the post-event reveal feel alive and personal, without ever risking a queue at the door.

---

## 4. Manual Admin Console (inspired by Grouper)

**There is no custom admin dashboard in this MVP.** At 100-200 users per event, all operational and edge-case handling is done manually, directly in the Firebase/Firestore console:

- **Moderation:** Flip a `status` field on a `users` doc to `suspended`/`banned` directly in the console.
- **Refunds:** Handled through the payment provider's own dashboard (e.g. Stripe), with the ticket's `purchaseStatus` manually updated to `refunded` in Firestore.
- **Odd-number groupings / no-shows:** Resolved by whoever's running the door that night, editing ticket records directly if needed — no automated re-pairing logic to build or maintain.
- **Triggering the reveal:** Manually flipping `event.revealed = true` in the console when the event actually wraps. This is the **only** trigger — no timestamp-based auto-reveal — because events rarely run exactly on schedule, and an auto-reveal firing mid-event would break the retroactive-only promise.

This is a deliberate scope cut, not a temporary gap: building and maintaining a custom admin UI is not justified at this scale. Revisit only once volume or team size genuinely requires it (see Section 7).

---

## 5. Design & UX Guidelines (inspired by Partiful)

The MVP is limited to 3-4 core screens — but small screen count is not an excuse for a generic, corporate-feeling app. Requirements for every screen:

- **Warm, casual tone.** Micro-copy should sound like a friend texting, not a system message — e.g. "You're in for tonight 🎉" instead of "Registration confirmed." Error and empty states get personality too (no bare "No data found").
- **Bouncy, alive micro-interactions.** Button taps, the check-in confirmation, and the reveal screen loading-in should use spring/bounce animation curves, not flat instant state changes. This is cheap to implement (standard React Native/Expo animation libraries) and disproportionately affects how "finished" the app feels.
- **Tel Aviv nightlife community identity.** Visual language should reflect the MISMAS brand — nightlife energy, drag-host warmth, queer community pride — not a neutral SaaS look. Color, type, and imagery choices should be distinctive enough that a screenshot is recognizably MISMAS, not a generic event-app template.
- **The reveal screen is the emotional payoff** — it should feel like a celebratory moment (motion, maybe confetti-style animation), not a plain list view, since it's the single screen guests are most anticipating after the event.
- **Branded default avatar required.** Guests who skip Instagram linking and don't take a selfie must still show up on the Reveal screen looking intentional, not blank. Design a MISMAS-branded default avatar (on-brand illustration or color-pattern placeholder, not a generic gray silhouette) used whenever both `photoUrl` and `selfieUrl` are missing, so the Reveal screen stays visually vibrant for every attendee regardless of how much they opted into.

Design effort should concentrate on these few screens rather than being spread thin — a tiny, distinctive app beats a larger, generic one.

---

## 6. The 3-Collection Architecture (Firebase/Firestore)

Three collections. No joins, no matching tables, no roles/admin tables.

### `users`
*(doc id = Firebase Auth uid)*
| Field | Type | Notes |
|---|---|---|
| `displayName` | string | |
| `photoUrl` | string | |
| `authMethod` | string | `email` \| `phone` \| (`instagram` if added later) |
| `status` | string | `active` \| `suspended` \| `banned` — set manually via console |
| `createdAt` | timestamp | |

### `events`
| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `venue` | string | |
| `date` | timestamp | |
| `capacity` | number | |
| `status` | string | `upcoming` \| `live` \| `past` |
| `checkInPin` | string | 4-digit daily PIN, set/rotated manually per event, displayed on a physical sign at the venue |
| `revealed` | bool | The **only** reveal trigger — manually flipped `true` from the console when the event wraps. No timestamp-based auto-reveal. |

### `tickets`
*(top-level collection; queried by `userId` and by `eventId`)*
| Field | Type | Notes |
|---|---|---|
| `userId` | string | ref to `users` |
| `eventId` | string | ref to `events` |
| `purchaseStatus` | string | `paid` \| `refunded` — refunds set manually |
| `consentAccepted` | bool | |
| `checkedIn` | bool | Flipped when the guest enters the correct daily PIN for the event |
| `checkedInAt` | timestamp | nullable |
| `selfieUrl` | string | nullable — set only if the optional Selfie Check-in is completed |

**Reveal query:** `tickets` where `eventId == X AND checkedIn == true` → join each `userId` to its `users.displayName` / `photoUrl`, and show `selfieUrl` where present. That's the entire post-event screen's data logic.

**No 4th collection is required for this MVP.** If Instagram OAuth or Hebrew localization strings are added later, they extend existing `users` fields rather than needing new collections.

---

## 7. Explicitly Out of Scope (Deferred, Not Cancelled)

Preserved for future versions once the MVP validates the core loop:

- Lock & Key drink feature
- Fact-Grouping icebreaker (must be built as a pre-event batch job per Section 2 when revisited)
- Rotation Bell, proximity conversation cards, Mystery Missions, Silent Disco Signal
- Mutual-tagging / auto-unlocked contact info on the reveal screen (v1 reveal is view-only)
- Custom Admin Web Dashboard (survey builder, targeted messaging, staff roles) — console access only for now
- In-app Contact Production form — direct guests to existing external channels for now
- Hebrew UI strings (scaffolding for a toggle is kept cheap via string externalization, but translations don't ship yet)

---

## 8. Why This Is the Right Scope (Traceability to Research)

| Principle applied | Source app | What it saves |
|---|---|---|
| Batch jobs over real-time matching | Timeleft | No WebSocket infra, no live matching engine to build/debug |
| Manual console over admin dashboard | Grouper | An entire admin app's worth of screens and auth/roles logic |
| PIN check-in, selfie optional | IRL | Confirms physical presence with near-zero friction (no camera/scan step); selfie is pure upside engagement, zero access-flow risk |
| 3-4 screens, high design investment per screen | Partiful | Design effort concentrated where it's seen most, not spread across unnecessary screens |
| 3-collection Firestore schema | All four | No relational database, no joins, no ORM — matches the actual query patterns needed |

This spec is intentionally boring at the infrastructure layer and intentionally distinctive at the design layer — that split is where the "functional and highly engaging without over-engineering" goal actually comes from.
