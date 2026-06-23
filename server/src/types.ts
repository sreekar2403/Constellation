import type { IPty } from 'node-pty';
import type { AgentNode, AgentConfig } from '@constellation/shared';

export interface AgentHandle {
  id: string;
  process: IPty;
  config: AgentConfig;
  state: AgentNode['state'];
  buffer: string;
  createdAt: string;
}
