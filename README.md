# CookStack

CookStack 是一个面向家庭厨房场景的 AI 饮食管理原型，帮助你把库存、食谱和周计划串成一个闭环。

当前版本支持：

- 库存录入与本地持久化
- 食材保质期提醒
- 食谱管理与库存实时比对
- 周计划排餐与差值清单计算
- 一键标记“已烹饪”并自动扣减库存
- 通过硅基流动 API 将自然语言食谱解析成结构化数据

## 技术栈

- Next.js 15
- React 19
- TypeScript
- OpenAI-compatible SDK
- SiliconFlow API

## 本地开发

先安装依赖：

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

复制 [`.env.example`](./.env.example) 为 `.env.local`，并填入你的硅基流动配置：

```env
SILICONFLOW_API_KEY=your_api_key
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=Pro/Qwen/Qwen2.5-7B-Instruct
```

`.env.local` 已被忽略，不会进入 Git。

## 项目结构

- `app/`: Next.js App Router 页面与 API 路由
- `components/`: 业务组件、状态管理、页面模块
- `lib/`: 共享类型与 mock 数据
- `PRD_AI饮食管理_v1.md`: 产品需求文档

## Git 工作流建议

每完成一个可验收的小版本，执行：

```bash
git add .
git commit -m "feat: describe this version"
git push
```

建议按功能里程碑提交，例如“食谱管理”“周计划”“硅基流动接入”。

## License

本项目使用 Apache-2.0 许可证，详见 [`LICENSE`](./LICENSE)。
