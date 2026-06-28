"""File scanning and walking utilities."""

from pathlib import Path
from constellation.utils.logger import get_logger

logger = get_logger(__name__)

# Default directories to skip
SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".cache", "coverage",
    ".pytest_cache", ".mypy_cache", ".ruff_cache",
}

# Default file extensions to include
INCLUDE_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java",
    ".md", ".txt", ".json", ".yaml", ".yml", ".toml",
    ".sql", ".graphql", ".proto",
}


def scan_directory(
    root_path: str,
    include_extensions: set[str] | None = None,
    skip_dirs: set[str] | None = None,
    max_depth: int | None = None,
) -> list[Path]:
    """
    Scan a directory and return all matching files.

    Args:
        root_path: Root directory to scan
        include_extensions: File extensions to include (default: INCLUDE_EXTENSIONS)
        skip_dirs: Directory names to skip (default: SKIP_DIRS)
        max_depth: Maximum directory depth (None = unlimited)

    Returns:
        List of file paths matching the criteria
    """
    root = Path(root_path)
    if not root.exists():
        logger.warning("directory_not_found", path=root_path)
        return []

    extensions = include_extensions or INCLUDE_EXTENSIONS
    skip = skip_dirs or SKIP_DIRS
    files = []

    def _scan(current: Path, depth: int = 0):
        if max_depth is not None and depth > max_depth:
            return

        try:
            for item in current.iterdir():
                if item.is_dir():
                    if item.name not in skip and not item.name.startswith("."):
                        _scan(item, depth + 1)
                elif item.is_file():
                    if item.suffix in extensions:
                        files.append(item)
        except PermissionError:
            logger.warning("permission_error", path=str(current))
        except Exception as e:
            logger.error("scan_error", path=str(current), error=str(e))

    _scan(root)
    return sorted(files)


def get_file_stats(root_path: str) -> dict:
    """Get statistics about a directory."""
    files = scan_directory(root_path)

    stats = {
        "total_files": len(files),
        "by_extension": {},
        "total_size": 0,
    }

    for f in files:
        ext = f.suffix
        stats["by_extension"][ext] = stats["by_extension"].get(ext, 0) + 1
        try:
            stats["total_size"] += f.stat().st_size
        except OSError:
            pass

    return stats
