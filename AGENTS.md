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
npm run test:e2e      # Playwright 端到端测试
```

## 项目结构概览

当前项目由三部分组成：

```text
src/                React + Vite 前端
src-tauri/          Tauri 2 / Rust 桌面壳与 SQLite 持久化
e2e/                Playwright 端到端测试
```

### 前端分层

```text
src/types/              领域类型与常量
  ↓
src/lib/schema.ts       Drizzle 表结构定义
src/lib/queries/        数据访问层
src/lib/db.ts           Tauri SQL 调用桥接
src/lib/backup.ts       备份恢复能力
src/lib/export.ts       Excel 导出
src/lib/business.ts     轻量业务计算
src/lib/utils.ts        纯工具函数
  ↓
src/hooks/              面向页面的状态与数据封装
  ↓
src/components/ui/      基础 UI 组件
src/components/shared/  业务复用组件
src/components/layout/  布局与导航
  ↓
src/pages/              页面模块
  ↓
src/App.tsx             路由装配、授权与启动流程
```

### 桌面端结构

```text
src-tauri/src/database.rs     SQLite 连接、迁移、加密备份/恢复
src-tauri/src/license.rs      授权校验与机器绑定
src-tauri/src/lib.rs          Tauri commands 导出
src-tauri/migrations/         SQLite schema 迁移脚本
```

### 业务模块

```text
orders/       订单管理
customers/    客户管理
production/   生产记录
finance/      收款、客户对账单、工厂经营统计（月/季/年、图表、导出）
workers/      工人、工资、出勤
threads/      线材库存、采购记录、库存调整
settings/     机台、备份、密码、授权信息
```

## 目标分层架构

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

## 当前实现基线

当前代码以已上线功能为准，以下能力已纳入正式范围：

1. `finance/` 包含收款登记、客户对账单、工厂经营统计。
2. 工厂经营统计首版即包含月 / 季 / 年切换、汇总卡片、周期明细、饼图展示和 Excel 导出。
3. `threads/` 包含线材主数据、库存调整和采购记录，采购支出进入工厂经营统计口径。

后续新增或重构时继续遵循：

1. 页面层只负责交互编排、表单状态和 UI 反馈。
2. 数据读取、聚合和数据库副作用优先封装进 `src/hooks/`。
3. 页面层允许直接依赖 `src/lib/utils.ts`、`src/lib/business.ts`、`src/lib/export.ts` 这类纯前端辅助模块，但不得直接依赖 `src/lib/queries/*`、`src/lib/db.ts`、`src/lib/schema.ts`、`src/lib/backup.ts`。

## Phase 回顾机制

每完成一个 Phase：
1. 运行 `npm run check` 全量检查
2. 将新发现的问题写入 `troubleshooting.mdc`
3. 更新过时的规则文件内容
4. 处理 `// TODO(debt):` 标记的技术债务
