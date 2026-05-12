"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchComments,
  createComment,
  deleteComment,
  type CommentRecord,
} from "@/lib/comment-api";
import { toast } from "sonner";

interface CommentPanelProps {
  documentId: string;
  blockId?: string; // 可选：针对某行/段落的评论
  open: boolean;
  onClose: () => void;
}

const USER_KEY = "doc-comment-user";

function getInitialUser(): string {
  if (typeof window === "undefined") return "匿名";
  return window.localStorage.getItem(USER_KEY) || "匿名";
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return date.toLocaleDateString("zh-CN");
}

function avatarColor(name: string): string {
  // 简单 hash 生成稳定颜色
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  const palette = [
    "#6366f1",
    "#ec4899",
    "#10b981",
    "#f59e0b",
    "#3b82f6",
    "#ef4444",
    "#8b5cf6",
    "#14b8a6",
  ];
  return palette[Math.abs(hash) % palette.length];
}

export default function CommentPanel({
  documentId,
  blockId,
  open,
  onClose,
}: CommentPanelProps) {
  const [list, setList] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [user, setUser] = useState<string>(getInitialUser);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const data = await fetchComments(documentId, blockId);
      setList(data);
    } catch (err) {
      toast.error(`加载评论失败：${String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [documentId, blockId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleSubmit = async () => {
    const text = input.trim();
    const name = user.trim() || "匿名";
    if (!text) return;
    setSubmitting(true);
    try {
      const created = await createComment(documentId, name, text, blockId);
      setList((prev) => [created, ...prev]);
      setInput("");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(USER_KEY, name);
      }
    } catch (err) {
      toast.error(`发布失败：${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该评论？")) return;
    try {
      await deleteComment(id);
      setList((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(`删除失败：${String(err)}`);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden
      />
      {/* 抽屉 */}
      <aside className="fixed top-0 right-0 h-full w-[380px] z-50 bg-white dark:bg-gray-950 shadow-xl flex flex-col border-l border-gray-200 dark:border-gray-800">
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-semibold">评论</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {blockId && blockId !== "document-level"
                ? `绑定到 ${blockId}`
                : "文档级评论"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
            aria-label="关闭"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="text-center text-xs text-gray-400 py-6">
              加载中...
            </div>
          ) : list.length === 0 ? (
            <div className="text-center text-xs text-gray-400 py-8">
              还没有评论，来抢沙发吧 ✍️
            </div>
          ) : (
            list.map((c) => (
              <div key={c.id} className="group flex gap-3">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ background: avatarColor(c.userId) }}
                >
                  {c.userId.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium truncate">
                      {c.userId}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatTime(c.createdAt)}
                    </span>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="ml-auto opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 hover:text-red-500 transition"
                    >
                      删除
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 输入区 */}
        <footer className="border-t border-gray-200 dark:border-gray-800 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">以</span>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="昵称"
              className="flex-1 text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-transparent focus:outline-none focus:border-primary"
            />
            <span className="text-xs text-gray-400">身份发言</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="留下你的想法... (⌘/Ctrl + Enter 发送)"
            rows={3}
            className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent focus:outline-none focus:border-primary resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting || !input.trim()}
              className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {submitting ? "发送中..." : "发送"}
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
