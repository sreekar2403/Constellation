# Constellation Python Backend

AI provider orchestration, knowledge graph computations, and data mapping for the Constellation Agent Orchestration Platform.

## Setup

```bash
# Install uv if not installed
pip install uv

# Install dependencies
uv sync

# Run the server
uv run uvicorn constellation.main:app --reload

# Run tests
uv run pytest
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Development

```bash
# Install dev dependencies
uv sync --all-extras

# Run linting
uv run ruff check src/

# Run type checking
uv run mypy src/

# Run tests with coverage
uv run pytest --cov=constellation
```
