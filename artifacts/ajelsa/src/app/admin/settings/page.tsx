"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { Save, Loader2, Sparkles, Camera, Palette, Activity } from "lucide-react";
import { toast } from "@/components/admin/Toast";

type Settings = Record<string, any>;

export default function SettingsPage() {
  const [data, setData] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setData(d.settings ?? {}))
      .catch(() => toast.error("فشل التحميل"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("تم حفظ الإعدادات");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function update(key: string, value: any) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <>
        <AdminTopbar title="الإعدادات" subtitle="تخصيص الموقع" />
        <div className="card py-16 grid place-items-center text-ink-soft"><Loader2 className="animate-spin" /></div>
      </>
    );
  }

  return (
    <>
      <AdminTopbar
        title="الإعدادات"
        subtitle="تخصيص معلومات الموقع والروابط"
        actions={
          <button onClick={handleSave} disabled={saving} className="bg-burgundy text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark transition-all disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ التغييرات
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="معلومات الموقع">
          <Field label="اسم الموقع" value={data.siteName} onChange={(v) => update("siteName", v)} placeholder="عاجل" />
          <Field label="الوصف القصير (Tagline)" value={data.siteTagline} onChange={(v) => update("siteTagline", v)} placeholder="صحيفة الحدث الأولى" />
          <Field label="الوصف الكامل" value={data.siteDescription} onChange={(v) => update("siteDescription", v)} multiline />
          <Field label="رابط الموقع" value={data.siteUrl} onChange={(v) => update("siteUrl", v)} placeholder="https://ajel.sa" />
        </Section>

        <Section title="الشعار والصور">
          <Field label="رابط الشعار" value={data.logoUrl} onChange={(v) => update("logoUrl", v)} placeholder="/logo.png" />
          <Field label="رابط الفافيكون" value={data.faviconUrl} onChange={(v) => update("faviconUrl", v)} placeholder="/favicon.ico" />
        </Section>

        <Section title="التواصل">
          <Field label="البريد الإلكتروني" value={data.contactEmail} onChange={(v) => update("contactEmail", v)} placeholder="info@ajel.sa" type="email" />
        </Section>

        <Section title="الشبكات الاجتماعية">
          <Field label="تويتر" value={data.twitter} onChange={(v) => update("twitter", v)} placeholder="https://twitter.com/ajel_sa" />
          <Field label="فيسبوك" value={data.facebook} onChange={(v) => update("facebook", v)} />
          <Field label="إنستجرام" value={data.instagram} onChange={(v) => update("instagram", v)} />
          <Field label="يوتيوب" value={data.youtube} onChange={(v) => update("youtube", v)} />
          <Field label="تيك توك" value={data.tiktok} onChange={(v) => update("tiktok", v)} />
        </Section>

        <Section title="الفوتر" full>
          <Field label="نص الفوتر" value={data.footerText} onChange={(v) => update("footerText", v)} multiline placeholder="© 2026 صحيفة عاجل. جميع الحقوق محفوظة." />
        </Section>

        <Section title="عناصر الواجهة" full icon={<Activity size={15} className="text-burgundy" />}>
          <Toggle
            label="إظهار شريط النبض المباشر (Live)"
            description="الشريط الأنيق الذي يظهر تحت قائمة التنقل ويعرض إحصاءات لحظية"
            value={data.showLivePulseBar !== false}
            onChange={(v) => update("showLivePulseBar", v)}
          />
        </Section>

        <Section title="إعدادات الذكاء الاصطناعي" full icon={<Sparkles size={15} className="text-burgundy" />}>
          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-3">نمط الصورة المولدة</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => update("aiImageStyle", "photorealistic")}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all ${
                  (data.aiImageStyle ?? "photorealistic") === "photorealistic"
                    ? "border-burgundy bg-rose-cream/40 text-burgundy"
                    : "border-line bg-bg-2 text-ink-2 hover:border-burgundy/40"
                }`}
              >
                <Camera size={22} />
                <div className="text-center">
                  <div className="text-[13px] font-bold">واقعية</div>
                  <div className="text-[11px] opacity-70 mt-0.5">صورة فوتوغرافية احترافية</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => update("aiImageStyle", "illustration")}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all ${
                  data.aiImageStyle === "illustration"
                    ? "border-burgundy bg-rose-cream/40 text-burgundy"
                    : "border-line bg-bg-2 text-ink-2 hover:border-burgundy/40"
                }`}
              >
                <Palette size={22} />
                <div className="text-center">
                  <div className="text-[13px] font-bold">رسومية</div>
                  <div className="text-[11px] opacity-70 mt-0.5">رسوم رقمي حديث وأنيق</div>
                </div>
              </button>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}

function Section({ title, children, full, icon }: { title: string; children: React.ReactNode; full?: boolean; icon?: React.ReactNode }) {
  return (
    <div className={`card ${full ? "lg:col-span-2" : ""}`}>
      <h2 className="text-[15px] font-bold text-ink mb-4 pb-3 border-b border-line-soft flex items-center gap-2">
        {icon}{title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 p-4 rounded-xl border border-line bg-bg-2 cursor-pointer hover:border-burgundy/40 transition-all">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-ink">{label}</div>
        {description && (
          <div className="text-[11px] text-ink-soft mt-0.5">{description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          value ? "bg-burgundy" : "bg-line"
        }`}
        aria-pressed={value}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${
            value ? "right-0.5" : "right-[1.375rem]"
          }`}
        />
      </button>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  type,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">{label}</label>
      {multiline ? (
        <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} className="input" placeholder={placeholder} />
      ) : (
        <input type={type ?? "text"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="input" placeholder={placeholder} />
      )}
    </div>
  );
}
