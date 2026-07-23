# Coffee Talk 入口可见性调整

## 目标

内网入口页只提供一个统一的 Coffee Talk 入口，并移除与右上角站内信重复的通知中心入口。Coffee Talk 二级入口页根据当前账户身份决定是否展示教师处理台，学生账户不应看到教师处理台。

## 页面行为

`/portal/list` 对所有已登录账户只展示一个指向 `/services/coffee-talk` 的 Coffee Talk 入口。原有“我的 Coffee Talk 申请”“申请 Coffee Talk”“Coffee Talk 教师处理台”和“通知中心”入口均从该页面移除。

`/services/coffee-talk` 保留“填写申请意向”和“查看申请状态”。只有身份为教师的账户展示“教师处理台”。教师处理台路由现有的服务端授权与客户端无权限状态保持不变，入口隐藏不替代权限校验。

## 实现边界

将 Coffee Talk 入口列表拆为身份感知的客户端组件，并通过现有 `useAuth` 获取账户身份。门户组件删除不再使用的通知、申请和教师待处理数据查询及计数逻辑。

本次不修改 `convex/`，不修改后端权限，不修改 `package.json`，不新增自动化源码检查，也不进行无关重构。

## 验收

学生登录后，在 `/portal/list` 只看到一个 Coffee Talk 总入口且看不到通知中心；进入 `/services/coffee-talk` 后看不到教师处理台。教师登录后，同样只从门户的统一入口进入 Coffee Talk，并可在二级页看到教师处理台。
