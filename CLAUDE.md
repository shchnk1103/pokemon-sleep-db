# CLAUDE.md

此文件为Claude Code (claude.ai/code)在此代码库中工作时提供指导。

## 项目概述

此代码库包含Pokemon Sleep配套应用程序的数据库结构文档。数据库使用Supabase/PostgreSQL构建，包含与Pokemon Sleep游戏中的宝可梦、树果、食材、性格和技能系统相关的表格。使用最新的 NextJS + typescript 来展示所有的信息，样式部分使用Sass。

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

## 开发命令

此代码库主要包含数据库文档，因此典型的开发工作流程包括：

### 数据库操作
- 使用Supabase CLI进行本地开发: `supabase start`
- 推送模式更改: `supabase db push`
- 拉取远程模式: `supabase db pull`
- 运行数据库迁移: `supabase db reset`

### 文档管理
- 在对表进行更改时更新数据库模式文档
- 保持实际模式与Pokemon_Sleep_Database_Structure_Documentation.md中的文档一致性
- 在修改表结构时记录外键关系
