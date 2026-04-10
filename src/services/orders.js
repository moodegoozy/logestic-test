import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const ordersRef = collection(db, 'orders');

export function subscribeToOrders(callback) {
  const q = query(ordersRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(orders);
  });
}

export function subscribeToDriverOrders(driverId, callback) {
  const q = query(
    ordersRef,
    where('assignedDriverId', '==', driverId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(orders);
  });
}

export async function createOrder(orderData) {
  const promise = addDoc(ordersRef, {
    ...orderData,
    status: 'new',
    assignedDriverId: null,
    assignedDriverName: null,
    driverNotes: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 10000)
  );

  return Promise.race([promise, timeout]);
}

export async function updateOrder(orderId, data) {
  const orderDoc = doc(db, 'orders', orderId);
  return updateDoc(orderDoc, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteOrder(orderId) {
  const orderDoc = doc(db, 'orders', orderId);
  return deleteDoc(orderDoc);
}

export async function assignDriver(orderId, driverId, driverName) {
  return updateOrder(orderId, {
    assignedDriverId: driverId,
    assignedDriverName: driverName,
    status: 'assigned',
  });
}

export async function updateOrderStatus(orderId, status) {
  return updateOrder(orderId, { status });
}

export async function addDriverNotes(orderId, notes) {
  return updateOrder(orderId, { driverNotes: notes });
}
