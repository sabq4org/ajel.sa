/**
 * Password policy — مركزي وقابل لإعادة الاستخدام.
 *
 * Policy:
 *  - الطول 8 أحرف على الأقل
 *  - حرف كبير واحد
 *  - حرف صغير واحد
 *  - رقم واحد على الأقل
 */
export const PASSWORD_MIN_LENGTH = 8;

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validatePassword(password: string): PasswordValidationResult {
  if (typeof password !== "string") {
    return { ok: false, error: "كلمة المرور غير صحيحة" };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `كلمة المرور يجب ألا تقل عن ${PASSWORD_MIN_LENGTH} أحرف` };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, error: "يجب أن تحتوي كلمة المرور على حرف كبير" };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, error: "يجب أن تحتوي كلمة المرور على حرف صغير" };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: "يجب أن تحتوي كلمة المرور على رقم" };
  }
  return { ok: true };
}

/**
 * Generates a random password that satisfies the policy. Used when an admin
 * creates a staff account without specifying one.
 */
export function generateTemporaryPassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  let pwd = pick(upper) + pick(lower) + pick(digits);
  for (let i = pwd.length; i < length; i++) pwd += pick(all);
  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}
