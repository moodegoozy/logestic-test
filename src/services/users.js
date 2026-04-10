import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const usersRef = collection(db, 'users');

export async function getDrivers() {
  const q = query(usersRef, where('role', '==', 'driver'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
