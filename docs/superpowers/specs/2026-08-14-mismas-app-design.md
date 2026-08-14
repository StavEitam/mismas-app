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
3. **Check-In** — 4-digit daily PIN check-in (see Section 3). No selfie feature — see Section 7.
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

## 3. PIN Check-In (inspired by IRL)

**Primary check-in must never create a bottleneck at the door, but must confirm the guest is physically on-site.** The MVP default is a **daily 4-digit PIN**: a single PIN is generated per event and displayed on a physical sign at the venue (visible only to people actually there). The guest opens their ticket screen, enters the 4-digit PIN, and check-in confirms instantly. This is deliberately simpler than QR scanning (no camera permission, no scan-alignment friction, nothing for door staff to operate) while still requiring physical presence — a guest can't check in from home without knowing tonight's PIN. Entering the correct PIN flips `checkedIn = true` immediately, which is the entire check-in flow — no further steps.

No selfie/photo capture step exists in this MVP (see Section 7) — the app stays on Firebase's free Spark plan, which does not include Cloud Storage.

---

## 4. Manual Admin Console, Narrowed (inspired by Grouper)

**There is still no separate admin web app in this MVP** — but two things that were originally console-only moved into a single admin-gated screen inside the same guest app, because they turned out to be needed too often to stay comfortably manual: **event management** and **ticket approval**. Everything else stays console-only, at 100-200 users per event:

- **Moderation:** Flip a `status` field on a `users` doc to `suspended`/`banned` directly in the console.
- **Odd-number groupings / no-shows:** Resolved by whoever's running the door that night, editing ticket records directly if needed — no automated re-pairing logic to build or maintain.

**In-app Admin screen** (visible only to the account(s) with `users.isAdmin == true`, which can only ever be set manually in the console — no self-elevation path exists):
- **Event management:** create/edit the current event (`name`, `venue`, `date`, `capacity`, `checkInPin`, `revealed`) from a form, instead of hand-editing Firestore documents in the console every time.
- **Ticket approval:** every reservation is created as `approvalStatus: 'pending'`. The admin screen lists pending tickets (with a live badge count on open — no push notifications, since those need Cloud Functions, which need Blaze) and lets the admin **Approve** or **Deny** each one. Only `approved` tickets can complete PIN check-in at the door — a denied ticket is blocked from entry entirely. Because payment stays external (Bit/PayBox — the guest reserves in-app, then pays MISMAS directly outside it), a denial's "refund" is a manual conversation with the guest outside the app — there is no real payment processor in this MVP for the app to auto-refund through.
- **Triggering the reveal:** still done from this same screen (`revealed` toggle) — this is the **only** reveal trigger, no timestamp-based auto-reveal, because events rarely run exactly on schedule and an auto-reveal firing mid-event would break the retroactive-only promise.

This is still a deliberate scope cut relative to a "real" admin dashboard: no survey builder, no messaging, no staff role hierarchy, no user moderation UI. Those stay exactly as deferred in Section 7.

---

## 5. Design & UX Guidelines (inspired by Partiful)

The MVP is limited to 3-4 core screens — but small screen count is not an excuse for a generic, corporate-feeling app. Requirements for every screen:

- **Warm, casual tone.** Micro-copy should sound like a friend texting, not a system message — e.g. "You're in for tonight 🎉" instead of "Registration confirmed." Error and empty states get personality too (no bare "No data found").
- **Bouncy, alive micro-interactions.** Button taps, the check-in confirmation, and the reveal screen loading-in should use spring/bounce animation curves, not flat instant state changes. This is cheap to implement (standard React Native/Expo animation libraries) and disproportionately affects how "finished" the app feels.
- **Tel Aviv nightlife community identity.** Visual language should reflect the MISMAS brand — nightlife energy, drag-host warmth, queer community pride — not a neutral SaaS look. Color, type, and imagery choices should be distinctive enough that a screenshot is recognizably MISMAS, not a generic event-app template.
- **The reveal screen is the emotional payoff** — it should feel like a celebratory moment (motion, maybe confetti-style animation), not a plain list view, since it's the single screen guests are most anticipating after the event.
- **Branded default avatar required.** Guests who registered without a photo (no Instagram link) must still show up on the Reveal screen looking intentional, not blank. Design a MISMAS-branded default avatar (on-brand illustration or color-pattern placeholder, not a generic gray silhouette) used whenever `users.photoUrl` is missing, so the Reveal screen stays visually vibrant for every attendee.

Design effort should concentrate on these few screens rather than being spread thin — a tiny, distinctive app beats a larger, generic one.

---

## 6. The 3-Collection Architecture (Firebase/Firestore)

Still three collections — `isAdmin` is one more field on `users`, not a separate roles table.

### `users`
*(doc id = Firebase Auth uid)*
| Field | Type | Notes |
|---|---|---|
| `displayName` | string | |
| `photoUrl` | string | |
| `authMethod` | string | `email` \| `phone` \| (`instagram` if added later) |
| `status` | string | `active` \| `suspended` \| `banned` — set manually via console |
| `isAdmin` | bool | Grants access to the in-app Admin screen. Set manually via console only — no self-elevation path exists client-side. |
| `createdAt` | timestamp | |

### `events`
| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `venue` | string | |
| `date` | timestamp | |
| `capacity` | number | |
| `status` | string | `upcoming` \| `live` \| `past` |
| `checkInPin` | string | 4-digit daily PIN, set per event from the in-app Admin screen (or console), displayed on a physical sign at the venue |
| `paymentPhone` | string | The phone number guests send Bit/PayBox payment to, set from the Admin screen. Shown to guests on reservation. No API integration exists (Bit/PayBox have no public developer API) — this is display-only, payment confirmation is manual (admin approval). |
| `revealed` | bool | The **only** reveal trigger — manually flipped `true` from the in-app Admin screen (or console) when the event wraps. No timestamp-based auto-reveal. |

`events` writes are still blocked for ordinary client requests in the security rules — the in-app Admin screen is allowed through only because the requesting user's own `users.isAdmin == true`, checked server-side by the rules themselves, not trusted from the client.

### `tickets`
*(top-level collection; queried by `userId` and by `eventId`)*
| Field | Type | Notes |
|---|---|---|
| `userId` | string | ref to `users` |
| `eventId` | string | ref to `events` |
| `purchaseStatus` | string | `paid` \| `refunded` — refunds set manually (payment is external/Bit-PayBox; there's no processor for the app to auto-refund through) |
| `approvalStatus` | string | `pending` \| `approved` \| `denied` — starts `pending` on reservation; only an admin can change it. Check-in is blocked unless `approved`. |
| `consentAccepted` | bool | |
| `checkedIn` | bool | Flipped when the guest enters the correct daily PIN for the event, only possible once `approvalStatus == 'approved'` |
| `checkedInAt` | timestamp | nullable |

**Reveal query:** `tickets` where `eventId == X AND checkedIn == true` → join each `userId` to its `users.displayName` / `photoUrl` (falling back to the branded default avatar when `photoUrl` is missing). That's the entire post-event screen's data logic — approval status doesn't affect it, since only checked-in guests (which requires prior approval) ever appear.

**No 4th collection is required for this MVP.** If Instagram OAuth or Hebrew localization strings are added later, they extend existing `users` fields rather than needing new collections.

---

## 7. Explicitly Out of Scope (Deferred, Not Cancelled)

Preserved for future versions once the MVP validates the core loop:

- **Selfie Check-in / any photo upload feature** — requires Firebase Storage, which requires the Blaze (pay-as-you-go) plan even at zero usage. Deliberately cut to stay on the free Spark plan; the app never reads or writes a `selfieUrl` field. Revisit only if/when upgrading to Blaze is acceptable.
- Lock & Key drink feature
- Fact-Grouping icebreaker (must be built as a pre-event batch job per Section 2 when revisited)
- Rotation Bell, proximity conversation cards, Mystery Missions, Silent Disco Signal
- Mutual-tagging / auto-unlocked contact info on the reveal screen (v1 reveal is view-only)
- **Real payment processor integration (charge + auto-refund)** — reservation and denial both stay externally reconciled (Bit/PayBox) for now. Revisit as its own focused spec/plan if automatic payment handling becomes worth the added subsystem.
- Custom Admin Web Dashboard (survey builder, targeted messaging, staff role hierarchy, guest moderation UI) — console access only for now. Note: event management and ticket approval are **no longer** on this deferred list — they moved into the app itself (Section 4).
- Push notifications (e.g. for pending ticket approvals) — needs Cloud Functions, which needs Blaze. The Admin screen uses a live badge count on open instead.
- In-app Contact Production form — direct guests to existing external channels for now
- Hebrew UI strings (scaffolding for a toggle is kept cheap via string externalization, but translations don't ship yet)

---

## 8. Why This Is the Right Scope (Traceability to Research)

| Principle applied | Source app | What it saves |
|---|---|---|
| Batch jobs over real-time matching | Timeleft | No WebSocket infra, no live matching engine to build/debug |
| Manual console over admin dashboard | Grouper | An entire admin app's worth of screens and auth/roles logic |
| PIN check-in | IRL | Confirms physical presence with near-zero friction (no camera/scan step, no Storage/Blaze dependency) |
| 3-4 screens, high design investment per screen | Partiful | Design effort concentrated where it's seen most, not spread across unnecessary screens |
| 3-collection Firestore schema | All four | No relational database, no joins, no ORM — matches the actual query patterns needed |

This spec is intentionally boring at the infrastructure layer and intentionally distinctive at the design layer — that split is where the "functional and highly engaging without over-engineering" goal actually comes from.
