# Eazy Share

## 中文

### 这是什么

`Eazy Share` 是一个浏览器扩展，用来把任意网页上的长文章、长页面、文档内容，快速整理成适合分享的图片。

它特别适合下面这类内容：

- 文章很长，别人不愿意点链接慢慢看
- 页面排版复杂，不适合直接转发链接
- 内容在社交平台里更适合“先看到核心内容，再决定是否深入阅读”
- 需要把原网页内容整理成单张长图或多张分图，方便发到朋友圈、微信群、社群、微博、小红书等场景

### 这个仓库解决什么问题

很多网页内容并不适合只发一个链接。

用户看到链接时，往往不会立刻点开，也无法快速理解文章内容。  
`Eazy Share` 的目标是把网页内容直接变成可读、可分享的图片，让别人第一眼就能看到文章本身，而不是先跳转。

同时，如果读者想继续阅读原文，还可以直接扫描图片中的二维码，回到原网页查看全文。

### 核心用途

- 把任意网站上的文章截图为长图
- 把长图自动切成多张适合分享的图片
- 支持自定义左右/上下边界，裁掉无关区域
- 支持在图片末尾附加二维码，方便扫码查看原文
- 适合“内容优先”的分享方式，而不是“链接优先”的分享方式

### 适合谁

- 内容创作者
- 运营和编辑
- 需要整理网页资料的人
- 想把文章内容快速转成图片分享的人

### 当前功能

- 全页截图
- 自定义左右边界、上下边界
- 单张长图导出
- 自动切分为 `3 / 4 / 6 / 9` 张图片
- 可选二维码页脚
- 中英文界面切换
- 可选输出清晰度

### 使用方式

1. 打开 `chrome://extensions`
2. 打开 **Developer mode**
3. 点击 **Load unpacked**
4. 选择 `src/extension`
5. 打开任意网页文章
6. 点击扩展图标
7. 如果需要，设置左/右/上/下边界
8. 选择导出模式和清晰度
9. 如果需要，填写原网页链接并启用二维码
10. 点击 **Capture & Export**

导出的文件默认保存在：

```text
Downloads/longshot/
```

### 开发

运行测试：

```bash
npm test
```

### 当前状态

这是一个仍在持续迭代的 MVP。

在复杂网页上，以下情况仍可能存在：

- 固定头部或浮层带来的拼接误差
- 懒加载内容导致的边界不稳定
- 极长页面在切分时需要人工微调

---

## English

### What This Repository Is For

`Eazy Share` is a browser extension for turning long web articles and long-form pages into shareable images.

It is especially useful for content that does **not** work well as a plain link.

Typical examples:

- the article is too long, so people are unlikely to click through immediately
- the page layout is too heavy or distracting for link-first sharing
- you want readers to see the content first, then decide whether to open the source page
- you need a clean image version of a webpage for social sharing

### Problem It Solves

Many web pages are not easy to share effectively with just a URL.

When people see a link, they often skip it or delay opening it.  
`Eazy Share` converts the page itself into readable images, so readers can understand the content immediately.

If they want to continue reading, they can scan the QR code in the exported image and open the original webpage.

### Main Use Case

- capture long articles from any website
- convert them into a single long image or multiple split images
- crop unnecessary left/right/top/bottom areas
- attach a QR code footer that links back to the source page
- make web content easier to preview and share in image-first channels

### Who It Is For

- content creators
- editors and operators
- people collecting and sharing web research
- anyone who wants to turn web articles into shareable image posts

### Current Features

- full-page capture
- custom left / right / top / bottom cropping
- single long-image export
- auto split into `3 / 4 / 6 / 9` images
- optional QR footer
- bilingual UI (Chinese / English)
- selectable output quality

### Quick Start

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `src/extension`
5. Open any webpage article
6. Click the extension icon
7. Optionally set left / right / top / bottom bounds
8. Choose output mode and quality
9. Optionally add the source URL for QR export
10. Click **Capture & Export**

Exported files are saved to:

```text
Downloads/longshot/
```

### Development

Run tests:

```bash
npm test
```

### Status

This repository is still an MVP under active iteration.

Known rough edges on complex pages may include:

- seams caused by sticky headers or overlays
- unstable bounds on lazy-loaded content
- manual split adjustment on very long pages
