const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3030";

export interface DocumentRecord {
  id: string;
  workspaceId: string;
  title: string;
  type: "doc" | "table";
  snapshot: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
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

// Workspace API
export async function fetchWorkspaces(): Promise<Workspace[]> {
  return request("/workspaces");
}

export async function createWorkspace(
  name: string,
  ownerId: string,
): Promise<Workspace> {
  return request("/workspaces", {
    method: "POST",
    body: JSON.stringify({ name, ownerId }),
  });
}

// Document API
export async function fetchDocuments(
  workspaceId: string,
): Promise<DocumentRecord[]> {
  return request(`/documents?workspaceId=${workspaceId}`);
}

export async function fetchDocument(id: string): Promise<DocumentRecord> {
  return request(`/documents/${id}`);
}

export async function createDocument(
  workspaceId: string,
  type: "doc" | "table",
  title?: string,
): Promise<DocumentRecord> {
  return request("/documents", {
    method: "POST",
    body: JSON.stringify({ workspaceId, type, title }),
  });
}

export async function updateDocumentTitle(
  id: string,
  title: string,
): Promise<DocumentRecord> {
  return request(`/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title }),
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await request(`/documents/${id}`, { method: "DELETE" });
}
