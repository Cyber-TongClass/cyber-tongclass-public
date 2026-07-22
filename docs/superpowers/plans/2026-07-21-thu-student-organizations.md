# 清华通班学生组织展示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在关于页面展示清华通班学生组织，并提供可访问的科研信息折叠区。

**Architecture:** 在现有客户端 `AboutPage` 中用静态对象数组映射清华组织与科研卡片；用 React 状态控制折叠区。以 Node 静态检查脚本验证页面源代码包含完整内容与可访问性交互标记。

**Tech Stack:** Next.js App Router、React、TypeScript、Tailwind CSS、lucide-react、Node.js assert。

---

### Task 1: 为清华组织内容写失败检查

**Files:**
- Create: `scripts/test-thu-student-organizations.mjs`
- Test: `scripts/test-thu-student-organizations.mjs`

- [x] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync("src/app/about/page.tsx", "utf8")

for (const expected of [
  "通班文化建设委员会",
  "通班信息网络技术委员会",
  "清华通班学生组织的统筹与执行机构",
  "通班学术发展与科研实践",
  "通班科研成果",
  "通班小班主任制度",
  "aria-expanded",
  "ChevronDown",
]) {
  assert.ok(source.includes(expected), `Missing ${expected}`)
}

console.log("THU student organizations source checks passed")
```

- [x] **Step 2: Run test to verify it fails**

Run: `node scripts/test-thu-student-organizations.mjs`

Expected: `AssertionError` for missing 清华通班组织内容.

### Task 2: 添加清华组织卡片与折叠科研区

**Files:**
- Modify: `src/app/about/page.tsx:3-12, 14-15, 288-289`

- [x] **Step 1: Add imports and state**

```tsx
import { ChevronDown, /* existing icons */ } from "lucide-react"
import { useState } from "react"

const [isThuResearchOpen, setIsThuResearchOpen] = useState(false)
```

- [x] **Step 2: Add static content arrays and map them to cards**

```tsx
const thuDepartments = [
  {
    title: "通班文化建设委员会",
    desc: "班级文化建设与集体认同凝聚的重要力量，负责组织通班同学开展文体活动、学术交流与班级文化产品设计，营造积极向上、团结协作的班级氛围。",
    items: ["组织新生班会、破冰活动与班委选拔", "策划春游、体育联谊赛、清北通班联合团建等活动", "设计班级 LOGO、班服、鼠标垫等文创产品", "组织师生餐叙交流，促进师生深入沟通", "打造具有清华通班特色的文化品牌与集体记忆"],
  },
  {
    title: "通班信息网络技术委员会",
    desc: "班级数字平台与科研技术支持的核心部门，负责官方网站、公众号、服务器与学生账号等信息化资源的维护管理，为同学们的科研学习和信息交流提供稳定可靠的技术保障。",
    items: ["维护和更新清华通班官方网站与公众号", "管理清华通班服务器及学生账号", "支撑同学们科研学习中的算力与信息化需求", "建设班级数字平台，服务学术发展与日常交流", "保障班级信息发布与技术资源运行稳定"],
  },
  {
    title: "通班顾问委员会",
    desc: "由高年级同学和优秀毕业生组成的经验支持力量，为班级建设、学业发展、科研实践与活动组织提供建议和传承支持。",
    items: ["为班级组织建设提供经验传承", "为低年级同学提供学业、科研与发展建议", "支持小班主任制度与新生培养工作", "协助推动清华通班自治体系持续完善"],
  },
]
```

Use the existing `grid md:grid-cols-[1fr_2fr]` and secondary two-column-card styling. Add a native `button` with `aria-expanded={isThuResearchOpen}` and a `ChevronDown` whose class conditionally adds `rotate-180`; render three research cards only when state is open.

- [x] **Step 3: Run source test to verify it passes**

Run: `node scripts/test-thu-student-organizations.mjs`

Expected: `THU student organizations source checks passed`.

### Task 3: Verify formatting and lint

**Files:**
- Test: `scripts/test-thu-student-organizations.mjs`

- [x] **Step 1: Check whitespace errors**

Run: `git diff --check -- src/app/about/page.tsx scripts/test-thu-student-organizations.mjs`

Expected: no output.

- [x] **Step 2: Run behavior source test and project lint**

Run: `node scripts/test-thu-student-organizations.mjs && npm run lint`

Expected: source check passes and ESLint exits 0.

- [ ] **Step 3: Commit scoped files**

```bash
git add src/app/about/page.tsx scripts/test-thu-student-organizations.mjs docs/superpowers/plans/2026-07-21-thu-student-organizations.md
git commit -m "feat: add thu student organizations"
```
