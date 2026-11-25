import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Input,
  Popover,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  AppstoreOutlined,
  BarsOutlined,
  HolderOutlined,
  OrderedListOutlined,
  PlusOutlined,
  RobotOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useStore } from '../store/AppStore';
import PageHeader from '../components/PageHeader';
import { colorOf, initials, priorityMeta, products, sprints, statusLabels, taskScore, team } from '../data/mock';
import type { Risk, Task, TaskStatus } from '../data/types';

const statuses = Object.keys(statusLabels) as TaskStatus[];

export const riskMeta: Record<Risk, { label: string; color: string }> = {
  none: { label: 'Без риска', color: 'default' },
  atrisk: { label: 'Под риском', color: 'orange' },
  overdue: { label: 'Просрочено', color: 'red' },
};

export const typeLabel: Record<Task['type'], string> = { story: 'История', bug: 'Баг', incident: 'Инцидент', tech: 'Техдолг' };

function useAskAssistant() {
  const navigate = useNavigate();
  return (t: Task) => navigate(`/assistant?q=${encodeURIComponent(`Проанализируй задачу ${t.key} «${t.title}»: риски и следующие шаги`)}`);
}

function TaskPreview({ t }: { t: Task }) {
  return (
    <div style={{ width: 300 }}>
      <Typography.Paragraph ellipsis={{ rows: 3 }}>{t.description}</Typography.Paragraph>
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="Метрика">{t.metric}</Descriptions.Item>
        <Descriptions.Item label="Прогноз">{t.impact}</Descriptions.Item>
        <Descriptions.Item label="Срок">{dayjs(t.dueDate).format('DD.MM.YYYY')}</Descriptions.Item>
        <Descriptions.Item label="Скор">{taskScore(t)}</Descriptions.Item>
      </Descriptions>
    </div>
  );
}

function KanbanCard({ t, onDragStart }: { t: Task; onDragStart: () => void }) {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const ask = useAskAssistant();
  const borderColor = t.risk === 'overdue' ? token.colorError : t.risk === 'atrisk' ? token.colorWarning : token.colorBorderSecondary;

  return (
    <Popover content={<TaskPreview t={t} />} title={`${t.key} · ${t.title}`} mouseEnterDelay={0.6} placement="right">
      <Card
        size="small"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', t.key);
          onDragStart();
        }}
        className="cp-draggable"
        hoverable
        onClick={() => navigate(`/tasks/${t.key}`)}
        style={{ marginBottom: 8, borderLeft: `4px solid ${borderColor}` }}
      >
        <Flex justify="space-between" align="center" wrap gap={4}>
          <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            {t.key}
          </Typography.Text>
          <Space size={4} wrap>
            {t.risk !== 'none' && <Tag color={riskMeta[t.risk].color}>{riskMeta[t.risk].label}</Tag>}
            <Tag color={priorityMeta[t.priority].color} style={{ marginInlineEnd: 0 }}>
              {priorityMeta[t.priority].label}
            </Tag>
          </Space>
        </Flex>
        <Typography.Paragraph style={{ margin: '6px 0' }} ellipsis={{ rows: 2 }}>
          {t.title}
        </Typography.Paragraph>
        <Flex justify="space-between" align="center">
          <Space size={6}>
            <Tooltip title={t.assignee}>
              <Avatar size="small" style={{ background: colorOf(t.assignee) }}>
                {initials(t.assignee)}
              </Avatar>
            </Tooltip>
            <Tag bordered={false}>{t.storyPoints} SP</Tag>
          </Space>
          <Tooltip title="Спросить ассистента">
            <Button
              size="small"
              type="text"
              icon={<RobotOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                ask(t);
              }}
              aria-label="Спросить ассистента"
            />
          </Tooltip>
        </Flex>
      </Card>
    </Popover>
  );
}

function Kanban({ list }: { list: Task[] }) {
  const { updateTask } = useStore();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [over, setOver] = useState<TaskStatus | null>(null);
  const [, setDragging] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statuses.length}, minmax(240px, 1fr))`, gap: 12, overflowX: 'auto' }}>
      {statuses.map((s) => {
        const col = list.filter((t) => t.status === s);
        return (
          <div
            key={s}
            className={`cp-drop-zone ${over === s ? 'is-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(s);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              const key = e.dataTransfer.getData('text/plain');
              const t = list.find((x) => x.key === key);
              if (t && t.status !== s) {
                updateTask(key, { status: s, risk: s === 'done' ? 'none' : t.risk });
                message.success(`${key} → ${statusLabels[s]}`);
              }
              setOver(null);
              setDragging(null);
            }}
            style={{ background: token.colorFillQuaternary, borderRadius: token.borderRadiusLG, padding: 8, minHeight: 400 }}
          >
            <Flex justify="space-between" style={{ padding: '4px 4px 10px' }}>
              <Typography.Text strong>{statusLabels[s]}</Typography.Text>
              <Badge count={col.length} showZero color={token.colorTextQuaternary} />
            </Flex>
            {col.map((t) => (
              <KanbanCard key={t.key} t={t} onDragStart={() => setDragging(t.key)} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ListView({ list }: { list: Task[] }) {
  const navigate = useNavigate();
  return (
    <Table<Task>
      rowKey="key"
      dataSource={list}
      scroll={{ x: 1100 }}
      onRow={(r) => ({ onClick: () => navigate(`/tasks/${r.key}`), style: { cursor: 'pointer' } })}
      columns={[
        { title: 'ID', dataIndex: 'key', width: 90, sorter: (a, b) => a.key.localeCompare(b.key) },
        {
          title: 'Заголовок',
          dataIndex: 'title',
          sorter: (a, b) => a.title.localeCompare(b.title),
          render: (v: string, r) => (
            <Space>
              {r.risk !== 'none' && <WarningOutlined style={{ color: r.risk === 'overdue' ? '#ff4d4f' : '#fa8c16' }} />}
              {v}
            </Space>
          ),
        },
        {
          title: 'Статус',
          dataIndex: 'status',
          sorter: (a, b) => statuses.indexOf(a.status) - statuses.indexOf(b.status),
          render: (s: TaskStatus) => <Tag color={s === 'done' ? 'green' : s === 'todo' ? 'default' : 'blue'}>{statusLabels[s]}</Tag>,
        },
        {
          title: 'Исполнитель',
          dataIndex: 'assignee',
          sorter: (a, b) => a.assignee.localeCompare(b.assignee),
          render: (a: string) => (
            <Space>
              <Avatar size="small" style={{ background: colorOf(a) }}>
                {initials(a)}
              </Avatar>
              {a}
            </Space>
          ),
        },
        {
          title: 'Приоритет',
          dataIndex: 'priority',
          sorter: (a, b) => Object.keys(priorityMeta).indexOf(a.priority) - Object.keys(priorityMeta).indexOf(b.priority),
          render: (p: Task['priority']) => <Tag color={priorityMeta[p].color}>{priorityMeta[p].label}</Tag>,
        },
        { title: 'Связанные метрики', dataIndex: 'metric' },
        { title: 'Прогноз влияния', dataIndex: 'impact' },
        {
          title: 'Дата завершения',
          dataIndex: 'dueDate',
          sorter: (a, b) => a.dueDate.localeCompare(b.dueDate),
          render: (d: string, r) => (
            <Typography.Text type={r.risk === 'overdue' ? 'danger' : undefined}>{dayjs(d).format('DD.MM.YYYY')}</Typography.Text>
          ),
        },
      ]}
    />
  );
}

function Backlog({ list }: { list: Task[] }) {
  const { backlogOrder, setBacklogOrder } = useStore();
  const { notification } = App.useApp();
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  const ordered = backlogOrder.map((k) => list.find((t) => t.key === k)).filter((t): t is Task => !!t && t.status !== 'done');
  const selected = ordered.find((t) => t.key === selectedKey) ?? ordered[0];

  const drop = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return;
    const order = backlogOrder.filter((k) => k !== dragKey);
    const ti = order.indexOf(targetKey);
    order.splice(ti, 0, dragKey);
    setBacklogOrder(order);

    // Предупреждение ассистента о последствиях
    const moved = list.find((t) => t.key === dragKey)!;
    const target = list.find((t) => t.key === targetKey)!;
    if (taskScore(moved) < taskScore(target)) {
      notification.warning({
        message: 'Ассистент: проверьте последствия',
        description: `${moved.key} (скор ${taskScore(moved)}) поставлен выше ${target.key} (скор ${taskScore(target)}). ${
          target.compliance >= 6 ? `У ${target.key} высокий compliance-риск — задержка может привести к замечаниям регулятора. ` : ''
        }Прогноз: метрика «${target.metric}» улучшится позже на ~1 спринт.`,
        icon: <RobotOutlined style={{ color: token.colorPrimary }} />,
        duration: 8,
      });
    }
  };

  return (
    <Row gutter={16}>
      <Col xs={24} lg={15}>
        <Card size="small" styles={{ body: { padding: 0 } }}>
          {ordered.length === 0 && <Empty style={{ padding: 24 }} />}
          {ordered.map((t, i) => {
            const score = taskScore(t);
            return (
              <Flex
                key={t.key}
                align="center"
                gap={12}
                draggable
                onDragStart={() => setDragKey(t.key)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverKey(t.key);
                }}
                onDrop={() => {
                  drop(t.key);
                  setDragKey(null);
                  setOverKey(null);
                }}
                onDragEnd={() => {
                  setDragKey(null);
                  setOverKey(null);
                }}
                onClick={() => setSelectedKey(t.key)}
                className="cp-draggable"
                style={{
                  padding: '10px 12px',
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  borderTop: overKey === t.key && dragKey !== t.key ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
                  background: selected?.key === t.key ? token.controlItemBgActive : undefined,
                  opacity: dragKey === t.key ? 0.5 : 1,
                }}
              >
                <HolderOutlined style={{ color: token.colorTextQuaternary }} />
                <Typography.Text strong style={{ width: 24, textAlign: 'right' }}>
                  {i + 1}
                </Typography.Text>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Text ellipsis>
                    <Typography.Text type="secondary">{t.key}</Typography.Text> {t.title}
                  </Typography.Text>
                  <div>
                    {t.compliance >= 6 && <Tag color="purple">compliance</Tag>}
                    {t.strategy >= 8 && <Tag color="geekblue">стратегия</Tag>}
                    {t.risk !== 'none' && <Tag color={riskMeta[t.risk].color}>{riskMeta[t.risk].label}</Tag>}
                  </div>
                </div>
                <Tooltip title="Скор = RICE + compliance + стратегия">
                  <Progress type="circle" size={40} percent={score} format={(p) => p} strokeColor={score > 70 ? token.colorSuccess : token.colorPrimary} />
                </Tooltip>
              </Flex>
            );
          })}
        </Card>
      </Col>
      <Col xs={24} lg={9}>
        {selected && (
          <Card
            title={`${selected.key} · ${selected.title}`}
            extra={
              <Button type="link" onClick={() => navigate(`/tasks/${selected.key}`)}>
                Открыть
              </Button>
            }
            style={{ position: 'sticky', top: 88 }}
          >
            <Typography.Paragraph>{selected.description}</Typography.Paragraph>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Reach">{selected.reach.toLocaleString('ru-RU')}</Descriptions.Item>
              <Descriptions.Item label="Impact">{selected.impactScore}</Descriptions.Item>
              <Descriptions.Item label="Confidence">{Math.round(selected.confidence * 100)}%</Descriptions.Item>
              <Descriptions.Item label="Effort">{selected.effort} чел.-нед.</Descriptions.Item>
              <Descriptions.Item label="Compliance-риск">{selected.compliance}/10</Descriptions.Item>
              <Descriptions.Item label="Стратегия">{selected.strategy}/10</Descriptions.Item>
              <Descriptions.Item label="Итоговый скор">
                <Typography.Text strong>{taskScore(selected)}</Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </Col>
    </Row>
  );
}

export default function TasksPage() {
  const { tasks, setCreateTaskOpen } = useStore();
  const [params, setParams] = useSearchParams();
  const view = (params.get('view') ?? 'kanban') as 'kanban' | 'list' | 'backlog';
  const [q, setQ] = useState('');
  const [f, setF] = useState<{ status?: TaskStatus[]; assignee?: string[]; sprint?: string; product?: string; risk?: Risk[] }>({
    sprint: 'Спринт 24',
  });

  const list = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (!q || (t.key + t.title).toLowerCase().includes(q.toLowerCase())) &&
          (!f.status?.length || f.status.includes(t.status)) &&
          (!f.assignee?.length || f.assignee.includes(t.assignee)) &&
          (!f.sprint || view === 'backlog' || t.sprint === f.sprint) &&
          (!f.product || t.product === f.product) &&
          (!f.risk?.length || f.risk.includes(t.risk)),
      ),
    [tasks, q, f, view],
  );

  return (
    <>
      <PageHeader
        title="Задачи"
        subtitle="Надстройка над Jira: доска, список и приоритизированный бэклог"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateTaskOpen(true)}>
            Создать задачу
          </Button>
        }
      />
      <Flex gap={8} wrap align="center" style={{ marginBottom: 16 }}>
        <Segmented
          value={view}
          onChange={(v) => setParams({ view: v as string })}
          options={[
            { value: 'kanban', label: 'Канбан', icon: <AppstoreOutlined /> },
            { value: 'list', label: 'Список', icon: <BarsOutlined /> },
            { value: 'backlog', label: 'Бэклог', icon: <OrderedListOutlined /> },
          ]}
        />
        <Input.Search placeholder="Быстрый поиск" allowClear style={{ width: 200 }} onChange={(e) => setQ(e.target.value)} />
        {view !== 'kanban' && (
          <Select
            mode="multiple"
            allowClear
            placeholder="Статус"
            style={{ minWidth: 140 }}
            maxTagCount={1}
            value={f.status}
            onChange={(status) => setF({ ...f, status })}
            options={statuses.map((s) => ({ value: s, label: statusLabels[s] }))}
          />
        )}
        <Select
          mode="multiple"
          allowClear
          placeholder="Исполнитель"
          style={{ minWidth: 160 }}
          maxTagCount={1}
          value={f.assignee}
          onChange={(assignee) => setF({ ...f, assignee })}
          options={team.map((m) => ({ value: m.name, label: m.name }))}
        />
        {view !== 'backlog' && (
          <Select
            allowClear
            placeholder="Спринт"
            style={{ width: 130 }}
            value={f.sprint}
            onChange={(sprint) => setF({ ...f, sprint })}
            options={sprints.map((s) => ({ value: s, label: s }))}
          />
        )}
        <Select
          allowClear
          placeholder="Продукт"
          style={{ width: 160 }}
          value={f.product}
          onChange={(product) => setF({ ...f, product })}
          options={products.map((p) => ({ value: p.name, label: p.name }))}
        />
        <Select
          mode="multiple"
          allowClear
          placeholder="Метки риска"
          style={{ minWidth: 150 }}
          maxTagCount={1}
          value={f.risk}
          onChange={(risk) => setF({ ...f, risk })}
          options={(Object.keys(riskMeta) as Risk[]).map((r) => ({ value: r, label: riskMeta[r].label }))}
        />
      </Flex>
      {view === 'kanban' && <Kanban list={list} />}
      {view === 'list' && <ListView list={list} />}
      {view === 'backlog' && <Backlog list={list} />}
    </>
  );
}
