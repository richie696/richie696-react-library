"""Create a minimal, feature-first React SPA from the maintained template."""

from __future__ import annotations

import argparse
import re
import shutil
import sys
import tempfile
from pathlib import Path


TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "react-spa"
PACKAGE_NAME_PATTERN = re.compile(r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*\Z")
REPLACEMENTS = {
    b"__PACKAGE_NAME__": lambda name: name.encode("utf-8"),
    b"__PROJECT_TITLE__": lambda name: name.replace("-", " ").title().encode("utf-8"),
}


def template_files() -> tuple[Path, ...]:
    """Return regular template files, rejecting symlinks and an empty template."""
    if not TEMPLATE_DIR.is_dir():
        raise FileNotFoundError(f"Template directory is missing: {TEMPLATE_DIR}")
    entries = tuple(TEMPLATE_DIR.rglob("*"))
    if any(entry.is_symlink() for entry in entries):
        raise ValueError("The template must not contain symlinks")
    files = tuple(sorted(entry for entry in entries if entry.is_file()))
    if not files:
        raise ValueError("The template contains no files")
    return files


def create_project(name: str, output: Path, *, dry_run: bool = False) -> tuple[Path, ...]:
    """Generate a new project; never overwrite an existing target."""
    if not PACKAGE_NAME_PATTERN.fullmatch(name):
        raise ValueError("Project name must be lowercase kebab-case, for example my-react-app")

    target = output.expanduser().resolve()
    if target.exists():
        raise FileExistsError(f"Target already exists: {target}")
    if not target.parent.is_dir():
        raise FileNotFoundError(f"Target parent directory does not exist: {target.parent}")

    files = template_files()
    relative_files = tuple(source.relative_to(TEMPLATE_DIR) for source in files)
    if dry_run:
        return relative_files

    staging = Path(tempfile.mkdtemp(prefix=f".{target.name}.scaffold-", dir=target.parent))
    try:
        for source, relative_path in zip(files, relative_files):
            destination = staging / relative_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            content = source.read_bytes()
            for marker, value in REPLACEMENTS.items():
                content = content.replace(marker, value(name))
            destination.write_bytes(content)

        if target.exists():
            raise FileExistsError(f"Target appeared during generation: {target}")
        staging.rename(target)
    except Exception:
        shutil.rmtree(staging)
        raise

    return relative_files


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", required=True, help="lowercase kebab-case npm package name")
    parser.add_argument("--output", required=True, type=Path, help="new, non-existing project directory")
    parser.add_argument("--dry-run", action="store_true", help="list files without creating anything")
    args = parser.parse_args(argv)

    try:
        files = create_project(args.name, args.output, dry_run=args.dry_run)
    except (FileExistsError, FileNotFoundError, OSError, ValueError) as error:
        parser.exit(2, f"error: {error}\n")

    target = args.output.expanduser().resolve()
    print(f"{'Would create' if args.dry_run else 'Created'} {target}")
    for relative_path in files:
        print(f"  {relative_path}")
    if not args.dry_run:
        print("Next: run npm install, npm run typecheck, npm run lint, and npm run build inside the project.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
