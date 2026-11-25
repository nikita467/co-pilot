import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  BranchesOutlined,
  CheckSquareOutlined,
  LoadingOutlined,
  MessageOutlined,
  PaperClipOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useStore } from '../store/AppStore';
import { ChatInput, MessageBubble } from '../components/Chat';
import { Sparkline } from '../components/Charts';
import { CURRENT_USER, colorOf, initials, knowledgeNodes, npsSeries, products, sprints, team } from '../data/mock';
import { generateReply } from '../services/assistant';
import type { Dialog } from '../data/types';

const groups: { key: Dialog['group']; label: string; icon: ReactNode }[] = [
  { key: 'personal', label: 'Личные', icon: <UserOutlined /> },
  { key: 'group', label: 'Групповые', icon: <TeamOutlined /> },
  { key: 'task', label: 'По задачам', icon: <CheckSquareOutlined /> },
];

export default function AssistantPage() {
  const { dialogs, addMessage, createDialog, tasks, settings } = useStore();
  const [params, setParams] = useSearchParams();
  const [group, setGroup] = useState<Dialog['group'] | 'all'>('all');
  const [activeId, setActiveId] = useState<string | undefined>(params.get('dialog') ?? dialogs[0]?.id);
  const [typing, setTyping] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const handledQuery = useRef<string | null>(null);

  const active = dialogs.find((d) => d.id === activeId) ?? dialogs[0];

  const send = (text: string, dialogId = active?.id) => {
    if (!dialogId) return;
    addMessage(dialogId, { role: 'user', author: CURRENT_USER, text });
    setTyping(true);
    setTimeout(() => {
      addMessage(dialogId, generateReply(text, tasks, settings.detail));
      setTyping(false);
    }, 800);
  };

  // Вопрос, пришедший из дашборда / поиска / задач (?q=...)
  useEffect(() => {
    const q = params.get('q');
    if (q && handledQuery.current !== q) {
      handledQuery.current = q;
      const d = createDialog({
        group: 'personal',
        title: q.length > 40 ? `${q.slice(0, 40)}…` : q,
        context: { product: 'Мобильный банк', sprint: 'Спринт 24' },
        participants: [CURRENT_USER],
      });
      setActiveId(d.id);
      setTimeout(() => send(q, d.id), 50);
      params.delete('q');
      setParams(params, { replace: true });
    }
    const dlg = params.get('dialog');
    if (dlg) setActiveId(dlg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [active?.messages.length, typing]);

  const list = useMemo(
    () =>
      dialogs.filter(
        (d) => (group === 'all' || d.group === group) && (!filter || d.title.toLowerCase().includes(filter.toLowerCase())),
      ),
    [dialogs, group, filter],
  );

  const panelHeight = 'calc(100vh - 64px - 48px)';

  return (
    <Row gutter={16} style={{ height: panelHeight }}>
      {/* Левая панель — список диалогов */}
      <Col xs={24} md={7} xl={6} style={{ height: '100%' }}>
        <Card
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          styles={{ body: { padding: 12, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 } }}
        >
          <Button type="primary" icon={<PlusOutlined />} block onClick={() => setNewOpen(true)}>
            Новый диалог
          </Button>
          <Input.Search placeholder="Найти диалог" allowClear onChange={(e) => setFilter(e.target.value)} />
          <Segmented
            block
            size="small"
            value={group}
            onChange={(v) => setGroup(v as typeof group)}
            options={[{ label: 'Все', value: 'all' }, ...groups.map((g) => ({ label: g.label, value: g.key }))]}
          />
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {list.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет диалогов" />}
            {list.map((d) => {
              const last = d.messages[d.messages.length - 1];
              const g = groups.find((x) => x.key === d.group)!;
              const isActive = d.id === active?.id;
              return (
                <Flex
                  key={d.id}
                  gap={10}
                  onClick={() => setActiveId(d.id)}
                  style={{
                    padding: 10,
                    borderRadius: token.borderRadius,
                    cursor: 'pointer',
                    background: isActive ? token.controlItemBgActive : undefined,
                  }}
                >
                  <Avatar style={{ background: d.group === 'task' ? token.colorWarning : token.colorPrimary, flex: 'none' }} icon={g.icon} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Flex justify="space-between" gap={6}>
                      <Typography.Text strong ellipsis>
                        {d.title}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 11, flex: 'none' }}>
                        {last ? dayjs(last.time).format('HH:mm') : ''}
                      </Typography.Text>
                    </Flex>
                    <Typography.Text type="secondary" ellipsis style={{ fontSize: 12, display: 'block' }}>
                      {last ? `${last.role === 'assistant' ? 'Ко-Пилот: ' : ''}${last.text}` : 'Нет сообщений'}
                    </Typography.Text>
                  </div>
                </Flex>
              );
            })}
          </div>
        </Card>
      </Col>

      {/* Центр — чат */}
      <Col xs={24} md={17} xl={12} style={{ height: '100%' }}>
        <Card
          title={
            active ? (
              <Space>
                <MessageOutlined />
                {active.title}
              </Space>
            ) : (
              'Ассистент'
            )
          }
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 16 } }}
        >
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
            {active?.messages.length === 0 && (
              <Empty description="Задайте вопрос ассистенту">
                <Space wrap>
                  {['Почему упала конверсия?', '/отчёт', '/история', 'Что в топе бэклога?'].map((s) => (
                    <Tag key={s} color="blue" style={{ cursor: 'pointer' }} onClick={() => send(s)}>
                      {s}
                    </Tag>
                  ))}
                </Space>
              </Empty>
            )}
            {active?.messages.map((m) => <MessageBubble key={m.id} m={m} />)}
            {typing && (
              <Typography.Text type="secondary">
                <LoadingOutlined /> Ко-Пилот анализирует данные Jira, Git и метрик…
              </Typography.Text>
            )}
          </div>
          <div style={{ paddingTop: 12 }}>
            <ChatInput onSend={(t) => send(t)} />
          </div>
        </Card>
      </Col>

      {/* Правая панель — контекст */}
      <Col xs={0} xl={6} style={{ height: '100%' }}>
        <Card title="Контекст" style={{ height: '100%', overflowY: 'auto' }} styles={{ body: { padding: 16 } }}>
          {active && (
            <Flex vertical gap={16}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Продукт">{active.context.product}</Descriptions.Item>
                <Descriptions.Item label="Спринт">{active.context.sprint ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Задача">
                  {active.context.task ? (
                    <Typography.Link onClick={() => navigate(`/tasks/${active.context.task}`)}>{active.context.task}</Typography.Link>
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
              </Descriptions>

              <div>
                <Typography.Text type="secondary">Связанные метрики</Typography.Text>
                <Card size="small" style={{ marginTop: 6 }} hoverable onClick={() => navigate('/')}>
                  <Flex justify="space-between">
                    <Typography.Text>NPS</Typography.Text>
                    <Typography.Text strong>{npsSeries[npsSeries.length - 1]}</Typography.Text>
                  </Flex>
                  <Sparkline data={npsSeries} height={36} />
                </Card>
              </div>

              <div>
                <Typography.Text type="secondary">Последние изменения в коде</Typography.Text>
                {[
                  { pr: '#4533', t: 'Фикс отступов шага 4', a: 'Мария Ким', m: 12 },
                  { pr: '#4530', t: 'Маски полей анкеты', a: 'Мария Ким', m: 30 },
                  { pr: '#4521', t: 'Новая валидация паспорта', a: 'Игорь Смирнов', m: 120, warn: true },
                ].map((c) => (
                  <Flex key={c.pr} gap={8} style={{ marginTop: 8 }}>
                    <BranchesOutlined style={{ color: c.warn ? token.colorError : token.colorTextSecondary, marginTop: 4 }} />
                    <div>
                      <Typography.Text style={{ fontSize: 13 }}>
                        PR {c.pr} {c.t}
                      </Typography.Text>
                      <div>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {c.a} · {dayjs().subtract(c.m, 'minute').fromNow()}
                        </Typography.Text>
                        {c.warn && (
                          <Tag color="red" style={{ marginLeft: 6 }}>
                            подозрительный
                          </Tag>
                        )}
                      </div>
                    </div>
                  </Flex>
                ))}
              </div>

              <div>
                <Typography.Text type="secondary">Участники</Typography.Text>
                <Flex vertical gap={6} style={{ marginTop: 6 }}>
                  {active.participants.map((p) => (
                    <Space key={p}>
                      <Badge dot status="success" offset={[-2, 22]}>
                        <Avatar size="small" style={{ background: colorOf(p) }}>
                          {initials(p)}
                        </Avatar>
                      </Badge>
                      <Typography.Text>{p}</Typography.Text>
                    </Space>
                  ))}
                </Flex>
              </div>

              <Button icon={<PaperClipOutlined />} block onClick={() => setAttachOpen(true)}>
                Прикрепить артефакт
              </Button>
            </Flex>
          )}
        </Card>
      </Col>

      <Modal
        title="Новый диалог"
        open={newOpen}
        okText="Начать"
        cancelText="Отмена"
        onCancel={() => setNewOpen(false)}
        onOk={() =>
          form.validateFields().then((v) => {
            const d = createDialog({
              group: v.task ? 'task' : v.participants?.length > 1 ? 'group' : 'personal',
              title: v.title || (v.task ? `${v.task}: обсуждение` : 'Новый диалог'),
              taskKey: v.task,
              context: { product: products.find((p) => p.id === v.product)?.name ?? '', sprint: v.sprint, task: v.task },
              participants: v.participants ?? [CURRENT_USER],
            });
            setActiveId(d.id);
            setNewOpen(false);
            form.resetFields();
          })
        }
      >
        <Form form={form} layout="vertical" initialValues={{ product: 'mb', sprint: 'Спринт 24', participants: [CURRENT_USER] }}>
          <Form.Item name="title" label="Название">
            <Input placeholder="Например: Анализ оттока" />
          </Form.Item>
          <Form.Item name="product" label="Продукт">
            <Select options={products.map((p) => ({ value: p.id, label: p.name }))} />
          </Form.Item>
          <Form.Item name="sprint" label="Спринт">
            <Select allowClear options={sprints.map((s) => ({ value: s, label: s }))} />
          </Form.Item>
          <Form.Item name="task" label="Задача">
            <Select allowClear showSearch options={tasks.map((t) => ({ value: t.key, label: `${t.key} ${t.title}` }))} />
          </Form.Item>
          <Form.Item name="participants" label="Участники">
            <Select mode="multiple" options={team.map((m) => ({ value: m.name, label: m.name }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Прикрепить артефакт" open={attachOpen} onCancel={() => setAttachOpen(false)} footer={null}>
        <Flex vertical gap={8}>
          {knowledgeNodes.map((n) => (
            <Card
              key={n.id}
              size="small"
              hoverable
              onClick={() => {
                if (active) addMessage(active.id, { role: 'user', author: CURRENT_USER, text: `📎 Прикреплён артефакт: ${n.title}` });
                message.success('Артефакт прикреплён');
                setAttachOpen(false);
              }}
            >
              <Space>
                <Tag>{n.type}</Tag>
                {n.title}
              </Space>
            </Card>
          ))}
        </Flex>
      </Modal>
    </Row>
  );
}
