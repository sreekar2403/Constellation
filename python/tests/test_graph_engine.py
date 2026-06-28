"""Tests for the graph engine service."""

import pytest
from constellation.services.graph_engine import GraphEngine
from constellation.models.graph import GraphNode, GraphEdge, NodeType, EdgeType


class TestGraphEngine:
    """Tests for GraphEngine class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.engine = GraphEngine()

    def test_create_graph(self):
        """Test creating a new graph."""
        meta = self.engine.create_graph("test_graph", "/test/path")
        assert meta.id == "test_graph"
        assert meta.root_path == "/test/path"

    def test_add_node(self):
        """Test adding a node to the graph."""
        self.engine.create_graph("test_graph", "/test/path")
        node = GraphNode(name="test.py", type=NodeType.FILE)
        self.engine.add_node("test_graph", node)
        
        result = self.engine.get_node("test_graph", node.id)
        assert result is not None
        assert result["name"] == "test.py"

    def test_add_edge(self):
        """Test adding an edge to the graph."""
        self.engine.create_graph("test_graph", "/test/path")
        
        node1 = GraphNode(name="a.py", type=NodeType.FILE)
        node2 = GraphNode(name="b.py", type=NodeType.FILE)
        self.engine.add_node("test_graph", node1)
        self.engine.add_node("test_graph", node2)
        
        edge = GraphEdge(source=node1.id, target=node2.id, type=EdgeType.IMPORTS)
        self.engine.add_edge("test_graph", edge)
        
        neighbors = self.engine.get_neighbors("test_graph", node1.id, "out")
        assert len(neighbors) == 1

    def test_get_stats(self):
        """Test getting graph statistics."""
        self.engine.create_graph("test_graph", "/test/path")
        
        for i in range(5):
            node = GraphNode(name=f"file_{i}.py", type=NodeType.FILE)
            self.engine.add_node("test_graph", node)
        
        stats = self.engine.get_stats("test_graph")
        assert stats.total_nodes == 5

    def test_find_communities(self):
        """Test community detection."""
        self.engine.create_graph("test_graph", "/test/path")
        
        # Create a simple graph structure
        nodes = [GraphNode(name=f"node_{i}.py", type=NodeType.FILE) for i in range(6)]
        for node in nodes:
            self.engine.add_node("test_graph", node)
        
        # Create edges within two communities
        for i in range(3):
            for j in range(3):
                if i != j:
                    edge = GraphEdge(source=nodes[i].id, target=nodes[j].id, type=EdgeType.IMPORTS)
                    self.engine.add_edge("test_graph", edge)
        
        for i in range(3, 6):
            for j in range(3, 6):
                if i != j:
                    edge = GraphEdge(source=nodes[i].id, target=nodes[j].id, type=EdgeType.IMPORTS)
                    self.engine.add_edge("test_graph", edge)
        
        communities = self.engine.find_communities("test_graph")
        assert len(communities) >= 1

    def test_compute_centrality(self):
        """Test centrality computation."""
        self.engine.create_graph("test_graph", "/test/path")
        
        nodes = [GraphNode(name=f"node_{i}.py", type=NodeType.FILE) for i in range(4)]
        for node in nodes:
            self.engine.add_node("test_graph", node)
        
        # Create a star pattern (bidirectional so center is high-centrality)
        for i in range(1, 4):
            edge1 = GraphEdge(source=nodes[0].id, target=nodes[i].id, type=EdgeType.IMPORTS)
            edge2 = GraphEdge(source=nodes[i].id, target=nodes[0].id, type=EdgeType.IMPORTS)
            self.engine.add_edge("test_graph", edge1)
            self.engine.add_edge("test_graph", edge2)
        
        centrality = self.engine.compute_centrality("test_graph", "pagerank")
        assert len(centrality) == 4
        # Center node should have highest centrality
        assert centrality[nodes[0].id] > centrality[nodes[1].id]

    def test_find_paths(self):
        """Test path finding."""
        self.engine.create_graph("test_graph", "/test/path")
        
        nodes = [GraphNode(name=f"node_{i}.py", type=NodeType.FILE) for i in range(4)]
        for node in nodes:
            self.engine.add_node("test_graph", node)
        
        # Create a linear chain
        for i in range(3):
            edge = GraphEdge(source=nodes[i].id, target=nodes[i + 1].id, type=EdgeType.IMPORTS)
            self.engine.add_edge("test_graph", edge)
        
        paths = self.engine.find_paths("test_graph", nodes[0].id, nodes[3].id)
        assert len(paths) >= 1
        assert paths[0] == [nodes[0].id, nodes[1].id, nodes[2].id, nodes[3].id]

    def test_compute_impact(self):
        """Test impact analysis."""
        self.engine.create_graph("test_graph", "/test/path")
        
        nodes = [GraphNode(name=f"node_{i}.py", type=NodeType.FILE) for i in range(4)]
        for node in nodes:
            self.engine.add_node("test_graph", node)
        
        # Create edges
        for i in range(3):
            edge = GraphEdge(source=nodes[i].id, target=nodes[i + 1].id, type=EdgeType.DEPENDS_ON)
            self.engine.add_edge("test_graph", edge)
        
        impact = self.engine.compute_impact("test_graph", nodes[0].id)
        assert len(impact.affected_nodes) == 3
        assert impact.risk_level in ("low", "medium", "high", "critical")
