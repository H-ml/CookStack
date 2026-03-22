# CookStack

CookStack 是一个面向家庭厨房场景的 AI 饮食管理原型，用来把库存、食谱、周计划和采购动作串成一个闭环。

当前版本支持：

- 库存录入与本地持久化
- 食材保质期提醒
- 食谱管理与库存实时比对
- 周计划排餐与差值清单计算
- 一键标记“已烹饪”并自动扣减库存
- 通过硅基流动 API 将自然语言食谱解析成结构化数据
- 通过 Supabase 增量同步库存、食谱、采购清单和周计划
- 通过 Supabase Auth 让每个用户只看到自己的厨房数据

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Supabase
- OpenAI-compatible SDK
- SiliconFlow API

## 本地开发

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

类型检查：

```bash
npx tsc --noEmit
```

## 环境变量

复制 [`.env.example`](./.env.example) 为 `.env.local`，然后填写：

```env
SILICONFLOW_API_KEY=your_api_key
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=Pro/Qwen/Qwen2.5-7B-Instruct

NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

`.env.local` 已被忽略，不会进入 Git。

## Supabase 接入

仓库已经带了两份迁移文件：

- [`supabase/migrations/20260322180000_create_cookstack_tables.sql`](./supabase/migrations/20260322180000_create_cookstack_tables.sql)
- [`supabase/migrations/20260322193000_add_user_scoped_auth_rls.sql`](./supabase/migrations/20260322193000_add_user_scoped_auth_rls.sql)

如果你之前已经跑过第一份 SQL，现在只需要继续执行第二份迁移，把 `user_id`、RLS policy 和登录隔离能力补上。

## Auth 说明

要启用登录，请在 Supabase 后台确认：

1. `Authentication` 已开启 Email provider。
2. 你已经把 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 配到 `.env.local`。
3. 你已经把高权限 `SUPABASE_SERVICE_ROLE_KEY` 配到服务端环境变量。

当前应用会按下面的优先级工作，并通过动作式 API 增量写入 Supabase：

1. 未登录时，使用本地浏览器存储。
2. 登录后，切换到当前用户自己的云端厨房数据。
3. 如果该用户云端还是空的，会自动把当前本地数据迁移到该用户名下。

## 项目结构

- `app/`: Next.js App Router 页面与 API 路由
- `components/`: 业务组件、状态管理、页面模块
- `lib/`: 共享类型、状态整理、Supabase 映射层
- `supabase/`: 版本化数据库迁移文件
- `PRD_AI饮食管理_v1.md`: 产品需求文档

## Git 工作流建议

每完成一个可验收的小版本，执行：

```bash
git add .
git commit -m "feat: describe this version"
git push
```

建议按功能里程碑提交，例如“食谱管理”“周计划”“硅基流动接入”“Supabase 持久化”“Supabase Auth”。

## License

本项目使用 Apache-2.0 许可证，详见 [`LICENSE`](./LICENSE)。
