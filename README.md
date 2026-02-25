# PokeSleep Lab

一个基于 **Pokemon Sleep** 的前端工具站，包含图鉴浏览、数据展示、主题切换与交互式检索。

## 功能概览

- 宝可梦图鉴
  - Supabase 真实数据加载
  - 普通/闪光双态切换（含预取与加载反馈）
  - ID/名称/技能/食材搜索与相关性排序
  - 动态分页加载
- 扩展图鉴
  - 树果图鉴
  - 食材图鉴
  - 主技能图鉴
  - 副技能图鉴（按 `effect_type` 着色）
- 全局主题系统
  - 浅色 / 深色 / 跟随系统（三态）
- 全局消息系统
  - 基于 Zustand 的右下角 Toast 反馈

## 技术栈

- Bun（包管理 + 脚本执行）
- Vite + React + TypeScript
- React Router
- Zustand
- Supabase（REST + Storage）

## 快速开始

### 1) 安装依赖

```bash
bun install
```

### 2) 配置环境变量

复制示例文件并填写：

```bash
cp .env.example .env.local
```

`.env.local` 至少需要：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 3) 启动开发环境

```bash
bun run dev
```

默认地址：`http://localhost:5173`

## 常用脚本

```bash
bun run dev      # 启动开发服务器
bun run build    # TypeScript + 生产构建
bun run preview  # 本地预览构建产物
bun run lint     # 运行 ESLint
```

## 项目结构

```text
src/
  app/            # 应用壳、路由、导航
  components/     # 通用组件（主题切换、全局消息等）
  hooks/          # 主题等自定义 hooks
  pages/          # 页面（首页、图鉴、关于）
  services/       # Supabase 数据访问与缓存逻辑
  stores/         # Zustand 状态管理
  styles/         # 全局样式
  types/          # 类型定义
```

## 部署建议

- 建议部署到 Vercel / Netlify
- 确保线上环境变量与 `.env.local` 对齐
- 若使用自定义域名，注意 Supabase CORS 白名单配置

## 说明

本仓库目前聚焦前端体验与图鉴数据消费层；如需数据抓取、清洗和入库，请在独立数据仓库维护。
