# CookStack

CookStack 是一个面向家庭厨房场景的 AI 饮食管理原型，用来把库存、食谱、周计划和采购动作串成一个闭环。

当前版本支持：

- 库存录入与本地持久化
- 食材保质期提醒
- 食谱管理与库存实时比对
- 周计划排餐与差值清单计算
- 一键标记“已烹饪”并自动扣减库存
- 通过硅基流动 API 将自然语言食谱解析成结构化数据
- 通过 Supabase 同步库存、食谱、采购清单和周计划

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

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

`.env.local` 已被忽略，不会进入 Git。

## Supabase 接入

仓库已经带了一份迁移文件：

- [`supabase/migrations/20260322180000_create_cookstack_tables.sql`](./supabase/migrations/20260322180000_create_cookstack_tables.sql)

你有两种使用方式：

1. 在 Supabase SQL Editor 里直接执行这份 SQL。
2. 如果你已经装了 Supabase CLI，就在本地项目中执行迁移。

当前应用会按下面的优先级工作：

1. 如果检测到 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`，应用会优先从 Supabase 读取数据。
2. 如果云端还没有数据，会把你现有的本地数据自动同步上去。
3. 如果 Supabase 没配置好，应用会自动退回本地浏览器存储。

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

建议按功能里程碑提交，例如“食谱管理”“周计划”“硅基流动接入”“Supabase 持久化”。

## License

本项目使用 Apache-2.0 许可证，详见 [`LICENSE`](./LICENSE)。
