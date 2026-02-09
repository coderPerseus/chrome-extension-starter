# light-reader

`light-reader` 是一个基于 `WXT + React + TypeScript` 的浏览器扩展，用于把网页强制转换到更易读的明亮模式。

## 功能

- Popup 一键开关明亮模式
- 内置 6 套阅读配色（参考 tweakcn 风格）
- 点击配色后，当前标签页立即应用
- 配置持久化到 `browser.storage.local`
- 内容脚本在 `document_start` 注入，支持 `Shadow DOM` 新增节点追踪

## 实现思路（参考 Dark Reader）

- 通过内容脚本动态注入 `<style>`，统一覆盖页面背景/文本/边框/链接/表单色彩
- 使用 CSS 变量承载配色方案，切换时仅更新变量和样式块
- 监听 `storage.onChanged` 和 runtime message，支持实时更新
- 使用 `MutationObserver` 跟踪 DOM 与 Shadow Root 变化，提升动态页面兼容性

## 本地开发

```bash
pnpm install
pnpm dev
```

## 构建与检查

```bash
pnpm check
pnpm build
pnpm zip
```
