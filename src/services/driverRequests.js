import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';

const usersRef = collection(db, 'users');

/**
 * Upload a driver document photo to Firebase Storage.
 * Returns the public download URL.
 */
export async function uploadDriverPhoto(uid, fileType, file) {
  const ext = file.name.split('.').pop();
  const storageRef = ref(storage, `driver-docs/${uid}/${fileType}.${ext}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Subscribe to all pending driver requests (role === 'pending').
 */
export function subscribeToPendingDrivers(callback) {
  const q = query(usersRef, where('role', '==', 'pending'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(requests);
  });
}

/**
 * Approve a pending driver: set role to 'driver'.
 */
export async function approveDriver(userId) {
  const userDoc = doc(db, 'users', userId);
  return updateDoc(userDoc, { role: 'driver', approvedAt: serverTimestamp() });
}

/**
 * Reject a pending driver: set role to 'rejected'.
 */
export async function rejectDriver(userId) {
  const userDoc = doc(db, 'users', userId);
  return updateDoc(userDoc, { role: 'rejected', rejectedAt: serverTimestamp() });
}

/**
 * Delete a driver registration record entirely.
 * (optional cleanup after rejection)
 */
export async function deleteDriverRequest(userId) {
  const userDoc = doc(db, 'users', userId);
  return deleteDoc(userDoc);
}

/**
 * Delete a storage file by path (cleanup on rejection).
 */
export async function deleteDriverPhoto(uid, fileType, ext = 'jpg') {
  try {
    const storageRef = ref(storage, `driver-docs/${uid}/${fileType}.${ext}`);
    await deleteObject(storageRef);
  } catch {
    // File may not exist — ignore
  }
}
