# Tong Class 新闻旧版样式恢复设计

## 目标

`/tong-class/news` 恢复 `main` 原新闻页的完整蓝色内容区，包括标题搜索、分类筛选、清除筛选、结果数量、按年份和月份分组、蓝色分类标签与白色新闻卡片。

## 方案

新增 Tong Class 专用新闻时间轴组件，沿用现有 `NewsTimelineItem` 数据形状与安全外链处理。Tong Class 新闻页改用专用组件；AIA `/updates` 继续使用现有 `NewsTimeline`，AIA 首页动态模块保持不变。

新闻数据、详情页和发布流程不变。不修改 `convex/`、AIA 页面或 `package.json`。

## 验证

先新增源码契约测试，证明 Tong Class 与 AIA 当前共用组件并产生预期失败。实现后运行该测试、现有 AIA 共享新闻测试、Tong Class 路由测试、完整 ESLint 与 TypeScript 检查，并在浏览器中对比两页视觉。
