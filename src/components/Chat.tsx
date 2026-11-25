import { useEffect, useRef, useState } from 'react';
import { App, Avatar, Button, Card, Flex, Mentions, Space, Tag, Tooltip, Typography, theme } from 'antd';
import {
  ApiOutlined,
  AudioOutlined,
  BarChartOutlined,
  BranchesOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  FileAddOutlined,
  LoadingOutlined,
  RobotOutlined,
  SendOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ChatMessage } from '../data/types';
import { agents, colorOf, initials, team } from '../data/mock';
import { generateReply, slashCommands } from '../services/assistant';
import { useStore } from '../store/AppStore';
import { BurndownChart, FunnelChart, Sparkline } from './Charts';
import { npsSeries } from '../data/mock';

const cardIcon = {
  pr: <BranchesOutlined />,
  task: <CheckSquareOutlined />,
  confluence: <FileTextOutlined />,
  figma: <BgColorsOutlined />,
  metric: <BarChartOutlined />,
};

export function MessageBubble({ m, actions = true }: { m: ChatMessage; actions?: boolean }) {
  const { token } = theme.useToken();
  const { setCreateTaskOpen } = useStore();
  const { message } = App.useApp();
  const isAi = m.role === 'assistant';

  return (
    <Flex gap={10} align="flex-start" style={{ marginBottom: 16 }}>
      <Avatar style={{ background: isAi ? token.colorPrimary : colorOf(m.author), flex: 'none' }} icon={isAi ? <RobotOutlined /> : undefined}>
        {!isAi && initials(m.author)}
      </Avatar>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Space size={8}>
          <Typography.Text strong>{m.author}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(m.time).format('HH:mm')}
          </Typography.Text>
        </Space>
        <div
          style={{
            marginTop: 4,
            padding: isAi ? 12 : 0,
            borderRadius: token.borderRadiusLG,
            background: isAi ? token.colorPrimaryBg : undefined,
            border: isAi ? `1px solid ${token.colorPrimaryBorder}` : undefined,
          }}
        >
          <Typography.Paragraph className="cp-pre" style={{ marginBottom: 0 }}>
            {m.text}
          </Typography.Paragraph>
          {m.chart && (
            <Card size="small" style={{ marginTop: 10, maxWidth: 460 }}>
              {m.chart === 'funnel' && <FunnelChart />}
              {m.chart === 'sparkline' && <Sparkline data={npsSeries} height={70} />}
              {m.chart === 'burndown' && <BurndownChart />}
            </Card>
          )}
          {m.cards && (
            <Flex gap={8} wrap style={{ marginTop: 10 }}>
              {m.cards.map((c) => (
                <Card key={c.title} size="small" hoverable style={{ width: 220 }}>
                  <Space align="start">
                    <span style={{ color: token.colorPrimary }}>{cardIcon[c.type]}</span>
                    <div>
                      <Typography.Text style={{ fontSize: 13 }}>{c.title}</Typography.Text>
                      {c.meta && (
                        <div>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {c.meta}
                          </Typography.Text>
                        </div>
                      )}
                    </div>
                  </Space>
                </Card>
              ))}
            </Flex>
          )}
          {isAi && actions && (
            <Space wrap style={{ marginTop: 10 }}>
              <Button size="small" icon={<CheckSquareOutlined />} onClick={() => setCreateTaskOpen(true)}>
                Создать задачу
              </Button>
              <Button size="small" icon={<FileAddOutlined />} onClick={() => message.success('Страница создана в Confluence (демо)')}>
                Добавить в Confluence
              </Button>
              <Button size="small" icon={<ApiOutlined />} onClick={() => message.info('Запущен сервис DocWriter (демо)')}>
                Запустить сервис
              </Button>
            </Space>
          )}
        </div>
      </div>
    </Flex>
  );
}

type SpeechRecognitionLike = {
  lang: string;
  start: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
};

export function ChatInput({ onSend, placeholder, compact }: { onSend: (text: string) => void; placeholder?: string; compact?: boolean }) {
  const [value, setValue] = useState('');
  const [prefix, setPrefix] = useState('@');
  const [listening, setListening] = useState(false);
  const { message } = App.useApp();
  const { services } = useStore();

  const mentionOptions =
    prefix === '/'
      ? slashCommands.map((c) => ({ value: c.value.slice(1), label: c.label }))
      : [
          ...agents.map((a) => ({ value: a.name.replace(/\s/g, '_'), label: `🤖 ${a.name}` })),
          ...services.map((s) => ({ value: s.name, label: `🧩 ${s.name}` })),
          ...team.map((m) => ({ value: m.name.replace(/\s/g, '_'), label: `👤 ${m.name}` })),
        ];

  const send = () => {
    const t = value.trim();
    if (!t) return;
    onSend(t);
    setValue('');
  };

  const voice = () => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      message.warning('Голосовой ввод не поддерживается этим браузером');
      return;
    }
    const rec = new Ctor();
    rec.lang = 'ru-RU';
    rec.onresult = (e) => setValue((v) => `${v} ${e.results[0][0].transcript}`.trim());
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  return (
    <Flex gap={8} align="flex-end">
      <Mentions
        value={value}
        onChange={setValue}
        prefix={['@', '/']}
        onSearch={(_, p) => setPrefix(p)}
        options={mentionOptions}
        autoSize={{ minRows: 1, maxRows: compact ? 3 : 6 }}
        placeholder={placeholder ?? 'Спросите ассистента… «/» — команды, «@» — агенты, сервисы, коллеги'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent as KeyboardEvent).isComposing) {
            // если открыт список подсказок — Enter выбирает подсказку
            const popupOpen = document.querySelector('.ant-mentions-dropdown:not(.ant-mentions-dropdown-hidden)');
            if (!popupOpen) {
              e.preventDefault();
              send();
            }
          }
        }}
        style={{ flex: 1 }}
      />
      {!compact && (
        <Tooltip title="Упомянуть агента, сервис или коллегу">
          <Button onClick={() => setValue((v) => `${v}@`)}>@</Button>
        </Tooltip>
      )}
      <Tooltip title="Голосовой ввод">
        <Button icon={listening ? <LoadingOutlined /> : <AudioOutlined />} onClick={voice} aria-label="Голосовой ввод" />
      </Tooltip>
      <Button type="primary" icon={<SendOutlined />} onClick={send} aria-label="Отправить" />
    </Flex>
  );
}

/** Компактный чат с ассистентом для боковых панелей (комнаты, задачи). Хранит сообщения локально. */
export function MiniAssistantChat({ intro, suggestions = [], height = 320 }: { intro: string; suggestions?: string[]; height?: number }) {
  const { tasks, settings } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'intro', role: 'assistant', author: 'Ко-Пилот', text: intro, time: new Date().toISOString() },
  ]);
  const [typing, setTyping] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const ask = (text: string) => {
    const now = new Date().toISOString();
    setMessages((m) => [...m, { id: `u${m.length}`, role: 'user', author: 'Анна Петрова', text, time: now }]);
    setTyping(true);
    setTimeout(() => {
      const r = generateReply(text, tasks, settings.detail);
      setMessages((m) => [...m, { ...r, id: `a${m.length}`, time: new Date().toISOString() }]);
      setTyping(false);
    }, 700);
  };

  return (
    <Flex vertical gap={8}>
      <div ref={ref} style={{ height, overflowY: 'auto', paddingRight: 4 }}>
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} actions={false} />
        ))}
        {typing && (
          <Typography.Text type="secondary">
            <LoadingOutlined /> Ассистент печатает…
          </Typography.Text>
        )}
      </div>
      {suggestions.length > 0 && (
        <Flex gap={4} wrap>
          {suggestions.map((s) => (
            <Tag key={s} color="blue" style={{ cursor: 'pointer' }} onClick={() => ask(s)}>
              {s}
            </Tag>
          ))}
        </Flex>
      )}
      <ChatInput onSend={ask} compact placeholder="Спросить ассистента…" />
    </Flex>
  );
}
