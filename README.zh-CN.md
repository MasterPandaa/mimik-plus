<div align="center"><a name="readme-top"></a>

<img src="public/mascot.svg" width="140" height="140" alt="Mimik 吉祥物" />

# Mimik Plus

[English](./README.md) · [Español](./README.es.md) · [Português (BR)](./README.pt-BR.md) · [Français](./README.fr.md) · **简体中文** · [Bahasa Indonesia](./README.id.md)

**自动捕获任何浏览器工作流，并生成分步指南。无需账号，没有云端，也不做追踪。**

点击录制，完成你的操作，Mimik 会生成一份带标注截图的精美指南。你可以边录边讲解，录完后编辑，然后 replay 或导出。

> **这是 [Mimik](https://github.com/westpoint-io/mimik)（由 Westpoint 创建）的社区 fork**，增加了自定义 AI 提供商支持、Bahasa Indonesia 语言等功能。所有原始功劳属于 Westpoint 团队。

<!-- SHIELD GROUP -->

[![License][license-shield]][license-link]
[![Manifest V3][mv3-shield]][mv3-link]
[![100% Local][local-shield]][local-link]
[![No Account][no-account-shield]][no-account-link]
<br/>
[![Stars][star-shield]][star-link]
[![Contributors][contributors-shield]][contributors-link]
![Last Commit][last-commit-shield]
[![Issues][issues-shield]][issues-link]

</div>

<details>
<summary><kbd>目录</kbd></summary>

#### TOC

- [📺 演示](#-演示)
- [👋 开始使用](#-开始使用)
- [✨ 功能](#-功能)
  - [🔒 智能模糊](#-智能模糊)
  - [🧠 AI 描述（可选）](#-ai-描述可选)
  - [▶️ Guide Me 回放](#️-guide-me-回放)
  - [🎙️ 语音讲解（可选）](#️-语音讲解可选)
  - [✏️ 指南编辑器](#️-指南编辑器)
  - [📤 多格式导出](#-多格式导出)
- [🔐 隐私与存储](#-隐私与存储)
- [🤝 贡献](#-贡献)
- [📜 许可证](#-许可证)

<br/>

</details>

## 📺 演示

<div align="center">
<img src="https://github.com/user-attachments/assets/9de20b45-2256-4127-8242-141cf1802f39" alt="Mimik 演示" width="800" />
</div>

## 👋 开始使用

Mimik 可以在几秒内把任何重复性的浏览器任务变成一份可分享的文档化指南。它完全运行在你的浏览器里。没有后端、没有账号、没有遥测，任何内容都不会离开你的设备。

无论你是在记录内部工具流程、编写产品教程，还是帮助同事入门，Mimik 都会自动捕获每一次点击、按键和导航，让你专注于真正要完成的工作。

每个有意义的操作都会变成一个步骤：按钮和链接点击、表单输入、键盘快捷键、剪贴板操作、拖拽事件以及页面导航。距离很近的快速点击会被合并，让指南保持干净；点击会在页面跳转前被截获，所以 SPA 和整页加载中的操作也不会丢失。

每个步骤都会带上一张截图，并突出显示和放大被点击的元素。不需要手动裁剪，也不需要学习额外的标注工具。

| 浏览器 | 版本 | 安装 |
| ------ | ---- | ---- |
| Chrome | [![Chrome Version][chrome-version-shield]][chrome-link]   | [Chrome Web Store][chrome-link] |
| Firefox | [![Firefox Version][firefox-version-shield]][firefox-link] | [Firefox Add-ons][firefox-link]  |
| Edge | [![Edge Version][edge-version-shield]][edge-link]          | [Microsoft Edge Add-ons][edge-link] |

支持英语、西班牙语、巴西葡萄牙语、法语、德语和简体中文。AI 描述语言可以单独设置，所以你可以用英文界面运行 Mimik，同时生成中文指南，或使用任意组合。

> \[!IMPORTANT]
>
> **⭐️ 如果 Mimik 帮你节省了时间，请给仓库点个 star。** 这能帮助更多人发现它！

<a href="https://github.com/westpoint-io/mimik">
  <img width="100%" alt="在 GitHub 上给 Mimik 点 star" src="https://github.com/user-attachments/assets/80d304da-a765-4bde-bf49-b1bdcb4fe804" />
</a>

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

## ✨ 功能

### 🔒 智能模糊

Mimik 会自动检测并模糊截图中的敏感数据：邮箱、电话号码、SSN、信用卡、IP 地址、MAC 地址。每个类别都可以独立开关。

需要隐藏自定义内容？手动模糊选择器可以让你选中任意 DOM 元素，并在它出现的每张截图中进行遮罩。

<img src="https://github.com/user-attachments/assets/968d2518-c561-4d68-92a6-3d5f569fe38a" alt="智能模糊" width="800" />

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

### 🧠 AI 描述（可选）

使用你自己的 API key（OpenAI 或 Anthropic），Mimik 可以生成更自然的步骤说明，例如 *“点击 **Submit** 按钮保存更改”*，而不是基于规则的 `Click Submit`。

描述会根据轻量 DOM 上下文生成（约 50-100 tokens），不是根据截图生成。相比视觉模型大约便宜 15-30 倍。你可以选择描述语言（英语、西班牙语、葡萄牙语、法语、德语、中文）。

<img src="https://github.com/user-attachments/assets/3540cbd5-133f-46fd-a9b6-ffce9b4d422a" alt="AI 描述" width="800" />

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

### ▶️ Guide Me 回放

在真实页面上实时回放任何指南。Mimik 会高亮下一步要点击的元素，逐步跟踪进度，并在你完成操作后自动前进。它很适合团队入门培训，也适合自己跟着流程走一遍。

<img src="https://github.com/user-attachments/assets/56ffca1d-5074-491f-8571-dd70782d4b05" alt="Guide Me 回放" width="800" />

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

### 🎙️ 语音讲解（可选）

录制时直接把流程讲出来，Mimik 会把你的语音转换成步骤描述。音频会用你自己的 key（OpenAI 或 Groq）转写，并匹配到对应步骤上，所以你只需要讲一遍，不用手动给每一步写说明。

<img src="https://github.com/user-attachments/assets/061fddc7-da65-4641-8b39-d30b80c36531" alt="语音讲解" width="800" />

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

### ✏️ 指南编辑器

录制后可以直接修正指南，不需要重新录制。你可以裁剪、标注和遮挡任意截图，使用 AI 在编辑器里改写步骤，在步骤之间插入标题和备注，重新排序或批量删除，并通过版本历史回滚。

<img src="https://github.com/user-attachments/assets/62d3a01e-b129-44c8-8ba3-e9b97ff08d7e" alt="指南编辑器" width="800" />

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

### 📤 多格式导出

你可以按工作流需要，用不同格式分享指南：

- **视频**：带讲解的 walkthrough，mp4/H.264，光标会移动到每个目标元素
- **PDF**：适合打印，A4 纵向，自动分页
- **DOCX**：可在 Word 中打开并继续编辑
- **HTML**：自包含文件，可在任何地方分享，图片以内嵌 base64 保存
- **Markdown**：可粘贴到 Notion、GitHub、内部文档或 wiki

所有导出都在客户端生成。没有任何内容经过服务器。

<img src="https://github.com/user-attachments/assets/e7584527-7d68-4f3f-9261-8380ee08dfb4" alt="多格式导出" width="800" />

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

## 🔐 隐私与存储

你的指南、步骤和截图都保存在你的设备上。没有后端、没有账号、没有遥测。你的 API key（如果配置了）不会离开浏览器；它们只会保存在本地，并用于直接调用你选择的服务商。

有两类内容会离开浏览器，并且都已在[隐私政策](https://mimik.westpoint.io/privacy/)中说明：网站图标会从 Google favicon 服务获取，这会发送对应网站的域名；可选的 AI 和语音功能会把文本或音频发送给你配置的服务商。

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

## 🤝 贡献

欢迎任何形式的贡献：bug 报告、功能建议、PR 和翻译。

请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)，了解开发环境、项目结构和贡献指南。

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

## 📜 许可证

MIT © [Westpoint](https://github.com/westpoint-io)。详情见 [LICENSE](./LICENSE)。

<div align="right">

[![Back to top][back-to-top]](#readme-top)

</div>

<!-- LINK GROUP -->

[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-1E1B4B?style=flat-square

[license-shield]: https://img.shields.io/badge/license-MIT-4F46E5?style=flat-square&labelColor=1E1B4B
[license-link]: ./LICENSE

[mv3-shield]: https://img.shields.io/badge/manifest-v3-3730A3?style=flat-square&labelColor=1E1B4B
[mv3-link]: https://developer.chrome.com/docs/extensions/mv3/intro/

[local-shield]: https://img.shields.io/badge/storage-100%25%20local-4F46E5?style=flat-square&labelColor=1E1B4B
[local-link]: #-隐私与存储

[no-account-shield]: https://img.shields.io/badge/account-not%20required-4F46E5?style=flat-square&labelColor=1E1B4B
[no-account-link]: #-隐私与存储

[star-shield]: https://img.shields.io/github/stars/westpoint-io/mimik?style=flat-square&label=stars&color=4F46E5&labelColor=1E1B4B
[star-link]: https://github.com/westpoint-io/mimik/stargazers

[contributors-shield]: https://img.shields.io/github/contributors/westpoint-io/mimik?style=flat-square&labelColor=1E1B4B
[contributors-link]: https://github.com/westpoint-io/mimik/graphs/contributors

[last-commit-shield]: https://img.shields.io/github/last-commit/westpoint-io/mimik?style=flat-square&label=commit&labelColor=1E1B4B

[issues-shield]: https://img.shields.io/github/issues/westpoint-io/mimik?style=flat-square&labelColor=1E1B4B
[issues-link]: https://github.com/westpoint-io/mimik/issues

[chrome-version-shield]: https://img.shields.io/chrome-web-store/v/jmfohdaflahliammccpiadmkcibohgha?label=Chrome%20Version&style=flat-square&logo=googlechrome&logoColor=C7D2FE&color=4F46E5&labelColor=1E1B4B
[chrome-link]: https://chromewebstore.google.com/detail/mimik/jmfohdaflahliammccpiadmkcibohgha
[firefox-version-shield]: https://img.shields.io/amo/v/mimik?label=Firefox%20Version&style=flat-square&logo=firefoxbrowser&logoColor=C7D2FE&color=4F46E5&labelColor=1E1B4B
[firefox-link]: https://addons.mozilla.org/en-US/firefox/addon/mimik/
[edge-version-shield]: https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fhgjemhfoffebbollleajkpefblppleai&query=%24.version&label=Edge%20Version&style=flat-square&logo=microsoftedge&logoColor=C7D2FE&color=4F46E5&labelColor=1E1B4B
[edge-link]: https://microsoftedge.microsoft.com/addons/detail/hgjemhfoffebbollleajkpefblppleai
