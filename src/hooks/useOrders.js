import { useState, useEffect } from 'react';
import {
  subscribeToOrders,
  subscribeToDriverOrders,
  subscribeToAvailableOrders,
} from '../services/orders';

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((data, err) => {
      setOrders(data || []);
      setError(err || null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { orders, loading, error };
}

export function useDriverOrders(driverId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToDriverOrders(driverId, (data, err) => {
      setOrders(data || []);
      setError(err || null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [driverId]);

  return { orders, loading, error };
}

export function useAvailableOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToAvailableOrders((data, err) => {
      setOrders(data || []);
      setError(err || null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { orders, loading, error };
}
