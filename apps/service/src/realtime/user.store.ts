export type ChatUser = {
  id: string; // socket.id
  nickname: string;
  avatarIndex: number; // 1-37, maps to /images/user/user-XX.jpg
  room: string;
  joinedAt: number;
};

export class UserStore {
  private users = new Map<string, ChatUser>();

  create(
    id: string,
    nickname: string,
    avatarIndex: number,
    room: string,
  ): ChatUser {
    const user: ChatUser = {
      id,
      nickname,
      avatarIndex,
      room,
      joinedAt: Date.now(),
    };
    this.users.set(id, user);
    return user;
  }

  get(id: string): ChatUser | undefined {
    return this.users.get(id);
  }

  getByRoom(room: string): ChatUser[] {
    const result: ChatUser[] = [];
    for (const user of this.users.values()) {
      if (user.room === room) {
        result.push(user);
      }
    }
    return result;
  }

  findByNickname(nickname: string): ChatUser | undefined {
    for (const user of this.users.values()) {
      if (user.nickname === nickname) {
        return user;
      }
    }
    return undefined;
  }

  remove(id: string): ChatUser | undefined {
    const user = this.users.get(id);
    if (user) {
      this.users.delete(id);
    }
    return user;
  }

  updateRoom(id: string, room: string): ChatUser | undefined {
    const user = this.users.get(id);
    if (user) {
      user.room = room;
    }
    return user;
  }
}
