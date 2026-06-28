"""Data mapping pipeline API endpoints."""

from fastapi import APIRouter, HTTPException
from constellation.models.mapping import MappingPipeline, MappingResult, PipelineStatus

router = APIRouter(prefix="/api/mappings", tags=["mappings"])

# In-memory pipeline store
_pipelines: dict[str, MappingPipeline] = {}
_results: dict[str, list[MappingResult]] = {}


@router.get("/pipelines")
async def list_pipelines():
    """List all mapping pipelines."""
    return {"pipelines": list(_pipelines.values())}


@router.post("/pipelines")
async def create_pipeline(pipeline: MappingPipeline):
    """Create a new mapping pipeline."""
    _pipelines[pipeline.id] = pipeline
    _results[pipeline.id] = []
    return pipeline


@router.get("/pipelines/{pipeline_id}")
async def get_pipeline(pipeline_id: str):
    """Get a pipeline by ID."""
    if pipeline_id not in _pipelines:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return _pipelines[pipeline_id]


@router.put("/pipelines/{pipeline_id}")
async def update_pipeline(pipeline_id: str, pipeline: MappingPipeline):
    """Update a pipeline."""
    if pipeline_id not in _pipelines:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    _pipelines[pipeline_id] = pipeline
    return pipeline


@router.delete("/pipelines/{pipeline_id}")
async def delete_pipeline(pipeline_id: str):
    """Delete a pipeline."""
    if pipeline_id not in _pipelines:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    del _pipelines[pipeline_id]
    if pipeline_id in _results:
        del _results[pipeline_id]
    return {"status": "deleted"}


@router.post("/pipelines/{pipeline_id}/run")
async def run_pipeline(pipeline_id: str):
    """Trigger a pipeline execution."""
    if pipeline_id not in _pipelines:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    # TODO: Implement pipeline execution
    result = MappingResult(
        pipeline_id=pipeline_id,
        status=PipelineStatus.RUNNING,
    )
    _results[pipeline_id].append(result)
    return {"status": "started", "result_id": result.id}


@router.get("/pipelines/{pipeline_id}/status")
async def pipeline_status(pipeline_id: str):
    """Get pipeline execution status."""
    if pipeline_id not in _pipelines:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    results = _results.get(pipeline_id, [])
    return {"pipeline_id": pipeline_id, "results": results}


@router.get("/pipelines/{pipeline_id}/logs")
async def pipeline_logs(pipeline_id: str):
    """Get pipeline execution logs."""
    if pipeline_id not in _pipelines:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    # TODO: Implement log retrieval
    return {"logs": []}
