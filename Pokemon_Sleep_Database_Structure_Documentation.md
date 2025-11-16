# 精灵宝可梦Sleep项目 - 数据库结构文档

## 概述

该文档描述了精灵宝可梦Sleep配套应用程序的数据库结构。数据库包含有关宝可梦、树果、食材、性格及其关系的信息，使用Supabase/PostgreSQL。

## 数据库模式

### 1. berries表（树果表）
**描述**: 包含精灵宝可梦Sleep中不同树果的信息
- **主键**: `id` (UUID)
- **外键**: 被`pokemon_dex.default_berry_id`引用

| 列名 | 类型 | 可空 | 默认值 | 描述 |
|------|------|------|--------|------|
| id | UUID | 否 | gen_random_uuid() | UUID主键 |
| berry_id | Text | 否 | - | 原始树果ID（如berry_001） |
| name | Text | 否 | - | 树果名称 |
| attribute | Text | 否 | - | 树果属性（如NORMAL, FIRE, WATER等） |
| image_url | Text | 是 | - | 树果图片路径 |
| energy_min | Integer | 是 | - | 最小能量值 |
| energy_max | Integer | 是 | - | 最大能量值 |
| created_at | Timestamp | 是 | now() | 创建时间 |
| updated_at | Timestamp | 是 | now() | 更新时间 |
| chinese_name | Text | 是 | - | 树果的中文名称 |

**示例数据**:
- berry_001: "Persim Berry" (柿仔果), NORMAL属性, 能量28-323
- berry_002: "Leppa Berry" (苹野果), FIRE属性, 能量27-311
- berry_003: "Oran Berry" (橙橙果), WATER属性, 能量31-357

### 2. ingredients表（食材表）
**描述**: 包含精灵宝可梦Sleep中不同食材的信息
- **主键**: `id` (UUID)

| 列名 | 类型 | 可空 | 默认值 | 描述 |
|------|------|------|--------|------|
| id | UUID | 否 | gen_random_uuid() | UUID主键 |
| ingredients_id | Text | 否 | - | 原始食材ID（如ingredient_001） |
| name | Text | 否 | - | 食材名称 (中文) |
| energy | Integer | 否 | - | 食材能量值 |
| image_url | Text | 否 | - | 食材图片路径 |
| price | Integer | 否 | - | 食材价格 |
| created_at | Timestamp | 是 | now() | 创建时间 |
| updated_at | Timestamp | 是 | now() | 更新时间 |

**示例数据**:
- ingredient_001: "粗枝大葱", 能量185, 价格7
- ingredient_002: "品鲜蘑菇", 能量167, 价格7
- ingredient_003: "特选蛋", 能量115, 价格5

### 3. natures表（性格表）
**描述**: 包含宝可梦性格及其效果的信息
- **主键**: `id` (UUID)

| 列名 | 类型 | 可空 | 默认值 | 描述 |
|------|------|------|--------|------|
| id | UUID | 否 | gen_random_uuid() | UUID主键 |
| name | Text | 否 | - | 性格名称 |
| beneficial_attribute | Text | 是 | - | 增益属性名称 |
| beneficial_value | Numeric | 是 | - | 增益值（如0.1表示+10%） |
| detrimental_attribute | Text | 是 | - | 减益属性名称 |
| detrimental_value | Numeric | 是 | - | 减益值（如-0.075表示-7.5%） |
| created_at | Timestamp | 是 | now() | 创建时间 |
| updated_at | Timestamp | 是 | now() | 更新时间 |

**示例数据**:
- "Relaxed": 增益活力回复+20%, 减益EXP获得量-18%
- "Bold": 增益活力回复+20%, 减益帮忙速度-7.5%
- "Lax": 增益活力回复+20%, 减益主技能几率-20%

### 4. pokemon_dex表（宝可梦图鉴表）
**描述**: 包含图鉴中宝可梦的基本信息
- **主键**: `id` (UUID)
- **外键**: 引用`berries.id`通过`default_berry_id`

| 列名 | 类型 | 可空 | 默认值 | 描述 |
|------|------|------|--------|------|
| id | UUID | 否 | gen_random_uuid() | UUID主键 |
| name | Text | 否 | - | 宝可梦名称 |
| attribute_type | Text | 否 | - | 属性类型 |
| specialty | Text | 否 | - | 专长 |
| main_skill | Text | 否 | - | 主技能 |
| base_berry_count | Integer | 是 | 1 | 基础树果数量 |
| created_at | Timestamp | 是 | now() | 创建时间 |
| updated_at | Timestamp | 是 | now() | 更新时间 |
| image_url | Text | 是 | - | 宝可梦图片地址 |
| default_berry_id | UUID | 是 | - | 关联树果表的外键，表示宝可梦的默认树果 |
| pokemon_id | Text | 是 | - | 存储原始宝可梦ID，与samplePokemonDex中的ID对应 |

**外键关系**:
- `default_berry_id` → `berries.id`
- 被`pokemon_instances.dex_id`引用
- 被`pokemon_ingredient_unlocks.dex_id`引用

### 5. pokemon_instances表（宝可梦个体表）
**描述**: 包含个体宝可梦实例（玩家拥有的具体宝可梦）
- **主键**: `id` (UUID)
- **外键**: 引用`pokemon_dex.id`通过`dex_id`

| 列名 | 类型 | 可空 | 默认值 | 描述 |
|------|------|------|--------|------|
| id | UUID | 否 | gen_random_uuid() | UUID主键 |
| dex_id | UUID | 否 | - | 关联图鉴表的外键 |
| nature | Text | 否 | - | 性格 |
| level | Integer | 否 | 1 | 等级 |
| gender | Text | 否 | - | 性别 |
| sub_skills | Text | 否 | - | 副技能数组 |
| berry_count | Integer | 是 | 1 | 树果数量 |
| collected_ingredients | Text | 是 | - | 已收集的食材 |
| met_date | Timestamp | 是 | - | 相遇日期 |
| met_camp | Text | 是 | - | 相遇营地 |
| sleep_time | Integer | 是 | 0 | 睡觉时间 |
| helping_speed | Numeric | 否 | - | 帮忙速度 |
| owner_id | Text | 是 | - | 训练家ID |
| created_at | Timestamp | 是 | now() | 创建时间 |
| updated_at | Timestamp | 是 | now() | 更新时间 |

### 6. pokemon_ingredient_unlocks表（宝可梦食材解锁表）
**描述**: 跟踪每个宝可梦在不同等级解锁的食材
- **主键**: `id` (UUID)
- **外键**: 引用`pokemon_dex.id`通过`dex_id`

| 列名 | 类型 | 可空 | 默认值 | 描述 |
|------|------|------|--------|------|
| id | UUID | 否 | gen_random_uuid() | - |
| dex_id | UUID | 否 | - | 关联到pokemon_dex表的宝可梦图鉴ID |
| level_threshold | Integer | 否 | - | 等级阈值（如1、30、60） |
| unlock_type | Text | 否 | - | 解锁类型（如level_1、level_30、level_60） |
| created_at | Timestamp | 是 | now() | 创建时间 |
| updated_at | Timestamp | 是 | now() | 更新时间 |

**外键关系**:
- `dex_id` → `pokemon_dex.id`
- 被`pokemon_ingredient_unlocks_details.unlock_id`引用

### 7. pokemon_ingredient_unlocks_details表（宝可梦食材解锁详情表）
**描述**: 包含在每个等级解锁的具体食材和数量
- **主键**: `id` (UUID)
- **外键**: 引用`pokemon_ingredient_unlocks.id`和`ingredients.id`

| 列名 | 类型 | 可空 | 默认值 | 描述 |
|------|------|------|--------|------|
| id | UUID | 否 | gen_random_uuid() | - |
| unlock_id | UUID | 否 | - | 关联到pokemon_ingredient_unlocks表的ID |
| ingredient_id | UUID | 否 | - | 关联到ingredients表的ID |
| quantity | Integer | 否 | 1 | 该食材的解锁数量 |
| created_at | Timestamp | 是 | now() | 创建时间 |

**外键关系**:
- `unlock_id` → `pokemon_ingredient_unlocks.id`
- `ingredient_id` → `ingredients.id`

### 8. main_skills表（主技能表）
**描述**: 包含主技能的信息

| 列名 | 类型 | 可空 | 默认值 | 描述 |
|------|------|------|--------|------|
| id | UUID | 否 | gen_random_uuid() | - |
| name | Text | 否 | - | - |
| description | Text | 是 | - | - |
| effect_type | Text | 否 | - | - |
| power_level | Integer | 是 | 1 | - |
| cooldown | Integer | 是 | 0 | - |
| created_at | Timestamp | 否 | now() | - |
| updated_at | Timestamp | 否 | now() | - |

### 9. sub_skills表（副技能表）
**描述**: 包含副技能的信息

| 列名 | 类型 | 可空 | 默认值 | 描述 |
|------|------|------|--------|------|
| id | UUID | 否 | gen_random_uuid() | - |
| name | Text | 否 | - | - |
| description | Text | 是 | - | - |
| effect_type | Text | 否 | - | - |
| power_level | Integer | 是 | 1 | - |
| created_at | Timestamp | 否 | now() | - |
| updated_at | Timestamp | 否 | now() | - |

## 数据关系

数据库使用多个外键关系来连接相关数据:

1. **宝可梦到树果**: `pokemon_dex.default_berry_id` → `berries.id`
2. **宝可梦实例到图鉴**: `pokemon_instances.dex_id` → `pokemon_dex.id`
3. **宝可梦解锁进度**: `pokemon_ingredient_unlocks.dex_id` → `pokemon_dex.id`
4. **解锁详情中的食材**: `pokemon_ingredient_unlocks_details.ingredient_id` → `ingredients.id`
5. **解锁详情到解锁记录**: `pokemon_ingredient_unlocks_details.unlock_id` → `pokemon_ingredient_unlocks.id`

## 主要特性

1. **树果系统**: 18种不同树果，具有属性、能量范围和中文名称
2. **食材系统**: 19种不同食材，具有能量值、价格和图片
3. **性格系统**: 25种宝可梦性格，具有有益/有害效果
4. **等级解锁系统**: 食材在等级1、30和60时解锁
5. **宝可梦收藏**: 个体宝可梦实例，具有个性化属性
6. **图鉴系统**: 完整的宝可梦数据库，包含图片和属性

