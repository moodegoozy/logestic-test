export const ORDER_STATUSES = {
  NEW: 'new',
  REVIEWED: 'reviewed',
  ASSIGNED: 'assigned',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  CANCELLED_BY_CUSTOMER: 'cancelled_by_customer',
};

export const STATUS_LABELS = {
  new: 'جديد',
  reviewed: 'تمت المراجعة',
  assigned: 'تم التعيين',
  on_the_way: 'في الطريق',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
  cancelled_by_customer: 'ملغي من العميل',
};

export const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  reviewed: 'bg-amber-100 text-amber-700 border-amber-200',
  assigned: 'bg-purple-100 text-purple-700 border-purple-200',
  on_the_way: 'bg-orange-100 text-orange-700 border-orange-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  cancelled_by_customer: 'bg-rose-100 text-rose-700 border-rose-200',
};

export const STATUS_OPTIONS = [
  { value: 'new', label: 'جديد' },
  { value: 'reviewed', label: 'تمت المراجعة' },
  { value: 'assigned', label: 'تم التعيين' },
  { value: 'on_the_way', label: 'في الطريق' },
  { value: 'delivered', label: 'تم التوصيل' },
  { value: 'cancelled', label: 'ملغي' },
  { value: 'cancelled_by_customer', label: 'ملغي من العميل' },
];

export const ROLES = {
  ADMIN: 'admin',
  DRIVER: 'driver',
};

export const DEFAULT_CENTER = [24.7136, 46.6753]; // Riyadh
