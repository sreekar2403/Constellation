import { create } from 'zustand';
import type { AgentNode, EdgeData, AgentEvent } from '@constellation/shared';

interface AgentStore {
  agents: Record<string, AgentNode>;
  edges: Record<string, EdgeData>;

  addAgent: (agent: AgentNode) => void;
  updateAgentState: (agentId: string, state: AgentNode['state']) => void;
  updateAgentPosition: (agentId: string, position: { x: number; y: number; z: number }) => void;
  setPendingQuestion: (agentId: string, question: AgentNode['pendingQuestion']) => void;
  removeAgent: (agentId: string) => void;

  addEdge: (edge: EdgeData) => void;
  updateEdgeActivity: (edgeId: string) => void;
  removeEdge: (edgeId: string) => void;

  handleEvent: (event: AgentEvent) => void;
  reset: () => void;

  // Derived selectors as methods
  getAgentArray: () => AgentNode[];
  getEdgeArray: () => EdgeData[];
  getWaitingAgents: () => AgentNode[];
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: {},
  edges: {},

  addAgent: (agent) =>
    set((state) => ({ agents: { ...state.agents, [agent.id]: agent } })),

  updateAgentState: (agentId, state) =>
    set((s) => {
      const agent = s.agents[agentId];
      if (!agent) return s;
      return { agents: { ...s.agents, [agentId]: { ...agent, state } } };
    }),

  updateAgentPosition: (agentId, position) =>
    set((s) => {
      const agent = s.agents[agentId];
      if (!agent) return s;
      return { agents: { ...s.agents, [agentId]: { ...agent, position } } };
    }),

  setPendingQuestion: (agentId, question) =>
    set((s) => {
      const agent = s.agents[agentId];
      if (!agent) return s;
      return { agents: { ...s.agents, [agentId]: { ...agent, pendingQuestion: question } } };
    }),

  removeAgent: (agentId) =>
    set((s) => {
      const { [agentId]: _, ...rest } = s.agents;
      // Also remove associated edges
      const edges = Object.values(s.edges).reduce<Record<string, EdgeData>>((acc, e) => {
        if (e.sourceId !== agentId && e.targetId !== agentId) {
          acc[e.id] = e;
        }
        return acc;
      }, {});
      return { agents: rest, edges };
    }),

  addEdge: (edge) =>
    set((state) => ({ edges: { ...state.edges, [edge.id]: edge } })),

  updateEdgeActivity: (edgeId) =>
    set((s) => {
      const edge = s.edges[edgeId];
      if (!edge) return s;
      return {
        edges: {
          ...s.edges,
          [edgeId]: { ...edge, lastActivityAt: new Date().toISOString() },
        },
      };
    }),

  removeEdge: (edgeId) =>
    set((s) => {
      const { [edgeId]: _, ...rest } = s.edges;
      return { edges: rest };
    }),

  handleEvent: (event) => {
    const state = get();
    switch (event.type) {
      case 'agent_spawned': {
        const newAgent: AgentNode = {
          id: event.agentId,
          name: (event.payload?.name as string) ?? event.agentId,
          tool: (event.payload?.tool as AgentNode['tool']) ?? 'opencode',
          model: (event.payload?.model as string) ?? 'default',
          parentId: event.parentId ?? null,
          state: 'initializing',
          workingDirectory: '.',
          createdAt: event.timestamp,
          pendingQuestion: null,
          topologyRole: event.parentId ? 'worker' : 'orchestrator',
          position: { x: Math.random() * 4 - 2, y: 0, z: Math.random() * 4 - 2 },
        };
        state.addAgent(newAgent);

        if (event.parentId) {
          const edge: EdgeData = {
            id: `edge-${event.parentId}-${event.agentId}`,
            sourceId: event.parentId,
            targetId: event.agentId,
            type: 'parent_child',
            lastActivityAt: event.timestamp,
          };
          state.addEdge(edge);
        }
        break;
      }

      case 'agent_state_changed': {
        const newState = event.payload?.state as AgentNode['state'];
        if (newState) {
          state.updateAgentState(event.agentId, newState);
        }
        break;
      }

      case 'agent_question': {
        state.setPendingQuestion(event.agentId, {
          promptText: (event.payload?.promptText as string) ?? '',
          suggestedReplies: (event.payload?.suggestedReplies as string[]) ?? [],
          rawTerminalContext: (event.payload?.rawTerminalContext as string) ?? '',
        });
        break;
      }

      case 'agent_answer': {
        state.setPendingQuestion(event.agentId, null);
        break;
      }

      case 'agent_completed':
        state.updateAgentState(event.agentId, 'completed');
        break;

      case 'agent_error':
        state.updateAgentState(event.agentId, 'error');
        break;

      case 'agent_message': {
        // Could trigger edge activity
        break;
      }
    }
  },

  reset: () => set({ agents: {}, edges: {} }),

  getAgentArray: () => Object.values(get().agents),
  getEdgeArray: () => Object.values(get().edges),
  getWaitingAgents: () =>
    Object.values(get().agents).filter((a) => a.state === 'waiting_for_input'),
}));
