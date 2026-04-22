# Article Tools

一套轻量、本地运行的在线工具集，专为内容创作者设计。所有工具均在浏览器中运行，无需服务端，可部署在 GitHub Pages。

**在线预览：** https://zhijunio.github.io/article-tools/

## 工具列表

| 工具 | 路径 | 说明 |
|------|------|------|
| 🖼️ 封面生成器 | `/cover/` | 生成文章封面图，支持配色、比例、装饰、字体 |
| 📝 Markdown 排版器 | `/md/` | 微信公众号 Markdown 编辑器，支持主题定制、图片压缩 |
| 🎨 公众号排版工作室 | `/studio/` | 12 种专业风格 + 5 种图片角色，扩展 Markdown 语法 |
| 📱 二维码工具 | `/qrcode/` | 生成与解析二维码，支持文本、链接 |

## 快速开始

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/zhijunio/article-tools.git
cd article-tools

# 启动静态服务（任选其一）
python3 -m http.server 8080
npx serve .
```

浏览器访问 `http://localhost:8080/`。

### 部署到 GitHub Pages

1. Fork 本仓库
2. 在仓库设置中启用 GitHub Pages（Source: `main` 分支）
3. 访问 `https://<your-username>.github.io/article-tools/`

## 工具详解

### 封面生成器

生成文章封面图，支持：
- 多种配色方案
- 自定义文字、副标题
- 装饰元素（线条、形状）
- 字体选择
- 本地保存（PNG 格式）

**路径：** `/cover/index.html`

![封面生成器](docs/cover.png)

### Markdown 排版器

微信公众号 Markdown 编辑器，将 Markdown 转为**带内联样式**的 HTML，便于粘贴到公众号后台。

**核心功能：**
- 5 套内置主题（暖棕书卷、黑白极简、科技蓝调、琥珀橙调、正红宣调）
- 自定义主题，支持 JSON 导入/导出
- 图片粘贴/拖拽、可选压缩、IndexedDB 存储
- 代码高亮（highlight.js）
- 富文本/HTML 智能粘贴（Turndown）
- 编辑区与预览区滚动同步

**路径：** `/md/index.html`

**详细说明：** [md/README.md](md/README.md)

![Markdown 排版器](docs/md.png)

### 公众号排版工作室（V6）

把任何文本内容变成精美的公众号文章排版。

**核心功能：**
- **12 种专业风格**：经典 4 种 + 专业 4 种 + 创意 4 种
- **5 种图片角色**：封面 / 配图 / 引用 / 双图 / 三图
- **版式元素**：导语、提示框（4 类）、金句、表格、落款
- **图片占位卡槽**：复制到公众号后，点击图片即可替换
- **品牌色定制**：一键覆盖任何风格的点缀色

**扩展语法：**
```markdown
>>> 导语段落

!!! tip 小贴士
提示内容
!!!

‖ 这里是金句 ‖

![[1|cover]]        封面图
![[1,2]]            双图并排

--- 作者：xxx / 公众号：xxx     落款
```

**路径：** `/studio/index.html`

**详细说明：** [studio/README.md](studio/README.md)


![公众号排版工作室](docs/studio.png)

### 二维码工具

生成与解析二维码，纯本地处理，无需联网。

**支持格式：**
- 文本
- 链接
- 图片（上传生成）

**路径：** `/qrcode/index.html`

## 技术特点

| 特性 | 说明 |
|------|------|
| **零构建** | 无 npm、无打包，直接运行 |
| **纯前端** | 所有工具在浏览器中运行 |
| **CDN 依赖** | 第三方库从 jsDelivr 加载 |
| **IndexedDB** | 图片等大数据本地存储 |
| **GitHub Pages** | 一键部署到静态托管 |

## 浏览器支持

- Chrome / Edge（推荐）
- Firefox
- Safari

## 参考项目

- https://github.com/eternityspring/article-tools
- https://github.com/alchaincyf/huasheng_editor
- https://gordensun.github.io/WX/

## License

[MIT](LICENSE)
