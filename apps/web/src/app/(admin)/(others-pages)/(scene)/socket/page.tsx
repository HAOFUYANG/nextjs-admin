"use client";
import React, { useEffect } from "react";
import { useGroupChat } from "@/hooks/use-group-chat";
import type { WeatherSnapshot } from "@/hooks/use-group-chat";
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
  } = useGroupChat("yang-socket-room");

  // auto-join room after login
  useEffect(() => {
    if (myUser) {
      joinRoom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUser?.id]);

  const handleLogin = (nickname: string, avatarIndex: number) => {
    login(nickname, avatarIndex);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageBreadcrumb pageTitle="群聊" />

      {/* Login dialog */}
      <LoginDialog open={connected && !myUser} onLogin={handleLogin} />

      <div
        className="flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/5 overflow-hidden"
        style={{ height: "calc(100vh - 200px)", minHeight: 480 }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {room}
            </h3>
            <span className="text-xs text-gray-400">
              {onlineUsers.length} 人在线
            </span>
            {weather && <WeatherBadge weather={weather} />}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="h-7 w-[160px] text-xs"
                placeholder="房间名"
                disabled={!myUser}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={joinRoom}
                disabled={!myUser}
              >
                加入
              </Button>
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
      </div>
    </div>
  );
};

export default Socket;
