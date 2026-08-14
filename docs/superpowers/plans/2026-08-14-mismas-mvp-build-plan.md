# MISMAS MVP Build Plan

> **For agentic workers:** This is a phase-level roadmap for a solo/indie builder driving development with AI coding tools, not a task-by-task TDD plan. Each phase below should be handed to your AI coding assistant one at a time, in order — don't start a phase until the previous one's Validation Check passes.

**Goal:** Ship the MISMAS MVP (Register → Event/Ticket → Check-In → Reveal, plus an admin-gated Event Management + Ticket Approval screen) ready for a live test at the next MISMAS event.

**Architecture:** React Native (Expo) mobile app talking directly to Firebase (Auth, Firestore — Spark/free plan only, no Storage, no Cloud Functions). No separate admin web app — a single admin-gated screen lives inside the same guest app, access controlled by `users.isAdmin` enforced in Firestore rules. No real-time matching, no custom backend server, no push notifications — per the finalized spec.

**Tech Stack:** Expo (React Native, TypeScript), Firebase Auth, Firestore, Expo Router, EAS Build for TestFlight/internal APK distribution. Firebase Storage is explicitly **not** used — the Selfie Check-in feature was dropped to stay on the free Spark plan (Storage requires Blaze even at zero usage).

**Spec:** [docs/superpowers/specs/2026-08-14-mismas-app-design.md](../specs/2026-08-14-mismas-app-design.md) — MISMAS MVP Product & Technical Spec (Version 1.0)

## Global Constraints (from spec)

- 3 Firestore collections only: `users`, `events`, `tickets`. No 4th collection for this MVP.
- No real-time listeners/WebSockets for matching or grouping logic — batch jobs or simple field flips only.
- No separate admin web app. Event management and ticket approval live in one admin-gated screen inside the guest app (`users.isAdmin`, console-set only). Everything else (user moderation, refunds-as-records) still stays console-only.
- Every reservation is created `approvalStatus: 'pending'`. Only an admin can set it to `approved`/`denied`. Check-in is blocked unless `approved`.
- No push notifications anywhere in this MVP (needs Cloud Functions → needs Blaze). The Admin screen shows a live pending-count badge on open instead.
- No real payment processor — reservations and denials are reconciled externally (Bit/PayBox); the app never auto-charges or auto-refunds.
- Primary check-in is a 4-digit daily PIN (displayed on a physical sign at the venue) — this is the entire check-in flow, no further steps.
- **No Selfie Check-in / photo upload feature exists in this MVP.** The app stays on Firebase's free Spark plan; Storage (which requires Blaze) is never enabled or used. No code reads or writes a `selfieUrl` field.
- Fallback avatars for guests without a registered photo must use a branded MISMAS default, never a generic placeholder.
- The Reveal screen unlocks **only** via a manual `event.revealed = true` flip in the console — no timestamp-based auto-reveal.
- 3-4 guest-facing screens only: Register, Event/Ticket, Check-In, Reveal.
- UI must feel warm/casual/branded (bouncy micro-interactions, Tel Aviv nightlife identity) — not a generic corporate form.

---

## Phase 1: Environment Setup & Foundations

**Core Goal:** Get a working, empty Expo app connected to a real Firebase project, so every later phase is just adding features to a proven pipeline.

**Actionable Tasks:**
- Create the Firebase project in the Firebase console (`mismas-app`); enable Authentication (Email/Password provider — Phone deferred, see below) and Firestore Database, both on the free Spark plan.
- **Storage is permanently out of scope for this MVP**, not just deferred: Firebase now requires the Blaze (pay-as-you-go) plan for Cloud Storage, even at zero usage, and the Selfie Check-in feature that would have needed it has been dropped entirely to stay on the free Spark plan.
- Scaffold the app: `npx create-expo-app mismas-app --template` (TypeScript template), initialize git, push to a private repo.
- Install and configure the Firebase SDK (`firebase` npm package — the JS/modular SDK, chosen for Expo Go compatibility) and store config in environment variables (`.env`, not committed).
- Set up basic navigation shell (Expo Router recommended) with 4 placeholder screens: Register, Event, Check-In, Reveal — each just rendering a labeled placeholder for now.
- Set Firestore security rules to a locked-down default (`allow read, write: if false;`) as a safe starting point — you'll open specific rules per-collection in Phase 2.
- Set up EAS (`eas.json`) so you have a one-command path to a TestFlight/internal build later, even if you don't build yet.

**Validation Check:** App builds and runs (Expo Go or web), navigates between all 4 placeholder screens, and a real read against the live Firestore project returns a `permission-denied` error (proving the app is genuinely connected to the real project and the locked-down rules are enforced, not just that the SDK initialized). Commit this as your baseline.

---

## Phase 2: Firestore Data Layer & Security Rules

**Core Goal:** Stand up the exact 3-collection schema from the spec, with security rules that are safe for a real event before any UI depends on them.

**Actionable Tasks:**
- In Firestore, manually create one test document in each collection (`users`, `events`, `tickets`) matching the exact field names/types from Section 6 of the spec, so you can develop against real sample data immediately.
- Write Firestore security rules:
  - `users`: a user can read/write only their own doc (`request.auth.uid == userId`); no client-side writes to `status`.
  - `events`: readable by any authenticated user; writable only via the console/Admin SDK (no client writes).
  - `tickets`: a user can read their own tickets; can create a ticket for themselves; can update only `checkedIn`, `checkedInAt` on their own ticket — not `purchaseStatus`.
- Write a small internal helper module (`lib/firestore.ts`) with typed functions: `getUser`, `getEvent`, `getMyTicketForEvent`, `createTicket`, `setCheckedIn`, `getCheckedInTicketsForEvent` — these are the only Firestore access points the UI will call, so all query logic lives in one place.
- Leave Storage rules at the Phase 1 deny-all default — Storage is out of scope for this MVP (see Global Constraints), no per-path rules are needed.

**Validation Check:** From a small test script or Expo dev console, successfully read `events`, create a `ticket` for a test user, flip `checkedIn` to true, and confirm the security rules reject an attempt to write another user's ticket or change `purchaseStatus` directly. This proves the data layer is both functional and safe before any real UI touches it.

---

## Phase 3: Core Frontend — Register, Event & Ticket

**Core Goal:** A guest can sign up, view the event, and hold a valid ticket — the first half of the guest journey.

**Actionable Tasks:**
- Build the Register screen: email/phone input, Firebase Auth sign-up/sign-in, on success create the matching `users` doc (`displayName`, `photoUrl` placeholder, `authMethod`, `status: active`, `createdAt`).
- Build the Event screen: fetch the current/upcoming `events` doc, display name/venue/date, show terms/cancellation policy and media consent as required checkboxes.
- Wire "Buy Ticket" to create a `tickets` doc (`userId`, `eventId`, `purchaseStatus: paid`, `approvalStatus: pending` — payment is external/Bit-PayBox, reconciled manually; approval is reviewed by an admin per Phase 4) with `consentAccepted: true` only if both checkboxes are ticked.
- Add a simple "My Ticket" view showing ticket status once purchased (pending/approved/denied), so the guest has a persistent home screen before the event.
- Apply first-pass copy voice and basic styling per the Design & UX Guidelines (Section 5 of the spec) — doesn't need to be final polish yet (that's Phase 5), but avoid default component styling.

**Validation Check:** On a real device, a new user can register, see the event, accept consent, and end up with a `tickets` doc in Firestore with correct fields — verified by checking the Firestore console after completing the flow end to end.

---

## Phase 4: Core Frontend — Check-In, Reveal & Admin (The Core Loop)

**Core Goal:** Implement the mechanic the whole app exists for: frictionless PIN check-in gated on admin approval, the post-event reveal, and the admin screen that makes approval + event management possible without touching the Firestore console every time. No Storage, no Blaze, no push notifications — stays entirely on the free Spark plan.

**Actionable Tasks:**
- Update `firestore.rules`: add `isAdmin` to `users` (client-immutable, same pattern as `status`); add an `isAdmin()` rules function (`get()`s the requester's own `users` doc); allow `events` writes and ticket `approvalStatus` writes only when `isAdmin()`; gate the guest's own `checkedIn` update on `approvalStatus == 'approved'`.
- Build the Check-In screen: a 4-digit PIN input field, only reachable/usable once `ticket.approvalStatus == 'approved'` (show a clear "waiting for approval" or "not approved" state otherwise, not a broken/blank screen). On submit, compare against `event.checkInPin`; on match, call `setCheckedIn(ticketId)`. On mismatch, friendly inline error, no lockouts.
- Build the branded MISMAS default avatar asset (per the Design & UX Guidelines) and wire it into the Reveal screen's avatar rendering: use `users.photoUrl` if present, else the branded default — never a blank/gray placeholder.
- Build the Reveal screen: query `tickets` where `eventId == current AND checkedIn == true`, join each to `users.displayName`/`photoUrl` (falling back per the avatar rule above). Gate visibility strictly on `event.revealed == true`.
- Build the **Admin screen** (route reachable directly, e.g. `/admin`; redirect away immediately if `!users.isAdmin`):
  - **Event management form:** create/edit the current event's `name`, `venue`, `date`, `capacity`, `checkInPin`, `revealed` toggle.
  - **Pending tickets list:** query `tickets` where `approvalStatus == 'pending'`, join to `users.displayName`, with **Approve**/**Deny** buttons that update `approvalStatus`. Show a badge with the pending count when the screen opens (this is the entire "notification" mechanism — no push).
- Add a lightweight loading/empty state for the Reveal screen (e.g. "Not revealed yet — check back after the event").

**Validation Check:** As admin: create the event from the Admin screen (not the console). As two separate test guests: reserve a ticket each (both land as `pending`), confirm Check-In is blocked pre-approval. Back as admin: approve one, deny the other — confirm the approved guest can complete PIN check-in and the denied guest still cannot. Flip `revealed` from the Admin screen and confirm both see the Reveal screen correctly (approved/checked-in guest shows their `photoUrl` or the branded fallback).

---

## Phase 5: Design Polish & Micro-Interactions

**Core Goal:** Take the functionally-complete app from "working" to "feels like MISMAS" — this is where the Partiful-inspired design bar gets applied for real.

**Actionable Tasks:**
- Define the actual brand tokens (colors, type, spacing) as a single theme file (`theme.ts`) referencing MISMAS's Instagram visual identity, so every screen pulls from one source instead of hardcoded styles.
- Add spring/bounce animations (`react-native-reanimated` or Expo's built-in `Animated`/`Moti`) to: the check-in confirmation and — most importantly — the Reveal screen's entrance (this is the emotional payoff screen per the spec, it should feel celebratory).
- Rewrite all UI copy in the warm, casual MISMAS voice (confirmations, empty states, error messages) — no default/generic system copy should ship.
- Pass over every screen for touch-target sizing, safe-area handling, and dark/light consistency on a real device (not just simulator).

**Validation Check:** Hand the app to 1-2 people unfamiliar with the project and ask them to complete Register → Ticket → Check-In → Reveal without guidance. If they hesitate on what to tap, or describe it as "looks like a generic app," that's a signal to revisit copy/motion before moving to Phase 6 — this is a subjective but real gate, not just a functional one.

---

## Phase 6: Integration & End-to-End Testing

**Core Goal:** Prove the whole system works together under conditions resembling the real event, before trusting it at the door.

**Actionable Tasks:**
- Run a full dry-run with 5-10 test accounts (real devices where possible, not just simulators) covering: registration, ticket purchase, PIN check-in (including a deliberate wrong-PIN attempt to confirm the friendly-retry path), and reveal.
- Manually rehearse every "manual admin console" edge case from the spec: suspend a test user, mark a ticket refunded, manually flip `event.revealed`, and confirm the app responds correctly to each (denied access, reflects refund, reveal appears) without needing an app update.
- Load-check Firestore reads at a rough 100-200 concurrent scale using Firebase's usage dashboard simulation or a simple script hitting `getCheckedInTicketsForEvent` repeatedly — confirm you're well within free-tier quotas.
- Verify security rules one more time against the finished app (not just the Phase 2 test script) — attempt from a second test account to check in on someone else's ticket and confirm it's rejected.

**Validation Check:** All dry-run accounts complete the full journey with zero manual database intervention required (beyond the deliberate admin-console tests), and no security rule allows a cross-user write. This is the gate for "ready to build for real devices."

---

## Phase 7: Pre-Launch Testing & Live Event Readiness

**Core Goal:** Get a signed build onto real phones (yours and a few trusted testers') and rehearse the actual door/event operational flow before the live test.

**Actionable Tasks:**
- Build via EAS (`eas build --platform ios` / `--platform android`) for internal distribution (TestFlight / direct APK) — this is your first real off-simulator build.
- Create the actual event's `events` doc for the upcoming MISMAS event with real details, set that night's `checkInPin`, print/prepare the physical PIN sign for the venue, and generate real ticket flows for a handful of trusted early testers.
- Prepare a simple "if something breaks" runbook for yourself: which Firestore fields to check/flip manually (including how to rotate `checkInPin` mid-event if it leaks before doors open), where the Firebase console logs are, and a fallback (e.g. a physical guest list) in case the app fails at the door.
- Do one final full walkthrough on the exact phones/OS versions your door staff or you will use on the night.

**Validation Check:** A build is installed and working on at least 2 real devices outside your dev machine, the real event document exists with correct data, and you personally have completed the full guest journey on the live Firebase project (not a test/dev project) at least once. At this point the MVP is ready for its live test at the next MISMAS event.
