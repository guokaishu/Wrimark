"""
Wrimark 构建脚本 —— 使用 PyInstaller 打包为 Windows 可执行文件

使用方法：
    python build.py

需要先安装：
    pip install pyinstaller pywebview darkdetect
"""

import sys
import os
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).parent.absolute()
WEB_DIR = BASE_DIR / "web"
ICON_PATH = BASE_DIR / "icon.ico"


def find_python():
    """查找可用的 Python 解释器"""
    paths = [
        r"C:\Users\Qcwwn\AppData\Local\Python\pythoncore-3.14-64\python.exe",
        sys.executable,
    ]
    for p in paths:
        if os.path.isfile(p):
            return p
    return sys.executable


def main():
    print("=" * 60)
    print("  Wrimark 构建脚本")
    print("=" * 60)

    python = find_python()
    print(f"Python: {python}")

    # 确保 PyInstaller 已安装
    try:
        subprocess.run([python, "-c", "import PyInstaller"], check=True, capture_output=True)
    except subprocess.CalledProcessError:
        print("正在安装 PyInstaller...")
        subprocess.run([python, "-m", "pip", "install", "pyinstaller"], check=True)

    # 检查 icon
    icon_args = []
    if ICON_PATH.exists():
        icon_args = ["--icon", str(ICON_PATH)]
    else:
        png = BASE_DIR / "icon.png"
        if png.exists():
            print("[提示] 使用 icon.png 作为图标")
            icon_args = ["--icon", str(png)]
        else:
            print("[警告] 未找到图标文件")

    sep = ";" if sys.platform == "win32" else ":"
    add_data = f"--add-data={WEB_DIR}{sep}web"

    # PyInstaller 参数
    cmd = [
        python, "-m", "PyInstaller",
        "--name=Wrimark",
        "--windowed",
        *icon_args,
        add_data,
        "--clean",
        "--noconfirm",
        "--log-level=WARN",
        # pywebview 在 Windows 上需要 pythonnet/clr
        "--hidden-import=clr",
        "--hidden-import=clr_loader",
        "--hidden-import=pythonnet",
        "--hidden-import=webview.platforms.edgechromium",
        str(BASE_DIR / "wrimark.py"),
    ]

    print(f"\n命令：{' '.join(cmd)}\n")
    print("正在打包，请耐心等待（可能需要几分钟）...\n")

    os.chdir(str(BASE_DIR))
    result = subprocess.run(cmd)

    if result.returncode == 0:
        exe = BASE_DIR / "dist" / "Wrimark" / "Wrimark.exe"
        print("\n" + "=" * 60)
        print("  构建成功！")
        print(f"  可执行文件: {exe}")
        print("=" * 60)
    else:
        print("\n构建失败，请检查错误信息。")
        sys.exit(1)


if __name__ == "__main__":
    main()
