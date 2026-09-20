# Tools Documentation

本文档记录了 tongclass.ac.cn 项目中使用到的工具和库。

---

## 前端工具

### 1. UI 组件库

#### Shadcn/UI
基于 Radix UI 的可定制组件库，提供高质量的 React 组件。

**使用方式**:
```bash
npx shadcn-ui@latest add button
```

**组件文件位置**: `src/components/ui/`

**已实现组件**:
- Button - 按钮组件
- Card - 卡片组件
- Input - 输入框组件
- Sheet - 侧边栏组件
- DropdownMenu - 下拉菜单组件

---

### 2. 样式工具

#### Tailwind CSS
Utility-first CSS 框架

**配置文件**: `tailwind.config.ts`

**自定义设计系统**:
- 颜色系统 (Yale Blue 主色调)
- 字体系统
- 间距系统
- 阴影系统

**样式文件**: `src/styles/globals.css`

---

#### class-variance-authority (cva)
用于创建类型安全的组件变体

**使用示例**:
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border border-input bg-background",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
      },
    },
  }
)
```

---

#### clsx & tailwind-merge
用于合并 CSS 类名

**使用示例**:
```typescript
import { cn } from "@/lib/utils"

function Card({ className }) {
  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      // ...
    </div>
  )
}
```

---

### 3. 图标库

#### Lucide React
现代、简洁的开源图标库

**使用示例**:
```typescript
import { Search, User, Menu } from "lucide-react"

<Search className="h-4 w-4" />
```

---

### 4. 表单与数据处理

#### Zod
TypeScript 优先的 schema 验证库

**使用示例**:
```typescript
import { z } from "zod"

const UserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  role: z.enum(["member", "admin", "super_admin"]),
})
```

---

### 5. 日期处理

#### date-fns
现代日期处理库

**使用示例**:
```typescript
import { format, formatDistanceToNow } from "date-fns"

format(new Date(), "yyyy-MM-dd")
formatDistanceToNow(new Date(), { addSuffix: true })
```

---

### 6. Markdown 处理

#### react-markdown
React Markdown 渲染器

**使用示例**:
```typescript
import ReactMarkdown from "react-markdown"

<ReactMarkdown>{content}</ReactMarkdown>
```

---

#### @uiw/react-md-editor
Markdown 编辑器 (带预览)

**使用示例**:
```typescript
import MDEditor from "@uiw/react-md-editor"

<MDEditor value={content} onChange={setContent} />
```

---

### 7. 日历组件

#### react-big-calendar
React 日历组件

**使用示例**:
```typescript
import { Calendar } from "react-big-calendar"
import "react-big-calendar/lib/css/react-big-calendar.css"
```

---

#### react-day-picker
日期选择器

**使用示例**:
```typescript
import { DayPicker } from "react-day-picker"
```

---

## 后端工具

### 1. Convex

#### @convex-dev/react
Convex React 集成

**使用示例**:
```typescript
import { useQuery, useMutation } from "@convex-dev/react"

const users = useQuery(api.users.list)
const createUser = useMutation(api.users.create)
```

---

#### @convex-dev/convex-auth
Convex 认证集成

**功能**:
- 邮箱/密码认证
- OAuth (可选)
- Session 管理

---

## 开发工具

### 1. TypeScript
类型安全的 JavaScript 超集

### 2. ESLint + Prettier
代码规范和格式化

### 3. Next.js

---

## 本地开发补充工具

### Local Auth Store

- **文件**: `src/lib/mock-auth.ts`
- **用途**: 在未连接 Convex 后端时提供本地注册/登录/会话能力
- **存储**: 浏览器 `localStorage`
- **配套 Hook**: `src/lib/hooks/use-auth.ts`
React 全栈框架

---

## 设计系统

### 色彩系统 (Yale-inspired)

```typescript
// src/styles/design-system.ts
export const colors = {
  primary: {
    DEFAULT: '#0F4C81', // Yale Blue
    light: '#1E6BA8',
    dark: '#0A3559',
  },
  // ...
}
```

### 字体系统

- **Sans**: Inter (主要字体)
- **Serif**: Playfair Display (标题)
- **Mono**: JetBrains Mono (代码)

---

## 工具创建指南

创建新工具时:

1. 在对应的组件目录创建文件
2. 使用现有的设计系统颜色和样式
3. 遵循组件命名规范
4. 导出类型定义
5. 更新本文档
