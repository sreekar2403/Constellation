"""Task management API endpoints."""

from fastapi import APIRouter, HTTPException
from constellation.models.task import TaskInfo, TaskStatus

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

# In-memory task store (will be replaced with persistence)
_tasks: dict[str, TaskInfo] = {}


@router.get("")
async def list_tasks(status: TaskStatus | None = None):
    """List all tasks with optional status filter."""
    tasks = list(_tasks.values())
    if status:
        tasks = [t for t in tasks if t.status == status]
    return {"tasks": tasks}


@router.post("")
async def create_task(task: TaskInfo):
    """Create a new task."""
    _tasks[task.id] = task
    return task


@router.get("/{task_id}")
async def get_task(task_id: str):
    """Get a task by ID."""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return _tasks[task_id]


@router.put("/{task_id}")
async def update_task(task_id: str, task: TaskInfo):
    """Update a task."""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    _tasks[task_id] = task
    return task


@router.delete("/{task_id}")
async def delete_task(task_id: str):
    """Delete a task."""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    del _tasks[task_id]
    return {"status": "deleted"}


@router.post("/{task_id}/execute")
async def execute_task(task_id: str):
    """Execute a task."""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    # TODO: Implement task execution via provider registry
    return {"status": "started", "task_id": task_id}
