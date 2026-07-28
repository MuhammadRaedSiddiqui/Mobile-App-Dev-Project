import { config } from '@/config/env';
import { Listing, ListingAgent } from '@/utils/types';
import { MOCK_AGENTS, MOCK_LISTINGS } from '@/mocks/data';
import { api } from './api';

export interface PublicAgentProfile {
  agent: ListingAgent;
  stats: { activeListingCount: number; freshCount: number };
  listings: Listing[];
}

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const agentsService = {
  async getPublicProfile(agentId: string): Promise<PublicAgentProfile> {
    if (config.useMockData) {
      const agent = MOCK_AGENTS[agentId];
      if (!agent) throw new Error('This agent could not be found.');
      const listings = MOCK_LISTINGS.filter(
        (l) => l.agentId === agentId && l.status === 'active',
      ).sort((a, b) => {
        const r = { fresh: 0, aging: 1, stale: 2 } as const;
        return r[a.freshness.status] - r[b.freshness.status];
      });
      return delay({
        agent,
        stats: {
          activeListingCount: listings.length,
          freshCount: listings.filter((l) => l.freshness.status === 'fresh').length,
        },
        listings,
      });
    }
    const { data } = await api.get(`/agents/${agentId}`);
    return {
      agent: data.agent,
      stats: data.stats,
      listings: data.listings,
    };
  },
};
