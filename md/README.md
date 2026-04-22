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
| `index.css` | 布局与工具栏、预览框等界面样式 |
| `index.js` | 编辑、主题、存储、复制、粘贴、滚动同步等逻辑 |
| `index.presets.js` | `PRESETS`（各元素样式预设）、`THEMES`（全套主题配置） |
| `index.renderer.js` | `renderMarkdown`：Markdown → 内联样式 HTML |
| `sample.md` | 默认示例文章（需 HTTP 服务加载） |
| `CHANGELOG.md` | 本目录实现说明与变更记录 |

## 内置主题（`THEMES` 键名）

每套主题在 `index.presets.js` 中含 `name` 与 `desc`（适用场景说明）；**预览区域**栏头右侧会显示当前 `desc`，顶栏主题选项悬停可看完整 `title`。

| 键名 | 展示名 | 适用场景（`desc` 摘要） |
|------|--------|-------------------------|
| `shujuan` | 暖棕书卷 | 读书、专栏、文化长文；衬线暖棕、纸感 |
| `jijian` | 黑白极简 | 通知、声明、政策与商务；高对比信息向 |
| `keji` | 科技蓝调 | 产品更新、教程、互联网/开发向 |
| `hupo` | 琥珀橙调 | 生活、情感、故事与亲子；暖橙活泼 |
| `zhenghong` | 正红宣调 | 节庆、党建、品牌与重要公告；正红庄重 |

## 功能要点

- 实时预览（手机宽度预览区）、**复制到公众号** / **复制 HTML 源码**
- 多主题与细粒度样式调节；**自定义主题**、JSON 导入/导出
- 图片粘贴/拖拽、可选压缩、IndexedDB 存图；文中 `img://` 占位
- 代码高亮（highlight.js）、富文本/ HTML 智能粘贴（Turndown，剪贴板已为 Markdown 源码时优先纯文本）
- 编辑区与预览区**滚动同步**；随机配色 / 随机样式；草稿 `localStorage` 持久化（键名见 `CHANGELOG.md`）

## 依赖

`marked`、highlight.js、Turndown 等通过 **jsDelivr CDN** 加载，需联网。

## 仓库与部署

本目录为 [article-tools](https://github.com/zhijunio/article-tools) 子项目；整站可部署在 GitHub Pages，本工具线上路径一般为站点下的 `md/` 目录。
