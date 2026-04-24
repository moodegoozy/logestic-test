import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

const usersRef = collection(db, 'users');

export async function getDrivers() {
  const q = query(usersRef, where('role', '==', 'driver'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function subscribeToUsers(callback) {
  const q = query(usersRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(users);
  });
}

export async function updateUserRole(userId, role) {
  const userDoc = doc(db, 'users', userId);
  return updateDoc(userDoc, { role });
}

export async function updateUserData(userId, data) {
  const userDoc = doc(db, 'users', userId);
  return updateDoc(userDoc, data);
}

export async function deleteUser(userId) {
  const userDoc = doc(db, 'users', userId);
  return deleteDoc(userDoc);
}
