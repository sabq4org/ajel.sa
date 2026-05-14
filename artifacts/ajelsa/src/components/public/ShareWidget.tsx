"use client";

import { useState } from "react";
import { Share2, Twitter, Facebook, Send, Link2, Check } from "lucide-react";

interface Props {
  url: string;
  title: string;
}

export function ShareWidget({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined" ? window.location.href : url;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedText = encodeURIComponent(title);

  const shareLinks = [
    {
      name: "تويتر",
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      color: "hover:bg-sky-500 hover:text-white hover:border-sky-500",
    },
    {
      name: "فيسبوك",
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "hover:bg-blue-600 hover:text-white hover:border-blue-600",
    },
    {
      name: "واتساب",
      icon: Send,
      url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      color: "hover:bg-emerald-500 hover:text-white hover:border-emerald-500",
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="bg-paper rounded-2xl border border-line p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-line-soft">
        <div className="w-7 h-7 rounded-lg bg-rose-cream dark:bg-rose-500/15 grid place-items-center">
          <Share2 size={13} className="text-burgundy dark:text-rose-300" />
        </div>
        <h3 className="text-[13px] font-extrabold text-ink">شارك الخبر</h3>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {shareLinks.map(({ name, icon: Icon, url, color }) => (
          <a
            key={name}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={name}
            className={`aspect-square rounded-xl border border-line bg-bg-2 grid place-items-center text-ink-2 transition-all ${color}`}
          >
            <Icon size={16} />
          </a>
        ))}
        <button
          onClick={copyLink}
          title="نسخ الرابط"
          className={`aspect-square rounded-xl border border-line bg-bg-2 grid place-items-center transition-all ${
            copied
              ? "bg-emerald-500 text-white border-emerald-500"
              : "text-ink-2 hover:bg-burgundy dark:hover:bg-rose-500 hover:text-white hover:border-burgundy dark:hover:border-rose-500"
          }`}
        >
          {copied ? <Check size={16} /> : <Link2 size={16} />}
        </button>
      </div>
    </div>
  );
}
