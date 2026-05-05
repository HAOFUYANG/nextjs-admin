"use client";

import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

type ChatInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onlineCount: number;
  disabled?: boolean;
};

export default function ChatInput({
  value,
  onChange,
  onSend,
  onlineCount,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
      <div className="flex items-end gap-3">
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 pb-2">
          在线 {onlineCount} 人
        </span>
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:text-gray-200 placeholder:text-gray-400"
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <Button size="sm" onClick={onSend} disabled={disabled || !value.trim()}>
          发送
        </Button>
      </div>
    </div>
  );
}
