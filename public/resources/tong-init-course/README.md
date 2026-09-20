# ToNG 通班人工智能科研先导课资料

本目录保存 `/resources/tong-init-course` 的历史静态课件和练习包，仅用于兼容与回退。

当前资源：

- `slides-lec0.pdf`：第 0 讲课件。
- `slides-lec1.pdf`：第 1 讲课件。
- `slides-lec2.pdf`：第 2 讲课件。
- `slides-lec3.pdf`：第 3 讲课件。
- `terminal-adventure.zip`：第 3 讲终端探险练习包。

新资源、替换版本和归档操作统一在 `/admin/resources/tong-init-course` 完成。文件由浏览器直接上传到私有 Cloudflare R2，保存为草稿后由管理员手动发布；不需要把课件提交到 Git，也不需要为更新资源 push 网站仓库。

`src/lib/resources/tong-init-course.ts` 中的 `tongAiResearchCourseResources` 只描述上述历史静态项。后台的“初始化现有资源”操作会幂等地登记它们；归档后的静态项也不会因兼容回退而重新出现。

不要再向本目录添加新课件。若需要移除历史文件，应先确认线上已发布对应的 R2 版本。
