# Wrimark
一个轻量级、界面美观的本地 Markdown 编辑器，支持实时预览、HTML 语法和 LaTeX 数学公式渲染。

![Version](https://img.shields.io/badge/version-0.1.3-blue)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

```text
Vibe-coding的一个自用小工具，若能对你也有所作用，那也算有意义了。
遵守 MIT License 的前提下，你也可以拿它做任何有趣的事。
```

### 注意
- 遵守开源协议，使用 MIT 许可证。
- 应用程序提供简体中文。

### 功能
- Wrimark可用于Markdown文件的编辑和预览，原生支持markdown源码和html标签。
- 直接使用Wrimark打开.md文件即可开始使用。
- Wrimark提供实时的Markdown源码编辑和预览体验。应用程序左侧窗口为编辑窗口，右侧窗口为实时渲染窗口。
- Wrimark（一般情况）下支持LaTeX数学公式的输入和预览。

### 关于
- 开发：Qcwwn Studio (Github@guokaishu)
- 主页：studio.qcwwn.cn/wrimark



---



# 完整的README.md
Wrimark是一个轻量级、界面美观的本地 Markdown 编辑器，支持实时预览、HTML 语法和 LaTeX 数学公式渲染。

![Version](https://img.shields.io/badge/version-0.1.3-blue)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

### 功能特性

- 原生 Markdown 语法 + HTML 语法支持
- LaTeX 数学公式实时渲染
- 左右分屏实时预览
- 浅色 / 深色主题（跟随 Windows 系统自动切换）
- 全屏编辑 / 全屏预览模式
- 字数统计
- 自动保存（每分钟）
- 搜索和替换
- 撤销 / 重做
- 快捷键（Ctrl+S/Ctrl+F/Ctrl+Z/Ctrl+Y 等）
- 文件拖拽调整分屏宽度


## 快速开始

### 环境要求

- Windows 10 / 11（未测试过Windows 10以下版本；经过修改与编译可在Linux环境下使用）
- Python 3.10+
- Edge WebView2 Runtime（Windows 10/11 默认已安装）

### 安装运行

```bash
# 1. 克隆仓库
git clone https://github.com/guokaishu/wrimark.git
cd wrimark

# 2. 安装依赖
pip install -r requirements.txt

# 3. 运行
python wrimark.py
```

也可双击 `启动.bat` 直接启动。

### 文件关联

在 Windows 中将 `.md` 文件的默认打开方式设置为 `wrimark.exe`（打包后），即可双击 `.md` 文件直接编辑。

## 快捷键

| 快捷键             | 功能                       |
| ------------------ | -------------------------- |
| `Ctrl + S`         | 保存                       |
| `Ctrl + Shift + S` | 另存为                     |
| `Ctrl + Z`         | 撤销                       |
| `Ctrl + Y`         | 恢复                       |
| `Ctrl + F`         | 搜索和替换                 |
| `Ctrl + H`         | 搜索和替换（焦点在替换框） |
| `Tab`              | 缩进（多行选中批量缩进）   |

## 打包为 EXE

```bash
pip install pyinstaller
python build.py
```

生成的 `Wrimark.exe` 位于 `dist/Wrimark/` 目录，使用 `icon.ico` 作为图标。

## 项目结构

```
Wrimark/
├── wrimark.py              # 主程序
├── requirements.txt         # 依赖清单
├── build.py                 # 打包脚本
├── icon.png / icon.ico      # 应用图标
└── web/
    ├── index.html           # 前端界面
    ├── style.css            # 样式（浅色 + 深色主题）
    └── script.js            # 前端逻辑
```

## 技术栈

- **后端**：Python + pywebview（Edge WebView2）
- **前端**：HTML5 + CSS3 + JavaScript
- **渲染**：marked.js（Markdown）+ KaTeX（LaTeX）
- **打包**：PyInstaller

## 开发者

Qcwwn Studio（Github@guokaishu）

- 主页：[studio.qcwwn.cn/wrimark](https://studio.qcwwn.cn/wrimark)
- 文档：[docs.qcwwn.cn/wrimark](https://docs.qcwwn.cn/wrimark)
- 主页和文档未必一直保持开启，可能处于维护状态。

## 许可证

MIT License
