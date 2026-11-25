export type TaskStatus = 'todo' | 'inprogress' | 'review' | 'testing' | 'done';
export type Priority = 'highest' | 'high' | 'medium' | 'low';
export type Risk = 'none' | 'atrisk' | 'overdue';

export interface Task {
  key: string;
  title: string;
  type: 'story' | 'bug' | 'incident' | 'tech';
  status: TaskStatus;
  assignee: string;
  priority: Priority;
  sprint: string;
  product: string;
  risk: Risk;
  labels: string[];
  metric: string;
  impact: string;
  dueDate: string;
  storyPoints: number;
  description: string;
  acceptance: string[];
  /** RICE-параметры */
  reach: number;
  impactScore: number; // 0.25..3
  confidence: number; // 0..1
  effort: number; // человеко-недели
  compliance: number; // 0..10, выше — больше регуляторный риск, который снимает задача
  strategy: number; // 0..10 соответствие стратегии
  ready: { design: boolean; criteria: boolean; estimate: boolean };
  related: { type: 'pr' | 'figma' | 'confluence'; title: string }[];
  history: { time: string; author: string; text: string }[];
  severity?: 'critical' | 'major' | 'minor';
}

export interface Agent {
  id: string;
  name: string;
  category: 'Метрики' | 'Разработка' | 'Поддержка' | 'Планирование' | 'Compliance' | 'Рынок';
  description: string;
  popularity: number; // 0..100
  sources: string[];
  logic: string;
  examples: string[];
  trigger: string;
  condition: string;
  action: string;
}

export interface MyAgent {
  agentId: string;
  active: boolean;
  status: 'ok' | 'warning' | 'error' | 'paused';
  lastRun: string;
  events24h: number;
}

export interface AgentLog {
  id: string;
  agent: string;
  time: string;
  level: 'info' | 'warning' | 'error';
  text: string;
}

export type ServiceCategory =
  | 'Текст и документация'
  | 'Дизайн'
  | 'Код'
  | 'Аналитика'
  | 'Исследования'
  | 'Прототипирование'
  | 'Автоматизация';

export interface AiService {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  fullDescription: string;
  rating: number;
  votes: number;
  url: string;
  price: string;
  corporate: boolean;
  color: string;
  examples: string[];
  comments: { author: string; text: string; rating: number }[];
  popularInBank?: boolean;
}

export type NotificationType = 'incident' | 'agent' | 'mention' | 'service';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
  link?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  author: string;
  text: string;
  time: string;
  chart?: 'funnel' | 'sparkline' | 'burndown';
  cards?: { title: string; type: 'pr' | 'task' | 'confluence' | 'figma' | 'metric'; meta?: string }[];
}

export interface Dialog {
  id: string;
  group: 'personal' | 'group' | 'task';
  title: string;
  taskKey?: string;
  context: { product: string; sprint?: string; task?: string };
  participants: string[];
  messages: ChatMessage[];
}

export interface Room {
  id: string;
  type: 'planning' | 'retro' | 'grooming';
  title: string;
  status: 'scheduled' | 'live' | 'finished';
  date: string;
  participants: string[];
}

export type NodeType = 'epic' | 'task' | 'pr' | 'metric' | 'confluence' | 'research';

export interface KnowledgeNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  description: string;
  author: string;
  updated: string;
  history: { time: string; text: string }[];
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  label: string;
}

export interface Product {
  id: string;
  name: string;
  team: string;
}
