/**
 * Activity log action labels (client-safe, no DB dependencies).
 *
 * Shared between ajelsa and api-server so both write/read the same
 * canonical action keys.
 */

export type ActivityAction =
  | "login"
  | "logout"
  | "login_failed"
  | "created"
  | "updated"
  | "password_changed"
  | "password_reset"
  | "role_changed"
  | "permissions_changed"
  | "activated"
  | "deactivated"
  | "force_logout"
  | "deleted"
  | "avatar_changed"
  | "cover_changed"
  | "profile_viewed"
  | "email_verified"
  | "email_verification_sent";

export const ACTIVITY_LABELS_AR: Record<ActivityAction, string> = {
  login: "تسجيل دخول",
  logout: "تسجيل خروج",
  login_failed: "محاولة دخول فاشلة",
  created: "إنشاء الحساب",
  updated: "تعديل البيانات",
  password_changed: "تغيير كلمة المرور",
  password_reset: "إعادة تعيين كلمة المرور",
  role_changed: "تغيير الدور",
  permissions_changed: "تعديل الصلاحيات الخاصة",
  activated: "تفعيل الحساب",
  deactivated: "تعطيل الحساب",
  force_logout: "إنهاء الجلسات يدويًا",
  deleted: "حذف الحساب",
  avatar_changed: "تحديث الصورة الشخصية",
  cover_changed: "تحديث صورة الغلاف",
  profile_viewed: "تصفح الملف الشخصي",
  email_verified: "تأكيد البريد الإلكتروني",
  email_verification_sent: "إرسال رابط تأكيد البريد",
};
