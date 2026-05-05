# pnpm workspace 使用速查

- 查看工作区包
  - `pnpm ls -r`
  - `pnpm -w ls`

- 在指定子包安装依赖
  - 常规依赖：`pnpm --filter <pkg> add <dep>`
    - 例：`pnpm --filter nextjs add axios`
    - 例：`pnpm --filter nestjs add @nestjs/config`
  - 开发依赖：`pnpm --filter <pkg> add -D <dep>`
    - 例：`pnpm --filter nextjs add -D @types/node`
  - 指定版本/范围：`pnpm --filter <pkg> add <dep>@<version>`

- 在指定子包删除依赖
  - `pnpm --filter <pkg> remove <dep>`
    - 例：`pnpm --filter nextjs remove axios`

- 在指定子包运行脚本
  - `pnpm --filter <pkg> run <script>`
    - 例：`pnpm --filter nextjs run dev`
    - 例：`pnpm --filter nestjs run start:dev`

- 根脚本（已配置）
  - 启动 Next：`pnpm run dev`
  - 启动 Nest：`pnpm run dev:nest`
  - 构建全部：`pnpm run build`
  - 检查全部（存在 lint 脚本的包）：`pnpm run lint`

- 在多个包并行运行（示例）
  - 同时启动 Next 与 Nest：  
    `pnpm --filter nextjs run dev & pnpm --filter nestjs run start:dev`
  - 或使用 turbo/concurrently（可选）：在根新增脚本统一编排

- 交叉引用与共享
  - 如果抽取公共代码到 `packages/*`，可在子包中按普通依赖安装：  
    `pnpm --filter nextjs add @workspace/ui`（假设 packages/ui/package.json name 为 `@workspace/ui`）
  - 工作区内本地包会自动以 symlink 形式链接，避免重复拷贝

- 当前结构说明
  - Next 子包：`apps/nextjs`
  - Nest 子包：`apps/nestjs`
  - 根目录仅保留工作区编排与通用文档
