"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";

type SocketContextValue = {
  socket: Socket | null;
  connected: boolean;
  clientId: string;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  clientId: "",
});

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3030/realtime";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket] = useState<Socket>(() =>
    io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
      autoConnect: true,
    }),
  );
  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    const handleConnect = () => {
      setConnected(true);
      setClientId(socket.id ?? "");
    };

    const handleDisconnect = () => {
      setConnected(false);
      setClientId("");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    if (socket.connected) handleConnect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.disconnect();
    };
  }, [socket]);

  const value = useMemo(
    () => ({ socket, connected, clientId }),
    [socket, connected, clientId],
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
