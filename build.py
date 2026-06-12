"""
Wrimark v2.0.0 构建脚本 —— 使用 PyInstaller 打包为 Windows 可执行文件

使用方法：
    python build.py

需要先安装：
    pip install pyinstaller pywebview darkdetect pythonnet
"""

import sys, os, subprocess
from pathlib import Path

BASE_DIR = Path(__file__).parent.absolute()
WEB_DIR = BASE_DIR / "web"
ICON_PATH = BASE_DIR / "icon.ico"


def find_python():
    paths = [
        r"C:\Users\Qcwwn\AppData\Local\Programs\Python\Python311\python.exe",
        r"C:\Users\Qcwwn\AppData\Local\Python\pythoncore-3.14-64\python.exe",
        sys.executable,
    ]
    for p in paths:
        if os.path.isfile(p):
            return p
    return sys.executable


def prepare_dotnet_runtime():
    import shutil
    src_dotnet = r"C:\Program Files\dotnet"
    dst = BASE_DIR / "dotnet_runtime"

    if dst.exists():
        shutil.rmtree(dst)

    hostfxr_src = os.path.join(src_dotnet, "host", "fxr")
    if os.path.isdir(hostfxr_src):
        shutil.copytree(hostfxr_src, dst / "host" / "fxr")

    for runtime in ["Microsoft.NETCore.App", "Microsoft.WindowsDesktop.App"]:
        src = os.path.join(src_dotnet, "shared", runtime)
        if not os.path.isdir(src):
            continue
        for ver in os.listdir(src):
            ver_src = os.path.join(src, ver)
            if os.path.isdir(ver_src):
                ver_dst = dst / "shared" / runtime / ver
                os.makedirs(ver_dst.parent, exist_ok=True)
                shutil.copytree(ver_src, ver_dst)
                break

    total = sum(os.path.getsize(os.path.join(r, f)) for r, _, files in os.walk(dst) for f in files)
    print(f"  .NET Runtime 已准备: {total / 1024 / 1024:.0f} MB")
    return str(dst)


def main():
    print("=" * 60)
    print("  Wrimark v2.0.0 构建脚本")
    print("=" * 60)

    python = find_python()
    print(f"Python: {python}")

    dotnet_dir = prepare_dotnet_runtime()

    try:
        subprocess.run([python, "-c", "import PyInstaller"], check=True, capture_output=True)
    except subprocess.CalledProcessError:
        print("正在安装 PyInstaller...")
        subprocess.run([python, "-m", "pip", "install", "pyinstaller"], check=True)

    icon_args = []
    if ICON_PATH.exists():
        icon_args = ["--icon", str(ICON_PATH)]

    sep = ";" if sys.platform == "win32" else ":"
    add_data_web = f"--add-data={WEB_DIR}{sep}web"
    add_data_dotnet = f"--add-data={dotnet_dir}{sep}dotnet_runtime"

    cmd = [
        python, "-m", "PyInstaller",
        "--name=Wrimark",
        "--windowed",
        *icon_args,
        add_data_web,
        add_data_dotnet,
        "--clean",
        "--noconfirm",
        "--log-level=WARN",
        "--collect-all=pythonnet",
        "--collect-all=clr_loader",
        "--collect-all=clr",
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
