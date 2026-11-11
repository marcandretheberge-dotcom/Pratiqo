import importlib.util
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location(
    "runtime", Path(__file__).resolve().parents[2] / "scripts/ensure-yoppo-linux-runtime.py"
)
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)


class LinuxRuntimeTest(unittest.TestCase):
    def test_checks_loading_not_just_package_presence(self):
        with patch.object(runtime.ctypes, "CDLL", side_effect=OSError("dependency missing")) as load:
            self.assertEqual(len(runtime.missing_libraries()), len(runtime.LIBRARIES))
            self.assertEqual(load.call_count, len(runtime.LIBRARIES))

    @patch.object(runtime.sys, "platform", "linux")
    def test_ready_runner_needs_no_repository_access(self):
        with patch.object(runtime, "missing_libraries", return_value={}), patch.object(runtime.subprocess, "run") as run:
            runtime.ensure_runtime()
            run.assert_not_called()

    @patch.object(runtime.sys, "platform", "linux")
    def test_installs_only_missing_and_rechecks(self):
        missing = {"libEGL.so.1": {"package": "libegl1", "error": "not found"}}
        with patch.object(runtime, "missing_libraries", side_effect=[missing, {}]) as check, patch.object(runtime.subprocess, "run") as run:
            runtime.ensure_runtime()
            self.assertEqual(check.call_count, 2)
            self.assertEqual(run.call_args_list[0].args[0][-2:], ["--error-on=any", "update"])
            self.assertEqual(run.call_args_list[1].args[0][-3:], ["install", "-y", "libegl1"])
            for call in run.call_args_list:
                self.assertEqual(call.kwargs, {"check": True, "timeout": 120})

    @patch.object(runtime.sys, "platform", "linux")
    def test_repository_failure_remains_blocking(self):
        missing = {"libEGL.so.1": {"package": "libegl1"}}
        with patch.object(runtime, "missing_libraries", return_value=missing), patch.object(runtime.subprocess, "run", side_effect=subprocess.CalledProcessError(100, "apt")) as run:
            with self.assertRaises(subprocess.CalledProcessError):
                runtime.ensure_runtime()
            self.assertEqual(run.call_count, 1)

    @patch.object(runtime.sys, "platform", "linux")
    def test_successful_install_does_not_hide_load_failure(self):
        missing = {"libEGL.so.1": {"package": "libegl1"}}
        with patch.object(runtime, "missing_libraries", return_value=missing), patch.object(runtime.subprocess, "run"):
            with self.assertRaisesRegex(RuntimeError, "still cannot load"):
                runtime.ensure_runtime()


if __name__ == "__main__":
    unittest.main()
