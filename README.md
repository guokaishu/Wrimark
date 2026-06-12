# Wrimark

轻量级 Windows Markdown 编辑器，实时预览、LaTeX 数学公式、Mermaid 图表、GFM 扩展语法。

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

```text
Vibe-coding的一个自用小工具，若能对你也有所作用，那也算有意义了。
遵守 MIT License 的前提下，你也可以拿它做任何有趣的事。
```


## 特性

- **实时预览**：编辑时即时渲染 Markdown
- **Office Ribbon 功能区**：图形化格式化按钮，可折叠
- **同步滚动**：编辑器与预览区双向同步
- **行号显示**：左侧行号栏
- **大纲导航**：自动提取 H1–H6 标题树，点击跳转
- **扩展语法**：GFM（表格/任务列表/删除线）、Mermaid 流程图、Emoji 表情
- **LaTeX 数学公式**：基于 KaTeX 渲染
- **多预览主题**：默认 / GitHub / VuePress
- **浅色/深色模式**：全局适配
- **浮动字数统计**：玻璃拟态，实时显示字数/字符数/行数
- **查找替换**：支持正则表达式
- **导出 HTML**：将文档导出为独立 HTML 文件
- **智能输入**：括号自动配对、列表智能缩进
- **崩溃保护**：自动备份，异常关闭后恢复

## 系统要求

- Windows 10 或更高版本（自带 Edge WebView2）
- 开发运行：Python 3.11 + .NET 8.0 Desktop Runtime
- 打包分发：无需任何依赖，解压即用

## 快速开始

### 源码运行

```bash
pip install -r requirements.txt
python wrimark.py
```

### 打包分发

```bash
python build.py
```

构建产物位于 `dist/Wrimark/`，将整个文件夹打包为 ZIP 即可分发。自包含 .NET Runtime，用户无需安装任何依赖。

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+S` | 保存 |
| `Ctrl+Shift+S` | 另存为 |
| `Ctrl+N` | 新建文件 |
| `Ctrl+O` | 打开文件 |
| `Ctrl+F` | 查找 |
| `Ctrl+H` | 查找并替换 |
| `Ctrl+B` | 加粗 |
| `Ctrl+I` | 斜体 |
| `Ctrl+K` | 插入链接 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Tab` | 缩进（支持多行） |

## 技术栈

- **桌面框架**：pywebview (Edge WebView2)
- **Markdown 渲染**：marked.js (GFM)
- **数学公式**：KaTeX
- **图表**：Mermaid.js
- **打包**：PyInstaller + 自包含 .NET 8.0 Runtime
- **语言**：Python 3.11 + HTML/CSS/JS

## 项目结构

```
Wrimark/
├── wrimark.py          # Python 后端
├── build.py            # PyInstaller 构建脚本
├── requirements.txt    # Python 依赖
├── icon.ico            # 应用图标
├── web/
│   ├── index.html      # 前端 HTML
│   ├── style.css       # 样式表
│   └── script.js       # 前端逻辑
└── README.md
```

## 许可证
MIT License

Copyright © 2026 Qcwwn Studio. All rights reserved.
Copyright © 2026 guokaishu (Github). All rights reserved.
