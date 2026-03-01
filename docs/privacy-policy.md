# Privacy Policy / 隐私政策

Effective date: March 1, 2026  
生效日期：2026 年 3 月 1 日

`Eazy Share` is a browser extension for capturing long web pages and exporting them as shareable images.

`Eazy Share` 是一款浏览器扩展，用于截取长网页并导出为适合分享的图片。

This policy explains what data the extension processes, how it is used, and what is not collected.

本政策说明该扩展会处理哪些数据、如何使用这些数据，以及哪些数据不会被收集。

## 1. What Eazy Share Does / Eazy Share 的用途

`Eazy Share` helps users:

- capture long articles or long-form web pages,
- crop left, right, top, and bottom bounds,
- export one long image or multiple split images,
- optionally attach a QR code that links back to the source page.

`Eazy Share` 主要帮助用户：

- 截取任意网站上的长文章或长页面，
- 自定义左右上下边界，
- 导出单张长图或多张分图，
- 可选附加跳转原网页的二维码。

## 2. Data Processed by the Extension / 扩展处理的数据

The extension processes the following data locally on the user's device:

- the currently open webpage content that the user chooses to capture,
- the source URL entered by the user for QR code generation,
- user settings such as language, output mode, quality, link options, and crop bounds,
- temporary image data created during capture and split export.

扩展会在用户设备本地处理以下数据：

- 用户主动选择截图的当前网页内容，
- 用户输入的、用于生成二维码的原网页链接，
- 语言、导出模式、清晰度、链接选项、裁剪边界等用户设置，
- 截图和分图导出过程中产生的临时图片数据。

## 3. What We Do Not Collect / 我们不收集什么

`Eazy Share` does not:

- create user accounts,
- collect personal profiles,
- sell user data,
- use analytics, advertising SDKs, or tracking scripts,
- upload captured webpage content to our servers,
- send QR code source links to third-party QR services.

`Eazy Share` 不会：

- 创建用户账号，
- 收集用户画像，
- 出售用户数据，
- 使用统计分析、广告 SDK 或追踪脚本，
- 将截图网页内容上传到开发者服务器，
- 将二维码链接发送给第三方二维码服务。

## 4. How Data Is Used / 数据如何被使用

The processed data is used only to provide the extension's core functionality:

- reading page size and scroll position,
- capturing the visible area of a page,
- stitching captures into one image,
- splitting the long image into multiple images,
- generating a QR code locally inside the extension,
- saving exported files to the user's local download folder,
- remembering user preferences between sessions.

这些数据仅用于实现扩展的核心功能：

- 读取页面尺寸和滚动位置，
- 截取网页当前可见区域，
- 拼接成长图，
- 将长图切分为多张图片，
- 在扩展内部本地生成二维码，
- 将导出文件保存到用户本地下载目录，
- 记住用户上一次使用的配置。

## 5. Storage and Retention / 存储与保留

`Eazy Share` uses Chrome extension local storage and temporary browser cache.

`Eazy Share` 会使用 Chrome 扩展本地存储以及临时浏览器缓存。

Stored locally:

- UI language,
- export preferences,
- crop bounds,
- temporary capture session metadata for split export.

本地保存的内容包括：

- 界面语言，
- 导出配置，
- 裁剪边界，
- 用于分图导出的临时截图会话信息。

Temporary capture session data is intended for short-lived editing and export. It is not designed as cloud storage or long-term hosting.

临时截图会话数据仅用于短时编辑和导出，并不作为云存储或长期托管使用。

## 6. Permissions / 权限说明

`Eazy Share` requests the following Chrome permissions:

- `activeTab`: to run capture on the page the user is currently using,
- `scripting`: to inject the content script required for page measurement and capture flow,
- `tabs`: to communicate with the active tab and read tab context needed for capture,
- `downloads`: to save exported images to the user's device,
- `storage`: to save user preferences and temporary capture session data,
- `<all_urls>` host permission: to support user-initiated capture on arbitrary websites.

`Eazy Share` 申请以下 Chrome 权限：

- `activeTab`：用于在用户当前打开的页面上执行截图，
- `scripting`：用于注入页面测量和截图流程所需的内容脚本，
- `tabs`：用于和当前标签页通信，并读取截图所需的标签页上下文，
- `downloads`：用于把导出的图片保存到用户设备，
- `storage`：用于保存用户配置和临时截图会话数据，
- `<all_urls>`：用于支持用户在任意网站上主动发起截图。

## 7. Network Access / 网络访问

The extension works primarily on-device.

该扩展的主要处理逻辑都在本地完成。

As of March 1, 2026, QR codes are generated locally inside the extension and are not sent to a third-party QR API.

截至 2026 年 3 月 1 日，二维码已在扩展内部本地生成，不再发送到第三方二维码接口。

The extension may access the webpage that the user is currently viewing because capture is performed on that page. Exported images stay on the user's device unless the user manually shares them.

扩展会访问用户当前正在浏览的网页，因为截图操作本身就在该页面上执行。导出的图片会保留在用户设备上，除非用户自行分享。

## 8. Children's Privacy / 儿童隐私

`Eazy Share` is not directed to children and does not knowingly collect personal information from children.

`Eazy Share` 并非面向儿童产品，也不会主动收集儿童个人信息。

## 9. Policy Updates / 政策更新

This policy may be updated if the extension's data practices or product scope change. The latest version should be published with the project repository or product listing.

如果扩展的数据处理方式或产品范围发生变化，本政策会相应更新。最新版本应随项目仓库或产品页面一起发布。

## 10. Contact / 联系方式

For privacy questions about `Eazy Share`, please open an issue in the project repository:

如对 `Eazy Share` 的隐私问题有疑问，请在项目仓库提交 issue：

- <https://github.com/chenghaofan1998/eazy_share/issues>
