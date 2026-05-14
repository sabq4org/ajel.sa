"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import CharacterCount from "@tiptap/extension-character-count";
import { useState } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading2,
  Heading3,
  Undo,
  Redo,
  AlignRight,
  AlignCenter,
} from "lucide-react";
import { toast } from "@/components/admin/Toast";
import {
  readUploadErrorMessage,
  readUploadThrownMessage,
  checkUploadSize,
} from "@/lib/uploadErrors";

type Props = {
  initialContent?: any;
  onChange?: (data: { html: string; json: any; words: number }) => void;
  placeholder?: string;
};

export function ArticleEditor({
  initialContent,
  onChange,
  placeholder = "ابدأ كتابة مقالك هنا...",
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-burgundy underline" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-xl my-4 max-w-full" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        defaultAlignment: "right",
      }),
      CharacterCount,
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.({
        html: editor.getHTML(),
        json: editor.getJSON(),
        words: editor.storage.characterCount?.words?.() ?? 0,
      });
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
        dir: "rtl",
      },
    },
  });

  const [linkOpen, setLinkOpen] = useState(false);

  if (!editor) return null;

  const wordCount = editor.storage.characterCount?.words?.() ?? 0;
  const charCount = editor.storage.characterCount?.characters?.() ?? 0;
  const readingTime = Math.max(1, Math.round(wordCount / 180));

  const ToolbarButton = ({
    onClick,
    active,
    children,
    label,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    label: string;
  }) => (
    <button
      onClick={onClick}
      title={label}
      type="button"
      className={`w-8 h-8 rounded-lg grid place-items-center transition-all ${
        active
          ? "bg-burgundy text-white"
          : "text-ink-2 hover:bg-bg-2 hover:text-burgundy"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-paper border border-line rounded-2xl overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-line bg-bg-2 px-3 py-2 flex items-center gap-1 flex-wrap">
        <ToolbarButton
          label="عنوان كبير"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="عنوان متوسط"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 size={14} />
        </ToolbarButton>

        <span className="w-px h-5 bg-line mx-1" />

        <ToolbarButton
          label="غامق"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="مائل"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <Italic size={14} />
        </ToolbarButton>

        <span className="w-px h-5 bg-line mx-1" />

        <ToolbarButton
          label="قائمة نقطية"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="قائمة مرقمة"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          <ListOrdered size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="اقتباس"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        >
          <Quote size={14} />
        </ToolbarButton>

        <span className="w-px h-5 bg-line mx-1" />

        <ToolbarButton
          label="محاذاة لليمين"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
        >
          <AlignRight size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="محاذاة للمنتصف"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
        >
          <AlignCenter size={14} />
        </ToolbarButton>

        <span className="w-px h-5 bg-line mx-1" />

        <ToolbarButton
          label="رابط"
          onClick={() => {
            const url = prompt("أدخل الرابط:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
        >
          <LinkIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="صورة"
          onClick={async () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
              const sizeErr = checkUploadSize(file);
              if (sizeErr) {
                toast.error(sizeErr);
                return;
              }
              const fd = new FormData();
              fd.append("file", file);
              try {
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                if (!res.ok) {
                  toast.error(await readUploadErrorMessage(res));
                  return;
                }
                const { media } = await res.json();
                editor.chain().focus().setImage({ src: media.url }).run();
              } catch (err: unknown) {
                toast.error(readUploadThrownMessage(err));
              }
            };
            input.click();
          }}
        >
          <ImageIcon size={14} />
        </ToolbarButton>

        <span className="flex-1" />

        <ToolbarButton
          label="تراجع"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="إعادة"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo size={14} />
        </ToolbarButton>
      </div>

      {/* Editor body */}
      <div className="p-6 min-h-[400px]">
        <EditorContent editor={editor} />
      </div>

      {/* Footer */}
      <div className="border-t border-line bg-bg-2 px-4 py-2 text-xs text-ink-soft flex items-center justify-between">
        <span>
          {wordCount} كلمة · {charCount} حرف
        </span>
        <span>~ {readingTime} دقيقة قراءة</span>
      </div>
    </div>
  );
}
