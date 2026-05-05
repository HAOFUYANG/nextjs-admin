# nextjs-learning Monorepo

本项目已改造成 pnpm workspace 的 monorepo 结构，包含两个子应用：

- `apps/nextjs`：Next.js 前端应用
- `apps/nestjs`：NestJS 服务端骨架

## 目录结构

```text
.
├── apps
│   ├── nextjs
│   └── nestjs
├── packages
├── pnpm-workspace.yaml
├── package.json
└── scripts.md
```

## 环境要求

- Node.js 18+
- pnpm 10+

## 安装依赖

在仓库根目录执行：

```bash
pnpm install
```

## 启动命令

### 从根目录启动

- 启动 Next.js：

```bash
pnpm run dev
```

- 启动 NestJS：

```bash
pnpm run dev:nest
```

- 构建全部子包：

```bash
pnpm run build
```

- lint 全部子包（存在 lint 脚本的包）：

```bash
pnpm run lint
```

### 按子包启动

- 启动 Next.js：

```bash
pnpm --filter nextjs run dev
```

- 启动 NestJS：

```bash
pnpm --filter nestjs run start:dev
```

## 常用 workspace 命令

完整命令速查见 [scripts.md](file:///Users/haofuyang/Desktop/AI/nextjs-learning/scripts.md)。

例如：

```bash
# 给 nextjs 子包安装依赖
pnpm --filter nextjs add axios

# 删除 nestjs 子包依赖
pnpm --filter nestjs remove @nestjs/config
```
