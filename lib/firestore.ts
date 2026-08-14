import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
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
  revealed: boolean;
};

export type PurchaseStatus = 'paid' | 'refunded';

export type Ticket = {
  userId: string;
  eventId: string;
  purchaseStatus: PurchaseStatus;
  consentAccepted: boolean;
  checkedIn: boolean;
  checkedInAt: unknown;
  selfieUrl: string | null;
};

export type TicketWithId = Ticket & { id: string };

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as User) : null;
}

export async function getEvent(eventId: string): Promise<Event | null> {
  const snap = await getDoc(doc(db, 'events', eventId));
  return snap.exists() ? (snap.data() as Event) : null;
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
    consentAccepted,
    checkedIn: false,
    checkedInAt: null,
    selfieUrl: null,
  } satisfies Ticket);
  return ref.id;
}

export async function setCheckedIn(ticketId: string): Promise<void> {
  await updateDoc(doc(db, 'tickets', ticketId), {
    checkedIn: true,
    checkedInAt: serverTimestamp(),
  });
}

export async function setSelfieUrl(ticketId: string, selfieUrl: string): Promise<void> {
  await updateDoc(doc(db, 'tickets', ticketId), { selfieUrl });
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
