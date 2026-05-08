const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3030";

export type RoomInfo = {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: string;
};

export async function fetchRooms(): Promise<RoomInfo[]> {
  const res = await fetch(`${API_BASE}/rooms`);
  const json = await res.json();
  if (json.errno !== 0) throw new Error(json.message);
  return json.data;
}

export async function createRoom(
  name: string,
  createdBy: string,
  description?: string,
): Promise<RoomInfo> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, createdBy, description }),
  });
  const json = await res.json();
  if (json.errno !== 0) throw new Error(json.message);
  return json.data;
}

export type RoomMember = {
  id: string;
  nickname: string;
  avatarIndex: number;
};

export async function fetchRoomMembers(roomId: string): Promise<RoomMember[]> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/members`);
  const json = await res.json();
  if (json.errno !== 0) throw new Error(json.message);
  return json.data;
}
