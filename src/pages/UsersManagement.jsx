import { useState, useEffect } from 'react';
import { subscribeToUsers, updateUserRole, updateUserData, deleteUser } from '../services/users';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
  HiOutlineTruck,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlinePhoto,
  HiOutlineXCircle,
} from 'react-icons/hi2';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'مدير', icon: HiOutlineShieldCheck, color: 'text-indigo-600 bg-indigo-50' },
  { value: 'driver', label: 'مندوب', icon: HiOutlineTruck, color: 'text-emerald-600 bg-emerald-50' },
];

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [licenseModal, setLicenseModal] = useState(null); // { name, licensePhotoUrl, vehicleDocPhotoUrl }
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: '' });
  const [showDelete, setShowDelete] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success(`تم تحديث الدور إلى: ${ROLE_OPTIONS.find(r => r.value === newRole)?.label}`);
    } catch {
      toast.error('حدث خطأ أثناء تحديث الدور');
    }
  };

  const handleStartEdit = (user) => {
    setEditingUser(user.id);
    setEditForm({ name: user.name || '', phone: user.phone || '', role: user.role || 'driver' });
  };

  const handleSaveEdit = async (userId) => {
    try {
      await updateUserData(userId, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        role: editForm.role,
      });
      toast.success('تم تحديث بيانات المستخدم');
      setEditingUser(null);
    } catch {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteUser(userToDelete.id);
      toast.success('تم حذف المستخدم');
      setShowDelete(false);
      setUserToDelete(null);
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    } finally {
      setDeleteLoading(false);
    }
  };

  const admins = users.filter((u) => u.role === 'admin');
  const drivers = users.filter((u) => u.role === 'driver');

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner size="lg" />
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 flex items-center gap-3 sm:gap-4 sm:p-5 min-w-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-200 text-white">
            <HiOutlineUserGroup className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500 break-words">إجمالي المستخدمين</p>
            <p className="text-2xl font-bold text-slate-800">{users.length}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 flex items-center gap-3 sm:gap-4 sm:p-5 min-w-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-200 text-white">
            <HiOutlineShieldCheck className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">المديرون</p>
            <p className="text-2xl font-bold text-slate-800">{admins.length}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 flex items-center gap-3 sm:gap-4 sm:p-5 min-w-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200 text-white">
            <HiOutlineTruck className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">المناديب</p>
            <p className="text-2xl font-bold text-slate-800">{drivers.length}</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="mt-6">
        <h3 className="mb-4 text-lg font-bold text-slate-800">إدارة المستخدمين والأدوار</h3>

        {users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <HiOutlineUserGroup className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">لا يوجد مستخدمون بعد</p>
            <p className="mt-1 text-sm text-slate-400">
              سيظهر المستخدمون هنا تلقائياً عند تسجيل الدخول لأول مرة
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                {editingUser === user.id ? (
                  /* Editing mode */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">الاسم</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">الهاتف</label>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                          dir="ltr"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">الدور</label>
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="admin">مدير</option>
                          <option value="driver">مندوب</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        onClick={() => handleSaveEdit(user.id)}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        <HiOutlineCheck className="h-4 w-4" /> حفظ
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="flex items-center gap-1 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
                      >
                        <HiOutlineXMark className="h-4 w-4" /> إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                          {user.name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{user.name || 'بدون اسم'}</p>
                          <p className="truncate text-xs text-slate-400" dir="ltr">{user.email}</p>
                        </div>
                      </div>
                      {user.phone && (
                        <p className="mt-1 mr-13 break-all text-xs text-slate-400" dir="ltr">{user.phone}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {/* Role quick-toggle */}
                      <div className="flex flex-wrap rounded-xl border border-slate-200 overflow-hidden">
                        {ROLE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleRoleChange(user.id, opt.value)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${
                              user.role === opt.value
                                ? opt.color + ' font-bold'
                                : 'bg-white text-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            <opt.icon className="h-4 w-4" />
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Actions */}
                      {user.role === 'driver' && (user.licensePhotoUrl || user.vehicleDocPhotoUrl) && (
                        <button
                          onClick={() => setLicenseModal(user)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                          title="عرض التراخيص"
                        >
                          <HiOutlinePhoto className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleStartEdit(user)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                        title="تعديل"
                      >
                        <HiOutlinePencilSquare className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => { setUserToDelete(user); setShowDelete(true); }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="حذف"
                      >
                        <HiOutlineTrash className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDelete}
        title="حذف المستخدم"
        message={`هل أنت متأكد من حذف المستخدم "${userToDelete?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
        onConfirm={handleDelete}
        onCancel={() => { setShowDelete(false); setUserToDelete(null); }}
        loading={deleteLoading}
      />

      {/* License Photos Modal */}
      {licenseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setLicenseModal(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLicenseModal(null)}
              className="absolute left-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <HiOutlineXCircle className="h-6 w-6" />
            </button>
            <h3 className="mb-5 text-base font-bold text-slate-800">وثائق المندوب — {licenseModal.name}</h3>
            <div className="grid grid-cols-2 gap-4">
              {licenseModal.licensePhotoUrl && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-500">
                    <HiOutlinePhoto className="h-3.5 w-3.5" /> رخصة القيادة
                  </p>
                  <a href={licenseModal.licensePhotoUrl} target="_blank" rel="noreferrer">
                    <img
                      src={licenseModal.licensePhotoUrl}
                      alt="رخصة القيادة"
                      className="h-40 w-full rounded-xl border border-slate-200 object-cover transition hover:opacity-90"
                    />
                  </a>
                </div>
              )}
              {licenseModal.vehicleDocPhotoUrl && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-500">
                    <HiOutlinePhoto className="h-3.5 w-3.5" /> استمارة المركبة
                  </p>
                  <a href={licenseModal.vehicleDocPhotoUrl} target="_blank" rel="noreferrer">
                    <img
                      src={licenseModal.vehicleDocPhotoUrl}
                      alt="استمارة المركبة"
                      className="h-40 w-full rounded-xl border border-slate-200 object-cover transition hover:opacity-90"
                    />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
