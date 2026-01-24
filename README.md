# WXT + React 浏览器扩展模板

本项目是基于 WXT + React 的浏览器扩展启动模板，内置 oRPC 消息通信示例，适合快速搭建 Chrome / Edge / Firefox 扩展的开发环境与基础结构。

## 主要特性

- WXT 驱动的扩展工程结构与构建流程
- React + React Query 的 Popup 示例
- Background / Content / Popup 之间的 oRPC 消息通信
- 计数器状态持久化到 `browser.storage.local`（MV3 兼容）
- 一键打包 Chrome / Edge / Firefox 的 zip 包

## 技术栈

- 构建与扩展框架：WXT
- 前端框架：React
- 数据请求与缓存：@tanstack/react-query
- 消息通信：oRPC
- 语言与工具链：TypeScript + Biome

## 快速开始

建议使用 pnpm：

```bash
pnpm install
pnpm dev
```

## 常用命令

```bash
# 开发
pnpm dev
pnpm dev:firefox

# 构建
pnpm build
pnpm build:firefox

# 打包
pnpm zip
pnpm zip:edge
pnpm zip:firefox

# 质量检查
pnpm lint
pnpm format
pnpm check
pnpm compile
```

## CI 流程介绍

本项目使用 GitHub Actions 搭配 Release Please 自动化发布：

- 主分支提交后触发 `release-please` 工作流
- 自动生成/更新 Release PR 与变更日志
- 当 Release PR 合并后自动创建 GitHub Release
- 自动构建并上传 Chrome / Edge 的 zip 包到 Release 资产

## Commit Message 与版本规则

Release Please 采用 Conventional Commits 解析提交信息并决定版本号：

- **大版本（Major）**：包含破坏性变更  
  使用 `feat!:` / `fix!:` 或在正文中添加 `BREAKING CHANGE: ...`
- **中版本（Minor）**：新增功能  
  使用 `feat: ...`
- **小版本（Patch）**：修复问题或小改动  
  使用 `fix: ...`，`perf: ...`，`refactor: ...`，`chore: ...` 等

常见示例：

```text
feat: add quick toggle in popup
fix: handle null storage value
feat!: migrate settings schema

BREAKING CHANGE: settings schema v2 requires migration
```
