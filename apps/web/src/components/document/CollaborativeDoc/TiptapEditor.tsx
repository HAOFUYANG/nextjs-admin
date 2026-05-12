"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { YjsSocketProvider, PeerInfo } from "@/lib/yjs/YjsSocketProvider";

interface TiptapEditorProps {
  documentId: string;
}

const DEFAULT_CONTENT = `<h2>欢迎使用协同文档 ✨</h2>
<p>这是一个基于 <strong>Tiptap + Yjs</strong> 的实时协同编辑器。</p>
<p>多端同时打开本页，内容会通过 Socket.IO 实时广播合并。</p>
<h3>使用说明</h3>
<ul>
  <li>✅ 实时协同编辑（Yjs CRDT）</li>
  <li>✅ 增量 update + snapshot 持久化</li>
  <li>✅ 在线用户头像（右上角）</li>
  <li>🔜 协同光标（下个阶段）</li>
</ul>`;

const COLOR_PALETTE = [
  "#F97316",
  "#22C55E",
  "#3B82F6",
  "#EAB308",
  "#EF4444",
  "#14B8A6",
  "#A855F7",
  "#EC4899",
];

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLOR_PALETTE[h % COLOR_PALETTE.length];
}

function getLocalUser(): { name: string; color: string } {
  if (typeof window === "undefined") return { name: "User", color: "#3B82F6" };
  let name = window.localStorage.getItem("doc-comment-user")?.trim();
  if (!name) {
    name = `用户${Math.floor(Math.random() * 1000)}`;
    try {
      window.localStorage.setItem("doc-comment-user", name);
    } catch {}
  }
  return { name, color: hashColor(name) };
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function PeerAvatars({ peers }: { peers: PeerInfo[] }) {
  if (!peers.length) return null;
  return (
    <div className="flex -space-x-2 ml-2">
      {peers.slice(0, 6).map((p) => (
        <div
          key={p.socketId}
          title={p.name}
          className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-[11px] font-semibold text-white"
          style={{ background: p.color }}
        >
          {p.name.slice(0, 2)}
        </div>
      ))}
      {peers.length > 6 && (
        <div className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-900 bg-gray-300 text-gray-700 text-[11px] flex items-center justify-center">
          +{peers.length - 6}
        </div>
      )}
    </div>
  );
}

export default function TiptapEditor({ documentId }: TiptapEditorProps) {
  // 每次 documentId 变化，重建 ydoc + provider
  const { ydoc, provider } = useMemo(() => {
    const localUser = getLocalUser();
    const doc = new Y.Doc();
    const p = new YjsSocketProvider({
      documentId,
      user: localUser,
      doc,
    });
    return { ydoc: doc, provider: p };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [synced, setSynced] = useState(false);
  const seededRef = useRef(false);

  useEffect(() => {
    const offPeers = provider.onPeersChange(setPeers);
    const offSynced = provider.onSyncedChange(setSynced);
    return () => {
      offPeers();
      offSynced();
    };
  }, [provider]);

  // 卸载时销毁 provider + doc
  useEffect(() => {
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  const editor = useEditor(
    {
      extensions: [
        // StarterKit 自带的 undoRedo 与 Yjs undo 冲突，必须禁用
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: ydoc }),
      ],
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[500px] px-8 py-6",
        },
      },
    },
    [ydoc],
  );

  // 首次 sync 完成后，若文档为空且房间只有自己，则插入默认内容
  useEffect(() => {
    if (!editor || !synced || seededRef.current) return;
    if (peers.length > 1) {
      seededRef.current = true;
      return;
    }
    const frag = ydoc.getXmlFragment("default");
    const isEmpty = frag.length === 0;
    const editorEmpty =
      editor.state.doc.childCount === 0 ||
      (editor.state.doc.childCount === 1 &&
        editor.state.doc.firstChild?.content.size === 0);
    if (isEmpty && editorEmpty) {
      editor.commands.setContent(DEFAULT_CONTENT);
    }
    seededRef.current = true;
  }, [editor, synced, peers, ydoc]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          title="标题1"
        >
          <b>H1</b>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="标题2"
        >
          <b>H2</b>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          title="标题3"
        >
          <b>H3</b>
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="粗体"
        >
          <b>B</b>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="斜体"
        >
          <i>I</i>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="删除线"
        >
          <s>S</s>
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="无序列表"
        >
          •
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="有序列表"
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="引用"
        >
          &ldquo;
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="代码块"
        >
          {"</>"}
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />
        <ToolbarButton
          active={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="分割线"
        >
          ―
        </ToolbarButton>

        {/* 协同状态 */}
        <div className="ml-auto flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              synced
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            }`}
            title={synced ? "已与服务端同步" : "等待同步…"}
          >
            {synced ? "● 已同步" : "○ 同步中"}
          </span>
          <PeerAvatars peers={peers} />
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
