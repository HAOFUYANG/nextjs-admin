"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/context/SocketContext";

type WsLog = {
  id: string;
  text: string;
};

export function useChatFeed(defaultRoom = "yang-socket-room") {
  const { socket, connected, clientId } = useSocket();
  const [logs, setLogs] = useState<WsLog[]>([]);
  const [room, setRoom] = useState(defaultRoom);
  const [message, setMessage] = useState("");

  const appendLog = (text: string) => {
    setLogs((prev) =>
      [{ id: `${Date.now()}-${Math.random()}`, text }, ...prev].slice(0, 30),
    );
  };

  useEffect(() => {
    if (!socket) return;
    const onWelcome = (payload: unknown) => {
      appendLog(`welcome: ${JSON.stringify(payload)}`);
    };
    const onPong = (payload: unknown) => {
      appendLog(`pong: ${JSON.stringify(payload)}`);
    };
    const onJoined = (payload: unknown) => {
      appendLog(`joined: ${JSON.stringify(payload)}`);
    };
    const onMessage = (payload: unknown) => {
      appendLog(`message: ${JSON.stringify(payload)}`);
    };
    const onDisconnect = (reason: string) => {
      appendLog(`disconnected: ${reason}`);
    };
    socket.on("server:welcome", onWelcome);
    socket.on("server:pong", onPong);
    socket.on("server:joined", onJoined);
    socket.on("server:message", onMessage);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("server:welcome", onWelcome);
      socket.off("server:pong", onPong);
      socket.off("server:joined", onJoined);
      socket.off("server:message", onMessage);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  const joinRoom = () => {
    const nextRoom = room.trim();
    if (!nextRoom) return;
    socket?.emit("client:join", { room: nextRoom });
    appendLog(`join sent: ${nextRoom}`);
  };

  const ping = () => {
    socket?.emit("client:ping", {
      from: "nextjs-admin",
      time: Date.now(),
    });
    appendLog("ping sent");
  };

  const broadcast = () => {
    const nextRoom = room.trim();
    const nextMessage = message.trim();
    if (!nextRoom || !nextMessage) return;
    socket?.emit("client:broadcast", { room: nextRoom, message: nextMessage });
    appendLog(`broadcast sent: ${nextMessage}`);
    setMessage("");
  };

  return {
    connected,
    clientId,
    logs,
    room,
    setRoom,
    message,
    setMessage,
    joinRoom,
    ping,
    broadcast,
  };
}
