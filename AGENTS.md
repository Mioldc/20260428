# 绣花厂订单管理系统 — AI 开发指南

本项目采用 **驾驭工程 (Harness Engineering)** 方法论进行 AI 辅助开发。
核心理念：**人类掌舵，智能体执行**。

## 快速入口

在修改任何代码之前，请先阅读以下规则文件：

| 规则文件 | 内容 |
|---------|------|
| `.cursor/rules/project.mdc` | 项目背景、业务术语、用户画像 |
| `.cursor/rules/architecture.mdc` | 分层架构、模块边界、依赖方向 |
| `.cursor/rules/coding-standards.mdc` | 命名规范、文件组织、组件模式 |
| `.cursor/rules/database.mdc` | 表设计约定、Drizzle 用法、查询模式 |
| `.cursor/rules/ui-patterns.mdc` | shadcn/ui 约定、布局规范、交互模式 |
| `.cursor/rules/security.mdc` | 商业保密性与软件保护规范 |
| `.cursor/rules/troubleshooting.mdc` | 已知坑和解决方案（持续积累） |

## 核心原则

1. **人类掌舵，智能体执行** — 遵循规则文件，不自行决定架构变更
2. **零 any 容忍** — TypeScript strict 模式，所有函数必须有返回类型
3. **自动化护栏** — 代码变更必须通过 `npm run check`（typecheck + lint + format + test）
4. **犯错即记录** — 每次踩坑后更新 `troubleshooting.mdc`

## 验证命令

```bash
npm run check         # 全量检查 (typecheck + lint + format:check + test)
npm run typecheck     # TypeScript 编译检查
npm run lint          # ESLint 检查
npm run lint:fix      # ESLint 自动修复
npm run format        # Prettier 格式化
npm run format:check  # Prettier 格式检查
npm run test          # Vitest 单元测试
npm run test:watch    # Vitest 监视模式
```

## 分层架构概览

```
types/        → 纯类型定义，零依赖
  ↓
lib/schema    → Drizzle 表定义，仅依赖 types
  ↓
lib/queries   → 数据库查询函数，依赖 schema
  ↓
hooks/        → React hooks，封装 queries
  ↓
components/   → UI 组件，使用 hooks
  ↓
pages/        → 页面组件，组合 components
```

## Phase 回顾机制

每完成一个 Phase：
1. 运行 `npm run check` 全量检查
2. 将新发现的问题写入 `troubleshooting.mdc`
3. 更新过时的规则文件内容
4. 处理 `// TODO(debt):` 标记的技术债务
