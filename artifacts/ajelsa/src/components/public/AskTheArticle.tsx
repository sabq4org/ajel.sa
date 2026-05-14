"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, MessageCircleQuestion } from "lucide-react";

interface Message {
  role: "user" | "ai";
  text: string;
}

interface Props {
  articleTitle: string;
  articleContent: string;
}

const SUGGESTED_QUESTIONS = [
  "ما الفكرة الرئيسية للخبر؟",
  "ما هي أبرز الأرقام والإحصاءات؟",
  "كيف يؤثر هذا علي؟",
];

export function AskTheArticle({ articleTitle, articleContent }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleAsk(question?: string) {
    const text = (question ?? input).trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/ask-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          articleTitle,
          articleContent,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => [...prev, { role: "ai", text: err.error || "تعذر الإجابة الآن" }]);
        return;
      }

      const { answer } = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: answer }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "ai", text: "حدث خطأ في الاتصال" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-paper rounded-2xl border border-line overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-l from-burgundy to-burgundy-dark dark:from-rose-500 dark:to-rose-700 text-white px-4 py-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white/20 grid place-items-center">
          <Sparkles size={15} className="text-yellow-300" />
        </div>
        <div className="flex-1">
          <h3 className="text-[13px] font-extrabold">اسأل الخبر</h3>
          <p className="text-[10px] opacity-80">مساعد ذكي يجيب من سياق الخبر فقط</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-72 overflow-y-auto px-3 py-3 space-y-2.5">
        {messages.length === 0 ? (
          <div className="text-center py-2">
            <MessageCircleQuestion size={26} className="mx-auto mb-2 text-burgundy/40 dark:text-rose-400/40" />
            <p className="text-[11px] text-ink-soft mb-3">اسأل ما تريد عن هذا الخبر</p>
            <div className="space-y-1.5">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleAsk(q)}
                  disabled={loading}
                  className="w-full text-right text-[11px] px-3 py-2 rounded-lg bg-bg-2 hover:bg-rose-cream/60 dark:hover:bg-rose-500/15 hover:text-burgundy dark:hover:text-rose-300 text-ink-2 transition-colors border border-line-soft"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-[12px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-burgundy dark:bg-rose-500 text-white rounded-bl-sm"
                    : "bg-bg-2 text-ink rounded-br-sm border border-line-soft"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-end">
            <div className="bg-bg-2 px-3 py-2 rounded-2xl rounded-br-sm border border-line-soft">
              <Loader2 size={14} className="animate-spin text-burgundy dark:text-rose-300" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="border-t border-line bg-bg-2 p-2 flex gap-2 items-center"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك..."
          disabled={loading}
          className="flex-1 bg-paper border border-line rounded-lg px-3 py-2 text-[12px] outline-none focus:border-burgundy/40 dark:focus:border-rose-400/40 transition-colors"
          dir="rtl"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-lg bg-burgundy dark:bg-rose-500 text-white grid place-items-center hover:bg-burgundy-dark dark:hover:bg-rose-400 transition-colors disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
