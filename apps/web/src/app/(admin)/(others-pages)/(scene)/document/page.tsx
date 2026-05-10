"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import {
  fetchWorkspaces,
  createWorkspace,
  fetchDocuments,
  createDocument,
  deleteDocument,
  type DocumentRecord,
  type Workspace,
} from "@/lib/document-api";
import {
  PlusIcon,
  TrashIcon,
  FileTextIcon,
  TableIcon,
  ChevronRightIcon,
} from "lucide-react";
import { toast } from "sonner";

export default function DocumentListPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [activeWs, setActiveWs] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewWs, setShowNewWs] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocType, setNewDocType] = useState<"doc" | "table">("doc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const wss = await fetchWorkspaces();
      setWorkspaces(wss);
      if (wss.length > 0) {
        const ws = wss[0];
        setActiveWs(ws);
        const list = await fetchDocuments(ws.id);
        setDocs(list);
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateWs = async () => {
    if (!newWsName.trim()) return;
    try {
      const ws = await createWorkspace(newWsName, "anonymous");
      setWorkspaces((prev) => [ws, ...prev]);
      setActiveWs(ws);
      setDocs([]);
      setShowNewWs(false);
      setNewWsName("");
      toast.success("工作空间已创建");
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleCreateDoc = async () => {
    if (!activeWs) return;
    try {
      const doc = await createDocument(
        activeWs.id,
        newDocType,
        newDocTitle || undefined,
      );
      setDocs((prev) => [doc, ...prev]);
      setShowNewDoc(false);
      setNewDocTitle("");
      toast.success("文档已创建");
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      toast.success("已删除");
    } catch (e) {
      toast.error(String(e));
    }
  };

  const switchWorkspace = async (ws: Workspace) => {
    setActiveWs(ws);
    setLoading(true);
    try {
      const list = await fetchDocuments(ws.id);
      setDocs(list);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageBreadCrumb pageTitle="我的文档" />
      {/* 工作空间切换 + 新建 */}
      <div className="mt-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">工作空间：</span>
          <div className="flex gap-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => switchWorkspace(ws)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  activeWs?.id === ws.id
                    ? "bg-primary text-white"
                    : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                }`}
              >
                {ws.name}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowNewWs(true)}
          className="text-sm text-primary hover:underline"
        >
          + 新建工作空间
        </button>
      </div>

      {/* 新建工作空间弹窗 */}
      {showNewWs && (
        <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm max-w-md">
          <h3 className="text-sm font-medium mb-3">新建工作空间</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="输入名称"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent"
              onKeyDown={(e) => e.key === "Enter" && handleCreateWs()}
            />
            <button
              onClick={handleCreateWs}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90"
            >
              创建
            </button>
            <button
              onClick={() => setShowNewWs(false)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 文档列表头部 */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {activeWs ? activeWs.name : "文档列表"}
        </h2>
        <button
          onClick={() => setShowNewDoc(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <PlusIcon className="w-4 h-4" />
          新建文档
        </button>
      </div>

      {/* 新建文档弹窗 */}
      {showNewDoc && (
        <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm max-w-md">
          <h3 className="text-sm font-medium mb-3">新建文档</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="文档标题（可选）"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setNewDocType("doc")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  newDocType === "doc"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <FileTextIcon className="w-4 h-4" />
                富文本文档
              </button>
              <button
                onClick={() => setNewDocType("table")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  newDocType === "table"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <TableIcon className="w-4 h-4" />
                多维表格
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateDoc}
                className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90"
              >
                创建
              </button>
              <button
                onClick={() => setShowNewDoc(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 文档列表 */}
      {loading ? (
        <div className="mt-8 text-center text-gray-400">加载中...</div>
      ) : docs.length === 0 ? (
        <div className="mt-16 text-center">
          <div className="text-gray-300 mb-2">
            <FileTextIcon className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-gray-500 text-sm">
            暂无文档，点击上方「新建文档」开始
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {docs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => router.push(`/document/${doc.id}`)}
              className="group flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  doc.type === "doc"
                    ? "bg-blue-50 text-blue-500"
                    : "bg-green-50 text-green-500"
                }`}
              >
                {doc.type === "doc" ? (
                  <FileTextIcon className="w-5 h-5" />
                ) : (
                  <TableIcon className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{doc.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {doc.type === "doc" ? "富文本文档" : "多维表格"} ·{" "}
                  {new Date(doc.updatedAt).toLocaleDateString("zh-CN")}
                </p>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(doc.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
