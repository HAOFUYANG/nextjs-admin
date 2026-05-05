"use client";

import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { ChatMessage, UserInfo } from "@/hooks/use-group-chat";

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai",
  });
}

function UserAvatar({
  avatarIndex,
  nickname,
  size = "default",
}: {
  avatarIndex: number;
  nickname: string;
  size?: "sm" | "default" | "lg";
}) {
  const padded = String(avatarIndex).padStart(2, "0");
  return (
    <Avatar size={size}>
      <AvatarImage src={`/images/user/user-${padded}.jpg`} alt={nickname} />
      <AvatarFallback>{nickname.slice(0, 1)}</AvatarFallback>
    </Avatar>
  );
}

function ChatBubbleMessage({
  msg,
  isOwn,
}: {
  msg: ChatMessage;
  isOwn: boolean;
}) {
  const user = msg.user!;

  if (isOwn) {
    return (
      <div className="flex justify-end gap-2">
        <div className="flex flex-col items-end max-w-[70%]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(msg.time)}
            </span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {user.nickname}
            </span>
          </div>
          <div className="rounded-xl rounded-tr-sm bg-green-500 dark:bg-green-600 px-3 py-2 text-sm text-white break-words">
            {msg.content}
          </div>
        </div>
        <UserAvatar avatarIndex={user.avatarIndex} nickname={user.nickname} />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <UserAvatar avatarIndex={user.avatarIndex} nickname={user.nickname} />
      <div className="flex flex-col max-w-[70%]">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {user.nickname}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(msg.time)}
          </span>
        </div>
        <div className="rounded-xl rounded-tl-sm bg-white dark:bg-white/10 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 break-words">
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function SystemMessage({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex justify-center">
      <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
        {msg.text}
      </span>
    </div>
  );
}

export default function ChatBubble({
  msg,
  myId,
}: {
  msg: ChatMessage;
  myId?: string;
}) {
  if (msg.type === "system") return <SystemMessage msg={msg} />;
  if (msg.type === "chat") {
    const isOwn = msg.user?.id === myId;
    return <ChatBubbleMessage msg={msg} isOwn={isOwn} />;
  }
  return null;
}

export { UserAvatar };
