# لوجستك — نظام إدارة طلبات التوصيل

تطبيق ويب عربي (RTL) لإدارة طلبات التوصيل مبني بـ React + Vite + Tailwind CSS + Firebase + Leaflet.

## المميزات

- **صفحة طلب عامة للعميل** — بدون تسجيل دخول
- **لوحة تحكم المدير** — إدارة الطلبات، تعيين السائقين، تغيير الحالات
- **لوحة تحكم السائق** — عرض الطلبات المعيّنة، تحديث الحالة، إضافة ملاحظات
- تحديثات لحظية باستخدام Firestore
- واجهة حديثة متجاوبة (Mobile-first)
- خريطة تفاعلية لتحديد موقع التوصيل

## هيكل المشروع

```
src/
├── components/       # مكونات مشتركة قابلة لإعادة الاستخدام
├── contexts/         # React Context (Auth)
├── hooks/            # Custom hooks
├── pages/            # صفحات التطبيق
├── services/         # Firebase config + Firestore helpers
└── utils/            # ثوابت ودوال مساعدة
```

## التشغيل

1. انسخ `.env.example` إلى `.env` وأضف بيانات مشروع Firebase:
   ```bash
   cp .env.example .env
   ```
2. ثبّت التبعيات:
   ```bash
   npm install
   ```
3. شغّل خادم التطوير:
   ```bash
   npm run dev
   ```

## إعداد Firebase

1. أنشئ مشروعاً في [Firebase Console](https://console.firebase.google.com)
2. فعّل **Authentication** → Email/Password
3. فعّل **Cloud Firestore**
4. أنشئ مستخدمين في Authentication ثم أضف مستنداتهم في مجموعة `users`:

```json
{
  "uid": "USER_UID_FROM_AUTH",
  "name": "اسم المستخدم",
  "email": "user@example.com",
  "phone": "05xxxxxxxx",
  "role": "admin",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

> الأدوار المتاحة: `admin` أو `driver`

5. أنشئ Composite Index في Firestore لمجموعة `orders`:
   - `assignedDriverId` (Ascending) + `createdAt` (Descending)

## المسارات

| المسار     | الوصف                    | الحماية         |
| ---------- | ------------------------ | --------------- |
| `/order`   | صفحة طلب العميل          | عامة            |
| `/login`   | تسجيل الدخول             | عامة            |
| `/admin`   | لوحة تحكم المدير         | مدير فقط        |
| `/driver`  | لوحة تحكم السائق         | سائق فقط        |

## حالات الطلب

`جديد` → `تمت المراجعة` → `تم التعيين` → `في الطريق` → `تم التوصيل`

يمكن إلغاء الطلب في أي مرحلة: `ملغي`

## البناء للإنتاج

```bash
npm run build
```