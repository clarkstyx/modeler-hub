#!/usr/bin/env python
"""Phase 0 step 1: what does this PC have? Run before installing the AI packages.
    python check_env.py
"""
import importlib
import os
import platform
import shutil
import subprocess
import sys


def gpu():
    exe = shutil.which("nvidia-smi")
    if not exe:
        return "nvidia-smi not found: no NVIDIA driver (CPU-only path: dav2-small via onnxruntime is fine)"
    try:
        out = subprocess.run([exe, "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader"],
                             capture_output=True, text=True, timeout=20).stdout.strip()
        return out or "nvidia-smi ran but listed no GPU"
    except Exception as e:
        return f"nvidia-smi failed: {e}"


def ram_gb():
    try:
        import psutil
        return round(psutil.virtual_memory().total / 2 ** 30, 1)
    except Exception:
        if hasattr(os, "sysconf"):
            try:
                return round(os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 2 ** 30, 1)
            except Exception:
                pass
        return "unknown (pip install psutil)"


print(f"OS        : {platform.platform()}")
print(f"Python    : {sys.version.split()[0]} at {sys.executable}")
print(f"CPU       : {platform.processor() or platform.machine()}, {os.cpu_count()} threads")
print(f"RAM       : {ram_gb()} GB")
print(f"GPU       : {gpu()}")
for name in ["numpy", "scipy", "cv2", "PIL", "trimesh", "manifold3d", "networkx", "onnxruntime", "huggingface_hub",
             "mediapipe", "torch", "transformers", "facenet_pytorch", "moge", "depth_anything_3"]:
    try:
        m = importlib.import_module(name)
        v = getattr(m, "__version__", "")
        extra = ""
        if name == "torch":
            extra = f"  cuda={m.cuda.is_available()}" + (f" ({m.cuda.get_device_name(0)})" if m.cuda.is_available() else "")
        if name == "onnxruntime":
            extra = f"  providers={m.get_available_providers()}"
        print(f"  {name:16s} {v}{extra}")
    except Exception:
        print(f"  {name:16s} -")
for exe in ["blender", "orca-slicer", "OrcaSlicer"]:
    p = shutil.which(exe)
    print(f"{exe:12s}: {p or 'not on PATH (fine, open the STL by hand)'}")
