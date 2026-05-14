"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { BarChart2, Plus, Loader2, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toast";

type PollOption = {
  id: string;
  pollId: string;
  text: string;
  votes: number;
  position: number;
};

type Poll = {
  id: string;
  question: string;
  articleId: string | null;
  isActive: boolean;
  endsAt: string | null;
  createdAt: string;
  options: PollOption[];
};

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [articleId, setArticleId] = useState("");
  const [endsAt, setEndsAt] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/polls");
      const d = await res.json();
      setPolls(d.polls ?? []);
    } catch {
      toast.error("فشل التحميل");
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setQuestion("");
    setOptions(["", ""]);
    setArticleId("");
    setEndsAt("");
    setModalOpen(true);
  }

  async function handleCreate() {
    const filled = options.filter((o) => o.trim());
    if (!question.trim()) { toast.error("السؤال مطلوب"); return; }
    if (filled.length < 2) { toast.error("أدخل خيارين على الأقل"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          options: filled,
          articleId: articleId.trim() || null,
          endsAt: endsAt || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("تم إنشاء الاستطلاع");
      setModalOpen(false);
      void load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(poll: Poll) {
    try {
      const res = await fetch(`/api/polls/${poll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !poll.isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setPolls((prev) => prev.map((p) => p.id === poll.id ? { ...p, isActive: !p.isActive } : p));
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(poll: Poll) {
    if (!confirm(`حذف الاستطلاع "${poll.question}"؟`)) return;
    try {
      await fetch(`/api/polls/${poll.id}`, { method: "DELETE" });
      setPolls((prev) => prev.filter((p) => p.id !== poll.id));
      toast.success("تم الحذف");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function addOption() {
    if (options.length < 6) setOptions([...options, ""]);
  }

  function removeOption(i: number) {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, val: string) {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  }

  const totalVotes = (p: Poll) => p.options.reduce((s, o) => s + o.votes, 0);

  return (
    <>
      <AdminTopbar
        title="استطلاعات الرأي"
        subtitle={`${polls.length} استطلاع`}
        actions={
          <button
            onClick={openModal}
            className="bg-burgundy text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark transition-all"
          >
            <Plus size={14} /> استطلاع جديد
          </button>
        }
      />

      {loading ? (
        <div className="py-16 grid place-items-center text-ink-soft"><Loader2 className="animate-spin" /></div>
      ) : polls.length === 0 ? (
        <div className="card py-16 text-center text-ink-soft text-sm flex flex-col items-center gap-3">
          <BarChart2 size={32} className="opacity-40" />
          <div>لا توجد استطلاعات بعد</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {polls.map((poll) => {
            const total = totalVotes(poll);
            const isEnded = poll.endsAt ? new Date(poll.endsAt) < new Date() : false;
            return (
              <div key={poll.id} className="card">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink mb-1">{poll.question}</h3>
                    <div className="flex items-center gap-3 text-[11px] text-ink-soft">
                      <span>{new Date(poll.createdAt).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn")}</span>
                      {poll.endsAt && (
                        <span>{isEnded ? "⏱ انتهى" : `ينتهي ${new Date(poll.endsAt).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn")}`}</span>
                      )}
                      <span>{total} صوت</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${poll.isActive && !isEnded ? "bg-emerald-50 text-sage" : "bg-bg-2 text-ink-soft"}`}>
                      {poll.isActive && !isEnded ? "نشط" : "منتهي"}
                    </span>
                    <button
                      onClick={() => toggleActive(poll)}
                      className="text-ink-soft hover:text-burgundy transition-colors"
                      title={poll.isActive ? "إيقاف" : "تفعيل"}
                    >
                      {poll.isActive ? <ToggleRight size={22} className="text-sage" /> : <ToggleLeft size={22} />}
                    </button>
                    <button
                      onClick={() => handleDelete(poll)}
                      className="w-7 h-7 rounded-lg grid place-items-center text-ink-soft hover:bg-rose-cream hover:text-burgundy transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {poll.options
                    .sort((a, b) => a.position - b.position)
                    .map((opt) => {
                      const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                      return (
                        <div key={opt.id}>
                          <div className="flex justify-between items-center mb-1 text-[13px]">
                            <span className="text-ink">{opt.text}</span>
                            <span className="text-ink-soft font-medium">{pct}% ({opt.votes})</span>
                          </div>
                          <div className="w-full bg-bg-2 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-burgundy transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="استطلاع جديد">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">السؤال *</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="input"
              rows={2}
              placeholder="اكتب سؤال الاستطلاع..."
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">الخيارات * (2 – 6)</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    className="input flex-1"
                    placeholder={`الخيار ${i + 1}`}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      className="px-2 text-ink-soft hover:text-burgundy transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button onClick={addOption} className="mt-2 text-[12px] text-burgundy hover:underline">
                + إضافة خيار
              </button>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">معرّف الخبر (اختياري)</label>
            <input
              type="text"
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              className="input"
              placeholder="UUID الخبر..."
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">تاريخ الانتهاء (اختياري)</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-burgundy text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-burgundy-dark disabled:opacity-50"
            >
              {saving ? "..." : "إنشاء"}
            </button>
            <button
              onClick={() => setModalOpen(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-ink-2 border border-line hover:bg-bg"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
