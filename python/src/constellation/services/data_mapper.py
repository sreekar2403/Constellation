"""Data mapping and ETL pipeline orchestration."""

from datetime import datetime, timezone
from constellation.models.mapping import (
    MappingPipeline, MappingResult, PipelineStatus,
    DataSource, DataTarget, MappingStep, TransformType
)
from constellation.utils.logger import get_logger

logger = get_logger(__name__)


class TransformEngine:
    """Data transformation engine."""

    def apply_filter(self, data: list[dict], config: dict) -> list[dict]:
        """Apply filter transformation."""
        field = config.get("field")
        operator = config.get("operator", "eq")
        value = config.get("value")

        result = []
        for item in data:
            item_value = item.get(field)
            if operator == "eq" and item_value == value:
                result.append(item)
            elif operator == "ne" and item_value != value:
                result.append(item)
            elif operator == "gt" and item_value > value:
                result.append(item)
            elif operator == "lt" and item_value < value:
                result.append(item)
            elif operator == "contains" and value in str(item_value):
                result.append(item)
        return result

    def apply_map(self, data: list[dict], config: dict) -> list[dict]:
        """Apply map transformation."""
        field_map = config.get("field_map", {})
        result = []
        for item in data:
            new_item = {}
            for old_field, new_field in field_map.items():
                new_item[new_field] = item.get(old_field)
            result.append(new_item)
        return result

    def apply_aggregate(self, data: list[dict], config: dict) -> list[dict]:
        """Apply aggregate transformation."""
        group_by = config.get("group_by", [])
        agg_field = config.get("aggregate_field")
        agg_func = config.get("aggregate_function", "sum")

        groups = {}
        for item in data:
            key = tuple(item.get(f) for f in group_by)
            if key not in groups:
                groups[key] = []
            groups[key].append(item.get(agg_field, 0))

        result = []
        for key, values in groups.items():
            row = dict(zip(group_by, key))
            if agg_func == "sum":
                row["aggregated"] = sum(values)
            elif agg_func == "avg":
                row["aggregated"] = sum(values) / len(values) if values else 0
            elif agg_func == "count":
                row["aggregated"] = len(values)
            elif agg_func == "min":
                row["aggregated"] = min(values) if values else 0
            elif agg_func == "max":
                row["aggregated"] = max(values) if values else 0
            result.append(row)
        return result

    def apply_deduplicate(self, data: list[dict], config: dict) -> list[dict]:
        """Apply deduplicate transformation."""
        key_fields = config.get("key_fields", [])
        seen = set()
        result = []
        for item in data:
            key = tuple(item.get(f) for f in key_fields)
            if key not in seen:
                seen.add(key)
                result.append(item)
        return result

    def apply_normalize(self, data: list[dict], config: dict) -> list[dict]:
        """Apply normalize transformation."""
        field = config.get("field")
        min_val = config.get("min", 0)
        max_val = config.get("max", 1)

        values = [item.get(field, 0) for item in data]
        data_min = min(values) if values else 0
        data_max = max(values) if values else 1
        data_range = data_max - data_min

        result = []
        for item in data:
            new_item = item.copy()
            if data_range > 0:
                normalized = (item.get(field, 0) - data_min) / data_range
                new_item[field] = min_val + normalized * (max_val - min_val)
            result.append(new_item)
        return result


class MappingOrchestrator:
    """Orchestrates data mapping pipelines."""

    def __init__(self):
        self._pipelines: dict[str, MappingPipeline] = {}
        self._results: dict[str, list[MappingResult]] = {}
        self._transform_engine = TransformEngine()

    def create_pipeline(self, pipeline: MappingPipeline) -> MappingPipeline:
        """Create a new mapping pipeline."""
        self._pipelines[pipeline.id] = pipeline
        self._results[pipeline.id] = []
        return pipeline

    def get_pipeline(self, pipeline_id: str) -> MappingPipeline | None:
        """Get a pipeline by ID."""
        return self._pipelines.get(pipeline_id)

    def list_pipelines(self) -> list[MappingPipeline]:
        """List all pipelines."""
        return list(self._pipelines.values())

    async def run_pipeline(self, pipeline_id: str) -> MappingResult:
        """Execute a pipeline."""
        pipeline = self._pipelines.get(pipeline_id)
        if not pipeline:
            raise ValueError(f"Pipeline {pipeline_id} not found")

        result = MappingResult(
            pipeline_id=pipeline_id,
            status=PipelineStatus.RUNNING,
        )

        start_time = datetime.now(timezone.utc)

        try:
            # TODO: Implement actual data extraction from source
            # For now, return a placeholder result
            result.status = PipelineStatus.COMPLETED
            result.records_processed = 0
            result.completed_at = datetime.now(timezone.utc)
            result.duration_ms = (result.completed_at - start_time).total_seconds() * 1000

            logger.info(
                "pipeline_completed",
                pipeline_id=pipeline_id,
                duration_ms=result.duration_ms,
            )
        except Exception as e:
            result.status = PipelineStatus.FAILED
            result.error = str(e)
            result.completed_at = datetime.now(timezone.utc)
            result.duration_ms = (result.completed_at - start_time).total_seconds() * 1000

            logger.error(
                "pipeline_failed",
                pipeline_id=pipeline_id,
                error=str(e),
            )

        self._results[pipeline_id].append(result)
        return result

    def get_pipeline_status(self, pipeline_id: str) -> list[MappingResult]:
        """Get pipeline execution results."""
        return self._results.get(pipeline_id, [])


# Singleton instance
_orchestrator: MappingOrchestrator | None = None


def get_orchestrator() -> MappingOrchestrator:
    """Get the mapping orchestrator singleton."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = MappingOrchestrator()
    return _orchestrator
