"""Multi-language AST parsing utilities."""

import re
from pathlib import Path
from constellation.utils.logger import get_logger

logger = get_logger(__name__)


class Symbol:
    """Represents a code symbol (function, class, etc.)."""

    def __init__(
        self,
        name: str,
        symbol_type: str,
        line: int = 0,
        end_line: int = 0,
        parent: str | None = None,
        docstring: str | None = None,
    ):
        self.name = name
        self.symbol_type = symbol_type  # "function", "class", "interface", "variable"
        self.line = line
        self.end_line = end_line
        self.parent = parent
        self.docstring = docstring

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "type": self.symbol_type,
            "line": self.line,
            "end_line": self.end_line,
            "parent": self.parent,
            "docstring": self.docstring,
        }


class Dependency:
    """Represents a code dependency (import, call, etc.)."""

    def __init__(self, source: str, target: str, dep_type: str, line: int = 0):
        self.source = source
        self.target = target
        self.dep_type = dep_type  # "import", "call", "extends", "implements"
        self.line = line

    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "target": self.target,
            "type": self.dep_type,
            "line": self.line,
        }


class ASTResult:
    """Result of AST parsing."""

    def __init__(self, file_path: str, language: str):
        self.file_path = file_path
        self.language = language
        self.symbols: list[Symbol] = []
        self.dependencies: list[Dependency] = []
        self.error: str | None = None

    def to_dict(self) -> dict:
        return {
            "file_path": self.file_path,
            "language": self.language,
            "symbols": [s.to_dict() for s in self.symbols],
            "dependencies": [d.to_dict() for d in self.dependencies],
            "error": self.error,
        }


def parse_file(file_path: str | Path) -> ASTResult:
    """
    Parse a file and extract symbols and dependencies.

    Uses regex-based parsing as a fallback when tree-sitter is not available.
    """
    path = Path(file_path)
    if not path.exists():
        return ASTResult(str(file_path), "unknown")

    language = _detect_language(path)
    result = ASTResult(str(file_path), language)

    try:
        content = path.read_text(encoding="utf-8", errors="ignore")

        if language == "python":
            _parse_python(content, result)
        elif language in ("typescript", "javascript"):
            _parse_typescript(content, result)
        else:
            # Generic parsing for other languages
            _parse_generic(content, result)

    except Exception as e:
        result.error = str(e)
        logger.error("parse_error", file=str(file_path), error=str(e))

    return result


def _detect_language(path: Path) -> str:
    """Detect programming language from file extension."""
    ext_map = {
        ".py": "python",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".js": "javascript",
        ".jsx": "javascript",
        ".go": "go",
        ".rs": "rust",
        ".java": "java",
    }
    return ext_map.get(path.suffix, "unknown")


def _parse_python(content: str, result: ASTResult):
    """Parse Python files using regex."""
    lines = content.split("\n")

    # Extract imports
    import_pattern = re.compile(
        r"^(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))", re.MULTILINE
    )
    for match in import_pattern.finditer(content):
        module = match.group(1) or match.group(2)
        line_num = content[:match.start()].count("\n") + 1
        result.dependencies.append(
            Dependency(result.file_path, module, "import", line_num)
        )

    # Extract class definitions
    class_pattern = re.compile(r"^class\s+(\w+)", re.MULTILINE)
    for match in class_pattern.finditer(content):
        name = match.group(1)
        line_num = content[:match.start()].count("\n") + 1
        result.symbols.append(Symbol(name, "class", line_num))

    # Extract function definitions
    func_pattern = re.compile(r"^(?:async\s+)?def\s+(\w+)", re.MULTILINE)
    for match in func_pattern.finditer(content):
        name = match.group(1)
        line_num = content[:match.start()].count("\n") + 1
        result.symbols.append(Symbol(name, "function", line_num))


def _parse_typescript(content: str, result: ASTResult):
    """Parse TypeScript/JavaScript files using regex."""
    lines = content.split("\n")

    # Extract imports
    import_pattern = re.compile(
        r'^import\s+.*?from\s+["\']([^"\']+)["\']', re.MULTILINE
    )
    for match in import_pattern.finditer(content):
        module = match.group(1)
        line_num = content[:match.start()].count("\n") + 1
        result.dependencies.append(
            Dependency(result.file_path, module, "import", line_num)
        )

    # Extract require calls
    require_pattern = re.compile(
        r'require\s*\(\s*["\']([^"\']+)["\']\s*\)', re.MULTILINE
    )
    for match in require_pattern.finditer(content):
        module = match.group(1)
        line_num = content[:match.start()].count("\n") + 1
        result.dependencies.append(
            Dependency(result.file_path, module, "import", line_num)
        )

    # Extract class definitions
    class_pattern = re.compile(r"^export\s+class\s+(\w+)", re.MULTILINE)
    for match in class_pattern.finditer(content):
        name = match.group(1)
        line_num = content[:match.start()].count("\n") + 1
        result.symbols.append(Symbol(name, "class", line_num))

    # Extract interface definitions
    interface_pattern = re.compile(r"^export\s+interface\s+(\w+)", re.MULTILINE)
    for match in interface_pattern.finditer(content):
        name = match.group(1)
        line_num = content[:match.start()].count("\n") + 1
        result.symbols.append(Symbol(name, "interface", line_num))

    # Extract function definitions
    func_pattern = re.compile(
        r"^export\s+(?:async\s+)?function\s+(\w+)", re.MULTILINE
    )
    for match in func_pattern.finditer(content):
        name = match.group(1)
        line_num = content[:match.start()].count("\n") + 1
        result.symbols.append(Symbol(name, "function", line_num))


def _parse_generic(content: str, result: ASTResult):
    """Generic parsing for unknown languages."""
    # Just count lines and basic patterns
    lines = content.split("\n")
    result.symbols.append(Symbol(f"file:{result.file_path}", "module"))


def extract_symbols(file_path: str | Path) -> list[Symbol]:
    """Extract symbols from a file."""
    result = parse_file(file_path)
    return result.symbols


def extract_dependencies(file_path: str | Path) -> list[Dependency]:
    """Extract dependencies from a file."""
    result = parse_file(file_path)
    return result.dependencies
