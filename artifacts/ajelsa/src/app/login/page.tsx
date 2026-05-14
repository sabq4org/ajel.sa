"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "حدث خطأ");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 relative z-5">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-cream/40 to-bg pointer-events-none" />

      <div className="bg-paper border border-line rounded-3xl p-10 w-full max-w-md shadow-card relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="صحيفة عاجل"
              className="h-16 w-auto mx-auto object-contain"
            />
            <div className="text-[10px] text-ink-soft mt-3 tracking-[3px]">
              صحيفة الحدث الأولى
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-ink mt-7 mb-1">
            مرحباً بعودتك
          </h1>
          <p className="text-sm text-ink-soft">سجّل الدخول للمتابعة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@ajelsa.net"
              className="input"
              required
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-2">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input"
              required
            />
          </div>

          {error && (
            <div className="bg-rose-cream text-burgundy text-[13px] px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-burgundy text-white py-3.5 rounded-xl font-semibold text-sm shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        <p className="text-[12px] text-ink-faint text-center mt-6">
          نسيت كلمة المرور؟{" "}
          <Link href="/forgot-password" className="text-burgundy font-semibold">
            استعدها
          </Link>
        </p>
      </div>
    </div>
  );
}
