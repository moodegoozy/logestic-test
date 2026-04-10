import { useState, useEffect } from 'react';
import { subscribeToOrders, subscribeToDriverOrders } from '../services/orders';

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { orders, loading };
}

export function useDriverOrders(driverId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToDriverOrders(driverId, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [driverId]);

  return { orders, loading };
}
