"""Knowledge Graph Engine - NetworkX-based graph algorithms and operations."""

import networkx as nx
from datetime import datetime
from constellation.models.graph import (
    GraphNode, GraphEdge, KnowledgeGraph, GraphStats,
    NodeType, EdgeType, Community, ImpactReport
)
from constellation.utils.logger import get_logger

logger = get_logger(__name__)


class GraphEngine:
    """Knowledge graph engine using NetworkX for graph computations."""

    def __init__(self):
        self._graphs: dict[str, nx.DiGraph] = {}
        self._metadata: dict[str, KnowledgeGraph] = {}

    def create_graph(self, graph_id: str, root_path: str) -> KnowledgeGraph:
        """Create a new knowledge graph."""
        G = nx.DiGraph()
        self._graphs[graph_id] = G
        meta = KnowledgeGraph(root_path=root_path, id=graph_id)
        self._metadata[graph_id] = meta
        return meta

    def add_node(self, graph_id: str, node: GraphNode) -> None:
        """Add a node to the graph."""
        if graph_id not in self._graphs:
            raise ValueError(f"Graph {graph_id} not found")

        G = self._graphs[graph_id]
        G.add_node(
            node.id,
            name=node.name,
            type=node.type.value,
            extension=node.extension,
            size=node.size,
            embedding=node.embedding,
            agent_activity=node.agent_activity,
            metadata=node.metadata,
        )

    def add_edge(self, graph_id: str, edge: GraphEdge) -> None:
        """Add an edge to the graph."""
        if graph_id not in self._graphs:
            raise ValueError(f"Graph {graph_id} not found")

        G = self._graphs[graph_id]
        G.add_edge(
            edge.source,
            edge.target,
            type=edge.type.value,
            weight=edge.weight,
            metadata=edge.metadata,
        )

    def get_node(self, graph_id: str, node_id: str) -> dict | None:
        """Get a node by ID."""
        if graph_id not in self._graphs:
            return None
        G = self._graphs[graph_id]
        if node_id not in G.nodes:
            return None
        return dict(G.nodes[node_id])

    def get_neighbors(
        self, graph_id: str, node_id: str, direction: str = "both", edge_types: list[str] | None = None
    ) -> list[dict]:
        """Get neighbors of a node."""
        if graph_id not in self._graphs:
            return []
        G = self._graphs[graph_id]
        if node_id not in G.nodes:
            return []

        neighbors = []
        if direction in ("out", "both"):
            for _, target, data in G.out_edges(node_id, data=True):
                if edge_types is None or data.get("type") in edge_types:
                    neighbors.append({"node_id": target, "direction": "out", **data})
        if direction in ("in", "both"):
            for source, _, data in G.in_edges(node_id, data=True):
                if edge_types is None or data.get("type") in edge_types:
                    neighbors.append({"node_id": source, "direction": "in", **data})
        return neighbors

    def get_stats(self, graph_id: str) -> GraphStats:
        """Get graph statistics."""
        if graph_id not in self._graphs:
            return GraphStats()

        G = self._graphs[graph_id]
        node_type_counts = {}
        edge_type_counts = {}

        for _, data in G.nodes(data=True):
            ntype = data.get("type", "unknown")
            node_type_counts[ntype] = node_type_counts.get(ntype, 0) + 1

        for _, _, data in G.edges(data=True):
            etype = data.get("type", "unknown")
            edge_type_counts[etype] = edge_type_counts.get(etype, 0) + 1

        total_nodes = G.number_of_nodes()
        total_edges = G.number_of_edges()
        avg_connectivity = total_edges / total_nodes if total_nodes > 0 else 0

        return GraphStats(
            total_nodes=total_nodes,
            total_edges=total_edges,
            node_type_counts=node_type_counts,
            edge_type_counts=edge_type_counts,
            avg_connectivity=avg_connectivity,
        )

    def find_communities(self, graph_id: str) -> list[Community]:
        """Detect communities using greedy modularity."""
        if graph_id not in self._graphs:
            return []

        G = self._graphs[graph_id]
        communities = []

        try:
            # Convert to undirected for community detection
            undirected = G.to_undirected()
            from networkx.algorithms.community import greedy_modularity_communities
            comm_iter = greedy_modularity_communities(undirected)

            for i, comm in enumerate(comm_iter):
                communities.append(
                    Community(
                        name=f"Community {i + 1}",
                        node_ids=list(comm),
                        cohesion=len(comm) / G.number_of_nodes() if G.number_of_nodes() > 0 else 0,
                    )
                )
        except Exception as e:
            logger.error("community_detection_error", error=str(e))

        return communities

    def compute_centrality(self, graph_id: str, algorithm: str = "pagerank") -> dict[str, float]:
        """Compute centrality scores for all nodes."""
        if graph_id not in self._graphs:
            return {}

        G = self._graphs[graph_id]
        try:
            if algorithm == "pagerank":
                return nx.pagerank(G)
            elif algorithm == "betweenness":
                return nx.betweenness_centrality(G)
            elif algorithm == "eigenvector":
                return nx.eigenvector_centrality(G, max_iter=1000)
            elif algorithm == "degree":
                return dict(G.degree())
            else:
                logger.warning("unknown_centrality_algorithm", algorithm=algorithm)
                return {}
        except Exception as e:
            logger.error("centrality_error", algorithm=algorithm, error=str(e))
            return {}

    def find_paths(self, graph_id: str, source: str, target: str, max_depth: int = 5) -> list[list[str]]:
        """Find all paths between two nodes up to max_depth."""
        if graph_id not in self._graphs:
            return []

        G = self._graphs[graph_id]
        if source not in G or target not in G:
            return []

        try:
            paths = list(nx.all_simple_paths(G, source, target, cutoff=max_depth))
            return paths
        except Exception as e:
            logger.error("path_finding_error", source=source, target=target, error=str(e))
            return []

    def compute_impact(self, graph_id: str, node_id: str, change_type: str = "modify") -> ImpactReport:
        """Compute impact analysis for a node change."""
        if graph_id not in self._graphs:
            return ImpactReport(source_node_id=node_id)

        G = self._graphs[graph_id]
        if node_id not in G:
            return ImpactReport(source_node_id=node_id)

        # BFS to find all affected nodes (downstream dependents)
        affected = []
        depths = {}
        visited = set()
        queue = [(node_id, 0)]

        while queue:
            current, depth = queue.pop(0)
            if current in visited or depth > 5:
                continue
            visited.add(current)

            if current != node_id:
                affected.append(current)
                depths[current] = depth

            # Follow edges forward (dependents)
            for _, target in G.out_edges(current):
                if target not in visited:
                    queue.append((target, depth + 1))

        # Determine risk level
        risk_level = "low"
        if len(affected) > 10:
            risk_level = "medium"
        if len(affected) > 25:
            risk_level = "high"
        if len(affected) > 50:
            risk_level = "critical"

        return ImpactReport(
            source_node_id=node_id,
            affected_nodes=affected,
            affected_depths=depths,
            risk_level=risk_level,
            summary=f"Changing {node_id} affects {len(affected)} downstream nodes",
        )

    def find_similar_nodes(
        self, graph_id: str, node_id: str, top_k: int = 10
    ) -> list[dict]:
        """Find similar nodes based on embedding cosine similarity."""
        if graph_id not in self._graphs:
            return []

        G = self._graphs[graph_id]
        if node_id not in G:
            return []

        source_embedding = G.nodes[node_id].get("embedding")
        if not source_embedding:
            return []

        import numpy as np
        source_vec = np.array(source_embedding)

        similarities = []
        for other_id, data in G.nodes(data=True):
            if other_id == node_id:
                continue
            other_embedding = data.get("embedding")
            if other_embedding:
                other_vec = np.array(other_embedding)
                # Cosine similarity
                dot_product = np.dot(source_vec, other_vec)
                norm_product = np.linalg.norm(source_vec) * np.linalg.norm(other_vec)
                similarity = dot_product / norm_product if norm_product > 0 else 0
                similarities.append({"node_id": other_id, "similarity": float(similarity)})

        # Sort by similarity and return top_k
        similarities.sort(key=lambda x: x["similarity"], reverse=True)
        return similarities[:top_k]
