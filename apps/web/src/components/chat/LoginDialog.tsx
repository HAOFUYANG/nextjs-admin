"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const AVATAR_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

type LoginDialogProps = {
  open: boolean;
  onLogin: (nickname: string, avatarIndex: number) => void;
};

export default function LoginDialog({ open, onLogin }: LoginDialogProps) {
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(1);

  const handleSubmit = () => {
    const name = nickname.trim();
    if (!name) return;
    onLogin(name, selectedAvatar);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>加入群聊</DialogTitle>
          <DialogDescription>
            设置你的昵称和头像，即可加入群聊
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 昵称 */}
          <Field>
            <FieldLabel>昵称</FieldLabel>
            <Input
              placeholder="请输入昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              autoFocus
            />
          </Field>

          {/* 头像选择 */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              选择头像
            </p>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((idx) => {
                const padded = String(idx).padStart(2, "0");
                return (
                  <button
                    key={idx}
                    type="button"
                    className={cn(
                      "relative size-12 rounded-full overflow-hidden border-2 transition-all",
                      selectedAvatar === idx
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-gray-300 dark:hover:border-gray-600",
                    )}
                    onClick={() => setSelectedAvatar(idx)}
                  >
                    <Image
                      src={`/images/user/user-${padded}.jpg`}
                      alt={`头像 ${idx}`}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 加入按钮 */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!nickname.trim()}
          >
            加入群聊
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
