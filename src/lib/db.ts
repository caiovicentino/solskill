// Database abstraction - File-based for hackathon, easy to swap for Redis/Postgres
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), '.data');
const AGENTS_FILE = join(DATA_DIR, 'agents.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  wallet: string;
  userId: string;
  twitterUsername?: string;
  tweetId?: string;
  tweetUrl?: string;
  apiKey: string;
  verified: boolean;
  verifiedAt?: string;
  createdAt: string;
  lastUsedAt?: string;
  requestCount: number;
}

// Load agents from file
function loadAgents(): Map<string, Agent> {
  ensureDataDir();
  if (!existsSync(AGENTS_FILE)) {
    return new Map();
  }
  try {
    const data = JSON.parse(readFileSync(AGENTS_FILE, 'utf-8'));
    return new Map(Object.entries(data));
  } catch {
    return new Map();
  }
}

// Save agents to file
function saveAgents(agents: Map<string, Agent>) {
  ensureDataDir();
  const data = Object.fromEntries(agents);
  writeFileSync(AGENTS_FILE, JSON.stringify(data, null, 2));
}

// Database operations
export const db = {
  // Get agent by API key
  getAgentByApiKey(apiKey: string): Agent | null {
    const agents = loadAgents();
    return agents.get(apiKey) || null;
  },

  // Get agent by ID
  getAgentById(id: string): Agent | null {
    const agents = loadAgents();
    for (const agent of agents.values()) {
      if (agent.id === id) return agent;
    }
    return null;
  },

  // Get agent by Twitter username
  getAgentByTwitter(username: string): Agent | null {
    const agents = loadAgents();
    for (const agent of agents.values()) {
      if (agent.twitterUsername?.toLowerCase() === username.toLowerCase()) {
        return agent;
      }
    }
    return null;
  },

  // Create agent
  createAgent(agent: Agent): Agent {
    const agents = loadAgents();
    agents.set(agent.apiKey, agent);
    saveAgents(agents);
    return agent;
  },

  // Update agent
  updateAgent(apiKey: string, updates: Partial<Agent>): Agent | null {
    const agents = loadAgents();
    const agent = agents.get(apiKey);
    if (!agent) return null;
    
    const updated = { ...agent, ...updates };
    agents.set(apiKey, updated);
    saveAgents(agents);
    return updated;
  },

  // Delete agent
  deleteAgent(apiKey: string): boolean {
    const agents = loadAgents();
    const deleted = agents.delete(apiKey);
    if (deleted) saveAgents(agents);
    return deleted;
  },

  // Validate API key exists
  validateApiKey(apiKey: string): boolean {
    if (!apiKey || !apiKey.startsWith('clawfi_')) return false;
    const agent = this.getAgentByApiKey(apiKey);
    return agent !== null && agent.verified;
  },

  // Increment request count
  incrementRequestCount(apiKey: string): void {
    const agents = loadAgents();
    const agent = agents.get(apiKey);
    if (agent) {
      agent.requestCount = (agent.requestCount || 0) + 1;
      agent.lastUsedAt = new Date().toISOString();
      agents.set(apiKey, agent);
      saveAgents(agents);
    }
  },

  // Get all agents (for admin)
  getAllAgents(): Agent[] {
    const agents = loadAgents();
    return Array.from(agents.values());
  },
};
