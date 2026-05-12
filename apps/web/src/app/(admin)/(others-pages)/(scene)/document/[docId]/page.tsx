"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import {
  fetchDocument,
  updateDocumentTitle,
  type DocumentRecord,
} from "@/lib/document-api";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { MessageSquareIcon } from "lucide-react";

// 动态导入编辑器组件（避免 SSR 问题）
const TiptapEditor = dynamic(
  () => import("@/components/document/CollaborativeDoc/TiptapEditor"),
  { ssr: false, loading: () => <EditorSkeleton /> },
) as React.ComponentType<{ documentId: string }>;

const CanvasTable = dynamic(
  () => import("@/components/document/CollaborativeTable/CanvasTableView"),
  { ssr: false, loading: () => <EditorSkeleton /> },
) as React.ComponentType<{ documentId: string }>;

const CommentPanel = dynamic(
  () => import("@/components/document/CommentPanel"),
  { ssr: false },
) as React.ComponentType<{
  documentId: string;
  blockId?: string;
  open: boolean;
  onClose: () => void;
}>;

function EditorSkeleton() {
  return (
    <div className="flex items-center justify-center h-96 text-gray-400">
      <div className="animate-pulse">加载编辑器...</div>
    </div>
  );
}

export default function DocumentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.docId as string;
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchDocument(docId);
        setDoc(d);
        setTitleValue(d.title);
      } catch (e) {
        toast.error(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [docId]);

  const handleTitleSave = async () => {
    if (!doc || !titleValue.trim()) return;
    try {
      const updated = await updateDocumentTitle(doc.id, titleValue.trim());
      setDoc(updated);
      setEditingTitle(false);
    } catch (e) {
      toast.error(String(e));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48" />
          <div className="h-96 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-6 text-center text-gray-500">文档不存在或已被删除</div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageBreadCrumb
        pageTitle={doc.title}
        parentTitle="我的文档"
        parentHref="/document"
      />

      {/* 标题栏 */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 dark:border-gray-800">
        <div
          className={`w-8 h-8 rounded flex items-center justify-center ${
            doc.type === "doc"
              ? "bg-blue-50 text-blue-500"
              : "bg-green-50 text-green-500"
          }`}
        >
          {doc.type === "doc" ? (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>

        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
            className="text-lg font-semibold px-2 py-1 border border-primary rounded-lg bg-transparent focus:outline-none"
          />
        ) : (
          <h1
            onClick={() => setEditingTitle(true)}
            className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
          >
            {doc.title}
          </h1>
        )}

        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            doc.type === "doc"
              ? "bg-blue-50 text-blue-600"
              : "bg-green-50 text-green-600"
          }`}
        >
          {doc.type === "doc" ? "富文本" : "多维表格"}
        </span>

        <button
          onClick={() => setCommentOpen(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
          title="打开评论面板"
        >
          <MessageSquareIcon className="w-4 h-4" />
          评论
        </button>
        <button
          onClick={() => router.push("/document")}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          返回列表
        </button>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden">
        {doc.type === "doc" ? (
          <TiptapEditor documentId={doc.id} />
        ) : (
          <CanvasTable documentId={doc.id} />
        )}
      </div>

      {/* 评论面板 */}
      <CommentPanel
        documentId={doc.id}
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
      />
    </div>
  );
}
