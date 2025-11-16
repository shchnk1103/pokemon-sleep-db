# CLAUDE.md

此文件为Claude Code (claude.ai/code)在此代码库中工作时提供指导。

## 项目概述

此代码库包含Pokemon Sleep配套应用程序的完整实现。项目分为两个主要部分：
1. 数据库结构文档：使用Supabase/PostgreSQL构建，包含与Pokemon Sleep游戏中的宝可梦、树果、食材、性格和技能系统相关的表格。
2. 前端应用：使用最新的Next.js 16+、React 19、TypeScript和Tailwind CSS构建的现代化Web应用。

## MCP 运用

- 读取或者操作文件时，积极使用 filesystem MCP。
- 在编写代码前使用 context7 MCP 查阅对应文档之后参考官网的最佳实践。
- 操作 Supabase 数据库时使用 Supabase MCP。
- 对于项目管理，积极使用 GitHub MCP

## 数据库架构

数据库由9个主要表格组成，具有以下关系：

1. **berries** - 包含游戏中不同树果的信息，包括属性、能量范围和图片。
2. **ingredients** - 存储烹饪食材的信息，包括能量值、价格和图片。
3. **natures** - 包含宝可梦性格效果，具有增益/减益属性修饰符。
4. **pokemon_dex** - 主要的宝可梦图鉴表，包含名称、属性、专长和主要技能。
5. **pokemon_instances** - 玩家拥有的单独宝可梦实例，具有个性化统计信息。
6. **pokemon_ingredient_unlocks** - 跟踪不同等级(1, 30, 60)解锁的食材。
7. **pokemon_ingredient_unlocks_details** - 每个等级解锁的具体食材详情。
8. **main_skills** - 主要技能信息。
9. **sub_skills** - 副技能信息。

### 关键关系

- `pokemon_dex.default_berry_id` 引用 `berries.id`
- `pokemon_instances.dex_id` 引用 `pokemon_dex.id`
- `pokemon_ingredient_unlocks.dex_id` 引用 `pokemon_dex.id`
- `pokemon_ingredient_unlocks_details.ingredient_id` 引用 `ingredients.id`

## 开发环境

根据在`.claude/settings.local.json`中找到的配置，此项目启用了Supabase集成，表明使用Supabase进行数据库操作。

## 前端应用架构

前端应用位于 `pokemonsleep-nextjs` 目录中，使用Next.js 16+、React 19、TypeScript和Tailwind CSS构建。

### 目录结构
- `app/` - 使用App Router的页面和布局
  - `layout.tsx` - 根布局组件
  - `page.tsx` - 主页组件
  - `globals.css` - 全局样式文件
- `public/` - 静态资源目录
- `package.json` - 项目依赖和脚本
- `tsconfig.json` - TypeScript配置
- `eslint.config.mjs` - ESLint配置
- `next.config.ts` - Next.js配置
- `postcss.config.mjs` - PostCSS配置

### 技术栈
- **Next.js 16+** - React框架，提供SSR、SSG等功能
- **React 19** - UI库
- **TypeScript** - 类型安全
- **Tailwind CSS v4** - CSS框架
- **pnpm** - 包管理器
- **ESLint** - 代码质量检查

## 开发命令

### 数据库操作
- 使用Supabase CLI进行本地开发: `supabase start`
- 推送模式更改: `supabase db push`
- 拉取远程模式: `supabase db pull`
- 运行数据库迁移: `supabase db reset`

### 前端应用开发
- 启动开发服务器: `cd pokemonsleep-nextjs && pnpm dev`
- 构建生产版本: `cd pokemonsleep-nextjs && pnpm build`
- 运行生产服务器: `cd pokemonsleep-nextjs && pnpm start`
- 运行ESLint检查: `cd pokemonsleep-nextjs && pnpm lint`

### 文档管理
- 在对表进行更改时更新数据库模式文档
- 保持实际模式与Pokemon_Sleep_Database_Structure_Documentation.md中的文档一致性
- 在修改表结构时记录外键关系
