import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

// Types mirror the schema in
// docs/superpowers/specs/2026-08-14-mismas-app-design.md Section 6.

export type AuthMethod = 'email' | 'phone' | 'instagram';
export type UserStatus = 'active' | 'suspended' | 'banned';

export type User = {
  displayName: string;
  photoUrl: string | null;
  authMethod: AuthMethod;
  status: UserStatus;
  isAdmin: boolean;
  createdAt: unknown;
};

export type EventStatus = 'upcoming' | 'live' | 'past';

export type Event = {
  name: string;
  venue: string;
  date: unknown;
  capacity: number;
  status: EventStatus;
  checkInPin: string;
  paymentPhone: string;
  revealed: boolean;
};

export type PurchaseStatus = 'paid' | 'refunded';
export type ApprovalStatus = 'pending' | 'approved' | 'denied';

export type Ticket = {
  userId: string;
  eventId: string;
  purchaseStatus: PurchaseStatus;
  approvalStatus: ApprovalStatus;
  consentAccepted: boolean;
  checkedIn: boolean;
  checkedInAt: unknown;
};

export type TicketWithId = Ticket & { id: string };

/**
 * Short, human-readable code derived from the ticket's own ID — shown to
 * the guest ("include this in your Bit/PayBox payment note") and next to
 * the same ticket in the admin's pending list, so a payment can be matched
 * to a reservation without relying on the payment app's display name
 * matching what the guest registered with.
 */
export function ticketReferenceCode(ticketId: string): string {
  return ticketId.slice(-6).toUpperCase();
}

export async function createUserProfile(
  uid: string,
  displayName: string,
  authMethod: AuthMethod
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    displayName,
    photoUrl: null,
    authMethod,
    status: 'active',
    isAdmin: false,
    createdAt: serverTimestamp(),
  } satisfies User);
}

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as User) : null;
}

export async function getEvent(eventId: string): Promise<Event | null> {
  const snap = await getDoc(doc(db, 'events', eventId));
  return snap.exists() ? (snap.data() as Event) : null;
}

export type EventWithId = Event & { id: string };

/** The single current/next event guests see. MVP assumes one active event at a time. */
export async function getUpcomingEvent(): Promise<EventWithId | null> {
  const q = query(collection(db, 'events'), where('status', '==', 'upcoming'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const first = snap.docs[0];
  return { id: first.id, ...(first.data() as Event) };
}

/**
 * For the Admin screen: the most recent event regardless of status, since
 * admins need to manage it whether it's upcoming, live, or just wrapped
 * (about to be revealed). MVP assumes one event exists at a time.
 */
export async function adminGetLatestEvent(): Promise<EventWithId | null> {
  const q = query(collection(db, 'events'), orderBy('date', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const first = snap.docs[0];
  return { id: first.id, ...(first.data() as Event) };
}

export async function adminCreateEvent(fields: Event): Promise<string> {
  const ref = await addDoc(collection(db, 'events'), fields);
  return ref.id;
}

export async function adminUpdateEvent(eventId: string, fields: Partial<Event>): Promise<void> {
  await updateDoc(doc(db, 'events', eventId), fields);
}

/**
 * MVP assumes one ticket per guest across the app's lifetime so far, so this
 * just takes the first match. Used by Check-In/Reveal, which need "my
 * ticket" regardless of the event's status (upcoming/live/past) — unlike
 * the Event screen's purchase flow, which specifically wants only
 * status == 'upcoming'.
 */
export async function getMyLatestTicket(userId: string): Promise<TicketWithId | null> {
  const q = query(collection(db, 'tickets'), where('userId', '==', userId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const first = snap.docs[0];
  return { id: first.id, ...(first.data() as Ticket) };
}

export async function getMyTicketForEvent(
  userId: string,
  eventId: string
): Promise<TicketWithId | null> {
  const q = query(
    collection(db, 'tickets'),
    where('userId', '==', userId),
    where('eventId', '==', eventId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const first = snap.docs[0];
  return { id: first.id, ...(first.data() as Ticket) };
}

export async function createTicket(
  userId: string,
  eventId: string,
  consentAccepted: boolean
): Promise<string> {
  const ref = await addDoc(collection(db, 'tickets'), {
    userId,
    eventId,
    purchaseStatus: 'paid',
    approvalStatus: 'pending',
    consentAccepted,
    checkedIn: false,
    checkedInAt: null,
  } satisfies Ticket);
  return ref.id;
}

export async function setCheckedIn(ticketId: string): Promise<void> {
  await updateDoc(doc(db, 'tickets', ticketId), {
    checkedIn: true,
    checkedInAt: serverTimestamp(),
  });
}

export async function getCheckedInTicketsForEvent(
  eventId: string
): Promise<TicketWithId[]> {
  const q = query(
    collection(db, 'tickets'),
    where('eventId', '==', eventId),
    where('checkedIn', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Ticket) }));
}

export async function getPendingTicketsForEvent(eventId: string): Promise<TicketWithId[]> {
  const q = query(
    collection(db, 'tickets'),
    where('eventId', '==', eventId),
    where('approvalStatus', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Ticket) }));
}

export async function adminApproveTicket(ticketId: string): Promise<void> {
  await updateDoc(doc(db, 'tickets', ticketId), { approvalStatus: 'approved' });
}

export async function adminDenyTicket(ticketId: string): Promise<void> {
  await updateDoc(doc(db, 'tickets', ticketId), { approvalStatus: 'denied' });
}
