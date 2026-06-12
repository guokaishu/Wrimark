"""
Wrimark —— 轻量级 Markdown 编辑/预览工具
开发者: Qcwwn Studio
版本: 2.0.0
"""

import sys
import os
import json
import logging
from pathlib import Path

# ---- 自包含 .NET Runtime（PyInstaller 打包后无需系统安装 .NET） ----
if getattr(sys, "frozen", False):
    _dotnet_root = os.path.join(sys._MEIPASS, "dotnet_runtime")
    if os.path.isdir(_dotnet_root):
        os.environ["DOTNET_ROOT"] = _dotnet_root
        _hostfxr_dir = os.path.join(_dotnet_root, "host", "fxr")
        if os.path.isdir(_hostfxr_dir):
            os.environ["PATH"] = _dotnet_root + os.pathsep + os.environ.get("PATH", "")
# -----------------------------------------------------------------

import webview

# ============================================================
VERSION = "2.0.0"
# ============================================================

APP_NAME = "Wrimark"
DEVELOPER = "Qcwwn Studio"

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
        self.current_file = None
        self._saved_content = ""
        self._current_content = ""
        self._modified = False
        self._initial_file = None
        self._close_in_progress = False

    def bind_window(self, window):
        self._window = window

    def get_version(self):
        return VERSION

    def get_system_theme(self):
        try:
            import darkdetect
            theme = darkdetect.theme()
            return theme.lower() if theme else "light"
        except Exception:
            return "light"

    def set_initial_file(self, filepath):
        self._initial_file = filepath

    def get_initial_file(self):
        if self._initial_file and os.path.isfile(self._initial_file):
            result = self._read_file_content(self._initial_file)
            self._initial_file = None
            return result
        return None

    def get_base_dir(self):
        return str(BASE_DIR)

    def update_content(self, content):
        self._current_content = content

    def check_update(self):
        try:
            import ssl, http.client, urllib.request, urllib.error, socket

            TIMEOUT = 15
            HEADERS = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/131.0.0.0 Safari/537.36"
                ),
                "Accept": "text/plain,text/html,*/*",
                "Accept-Language": "zh-CN,zh;q=0.9",
                "Connection": "close",
            }
            SSL_CTX = ssl.create_default_context()
            SSL_CTX.check_hostname = False
            SSL_CTX.verify_mode = ssl.CERT_NONE

            def is_valid(text):
                return text and "请求可疑" not in text and "<!DOCTYPE" not in text and "html" not in text.lower()[:20]

            url = "https://studio.qcwwn.cn/wrimark/version.txt"

            try:
                req = urllib.request.Request(url, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=TIMEOUT, context=SSL_CTX) as resp:
                    text = resp.read().decode("utf-8").strip()
                if is_valid(text):
                    return {"status": "ok", "version": text}
            except Exception:
                pass

            try:
                conn = http.client.HTTPSConnection("studio.qcwwn.cn", timeout=TIMEOUT, context=SSL_CTX)
                conn.request("GET", "/wrimark/version.txt", headers=HEADERS)
                resp = conn.getresponse()
                text = resp.read().decode("utf-8").strip()
                conn.close()
                if is_valid(text):
                    return {"status": "ok", "version": text}
            except Exception:
                pass

            try:
                sock = socket.create_connection(("studio.qcwwn.cn", 443), timeout=TIMEOUT)
                SSL_CTX.wrap_socket(sock, server_hostname="studio.qcwwn.cn")
                request = (
                    "GET /wrimark/version.txt HTTP/1.1\r\n"
                    "Host: studio.qcwwn.cn\r\n"
                    f"User-Agent: {HEADERS['User-Agent']}\r\n"
                    "Accept: text/plain,text/html,*/*\r\n"
                    "Accept-Language: zh-CN,zh;q=0.9\r\n"
                    "Connection: close\r\n\r\n"
                )
                sock.sendall(request.encode())
                response = b""
                while True:
                    chunk = sock.recv(4096)
                    if not chunk:
                        break
                    response += chunk
                sock.close()
                resp_text = response.decode("utf-8", errors="replace")
                parts = resp_text.split("\r\n\r\n", 1)
                body = parts[1].strip() if len(parts) > 1 else parts[0].strip()
                if is_valid(body):
                    return {"status": "ok", "version": body}
            except Exception:
                pass

            return {"status": "error"}
        except Exception:
            return {"status": "error"}

    # ---- 文件操作 ----

    def new_file_dialog(self):
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

    # ---- 导出 ----

    def export_html(self, html_content):
        """导出为 HTML 文件"""
        result = self._window.create_file_dialog(
            webview.FileDialog.SAVE,
            directory=str(Path.home()),
            save_filename="export.html",
        )
        if result and len(result) > 0:
            try:
                with open(result[0], "w", encoding="utf-8") as f:
                    f.write(html_content)
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

    def get_window_title(self):
        if self.current_file:
            filename = os.path.basename(self.current_file)
            prefix = "*" if self._modified else ""
            return f"{prefix}{filename} - {APP_NAME}  v{VERSION}"
        return f"{APP_NAME}  v{VERSION}  (By {DEVELOPER})"

    def _update_title(self):
        if self._window:
            self._window.set_title(self.get_window_title())

    def close_window(self):
        self._close_in_progress = True
        if self._window:
            self._window.destroy()

    def open_url(self, url):
        import webbrowser
        webbrowser.open(url)

    def quit_app(self):
        self._close_in_progress = True
        if self._window:
            self._window.destroy()


def main():
    api = WrimarkAPI()

    initial_file = None
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            clean = arg.strip().strip('"').strip("'")
            if os.path.isfile(clean):
                initial_file = clean
                logger.info(f"检测到初始文件: {initial_file}")
                break
            if os.path.isfile(arg):
                initial_file = arg
                logger.info(f"检测到初始文件(原始): {initial_file}")
                break

    html_path = BASE_DIR / "web" / "index.html"
    if not html_path.exists():
        logger.error(f"找不到前端文件: {html_path}")
        sys.exit(1)

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

    if initial_file:
        api.set_initial_file(initial_file)

    def on_closing():
        if api._close_in_progress:
            return
        if not api._modified:
            return

        import ctypes
        result = ctypes.windll.user32.MessageBoxW(
            0,
            "文件尚未保存，是否保存更改？\n\n"
            "是 (Y)  - 保存更改并关闭\n"
            "否 (N)  - 不保存更改直接关闭\n"
            "取消    - 返回编辑器",
            f"Wrimark  v{VERSION}",
            3 | 0x30,
        )

        if result == 6:
            save_result = api.save_file(api._current_content)
            if save_result and save_result.get("status") == "ok":
                return
            ctypes.windll.user32.MessageBoxW(
                0,
                "无法保存文件。请先在编辑器中使用 Ctrl+S 保存文件，再关闭程序。",
                "Wrimark",
                0 | 0x10,
            )
            return False
        elif result == 7:
            return
        else:
            return False

    window.events.closing += on_closing

    try:
        webview.start(debug=False)
    except RuntimeError as e:
        msg = str(e)
        if "Python.Runtime" in msg or "clr_loader" in msg or "pythonnet" in msg:
            import ctypes
            ctypes.windll.user32.MessageBoxW(
                0,
                "Wrimark 启动失败：缺少 .NET 运行环境。\n\n"
                "请安装 .NET 8.0 桌面运行时：\n"
                "https://dotnet.microsoft.com/zh-cn/download/dotnet/8.0\n\n"
                "选择「.NET Desktop Runtime 8.0」→ Windows x64 下载安装即可。",
                f"Wrimark  v{VERSION} — 环境错误",
                0 | 0x10,
            )
        else:
            raise


if __name__ == "__main__":
    main()
