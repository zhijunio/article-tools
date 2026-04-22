# Markdown 编辑器（公众号排版）

将 Markdown 转为**带内联样式**的 HTML，便于粘贴到微信公众号后台；支持主题、自定义样式、图片压缩与本地缓存。

## 使用方式

- **推荐**：在本目录启动静态服务后，用 **http://** 打开（否则无法 `fetch` 同目录的示例 `sample.md`）。

```bash
cd md
python3 -m http.server 8080
```

浏览器访问 `http://127.0.0.1:8080/` 或 `http://127.0.0.1:8080/index.html`。

- 直接 **file://** 打开时，示例文会回退到内置短文案；也可在 `index.html` 中按需加入 `<script type="text/plain" id="editor-sample-md">` 作为第二数据源（勿在内容中出现字面量 `</script>`）。

## 目录与职责

| 文件 | 说明 |
|------|------|
| `index.html` | 页面结构、脚本引用 |
| `index.css` | 布局与编辑区顶栏工具栏、预览框等界面样式 |
| `index.js` | 编辑、主题、存储、复制、粘贴、滚动同步等逻辑 |
| `index.presets.js` | `PRESETS`（各元素样式预设）、`THEMES`（全套主题配置） |
| `index.renderer.js` | `renderMarkdown`：Markdown → 内联样式 HTML |
| `sample.md` | 默认示例文章（需 HTTP 服务加载） |
| `CHANGELOG.md` | 本目录实现说明与变更记录 |

## 内置主题（`THEMES` 键名）

每套主题在 `index.presets.js` 中含 `name` 与 `desc`（适用场景说明）；**预览区域**栏头右侧会显示当前 `desc`，顶栏色点悬停显示主题名（`title`）。

| 键名 | 展示名 | 适用场景（`desc` 摘要） |
|------|--------|-------------------------|
| `youya` | 优雅蓝 | 默认主题，理性蓝调；适合产品、技术、资讯与通用长文 |
| `qingxin` | 清新绿 | 清爽绿色，接近微信阅读感；适合生活服务、轻阅读与日常分享 |
| `wennuan` | 温暖橙 | 暖橙衬线，阅读氛围松弛；适合故事、情感、亲子与生活向内容 |
| `shensui` | 深邃紫 | 紫调沉稳有层次；适合品牌风、课程、知识付费与深度长文 |
| `jingdian` | 经典红 | 经典中国红与衬线气质；适合节庆、文化、政务与品牌红色调 |
| `jijian` | 极简黑 | 黑白灰极简，弱装饰强信息；适合公告、声明、条例与高密度正文 |

## 功能要点

- 编辑器 **顶栏工具栏**：加粗/斜体/删除线/行内代码/链接、代码块与引用、**水平分割线**与 **GFM 三列表格**插入、标题（H1～H4/正文）、缩进；与全键盘快捷键共用同一套插入/切换逻辑
- 编辑器 **全键盘快捷键**（`Ctrl/⌘` 与 `Ctrl/⌘+Alt` 等，顶栏「快捷键说明」与 `index.js` 中 `HOTKEY_HELP`）
- 实时预览、**复制到公众号** / **复制 HTML 源码**
- 多主题与细粒度样式调节；**自定义主题**、JSON 导入/导出
- 图片粘贴/拖拽、可选压缩、IndexedDB 存图；文中 `img://` 占位
- 代码高亮（highlight.js）、富文本/ HTML 智能粘贴（Turndown，剪贴板已为 Markdown 源码时优先纯文本）
- 编辑区与预览区**滚动同步**；随机配色 / 随机样式；草稿 `localStorage` 持久化（键名见 `CHANGELOG.md`）

## 依赖

`marked`、highlight.js、Turndown 等通过 **jsDelivr CDN** 加载，需联网。

## 仓库与部署

本目录为 [article-tools](https://github.com/zhijunio/article-tools) 子项目；整站可部署在 GitHub Pages，本工具线上路径一般为站点下的 `md/` 目录。
