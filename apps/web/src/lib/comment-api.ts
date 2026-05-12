const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3030";

export interface CommentRecord {
  id: string;
  documentId: string;
  blockId: string;
  userId: string;
  content: string;
  createdAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errno !== 0) throw new Error(json.message || "Request failed");
  return json.data;
}

async function requestMessage(path: string, init?: RequestInit): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errno !== 0) throw new Error(json.message || "Request failed");
}

export async function fetchComments(
  documentId: string,
  blockId?: string,
): Promise<CommentRecord[]> {
  const q = blockId ? `?blockId=${encodeURIComponent(blockId)}` : "";
  return request(`/documents/${documentId}/comments${q}`);
}

export async function createComment(
  documentId: string,
  userId: string,
  content: string,
  blockId?: string,
): Promise<CommentRecord> {
  return request(`/documents/${documentId}/comments`, {
    method: "POST",
    body: JSON.stringify({ userId, content, blockId }),
  });
}

export async function deleteComment(id: string): Promise<void> {
  await requestMessage(`/comments/${id}`, { method: "DELETE" });
}
