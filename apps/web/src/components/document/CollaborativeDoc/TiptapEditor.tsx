"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface TiptapEditorProps {
  documentId: string;
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

export default function TiptapEditor({ documentId }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: `<h2>欢迎使用协同文档 ✨</h2>
<p>这是一个基于 <strong>Tiptap</strong> 的富文本编辑器，后续会接入 Yjs 实现多人实时协同。</p>
<p>当前为 <em>预览模式</em>，你可以自由编辑内容（暂不同步到服务端）。</p>
<h3>功能规划</h3>
<ul>
  <li>✅ 富文本编辑（粗体、斜体、标题、列表）</li>
  <li>🔜 多人实时协同（Yjs + Socket.IO）</li>
  <li>🔜 协同光标显示</li>
  <li>🔜 评论与讨论</li>
</ul>`,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[500px] px-8 py-6",
      },
    },
  });

  useEffect(() => {
    console.log("[TiptapEditor] documentId:", documentId);
  }, [documentId]);

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
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
