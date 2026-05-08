"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type MemberInfo = {
  id: string;
  nickname: string;
  avatarIndex: number;
};

type ChatInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onlineCount: number;
  disabled?: boolean;
  members: MemberInfo[];
  myNickname?: string;
};

export default function ChatInput({
  value,
  onChange,
  onSend,
  onlineCount,
  disabled,
  members,
  myNickname,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredMembers = members.filter(
    (m) =>
      m.nickname !== myNickname &&
      m.nickname.toLowerCase().includes(mentionQuery.toLowerCase()),
  );

  // auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [value]);

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [mentionQuery]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart;

      // Check if cursor is right after an @mention pattern
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\S*)$/);

      if (mentionMatch) {
        const start = cursorPos - mentionMatch[0].length;
        setMentionOpen(true);
        setMentionQuery(mentionMatch[1]);
        setMentionStart(start);
      } else {
        setMentionOpen(false);
      }

      onChange(newValue);
    },
    [onChange],
  );

  const selectMember = useCallback(
    (member: MemberInfo) => {
      if (mentionStart < 0) return;
      const before = value.slice(0, mentionStart);
      const after = value.slice(
        mentionStart + 1 + mentionQuery.length, // skip @ and query
      );
      const newValue = `${before}@${member.nickname} ${after}`;
      onChange(newValue);
      setMentionOpen(false);
      setMentionStart(-1);

      // Refocus textarea
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          const newCursorPos = before.length + member.nickname.length + 2;
          el.focus();
          el.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    },
    [value, mentionStart, mentionQuery, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) =>
            (prev - 1 + filteredMembers.length) % filteredMembers.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMember(filteredMembers[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 relative">
      {/* Mention dropdown */}
      {mentionOpen && filteredMembers.length > 0 && (
        <ul className="absolute bottom-full left-4 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto list-none p-0 m-0 min-w-[120px] w-auto">
          {filteredMembers.map((member, idx) => {
            const padded = String(member.avatarIndex).padStart(2, "0");
            return (
              <li
                key={member.id}
                className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                  idx === selectedIndex ? "bg-blue-50 dark:bg-blue-900/30" : ""
                }`}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <Image
                  src={`/images/user/user-${padded}.jpg`}
                  alt={member.nickname}
                  width={24}
                  height={24}
                  className="rounded-full object-cover"
                />
                <span className="text-gray-800 dark:text-gray-200">
                  {member.nickname}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-end gap-3">
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 pb-2">
          在线 {onlineCount} 人
        </span>
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:text-gray-200 placeholder:text-gray-400"
          placeholder="输入消息，Enter 发送，Shift+Enter 换行，@ 提及用户"
          rows={1}
          value={value}
          onChange={handleChange}
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
