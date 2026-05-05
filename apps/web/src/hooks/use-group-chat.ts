"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "@/context/SocketContext";

export type UserInfo = {
  id: string;
  nickname: string;
  avatarIndex: number;
};

export type WeatherSnapshot = {
  city: string;
  tempC: number;
  text: string;
  windKph: number;
  humidity: number;
  icon: string;
  localtime: string;
};

export type ChatMessage = {
  id: string;
  type: "chat" | "system";
  user?: UserInfo;
  content?: string;
  text?: string;
  time: number;
};

export function useGroupChat(defaultRoom: string) {
  const { socket, connected } = useSocket();
  const [myUser, setMyUser] = useState<UserInfo | null>(null);
  const [room, setRoom] = useState(defaultRoom);
  const [onlineUsers, setOnlineUsers] = useState<UserInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg].slice(-200));
  }, []);

  // auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const onUserInfo = (payload: { data: UserInfo }) => {
      setMyUser(payload.data);
    };

    const onUserJoined = (payload: { data: { user: UserInfo } }) => {
      const user = payload.data.user;
      appendMessage({
        id: `sys-joined-${Date.now()}-${Math.random()}`,
        type: "system",
        text: `${user.nickname} 加入了群聊`,
        time: Date.now(),
      });
      // update online users
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.id === user.id)) return prev;
        return [...prev, user];
      });
    };

    const onUserLeft = (payload: {
      data: { user: { id: string; nickname: string } };
    }) => {
      const user = payload.data.user;
      appendMessage({
        id: `sys-left-${Date.now()}-${Math.random()}`,
        type: "system",
        text: `${user.nickname} 离开了群聊`,
        time: Date.now(),
      });
      setOnlineUsers((prev) => prev.filter((u) => u.id !== user.id));
    };

    const onRoomUsers = (payload: { data: UserInfo[] }) => {
      setOnlineUsers(payload.data);
    };

    const onMessage = (payload: {
      data: { id: string; user: UserInfo; content: string; time: number };
    }) => {
      const d = payload.data;
      appendMessage({
        id: d.id,
        type: "chat",
        user: d.user,
        content: d.content,
        time: d.time,
      });
    };

    const onWeather = (payload: { data: WeatherSnapshot }) => {
      setWeather(payload.data);
    };

    const onDisconnect = () => {
      setMyUser(null);
      setOnlineUsers([]);
      appendMessage({
        id: `sys-disc-${Date.now()}`,
        type: "system",
        text: "连接已断开",
        time: Date.now(),
      });
    };

    socket.on("server:user-info", onUserInfo);
    socket.on("server:user-joined", onUserJoined);
    socket.on("server:user-left", onUserLeft);
    socket.on("server:room-users", onRoomUsers);
    socket.on("server:message", onMessage);
    socket.on("server:weather", onWeather);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("server:user-info", onUserInfo);
      socket.off("server:user-joined", onUserJoined);
      socket.off("server:user-left", onUserLeft);
      socket.off("server:room-users", onRoomUsers);
      socket.off("server:message", onMessage);
      socket.off("server:weather", onWeather);
      socket.off("disconnect", onDisconnect);
      setWeather(null);
    };
  }, [socket, appendMessage]);

  const login = useCallback(
    (nickname: string, avatarIndex: number) => {
      socket?.emit("client:login", { nickname, avatarIndex });
    },
    [socket],
  );

  const joinRoom = useCallback(() => {
    const nextRoom = room.trim();
    if (!nextRoom || !myUser) return;
    socket?.emit("client:join", { room: nextRoom });
  }, [socket, room, myUser]);

  const sendMessage = useCallback(() => {
    const content = messageInput.trim();
    if (!content || !myUser) return;
    socket?.emit("client:message", { room, content });
    setMessageInput("");
  }, [socket, room, messageInput, myUser]);

  return {
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
  };
}
