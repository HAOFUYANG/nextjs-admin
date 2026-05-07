"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useGroupChat } from "@/hooks/use-group-chat";
import type { WeatherSnapshot } from "@/hooks/use-group-chat";
import { fetchRooms, createRoom, type RoomInfo } from "@/lib/room-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput from "@/components/chat/ChatInput";
import LoginDialog from "@/components/chat/LoginDialog";

function WeatherBadge({ weather }: { weather: WeatherSnapshot }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
      <span>🌤️</span>
      <span>
        {weather.city} {weather.tempC}°C {weather.text}
      </span>
    </span>
  );
}

function CreateRoomDialog({
  open,
  onClose,
  onCreated,
  createdBy,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (room: RoomInfo) => void;
  createdBy: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const room = await createRoom(
        name.trim(),
        createdBy,
        description.trim() || undefined,
      );
      setName("");
      setDescription("");
      onCreated(room);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          新建房间
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              房间名
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入房间名"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              描述（可选）
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="房间描述"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
              {loading ? "创建中..." : "创建"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const Socket: React.FC = () => {
  const {
    connected,
    myUser,
    room,
    setRoom,
    onlineUsers,
    messages,
    messageInput,
    setMessageInput,
    login,
    joinRoom,
    sendMessage,
    messagesEndRef,
    weather,
  } = useGroupChat("");

  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [activeRoom, setActiveRoom] = useState<RoomInfo | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const data = await fetchRooms();
      setRooms(data);
    } catch {
      // silently fail
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  // load rooms on mount
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // auto-join room after login
  useEffect(() => {
    if (myUser && activeRoom) {
      joinRoom(activeRoom.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUser?.id]);

  // join room when activeRoom changes (and already logged in)
  useEffect(() => {
    if (myUser && activeRoom) {
      joinRoom(activeRoom.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom?.id]);

  const handleLogin = (nickname: string, avatarIndex: number) => {
    login(nickname, avatarIndex);
  };

  const handleSelectRoom = (r: RoomInfo) => {
    setActiveRoom(r);
  };

  const handleRoomCreated = (r: RoomInfo) => {
    setRooms((prev) => [r, ...prev]);
    setActiveRoom(r);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageBreadcrumb pageTitle="群聊" />

      <LoginDialog open={connected && !myUser} onLogin={handleLogin} />
      <CreateRoomDialog
        open={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        onCreated={handleRoomCreated}
        createdBy={myUser?.nickname || "anonymous"}
      />

      <div
        className="flex gap-4"
        style={{ height: "calc(100vh - 200px)", minHeight: 480 }}
      >
        {/* Left: Room list sidebar */}
        <div className="w-56 shrink-0 flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5">
            <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
              房间
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={() => setShowCreateRoom(true)}
              disabled={!myUser}
            >
              + 新建
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {roomsLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-gray-400">加载中...</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-gray-400">暂无房间</p>
              </div>
            ) : (
              rooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectRoom(r)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 transition-colors ${
                    activeRoom?.id === r.id
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  {r.description && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {r.description}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-7"
              onClick={loadRooms}
            >
              刷新
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs h-7"
              onClick={() => setShowCreateRoom(true)}
              disabled={!myUser}
            >
              新建房间
            </Button>
          </div>
        </div>

        {/* Right: Chat area */}
        <div className="flex-1 flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/5 overflow-hidden">
          {!activeRoom ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">选择一个房间开始聊天</p>
            </div>
          ) : (
            <>
              {/* Header bar */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {activeRoom.name}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {onlineUsers.length} 人在线
                  </span>
                  {weather && <WeatherBadge weather={weather} />}
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                    connected
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-500 dark:text-red-400"
                  }`}
                >
                  <span
                    className={`inline-block size-1.5 rounded-full ${
                      connected ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  {connected ? "已连接" : "未连接"}
                </span>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50 dark:bg-transparent">
                {!myUser && connected ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-400">正在登录...</p>
                  </div>
                ) : !connected ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-400">连接中...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-400">
                      暂无消息，发送第一条消息吧
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <ChatBubble key={msg.id} msg={msg} myId={myUser?.id} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <ChatInput
                value={messageInput}
                onChange={setMessageInput}
                onSend={sendMessage}
                onlineCount={onlineUsers.length}
                disabled={!myUser}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Socket;
