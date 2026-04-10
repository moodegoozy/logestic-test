export function generateOrderNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ORD-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateMapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getStatusNext(current) {
  const flow = {
    new: 'reviewed',
    reviewed: 'assigned',
    assigned: 'on_the_way',
    on_the_way: 'delivered',
  };
  return flow[current] || null;
}
