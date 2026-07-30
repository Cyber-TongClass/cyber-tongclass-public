# Tong Class 学术成果旧版样式恢复设计

## 背景

`newnew` 分支中的 `/tong-class/publications` 与 `/research` 当前都使用 `PublicationArchive`，因此两页的筛选栏、分组和论文卡片采用同一套研究院视觉。虽然研究院研究页中的本科生成果与 Tong Class 学术成果来自相同的公开论文数据，但两个站点区域需要保持不同的视觉语言。

## 目标

`/tong-class/publications` 的内容区恢复 `main` 分支原 `/publications` 页面使用的 Tong Class 旧版样式和交互，包括搜索、成果类型筛选、领域筛选、排序、结果数量、按年份分组、蓝色会议标签和紧凑论文卡片。

页面现有 Tong Class 页头保持不变。论文详情链接继续指向 `/tong-class/publications/[id]`。文章来源与数据查询保持不变，不复制、迁移或修改论文数据。

`/research` 保持当前研究院样式、受众标签和数据加载行为，不做视觉或功能调整。

## 方案

新增一个仅供 Tong Class 使用的论文归档组件。该组件沿用现有 `PublicationArchiveItem` 数据形状，但独立实现 `main` 旧版的筛选、排序、年份分组和卡片视觉。`/tong-class/publications` 改用该组件；研究院 `/research` 继续使用现有 `PublicationArchive`。

不在共享研究院组件上增加样式分支，避免 Tong Class 与研究院视觉继续耦合。也不把完整列表实现直接内联回页面，以保持页面负责数据映射、组件负责展示与交互的边界。

## 数据流

`/tong-class/publications` 继续通过 `usePublications({ limit: 100 })` 获取数据，并映射为 `PublicationArchiveItem`。映射后的数据传入 Tong Class 专用归档组件，由组件在客户端完成搜索、筛选、排序和年份分组。

外部项目链接继续经过安全 URL 处理；作者显示继续复用 `PublicationAuthorsList` 与既有作者名称规范化逻辑。

## 状态与边界情况

加载期间显示与现有实现一致的安全空状态，不抛出错误。筛选无结果时显示旧版“未找到相关成果”提示。空分类按既有组件约定显示为“未分类”。`arXiv preprint` 继续作为 Preprint 判断条件。清除筛选会恢复已发表论文、全部领域和空搜索词。

## 测试与验证

先新增一个源码契约回归测试，断言 Tong Class 页面使用专用组件、研究院页面继续使用 `PublicationArchive`，并确认测试在实现前因组件尚不存在或页面仍使用共享组件而失败。

实现后重新运行该回归测试，并运行与共享论文页面相关的现有测试。最后运行完整 `npm run lint`。不修改 `package.json` 脚本，不修改 `convex/`，不进行数据库或生产环境操作。

## 非目标

本次不调整 `/research` 的样式、受众筛选或加载更多逻辑；不修改论文详情页；不改变论文 API、Convex 后端、数据归属或本科生成果的发布流程；不进行无关重构。
