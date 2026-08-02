# AIA 网页字体

供 `.aia-scope`（研究院站点）使用的打包字体，WOFF2 格式，`font-display: swap`。
通班官网（`/tong-class/*`）不引用这些字族，不会触发下载。

| 文件 | 字族 | 字重 | 说明 |
|------|------|------|------|
| `tiempos-headline-*.woff2` | Tiempos Headline | 400 / 600 / 700 | 西文标题衬线（试用版，仅含基本拉丁字符） |
| `fz-dabiaosong.woff2` | FZ DaBiaoSong（方正大标宋简体） | 单字重（映射 100–900） | 中文标题衬线 |
| `alibaba-puhuiti-*.woff2` | Alibaba PuHuiTi 3 | 400 / 500 / 600 / 700 | 正文黑体，已子集化（ASCII + GB2312，约 7.5k 字符） |
| `geist-mono.woff2` | Geist Mono | 100–900 可变 | kicker / 数据等宽 |

## 版权说明

- **Alibaba PuHuiTi 3.0**：阿里巴巴普惠体，官方声明免费商用（含网页嵌入）。
- **Geist Mono**：Vercel 发布，SIL OFL 1.1。
- **方正大标宋 / Tiempos Headline（Test 试用版）**：商业字体，仅限本站授权范围内使用；
  如需对外公开发布或部署到正式域名，请先确认授权或替换为免费替代
  （思源宋体 / Source Serif、站酷小薇体等）。

## 更新方式

字体文件由本地源文件经 fontTools 转换/子集化生成：

```bash
python3 转换脚本（见 git 历史或联系维护者）
```

正文黑体如需支持生僻字（如人名用字超出 GB2312），回退链为系统字体
（PingFang SC / 微软雅黑），视觉上略有差异但可接受；如需全量字库，
重新以完整字符集生成 woff2 即可（单字重约 4.4MB）。
