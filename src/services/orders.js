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
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';

const ordersRef = collection(db, 'orders');

export function subscribeToOrders(callback) {
  const q = query(ordersRef, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(orders);
    },
    (error) => {
      console.error('[subscribeToOrders] snapshot error:', error?.code, error?.message);
      callback([], error);
    }
  );
}

export function subscribeToDriverOrders(driverId, callback) {
  const q = query(
    ordersRef,
    where('assignedDriverId', '==', driverId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(orders);
    },
    (error) => {
      console.error('[subscribeToDriverOrders] snapshot error:', error?.code, error?.message);
      callback([], error);
    }
  );
}

export function subscribeToAvailableOrders(callback) {
  const q = query(
    ordersRef,
    where('assignedDriverId', '==', null),
    where('status', 'in', ['new', 'reviewed']),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(orders);
    },
    (error) => {
      console.error('[subscribeToAvailableOrders] snapshot error:', error?.code, error?.message);
      callback([], error);
    }
  );
}

export async function createOrder(orderData) {
  return addDoc(ordersRef, {
    ...orderData,
    status: 'new',
    assignedDriverId: null,
    assignedDriverName: null,
    driverNotes: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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

export async function acceptOrderFirstCome(orderId, driverId, driverName) {
  const orderRef = doc(db, 'orders', orderId);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists()) {
      throw new Error('order-not-found');
    }

    const data = snap.data();
    const alreadyAssigned = !!data.assignedDriverId;
    const notAcceptable = !['new', 'reviewed'].includes(data.status);

    if (alreadyAssigned || notAcceptable) {
      return { accepted: false };
    }

    transaction.update(orderRef, {
      assignedDriverId: driverId,
      assignedDriverName: driverName,
      status: 'assigned',
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { accepted: true };
  });
}

export async function updateOrderStatus(orderId, status) {
  return updateOrder(orderId, { status });
}

export async function addDriverNotes(orderId, notes) {
  return updateOrder(orderId, { driverNotes: notes });
}
