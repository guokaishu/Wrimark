"""
Wrimark —— 轻量级 Markdown 编辑/预览工具
开发者: Qcwwn Studio
版本: 0.1.3

========== 修改版本号的方法 ==========
修改下方 VERSION 变量的值即可。
同时需要修改 web/index.html 中 splash 和 home 区域的版本号显示。
"""

import sys
import os
import json
import logging
from pathlib import Path
import webview

# ============================================================
# 版本号：在此处修改
# ============================================================
VERSION = "0.1.3"
# ============================================================

APP_NAME = "Wrimark"
DEVELOPER = "Qcwwn Studio"

# 支持 PyInstaller 打包
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys._MEIPASS)
else:
    BASE_DIR = Path(__file__).parent.absolute()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WrimarkAPI:
    """供 JavaScript 调用的 API 接口"""

    def __init__(self):
        self._window = None
        self.current_file = None  # 当前文件路径
        self._saved_content = ""  # 最后一次保存时的内容
        self._current_content = ""  # JS 同步的最新编辑内容
        self._modified = False
        self._initial_file = None  # 命令行传入的初始文件路径
        self._close_in_progress = False  # 防止关闭递归

    def bind_window(self, window):
        self._window = window

    def get_version(self):
        return VERSION

    def get_system_theme(self):
        """获取 Windows 系统主题"""
        try:
            import darkdetect
            theme = darkdetect.theme()
            return theme.lower() if theme else "light"
        except Exception:
            return "light"

    def set_initial_file(self, filepath):
        self._initial_file = filepath

    def get_initial_file(self):
        """JS 初始化时调用：检查是否有命令行传入的文件需要打开"""
        if self._initial_file and os.path.isfile(self._initial_file):
            result = self._read_file_content(self._initial_file)
            self._initial_file = None
            return result
        return None

    def get_base_dir(self):
        return str(BASE_DIR)

    def update_content(self, content):
        """JS 调用：同步编辑器最新内容（用于关闭时保存）"""
        self._current_content = content

    # ---- 文件操作 ----

    def new_file_dialog(self):
        """弹出「另存为」对话框，用于新建文件"""
        result = self._window.create_file_dialog(
            webview.FileDialog.SAVE,
            directory=str(Path.home()),
            save_filename="untitled.md",
        )
        if result and len(result) > 0:
            self.current_file = result[0]
            self._saved_content = ""
            self._modified = False
            return result[0]
        return None

    def open_file_dialog(self):
        """弹出「打开文件」对话框"""
        file_types = ["Markdown (*.md;*.markdown)", "All files (*.*)"]
        result = self._window.create_file_dialog(
            webview.FileDialog.OPEN,
            directory=str(Path.home()),
            file_types=file_types,
        )
        if result and len(result) > 0:
            return self._read_file_content(result[0])
        return None

    def read_file(self, filepath):
        """直接读取指定路径的文件（用于命令行参数 / 文件关联打开）"""
        return self._read_file_content(filepath)

    def _read_file_content(self, filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            self.current_file = filepath
            self._saved_content = content
            self._modified = False
            return {"path": filepath, "content": content}
        except UnicodeDecodeError:
            # 尝试其他编码
            try:
                with open(filepath, "r", encoding="gbk") as f:
                    content = f.read()
                self.current_file = filepath
                self._saved_content = content
                self._modified = False
                return {"path": filepath, "content": content}
            except Exception as e:
                return {"error": f"无法读取文件 (编码错误): {str(e)}"}
        except Exception as e:
            return {"error": f"无法读取文件: {str(e)}"}

    def save_file(self, content):
        """保存当前文件"""
        if not self.current_file:
            return {"status": "no_file"}
        try:
            with open(self.current_file, "w", encoding="utf-8") as f:
                f.write(content)
            self._saved_content = content
            self._modified = False
            logger.info(f"文件已保存: {self.current_file}")
            return {"status": "ok"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def save_file_as(self, content):
        """另存为"""
        result = self._window.create_file_dialog(
            webview.FileDialog.SAVE,
            directory=str(Path.home()),
            save_filename="untitled.md",
        )
        if result and len(result) > 0:
            self.current_file = result[0]
            try:
                with open(result[0], "w", encoding="utf-8") as f:
                    f.write(content)
                self._saved_content = content
                self._modified = False
                logger.info(f"文件已另存为: {result[0]}")
                return {"status": "ok", "path": result[0]}
            except Exception as e:
                return {"status": "error", "message": str(e)}
        return {"status": "cancelled"}

    # ---- 状态管理 ----

    def set_modified(self, is_modified):
        self._modified = is_modified
        self._update_title()

    def is_modified(self):
        return self._modified

    def get_current_file(self):
        if self.current_file:
            return {
                "path": self.current_file,
                "name": os.path.basename(self.current_file),
            }
        return None

    # ---- 窗口标题 ----

    def get_window_title(self):
        if self.current_file:
            filename = os.path.basename(self.current_file)
            prefix = "*" if self._modified else ""
            return f"{prefix}{filename} - {APP_NAME}  v{VERSION}"
        return f"{APP_NAME}  v{VERSION}  (By {DEVELOPER})"

    def _update_title(self):
        if self._window:
            self._window.set_title(self.get_window_title())

    # ---- 关闭窗口 ----

    def close_window(self):
        """由 JS 调用：安全关闭窗口"""
        self._close_in_progress = True
        if self._window:
            self._window.destroy()

    # ---- 外部链接 ----

    def open_url(self, url):
        import webbrowser
        webbrowser.open(url)

    # ---- 应用退出 ----

    def quit_app(self):
        self._close_in_progress = True
        if self._window:
            self._window.destroy()


def main():
    api = WrimarkAPI()

    # 检查命令行参数（文件关联打开）
    initial_file = None
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if os.path.isfile(arg):
            initial_file = arg

    # HTML 文件路径
    html_path = BASE_DIR / "web" / "index.html"
    if not html_path.exists():
        logger.error(f"找不到前端文件: {html_path}")
        sys.exit(1)

    # 创建窗口
    window = webview.create_window(
        title=f"{APP_NAME}  v{VERSION}  (By {DEVELOPER})",
        url=str(html_path),
        js_api=api,
        width=1200,
        height=800,
        min_size=(900, 600),
        text_select=True,
        confirm_close=False,
    )

    api.bind_window(window)

    # 设置初始文件（由 JS 初始化完成后主动调用 get_initial_file 获取）
    if initial_file:
        api.set_initial_file(initial_file)

    # ---------- 关闭事件处理 ----------
    # 使用 Win32 MessageBox 处理未保存提示，避免 evaluate_js 导致 GUI 死锁

    def on_closing():
        if api._close_in_progress:
            return  # 程序主动关闭，放行
        if not api._modified:
            return  # 没有未保存更改，放行

        import ctypes
        # MB_YESNOCANCEL=3  MB_ICONWARNING=0x30
        result = ctypes.windll.user32.MessageBoxW(
            0,
            "文件尚未保存，是否保存更改？\n\n"
            "是 (Y)  - 保存更改并关闭\n"
            "否 (N)  - 不保存更改直接关闭\n"
            "取消    - 返回编辑器",
            f"Wrimark  v{VERSION}",
            3 | 0x30,
        )

        if result == 6:  # Yes - 保存
            save_result = api.save_file(api._current_content)
            if save_result and save_result.get("status") == "ok":
                return  # 保存成功，放行
            # 保存失败（无路径等），提示用户
            ctypes.windll.user32.MessageBoxW(
                0,
                "无法保存文件。请先在编辑器中使用 Ctrl+S 保存文件，再关闭程序。",
                "Wrimark",
                0 | 0x10,  # MB_OK | MB_ICONERROR
            )
            return False  # 阻止关闭
        elif result == 7:  # No - 不保存
            return  # 放行
        else:  # Cancel (result == 2)
            return False  # 阻止关闭

    window.events.closing += on_closing
    # -----------------------------------

    webview.start(debug=False)


if __name__ == "__main__":
    main()
