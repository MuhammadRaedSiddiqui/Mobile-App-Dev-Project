import { config } from '@/config/env';
import { api } from './api';

export interface Message {
  id: string;
  threadId: string;
  listingId: string;
  fromUid: string;
  toUid: string;
  text: string;
  createdAt: string;
  readAt?: string;
}

export interface MessageThreadSummary {
  threadId: string;
  listingId: string;
  listingTitle: string;
  otherPartyUid: string;
  otherPartyName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface MockThread {
  threadId: string;
  listingId: string;
  listingTitle: string;
  agentName: string;
  agentUid: string;
}

const mockMessages: Message[] = [];
const mockThreadMeta = new Map<string, MockThread>();
let mockCounter = 1;

export const messagesService = {
  async sendMessage(input: {
    listingId: string;
    text: string;
    seekerUid?: string;
    threadId?: string;
    senderUid?: string;
    agentName?: string;
    listingTitle?: string;
  }): Promise<Message> {
    if (config.useMockData) {
      const tid = input.threadId ?? `thread-${input.listingId}-mock`;
      const msg: Message = {
        id: `msg-mock-${mockCounter++}`,
        threadId: tid,
        listingId: input.listingId,
        fromUid: input.senderUid ?? '__self__',
        toUid: 'agent',
        text: input.text,
        createdAt: new Date().toISOString(),
      };
      mockMessages.push(msg);
      if (!mockThreadMeta.has(tid)) {
        mockThreadMeta.set(tid, {
          threadId: tid,
          listingId: input.listingId,
          listingTitle: input.listingTitle ?? 'Listing',
          agentName: input.agentName ?? 'Agent',
          agentUid: 'agent',
        });
      }
      return msg;
    }
    const { data } = await api.post('/messages', input);
    return data.message;
  },

  async listThreads(): Promise<MessageThreadSummary[]> {
    if (config.useMockData) {
      const threads = new Map<string, MessageThreadSummary>();
      for (const m of mockMessages) {
        const meta = mockThreadMeta.get(m.threadId);
        const existing = threads.get(m.threadId);
        if (!existing || m.createdAt > existing.lastMessageAt) {
          threads.set(m.threadId, {
            threadId: m.threadId,
            listingId: m.listingId,
            listingTitle: meta?.listingTitle ?? 'Listing',
            otherPartyUid: meta?.agentUid ?? m.toUid,
            otherPartyName: meta?.agentName ?? 'Agent',
            lastMessage: m.text,
            lastMessageAt: m.createdAt,
            unreadCount: 0,
          });
        }
      }
      return [...threads.values()].sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      );
    }
    const { data } = await api.get('/messages');
    return data.threads;
  },

  async getThread(threadId: string): Promise<Message[]> {
    if (config.useMockData) {
      return mockMessages.filter((m) => m.threadId === threadId);
    }
    const { data } = await api.get(`/messages/${threadId}`);
    return data.messages;
  },

  async markRead(threadId: string): Promise<void> {
    if (config.useMockData) return;
    await api.put(`/messages/${threadId}/read`);
  },
};
