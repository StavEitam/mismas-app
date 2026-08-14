import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserProfile } from './firestore';

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await createUserProfile(cred.user.uid, displayName, 'email');
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
