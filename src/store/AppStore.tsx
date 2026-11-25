import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as mock from '../data/mock';
import type {
  AgentLog,
  AiService,
  AppNotification,
  ChatMessage,
  Dialog,
  KnowledgeEdge,
  MyAgent,
  Room,
  Task,
} from '../data/types';

export type WidgetId = 'funnel' | 'nps' | 'velocity' | 'incidents' | 'notifications' | 'support';

export interface WidgetConfig {
  id: WidgetId;
  threshold?: number;
}

export interface Settings {
  theme: 'light' | 'dark';
  language: 'ru' | 'en';
  detail: number; // 1..3 уровень детализации ассистента
  compact: boolean;
}

interface State {
  productId: string;
  tasks: Task[];
  backlogOrder: string[];
  myAgents: MyAgent[];
  agentLogs: AgentLog[];
  customAgents: { id: string; name: string; trigger: string; condition: string; action: string }[];
  services: AiService[];
  favorites: string[];
  notifications: AppNotification[];
  dialogs: Dialog[];
  rooms: Room[];
  edges: KnowledgeEdge[];
  widgets: WidgetConfig[];
  settings: Settings;
}

const STORAGE_KEY = 'co-pilot-state-v1';

const initialState = (): State => ({
  productId: 'mb',
  tasks: mock.tasks,
  backlogOrder: [...mock.tasks]
    .filter((t) => t.status !== 'done')
    .sort((a, b) => mock.taskScore(b) - mock.taskScore(a))
    .map((t) => t.key),
  myAgents: mock.myAgents,
  agentLogs: mock.agentLogs,
  customAgents: [],
  services: mock.services,
  favorites: ['gpt-docs', 'sql-ai'],
  notifications: mock.notifications,
  dialogs: mock.dialogs,
  rooms: mock.rooms,
  edges: mock.knowledgeEdges,
  widgets: [
    { id: 'funnel', threshold: 5 },
    { id: 'nps' },
    { id: 'velocity' },
    { id: 'incidents' },
    { id: 'notifications' },
  ],
  settings: { theme: 'light', language: 'ru', detail: 2, compact: false },
});

const load = (): State => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...initialState(), ...JSON.parse(raw) };
  } catch {
    /* storage недоступен — работаем в памяти */
  }
  return initialState();
};

const uid = () => Math.random().toString(36).slice(2, 10);

function useStoreValue() {
  const [state, setState] = useState<State>(load);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const patch = (fn: (s: State) => Partial<State>) => setState((s) => ({ ...s, ...fn(s) }));

  const actions = {
    setProduct: (productId: string) => patch(() => ({ productId })),

    updateTask: (key: string, changes: Partial<Task>) =>
      patch((s) => ({
        tasks: s.tasks.map((t) =>
          t.key === key
            ? {
                ...t,
                ...changes,
                history: [
                  ...t.history,
                  {
                    time: new Date().toISOString(),
                    author: mock.CURRENT_USER,
                    text: changes.status
                      ? `Статус: ${mock.statusLabels[changes.status]}`
                      : changes.sprint
                        ? `Перенесена в ${changes.sprint}`
                        : 'Задача обновлена',
                  },
                ],
              }
            : t,
        ),
      })),

    createTask: (data: Pick<Task, 'title' | 'type' | 'priority' | 'assignee' | 'description'> & Partial<Task>) => {
      const nextNum = Math.max(...state.tasks.filter((t) => t.key.startsWith('CP-')).map((t) => Number(t.key.split('-')[1]))) + 1;
      const task: Task = {
        key: `CP-${nextNum}`,
        status: 'todo',
        sprint: 'Спринт 25',
        product: mock.products.find((p) => p.id === state.productId)?.name ?? 'Мобильный банк',
        risk: 'none',
        labels: [],
        metric: '—',
        impact: '—',
        dueDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
        storyPoints: 3,
        acceptance: [],
        reach: 1000,
        impactScore: 1,
        confidence: 0.5,
        effort: 1,
        compliance: 0,
        strategy: 5,
        ready: { design: false, criteria: false, estimate: false },
        related: [],
        history: [{ time: new Date().toISOString(), author: mock.CURRENT_USER, text: 'Задача создана' }],
        ...data,
      };
      patch((s) => ({ tasks: [task, ...s.tasks], backlogOrder: [...s.backlogOrder, task.key] }));
      return task;
    },

    setBacklogOrder: (backlogOrder: string[]) => patch(() => ({ backlogOrder })),

    toggleAgent: (agentId: string, active: boolean) =>
      patch((s) => ({
        myAgents: s.myAgents.map((a) => (a.agentId === agentId ? { ...a, active, status: active ? 'ok' : 'paused' } : a)),
      })),
    addAgent: (agentId: string) =>
      patch((s) =>
        s.myAgents.some((a) => a.agentId === agentId)
          ? {}
          : { myAgents: [...s.myAgents, { agentId, active: true, status: 'ok', lastRun: new Date().toISOString(), events24h: 0 }] },
      ),
    removeAgent: (agentId: string) =>
      patch((s) => ({
        myAgents: s.myAgents.filter((a) => a.agentId !== agentId),
        customAgents: s.customAgents.filter((a) => a.id !== agentId),
      })),
    createCustomAgent: (a: { name: string; trigger: string; condition: string; action: string }) => {
      const id = `custom-${uid()}`;
      patch((s) => ({
        customAgents: [...s.customAgents, { id, ...a }],
        myAgents: [...s.myAgents, { agentId: id, active: true, status: 'ok', lastRun: new Date().toISOString(), events24h: 0 }],
        agentLogs: [
          { id: uid(), agent: a.name, time: new Date().toISOString(), level: 'info', text: `Агент создан: ${a.trigger} → ${a.action}` },
          ...s.agentLogs,
        ],
      }));
    },

    toggleFavorite: (id: string) =>
      patch((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id] })),
    rateService: (id: string, rating: number, text: string) =>
      patch((s) => ({
        services: s.services.map((sv) =>
          sv.id === id
            ? {
                ...sv,
                rating: Math.round(((sv.rating * sv.votes + rating) / (sv.votes + 1)) * 10) / 10,
                votes: sv.votes + 1,
                comments: text ? [{ author: mock.CURRENT_USER, text, rating }, ...sv.comments] : sv.comments,
              }
            : sv,
        ),
      })),
    proposeService: (sv: Pick<AiService, 'name' | 'category' | 'description' | 'url'>) =>
      patch((s) => ({
        services: [
          ...s.services,
          {
            ...sv,
            id: uid(),
            fullDescription: sv.description,
            rating: 0,
            votes: 0,
            price: 'На рассмотрении',
            corporate: false,
            color: '#8c8c8c',
            examples: [],
            comments: [],
          },
        ],
      })),

    markRead: (id: string) => patch((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
    markAllRead: () => patch((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    pushNotification: (n: Omit<AppNotification, 'id' | 'time' | 'read'>) =>
      patch((s) => ({ notifications: [{ ...n, id: uid(), time: new Date().toISOString(), read: false }, ...s.notifications] })),

    createDialog: (d: Omit<Dialog, 'id' | 'messages'>) => {
      const dialog: Dialog = { ...d, id: uid(), messages: [] };
      patch((s) => ({ dialogs: [dialog, ...s.dialogs] }));
      return dialog;
    },
    addMessage: (dialogId: string, m: Omit<ChatMessage, 'id' | 'time'>) =>
      patch((s) => ({
        dialogs: s.dialogs.map((d) =>
          d.id === dialogId ? { ...d, messages: [...d.messages, { ...m, id: uid(), time: new Date().toISOString() }] } : d,
        ),
      })),

    createRoom: (r: Omit<Room, 'id'>) => {
      const room = { ...r, id: uid() };
      patch((s) => ({ rooms: [room, ...s.rooms] }));
      return room;
    },

    addEdge: (e: KnowledgeEdge) => patch((s) => ({ edges: [...s.edges, e] })),

    setWidgets: (widgets: WidgetConfig[]) => patch(() => ({ widgets })),

    updateSettings: (changes: Partial<Settings>) => patch((s) => ({ settings: { ...s.settings, ...changes } })),

    resetDemo: () => setState(initialState()),
  };

  return {
    ...state,
    ...actions,
    createTaskOpen,
    setCreateTaskOpen,
    createRoomOpen,
    setCreateRoomOpen,
    unreadCount: state.notifications.filter((n) => !n.read).length,
  };
}

type Store = ReturnType<typeof useStoreValue>;
const StoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside AppStoreProvider');
  return ctx;
}

/** Удобный хелпер: найти описание агента (готового или созданного в конструкторе). */
export function useAgentInfo() {
  const { customAgents } = useStore();
  return useMemo(
    () => (id: string) => {
      const ready = mock.agents.find((a) => a.id === id);
      if (ready) return { name: ready.name, category: ready.category as string, trigger: ready.trigger };
      const c = customAgents.find((a) => a.id === id);
      return c ? { name: c.name, category: 'Свой агент', trigger: c.trigger } : { name: id, category: '—', trigger: '—' };
    },
    [customAgents],
  );
}
