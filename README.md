# 绣花厂订单管理系统

面向小型电脑绣花厂（4–8 台机器、2–3 名工人）的**轻量级桌面订单管理应用**。厂长/老板在一台 Windows 电脑上即可完成订单、客户、生产、收款、工资的全流程管理。

## 功能概览

| 模块 | 说明 |
|------|------|
| 订单管理 | 新建/编辑/删除订单，状态跟踪（待打样→打样中→待生产→生产中→已完成→已发货），关键字搜索与状态筛选 |
| 客户管理 | 客户信息维护（联系人、电话、地址、结算方式、开票信息），按名称/电话搜索 |
| 生产管理 | 按日期录入每台机器的产量、针数和次品数，关联订单自动汇总 |
| 收款对账 | 登记收款记录，按日期区间和关键字查询，一键生成客户对账单，导出 Excel |
| 工人工资 | 长工月薪管理（生成/发放/标记），临时工按日出勤录入（白班/夜班），汇总结清，导出工资明细 |
| 系统设置 | 绣花机台管理，启动密码保护，数据一键备份与恢复 |

## 技术栈

- **桌面框架** — [Tauri 2](https://v2.tauri.app/)（Rust 后端 + WebView 前端）
- **前端** — React 19 + TypeScript + Vite
- **UI** — shadcn/ui + Tailwind CSS 4 + Radix UI + Lucide Icons
- **数据库** — SQLite（tauri-plugin-sql 内嵌，数据存储在本地）
- **导出** — xlsx（Excel 文件生成）
- **测试** — Vitest（单元测试）+ Playwright（E2E 功能测试）

## 环境要求

- **Node.js** ≥ 18
- **Rust** ≥ 1.77（用于编译 Tauri 后端）
- **Windows 10/11**（主要目标平台）

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动开发模式（桌面应用）
npm run tauri:dev

# 3. 仅启动前端（浏览器预览，无数据库功能）
npm run dev
```

## 常用命令

```bash
npm run tauri:dev      # Tauri 开发模式（含 Rust 后端）
npm run tauri:build    # 构建安装包（NSIS / MSI）
npm run dev            # Vite 前端开发服务器
npm run build          # 前端生产构建
npm run check          # 全量检查（类型 + 代码规范 + 格式 + 单元测试）
npm run test           # Vitest 单元测试
npm run test:e2e       # Playwright E2E 功能测试
npm run lint           # ESLint 检查
npm run format         # Prettier 格式化
```

## 项目结构

```
xiuhua/
├── src/
│   ├── components/      # UI 组件（layout / shared / ui）
│   ├── hooks/           # React 自定义 hooks
│   ├── lib/             # 工具函数、数据库查询、导出/备份
│   │   └── queries/     # SQL 查询函数
│   ├── pages/           # 页面组件
│   │   ├── orders/      # 订单管理（列表/详情/表单）
│   │   ├── customers/   # 客户管理（列表/详情）
│   │   ├── production/  # 生产管理
│   │   ├── finance/     # 收款对账 / 对账单
│   │   └── workers/     # 工人工资 / 出勤
│   ├── types/           # TypeScript 类型定义
│   └── App.tsx          # 应用根组件和路由
├── src-tauri/
│   ├── src/lib.rs       # Tauri 后端逻辑（备份/恢复）
│   └── migrations/      # SQLite 建表迁移脚本
├── __tests__/           # Vitest 单元测试
├── e2e/                 # Playwright E2E 测试
└── package.json
```

## 构建安装包

```bash
npm run tauri:build
```

产出位于 `src-tauri/target/release/bundle/`，包含 NSIS 安装程序（`.exe`）和 MSI 安装包。安装程序语言为简体中文。

## 数据说明

- 数据库文件 `xiuhua.db` 存储在系统 AppData 目录中，所有数据完全保存在本地
- 建议通过"系统设置 → 一键备份"定期导出 `.db` 文件
- 超过 7 天未备份时，应用启动会弹出提醒

## 许可证

私有项目，未开源。
