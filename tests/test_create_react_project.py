"""Behavior checks for the maintained React project scaffold."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "create_react_project.py"
SPEC = importlib.util.spec_from_file_location("create_react_project", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class CreateReactProjectTests(unittest.TestCase):
    def test_dry_run_does_not_create_target(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "my-app"
            files = MODULE.create_project("my-app", target, dry_run=True)
            self.assertIn(Path("src/app/App.tsx"), files)
            self.assertFalse(target.exists())

    def test_generate_replaces_markers(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "my-app"
            MODULE.create_project("my-app", target)
            self.assertIn('"name": "my-app"', (target / "package.json").read_text())
            self.assertIn("My App", (target / "index.html").read_text())
            self.assertTrue((target / "src/core/styles/themes/_dark.scss").is_file())
            self.assertTrue((target / ".gitignore").is_file())

    def test_existing_target_is_not_modified(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "my-app"
            target.mkdir()
            original = target / "keep.txt"
            original.write_text("user data")
            with self.assertRaises(FileExistsError):
                MODULE.create_project("my-app", target)
            self.assertEqual(original.read_text(), "user data")

    def test_invalid_name_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                MODULE.create_project("Bad Name", Path(directory) / "new-app")


if __name__ == "__main__":
    unittest.main()
