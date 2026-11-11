"""Check real shared-library loading before contacting Ubuntu repositories."""

import ctypes
import json
import subprocess
import sys


LIBRARIES = {
    "libEGL.so.1": "libegl1",
    "libGL.so.1": "libgl1",
    "libGLESv2.so.2": "libgles2",
    "libX11.so.6": "libx11-6",
    "libXext.so.6": "libxext6",
    "libXrender.so.1": "libxrender1",
    "libXi.so.6": "libxi6",
    "libXrandr.so.2": "libxrandr2",
    "libXcursor.so.1": "libxcursor1",
    "libXinerama.so.1": "libxinerama1",
    "libxkbcommon.so.0": "libxkbcommon0",
}


def missing_libraries():
    missing = {}
    for library, package in LIBRARIES.items():
        try:
            ctypes.CDLL(library)
        except OSError as error:
            missing[library] = {"package": package, "error": str(error)}
    return missing


def ensure_runtime():
    if sys.platform != "linux":
        raise RuntimeError("The Rive Linux dependency check requires Linux")
    missing = missing_libraries()
    print(json.dumps({"required": LIBRARIES, "missing": missing}), flush=True)
    if missing:
        # Preserve the runner's signed repository configuration. Never accept an
        # incomplete refresh or substitute unsigned downloads when DNS fails.
        apt = ["sudo", "apt-get", "-o", "Acquire::Retries=1", "-o",
               "Acquire::http::Timeout=10", "-o", "Acquire::https::Timeout=10"]
        subprocess.run(apt + ["--error-on=any", "update"], check=True, timeout=120)
        packages = sorted({item["package"] for item in missing.values()})
        subprocess.run(apt + ["install", "-y", *packages], check=True, timeout=120)
        remaining = missing_libraries()
        if remaining:
            raise RuntimeError("Rive libraries still cannot load: " + json.dumps(remaining))
    print("Rive Linux shared libraries: PASS (actual dynamic loading)", flush=True)


if __name__ == "__main__":
    ensure_runtime()
