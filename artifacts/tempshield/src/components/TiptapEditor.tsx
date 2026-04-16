import React, { useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/extension-bubble-menu";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import { TextStyle } from "@tiptap/extension-text-style";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import CharacterCount from "@tiptap/extension-character-count";
import { marked } from "marked";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Code, Code2, Link as LinkIcon, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Minus, Table as TableIcon,
  Undo, Redo, Type,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str.trim());
}

function getInitialHtml(value: string): string {
  if (!value.trim()) return "";
  if (isHtml(value)) return value;
  return marked.parse(value) as string;
}

type ToolbarItem =
  | { type: "separator" }
  | {
      type: "button";
      icon: React.ElementType;
      label: string;
      action: () => void;
      isActive?: () => boolean;
    };

export default function TiptapEditor({
  value,
  onChange,
  placeholder = "Start writing your content…",
  minHeight = 480,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextStyle,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Typography,
      Placeholder.configure({ placeholder }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
    ],
    content: getInitialHtml(value),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = getInitialHtml(value);
    if (editor.getHTML() !== incoming) {
      editor.commands.setContent(incoming, false);
    }
  }, []);

  const addImage = useCallback(() => {
    const url = window.prompt("Image URL");
    if (url && editor) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  const toolbarGroups: ToolbarItem[][] = [
    [
      { type: "button", icon: Undo, label: "Undo (Ctrl+Z)", action: () => editor.chain().focus().undo().run(), isActive: () => false },
      { type: "button", icon: Redo, label: "Redo (Ctrl+Y)", action: () => editor.chain().focus().redo().run(), isActive: () => false },
    ],
    [
      { type: "button", icon: Bold, label: "Bold (Ctrl+B)", action: () => editor.chain().focus().toggleBold().run(), isActive: () => editor.isActive("bold") },
      { type: "button", icon: Italic, label: "Italic (Ctrl+I)", action: () => editor.chain().focus().toggleItalic().run(), isActive: () => editor.isActive("italic") },
      { type: "button", icon: UnderlineIcon, label: "Underline (Ctrl+U)", action: () => editor.chain().focus().toggleUnderline().run(), isActive: () => editor.isActive("underline") },
      { type: "button", icon: Strikethrough, label: "Strikethrough", action: () => editor.chain().focus().toggleStrike().run(), isActive: () => editor.isActive("strike") },
      { type: "button", icon: Highlighter, label: "Highlight", action: () => editor.chain().focus().toggleHighlight().run(), isActive: () => editor.isActive("highlight") },
    ],
    [
      { type: "button", icon: Heading1, label: "Heading 1", action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor.isActive("heading", { level: 1 }) },
      { type: "button", icon: Heading2, label: "Heading 2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.isActive("heading", { level: 2 }) },
      { type: "button", icon: Heading3, label: "Heading 3", action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => editor.isActive("heading", { level: 3 }) },
      { type: "button", icon: Type, label: "Paragraph", action: () => editor.chain().focus().setParagraph().run(), isActive: () => editor.isActive("paragraph") },
    ],
    [
      { type: "button", icon: AlignLeft, label: "Align Left", action: () => editor.chain().focus().setTextAlign("left").run(), isActive: () => editor.isActive({ textAlign: "left" }) },
      { type: "button", icon: AlignCenter, label: "Align Center", action: () => editor.chain().focus().setTextAlign("center").run(), isActive: () => editor.isActive({ textAlign: "center" }) },
      { type: "button", icon: AlignRight, label: "Align Right", action: () => editor.chain().focus().setTextAlign("right").run(), isActive: () => editor.isActive({ textAlign: "right" }) },
      { type: "button", icon: AlignJustify, label: "Justify", action: () => editor.chain().focus().setTextAlign("justify").run(), isActive: () => editor.isActive({ textAlign: "justify" }) },
    ],
    [
      { type: "button", icon: List, label: "Bullet List", action: () => editor.chain().focus().toggleBulletList().run(), isActive: () => editor.isActive("bulletList") },
      { type: "button", icon: ListOrdered, label: "Numbered List", action: () => editor.chain().focus().toggleOrderedList().run(), isActive: () => editor.isActive("orderedList") },
      { type: "button", icon: Quote, label: "Blockquote", action: () => editor.chain().focus().toggleBlockquote().run(), isActive: () => editor.isActive("blockquote") },
      { type: "button", icon: Code, label: "Inline Code", action: () => editor.chain().focus().toggleCode().run(), isActive: () => editor.isActive("code") },
      { type: "button", icon: Code2, label: "Code Block", action: () => editor.chain().focus().toggleCodeBlock().run(), isActive: () => editor.isActive("codeBlock") },
    ],
    [
      { type: "button", icon: LinkIcon, label: "Link", action: setLink, isActive: () => editor.isActive("link") },
      { type: "button", icon: ImageIcon, label: "Insert Image", action: addImage, isActive: () => false },
      { type: "button", icon: TableIcon, label: "Insert Table", action: addTable, isActive: () => false },
      { type: "button", icon: Minus, label: "Horizontal Rule", action: () => editor.chain().focus().setHorizontalRule().run(), isActive: () => false },
    ],
  ];

  const wordCount = editor.storage.characterCount?.words() ?? 0;
  const charCount = editor.storage.characterCount?.characters() ?? 0;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background shadow-sm">

      {/* ── Toolbar ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
        {toolbarGroups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <div className="mx-1 h-5 w-px bg-border/60 shrink-0" />}
            {group.map((item) => {
              if (item.type === "separator") return <div key="sep" className="mx-1 h-5 w-px bg-border/60" />;
              const active = item.isActive?.() ?? false;
              return (
                <button
                  key={item.label}
                  type="button"
                  title={item.label}
                  onMouseDown={(e) => { e.preventDefault(); item.action(); }}
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* ── Bubble menu (appears on text selection) ─ */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 150, placement: "top" }}
        className="flex items-center gap-0.5 rounded-lg border border-border bg-background/95 p-1 shadow-lg backdrop-blur-sm"
      >
        {[
          { icon: Bold, label: "Bold", action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
          { icon: Italic, label: "Italic", action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
          { icon: UnderlineIcon, label: "Underline", action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline") },
          { icon: Strikethrough, label: "Strike", action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike") },
          { icon: Highlighter, label: "Highlight", action: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive("highlight") },
          { icon: LinkIcon, label: "Link", action: setLink, active: editor.isActive("link") },
          { icon: Code, label: "Code", action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code") },
        ].map(({ icon: Icon, label, action, active }) => (
          <button
            key={label}
            type="button"
            title={label}
            onMouseDown={(e) => { e.preventDefault(); action(); }}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </BubbleMenu>

      {/* ── Editor content area ──────────────────── */}
      <EditorContent
        editor={editor}
        className="tiptap-editor px-6 py-4 text-foreground"
        style={{ minHeight }}
      />

      {/* ── Status bar ──────────────────────────── */}
      <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-4 py-1.5">
        <span className="text-[10px] text-muted-foreground">
          {wordCount} words &nbsp;·&nbsp; {charCount} characters
        </span>
        <span className="text-[10px] text-muted-foreground">
          Rich Text &nbsp;·&nbsp;
          <kbd className="rounded bg-muted px-1 py-0.5 text-[9px]">Ctrl+B</kbd> Bold &nbsp;
          <kbd className="rounded bg-muted px-1 py-0.5 text-[9px]">Ctrl+I</kbd> Italic &nbsp;
          <kbd className="rounded bg-muted px-1 py-0.5 text-[9px]">Ctrl+Z</kbd> Undo
        </span>
      </div>
    </div>
  );
}
