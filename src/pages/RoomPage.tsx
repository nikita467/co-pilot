import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  App,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Input,
  List,
  Modal,
  Progress,
  Result,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  LikeOutlined,
  LikeFilled,
  PlusOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useStore } from '../store/AppStore';
import { MiniAssistantChat } from '../components/Chat';
import { colorOf, initials, taskScore, team } from '../data/mock';
import type { Room, Task } from '../data/types';
import { roomTypeMeta } from './RoomsPage';

const NEXT_SPRINT = 'Спринт 25';

function DraggableTask({ t, onDragStart }: { t: Task; onDragStart: () => void }) {
  const { token } = theme.useToken();
  const notReady = !t.ready.design || !t.ready.criteria || !t.ready.estimate;
  return (
    <Card
      size="small"
      draggable
      className="cp-draggable"
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', t.key);
        onDragStart();
      }}
      style={{ marginBottom: 8, borderLeft: `3px solid ${notReady ? token.colorWarning : token.colorSuccess}` }}
    >
      <Flex justify="space-between" gap={8}>
        <Typography.Text ellipsis style={{ fontSize: 13 }}>
          <Typography.Text type="secondary">{t.key}</Typography.Text> {t.title}
        </Typography.Text>
        <Tag bordered={false} style={{ marginInlineEnd: 0 }}>
          {t.storyPoints}
        </Tag>
      </Flex>
      <Space size={4} style={{ marginTop: 4 }}>
        <Avatar size={18} style={{ background: colorOf(t.assignee), fontSize: 10 }}>
          {initials(t.assignee)}
        </Avatar>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          скор {taskScore(t)} · {t.impact}
        </Typography.Text>
      </Space>
    </Card>
  );
}

function PlanningRoom() {
  const { tasks, updateTask } = useStore();
  const { token } = theme.useToken();
  const [over, setOver] = useState<'backlog' | 'sprint' | null>(null);
  const [, setDrag] = useState<string | null>(null);

  const open = tasks.filter((t) => t.status !== 'done');
  const sprint = open.filter((t) => t.sprint === NEXT_SPRINT);
  const backlog = open.filter((t) => t.sprint !== NEXT_SPRINT).sort((a, b) => taskScore(b) - taskScore(a));

  const capacity = team.filter((m) => m.capacity > 0);
  const load = capacity.map((m) => ({
    ...m,
    sp: sprint.filter((t) => t.assignee === m.name).reduce((s, t) => s + t.storyPoints, 0),
  }));
  const totalSp = sprint.reduce((s, t) => s + t.storyPoints, 0);
  const totalCap = capacity.reduce((s, m) => s + m.capacity, 0);

  const byType = (types: Task['type'][]) => sprint.filter((t) => types.includes(t.type)).reduce((s, t) => s + t.storyPoints, 0);
  const balance = [
    { label: 'Фичи', value: byType(['story']), color: token.colorPrimary },
    { label: 'Техдолг', value: byType(['tech']), color: token.colorWarning },
    { label: 'Баги и инциденты', value: byType(['bug', 'incident']), color: token.colorError },
  ];

  const warnings = [
    ...load.filter((m) => m.sp > m.capacity).map((m) => `${m.name} перегружен(а): ${m.sp} из ${m.capacity} SP`),
    ...sprint
      .filter((t) => !t.ready.design || !t.ready.criteria || !t.ready.estimate)
      .map((t) => `${t.key} не готова к взятию: ${[!t.ready.design && 'нет макетов', !t.ready.criteria && 'нет критериев', !t.ready.estimate && 'нет оценки'].filter(Boolean).join(', ')}`),
    ...(totalSp > totalCap ? [`Спринт переполнен: ${totalSp} SP при ёмкости ${totalCap}`] : []),
  ];

  const zone = (id: 'backlog' | 'sprint', children: ReactNode, title: string, extra?: ReactNode) => (
    <Card
      title={title}
      extra={extra}
      size="small"
      className={`cp-drop-zone ${over === id ? 'is-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(id);
      }}
      onDragLeave={() => setOver(null)}
      onDrop={(e) => {
        const key = e.dataTransfer.getData('text/plain');
        updateTask(key, { sprint: id === 'sprint' ? NEXT_SPRINT : 'Бэклог' });
        setOver(null);
      }}
      styles={{ body: { minHeight: 420, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' } }}
    >
      {children}
    </Card>
  );

  return (
    <Row gutter={16}>
      <Col xs={24} lg={7}>
        {zone(
          'backlog',
          backlog.length ? backlog.map((t) => <DraggableTask key={t.key} t={t} onDragStart={() => setDrag(t.key)} />) : <Empty description="Бэклог пуст" />,
          `Бэклог (${backlog.length})`,
        )}
      </Col>
      <Col xs={24} lg={9}>
        {zone(
          'sprint',
          <>
            {sprint.length === 0 && <Empty description="Перетащите задачи из бэклога" />}
            {sprint.map((t) => (
              <DraggableTask key={t.key} t={t} onDragStart={() => setDrag(t.key)} />
            ))}
            {sprint.length > 0 && (
              <Card size="small" style={{ marginTop: 12, background: token.colorPrimaryBg }}>
                <Typography.Text strong>
                  <RobotOutlined /> Прогноз влияния спринта
                </Typography.Text>
                <List
                  size="small"
                  dataSource={sprint.slice(0, 4)}
                  renderItem={(t) => (
                    <List.Item>
                      {t.metric}: <Typography.Text strong>{t.impact}</Typography.Text>
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </>,
          `Состав ${NEXT_SPRINT}`,
          <Tag color={totalSp > totalCap ? 'red' : 'blue'}>
            {totalSp} / {totalCap} SP
          </Tag>,
        )}
      </Col>
      <Col xs={24} lg={8}>
        <Flex vertical gap={12}>
          <Card size="small" title="Загрузка команды">
            {load.map((m) => (
              <Flex key={m.name} align="center" gap={8}>
                <Typography.Text style={{ width: 120, fontSize: 12 }} ellipsis>
                  {m.name}
                </Typography.Text>
                <Progress
                  percent={Math.round((m.sp / m.capacity) * 100)}
                  size="small"
                  status={m.sp > m.capacity ? 'exception' : 'normal'}
                  format={() => `${m.sp}/${m.capacity}`}
                  style={{ flex: 1, margin: 0 }}
                />
              </Flex>
            ))}
          </Card>
          <Card size="small" title="Баланс спринта">
            <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: token.colorFillSecondary }}>
              {balance.map((b) => (
                <Tooltip key={b.label} title={`${b.label}: ${b.value} SP`}>
                  <div style={{ width: `${totalSp ? (b.value / totalSp) * 100 : 0}%`, background: b.color }} />
                </Tooltip>
              ))}
            </div>
            <Flex gap={12} wrap style={{ marginTop: 8 }}>
              {balance.map((b) => (
                <Badge key={b.label} color={b.color} text={`${b.label} ${totalSp ? Math.round((b.value / totalSp) * 100) : 0}%`} />
              ))}
            </Flex>
          </Card>
          {warnings.length > 0 && (
            <Alert type="warning" showIcon message="Предупреждения" description={<ul style={{ paddingLeft: 16, margin: 0 }}>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>} />
          )}
          <Card size="small" title="Ассистент">
            <MiniAssistantChat
              height={200}
              intro="Помогу собрать сбалансированный спринт. Спросите про приоритеты или риски."
              suggestions={['Что в топе бэклога?', '/отчёт']}
            />
          </Card>
        </Flex>
      </Col>
    </Row>
  );
}

type RetroCard = { id: string; col: 'good' | 'bad' | 'action'; text: string; votes: number; voted: boolean };

function RetroRoom() {
  const { tasks } = useStore();
  const { token } = theme.useToken();
  const [cards, setCards] = useState<RetroCard[]>([
    { id: '1', col: 'good', text: 'Быстро отреагировали на инцидент благодаря агенту', votes: 4, voted: false },
    { id: '2', col: 'good', text: 'Хорошие макеты от дизайнера заранее', votes: 2, voted: false },
    { id: '3', col: 'bad', text: 'PR с валидацией прошёл без проверки на реальных форматах', votes: 5, voted: false },
    { id: '4', col: 'bad', text: 'Много переключений из-за срочных задач', votes: 3, voted: false },
    { id: '5', col: 'action', text: 'Добавить автотесты на форматы документов', votes: 3, voted: false },
  ]);
  const [drafts, setDrafts] = useState<Record<RetroCard['col'], string>>({ good: '', bad: '', action: '' });

  const done = tasks.filter((t) => t.status === 'done');
  const cols: { key: RetroCard['col']; title: string; color: string }[] = [
    { key: 'good', title: '👍 Хорошо', color: token.colorSuccess },
    { key: 'bad', title: '👎 Плохо', color: token.colorError },
    { key: 'action', title: '🎯 Действия', color: token.colorPrimary },
  ];

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {[
          { t: 'Velocity', v: '41 SP', d: '−8% к среднему' },
          { t: 'Выполнено задач', v: `${done.length + 9}`, d: 'из 13 запланированных' },
          { t: 'Перенесено', v: '2', d: 'CP-216, CP-217' },
          { t: 'Инцидентов', v: '2', d: '1 критический' },
        ].map((s) => (
          <Col key={s.t} xs={12} md={6}>
            <Card size="small">
              <Statistic title={s.t} value={s.v} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {s.d}
              </Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={16}>
        <Col xs={24} xl={17}>
          <Row gutter={12}>
            {cols.map((c) => (
              <Col key={c.key} xs={24} md={8}>
                <Card size="small" title={c.title} style={{ borderTop: `3px solid ${c.color}` }}>
                  {cards
                    .filter((x) => x.col === c.key)
                    .sort((a, b) => b.votes - a.votes)
                    .map((x) => (
                      <Card key={x.id} size="small" style={{ marginBottom: 8 }}>
                        <Typography.Paragraph style={{ marginBottom: 6 }}>{x.text}</Typography.Paragraph>
                        <Button
                          size="small"
                          type={x.voted ? 'primary' : 'default'}
                          icon={x.voted ? <LikeFilled /> : <LikeOutlined />}
                          onClick={() =>
                            setCards(cards.map((y) => (y.id === x.id ? { ...y, voted: !y.voted, votes: y.votes + (y.voted ? -1 : 1) } : y)))
                          }
                        >
                          {x.votes}
                        </Button>
                      </Card>
                    ))}
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      size="small"
                      placeholder="Добавить карточку"
                      value={drafts[c.key]}
                      onChange={(e) => setDrafts({ ...drafts, [c.key]: e.target.value })}
                      onPressEnter={() => {
                        if (!drafts[c.key].trim()) return;
                        setCards([...cards, { id: String(Date.now()), col: c.key, text: drafts[c.key].trim(), votes: 0, voted: false }]);
                        setDrafts({ ...drafts, [c.key]: '' });
                      }}
                    />
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        if (!drafts[c.key].trim()) return;
                        setCards([...cards, { id: String(Date.now()), col: c.key, text: drafts[c.key].trim(), votes: 0, voted: false }]);
                        setDrafts({ ...drafts, [c.key]: '' });
                      }}
                    />
                  </Space.Compact>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>
        <Col xs={24} xl={7}>
          <Card size="small" title="Ассистент — идеи улучшений">
            <MiniAssistantChat
              height={300}
              intro="Я проанализировал спринт: главная проблема — инцидент INC-101 из-за валидации. Нажмите «Идеи улучшений»."
              suggestions={['Предложи идеи улучшений', '/отчёт']}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}

function GroomingRoom() {
  const { tasks, updateTask } = useStore();
  const { message } = App.useApp();
  const [refine, setRefine] = useState<Task | null>(null);
  const list = tasks.filter((t) => t.status === 'todo').sort((a, b) => taskScore(b) - taskScore(a));
  const flag = (ok: boolean) =>
    ok ? <CheckCircleFilled style={{ color: '#52c41a' }} /> : <CloseCircleFilled style={{ color: '#ff4d4f' }} />;

  return (
    <>
      <Table<Task>
        rowKey="key"
        dataSource={list}
        pagination={false}
        scroll={{ x: 800 }}
        columns={[
          { title: 'Задача', render: (_, t) => <><Typography.Text type="secondary">{t.key}</Typography.Text> {t.title}</> },
          { title: 'Макеты', align: 'center', render: (_, t) => flag(t.ready.design) },
          { title: 'Критерии', align: 'center', render: (_, t) => flag(t.ready.criteria) },
          { title: 'Оценка', align: 'center', render: (_, t) => flag(t.ready.estimate) },
          {
            title: 'Готовность',
            render: (_, t) => {
              const p = Math.round(([t.ready.design, t.ready.criteria, t.ready.estimate].filter(Boolean).length / 3) * 100);
              return <Progress percent={p} size="small" status={p === 100 ? 'success' : 'active'} style={{ width: 120 }} />;
            },
          },
          {
            title: '',
            render: (_, t) => (
              <Button size="small" icon={<RobotOutlined />} onClick={() => setRefine(t)}>
                Уточнить
              </Button>
            ),
          },
        ]}
      />
      <Modal
        open={!!refine}
        title={refine && `Уточнение ${refine.key} с ассистентом`}
        onCancel={() => setRefine(null)}
        okText="Применить предложения"
        cancelText="Закрыть"
        onOk={() => {
          if (refine) {
            updateTask(refine.key, {
              ready: { design: refine.ready.design, criteria: true, estimate: true },
              acceptance: refine.acceptance.length ? refine.acceptance : ['Сценарий покрыт автотестом', 'Метрика отслеживается в дашборде'],
              storyPoints: refine.storyPoints || 5,
            });
            message.success('Задача уточнена');
          }
          setRefine(null);
        }}
      >
        {refine && (
          <Flex vertical gap={8}>
            <Alert
              type="info"
              showIcon
              icon={<RobotOutlined />}
              message="Предложения ассистента"
              description={
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {!refine.ready.criteria && <li>Добавить критерии приёмки: «сценарий покрыт автотестом», «метрика отслеживается»</li>}
                  {!refine.ready.estimate && <li>Оценка по аналогам (CP-214, CP-215): {refine.storyPoints} SP</li>}
                  {!refine.ready.design && <li>Запросить макет у Елены Орловой — без него задачу не брать</li>}
                  <li>Прогноз влияния: {refine.impact} на «{refine.metric}»</li>
                </ul>
              }
            />
          </Flex>
        )}
      </Modal>
    </>
  );
}

export default function RoomPage() {
  const { id } = useParams();
  const { rooms } = useStore();
  const navigate = useNavigate();
  const room = useMemo(() => rooms.find((r) => r.id === id), [rooms, id]);

  if (!room) return <Result status="404" title="Комната не найдена" extra={<Button onClick={() => navigate('/rooms')}>К комнатам</Button>} />;

  const m = roomTypeMeta[room.type];
  const body: Record<Room['type'], ReactNode> = {
    planning: <PlanningRoom />,
    retro: <RetroRoom />,
    grooming: <GroomingRoom />,
  };

  return (
    <>
      <Breadcrumb style={{ marginBottom: 12 }} items={[{ title: <a onClick={() => navigate('/rooms')}>Комнаты</a> }, { title: room.title }]} />
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <Space>
          <Tag icon={m.icon} color={m.color}>
            {m.label}
          </Tag>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {room.title}
          </Typography.Title>
          {room.status === 'live' && <Badge status="processing" text="Идёт сейчас" />}
        </Space>
        <Space>
          <Typography.Text type="secondary">{dayjs(room.date).format('D MMMM, HH:mm')}</Typography.Text>
          <Avatar.Group max={{ count: 5 }}>
            {room.participants.map((p) => (
              <Tooltip key={p} title={p}>
                <Avatar style={{ background: colorOf(p) }}>{initials(p)}</Avatar>
              </Tooltip>
            ))}
          </Avatar.Group>
        </Space>
      </Flex>
      {body[room.type]}
    </>
  );
}
