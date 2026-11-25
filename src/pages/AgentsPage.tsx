import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  theme,
} from 'antd';
import {
  AlertOutlined,
  BarChartOutlined,
  CodeOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
  FireOutlined,
  GlobalOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ProfileOutlined,
  SafetyOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAgentInfo, useStore } from '../store/AppStore';
import { agents } from '../data/mock';
import type { Agent, AgentLog } from '../data/types';
import PageHeader from '../components/PageHeader';

const categoryIcon: Record<string, ReactNode> = {
  Метрики: <BarChartOutlined />,
  Разработка: <CodeOutlined />,
  Поддержка: <CustomerServiceOutlined />,
  Планирование: <ScheduleOutlined />,
  Compliance: <SafetyOutlined />,
  Рынок: <GlobalOutlined />,
  'Свой агент': <ThunderboltOutlined />,
};

const statusBadge = {
  ok: { status: 'success' as const, text: 'Работает' },
  warning: { status: 'warning' as const, text: 'Есть срабатывания' },
  error: { status: 'error' as const, text: 'Ошибка' },
  paused: { status: 'default' as const, text: 'Приостановлен' },
};

const levelColor: Record<AgentLog['level'], string> = { info: 'blue', warning: 'orange', error: 'red' };

function AgentLogTimeline({ logs }: { logs: AgentLog[] }) {
  if (!logs.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Лог пуст" />;
  return (
    <Timeline
      items={logs.map((l) => ({
        color: levelColor[l.level],
        children: (
          <div>
            <Space size={6}>
              <Typography.Text strong>{l.agent}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(l.time).format('DD.MM HH:mm')}
              </Typography.Text>
            </Space>
            <div>{l.text}</div>
          </div>
        ),
      }))}
    />
  );
}

function Catalog() {
  const { myAgents, addAgent } = useStore();
  const { message } = App.useApp();
  const [category, setCategory] = useState('Все');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Agent | null>(null);
  const { token } = theme.useToken();

  const list = agents.filter(
    (a) =>
      (category === 'Все' || a.category === category) &&
      (!query || (a.name + a.description).toLowerCase().includes(query.toLowerCase())),
  );
  const isMine = (id: string) => myAgents.some((m) => m.agentId === id);

  return (
    <>
      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Segmented value={category} onChange={(v) => setCategory(v as string)} options={['Все', ...new Set(agents.map((a) => a.category))]} />
        <Input.Search placeholder="Поиск агента" allowClear style={{ maxWidth: 280 }} onChange={(e) => setQuery(e.target.value)} />
      </Flex>
      <Row gutter={[16, 16]}>
        {list.map((a) => (
          <Col key={a.id} xs={24} sm={12} xl={8} xxl={6}>
            <Card hoverable onClick={() => setSelected(a)} style={{ height: '100%' }}>
              <Flex justify="space-between" align="flex-start">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    display: 'grid',
                    placeItems: 'center',
                    background: token.colorPrimaryBg,
                    color: token.colorPrimary,
                    fontSize: 20,
                  }}
                >
                  {categoryIcon[a.category]}
                </div>
                {isMine(a.id) ? <Tag color="green">Подключён</Tag> : <Tag>{a.category}</Tag>}
              </Flex>
              <Typography.Title level={5} style={{ marginTop: 12 }}>
                {a.name}
              </Typography.Title>
              <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>
                {a.description}
              </Typography.Paragraph>
              <Flex align="center" gap={8}>
                <FireOutlined style={{ color: token.colorWarning }} />
                <Progress percent={a.popularity} size="small" showInfo={false} style={{ flex: 1, margin: 0 }} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {a.popularity}%
                </Typography.Text>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>
      <Drawer
        width={520}
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        extra={
          selected && (
            <Button
              type="primary"
              disabled={isMine(selected.id)}
              icon={<PlusOutlined />}
              onClick={() => {
                addAgent(selected.id);
                message.success(`«${selected.name}» добавлен в «Мои агенты»`);
              }}
            >
              {isMine(selected.id) ? 'Уже в моих' : 'Добавить в мои'}
            </Button>
          )
        }
      >
        {selected && (
          <Flex vertical gap={16}>
            <Typography.Paragraph>{selected.description}</Typography.Paragraph>
            <Card size="small" title="Логика работы">
              {selected.logic}
            </Card>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Триггер">{selected.trigger}</Descriptions.Item>
              <Descriptions.Item label="Условие">{selected.condition}</Descriptions.Item>
              <Descriptions.Item label="Действие">{selected.action}</Descriptions.Item>
            </Descriptions>
            <div>
              <Typography.Text strong>Источники данных</Typography.Text>
              <div style={{ marginTop: 8 }}>
                {selected.sources.map((s) => (
                  <Tag key={s} color="blue">
                    {s}
                  </Tag>
                ))}
              </div>
            </div>
            <div>
              <Typography.Text strong>Примеры действий</Typography.Text>
              <List size="small" dataSource={selected.examples} renderItem={(e) => <List.Item>⚡ {e}</List.Item>} />
            </div>
          </Flex>
        )}
      </Drawer>
    </>
  );
}

function MyAgents() {
  const { myAgents, toggleAgent, removeAgent, agentLogs } = useStore();
  const info = useAgentInfo();
  const { message } = App.useApp();
  const [logFor, setLogFor] = useState<string | null>(null);
  const [configFor, setConfigFor] = useState<string | null>(null);

  if (!myAgents.length) return <Empty description="Нет активированных агентов. Добавьте из каталога или создайте в конструкторе." />;

  return (
    <>
      <Table
        rowKey="agentId"
        dataSource={myAgents}
        pagination={false}
        scroll={{ x: 800 }}
        columns={[
          {
            title: 'Активен',
            width: 90,
            render: (_, r) => <Switch checked={r.active} onChange={(v) => toggleAgent(r.agentId, v)} />,
          },
          {
            title: 'Агент',
            render: (_, r) => {
              const i = info(r.agentId);
              return (
                <Space>
                  {categoryIcon[i.category] ?? <ThunderboltOutlined />}
                  <div>
                    <Typography.Text strong>{i.name}</Typography.Text>
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {i.category} · {i.trigger}
                      </Typography.Text>
                    </div>
                  </div>
                </Space>
              );
            },
          },
          {
            title: 'Статус',
            render: (_, r) => <Badge status={statusBadge[r.status].status} text={statusBadge[r.status].text} />,
          },
          {
            title: 'Последнее срабатывание',
            sorter: (a, b) => dayjs(a.lastRun).valueOf() - dayjs(b.lastRun).valueOf(),
            render: (_, r) => dayjs(r.lastRun).fromNow(),
          },
          {
            title: 'Событий за 24 ч',
            dataIndex: 'events24h',
            sorter: (a, b) => a.events24h - b.events24h,
            render: (v: number) => (v > 10 ? <Tag color="orange">{v}</Tag> : v),
          },
          {
            title: 'Действия',
            render: (_, r) => (
              <Space>
                <Button
                  size="small"
                  icon={r.active ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={() => toggleAgent(r.agentId, !r.active)}
                >
                  {r.active ? 'Пауза' : 'Запустить'}
                </Button>
                <Button size="small" icon={<SettingOutlined />} onClick={() => setConfigFor(r.agentId)} aria-label="Настроить" />
                <Button size="small" icon={<ProfileOutlined />} onClick={() => setLogFor(r.agentId)}>
                  Лог
                </Button>
                <Popconfirm
                  title="Удалить агента?"
                  okText="Удалить"
                  cancelText="Отмена"
                  onConfirm={() => {
                    removeAgent(r.agentId);
                    message.success('Агент удалён');
                  }}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} aria-label="Удалить" />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Drawer open={!!logFor} onClose={() => setLogFor(null)} title={logFor ? `Лог: ${info(logFor).name}` : ''} width={480}>
        {logFor && <AgentLogTimeline logs={agentLogs.filter((l) => l.agent === info(logFor).name)} />}
      </Drawer>
      <Modal
        open={!!configFor}
        title={configFor ? `Настройка: ${info(configFor).name}` : ''}
        onCancel={() => setConfigFor(null)}
        onOk={() => {
          message.success('Настройки агента сохранены');
          setConfigFor(null);
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form layout="vertical" initialValues={{ threshold: 5, window: 60, channel: ['app', 'chat'] }}>
          <Form.Item name="threshold" label="Порог срабатывания, %">
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="window" label="Окно наблюдения, мин">
            <InputNumber min={5} max={1440} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="channel" label="Куда отправлять">
            <Select
              mode="multiple"
              options={[
                { value: 'app', label: 'Центр уведомлений' },
                { value: 'chat', label: 'Чат команды' },
                { value: 'email', label: 'E-mail' },
                { value: 'jira', label: 'Jira' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

const triggers = [
  { value: 'Расписание', desc: 'Запуск по cron: ежедневно, еженедельно' },
  { value: 'Событие Jira', desc: 'Создание/изменение задачи, смена статуса' },
  { value: 'Порог метрики', desc: 'Метрика вышла за границы' },
  { value: 'Новый PR', desc: 'Открыт или смержен pull request' },
  { value: 'Новый тикет', desc: 'Обращение в поддержку' },
  { value: 'Событие деплоя', desc: 'Релиз в окружение' },
];
const actionsList = ['Создать задачу', 'Отправить уведомление', 'Запустить сервис', 'Написать в чат'];

function Builder() {
  const { createCustomAgent } = useStore();
  const { message } = App.useApp();
  const [step, setStep] = useState(0);
  const [trigger, setTrigger] = useState<string>('Порог метрики');
  const [cond, setCond] = useState({ metric: 'Конверсия кредитной заявки', op: 'падение', value: 5, window: '1 час', text: '' });
  const [action, setAction] = useState('Создать задачу');
  const [name, setName] = useState('');
  const { token } = theme.useToken();

  const conditionText =
    trigger === 'Порог метрики'
      ? `${cond.op === 'падение' ? 'Падение' : 'Рост'} «${cond.metric}» > ${cond.value}% за ${cond.window}`
      : cond.text || 'Любое событие';

  const choiceCard = (value: string, desc: string | undefined, active: boolean, onClick: () => void) => (
    <Card
      size="small"
      hoverable
      onClick={onClick}
      style={{ borderColor: active ? token.colorPrimary : undefined, background: active ? token.colorPrimaryBg : undefined }}
    >
      <Typography.Text strong>{value}</Typography.Text>
      {desc && (
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {desc}
          </Typography.Text>
        </div>
      )}
    </Card>
  );

  return (
    <Card>
      <Steps
        current={step}
        onChange={setStep}
        items={[{ title: 'Триггер' }, { title: 'Условие' }, { title: 'Действие' }, { title: 'Проверка' }]}
        style={{ marginBottom: 24 }}
      />
      {step === 0 && (
        <Row gutter={[12, 12]}>
          {triggers.map((t) => (
            <Col key={t.value} xs={24} sm={12} lg={8}>
              {choiceCard(t.value, t.desc, trigger === t.value, () => setTrigger(t.value))}
            </Col>
          ))}
        </Row>
      )}
      {step === 1 &&
        (trigger === 'Порог метрики' ? (
          <Flex gap={8} wrap align="center">
            <Select
              value={cond.metric}
              onChange={(metric) => setCond({ ...cond, metric })}
              style={{ width: 260 }}
              options={['Конверсия кредитной заявки', 'NPS', 'Доля ошибок API', 'Обращения в поддержку'].map((v) => ({ value: v }))}
            />
            <Select
              value={cond.op}
              onChange={(op) => setCond({ ...cond, op })}
              style={{ width: 120 }}
              options={[{ value: 'падение' }, { value: 'рост' }]}
            />
            <Typography.Text>больше</Typography.Text>
            <InputNumber value={cond.value} min={1} max={100} addonAfter="%" onChange={(v) => setCond({ ...cond, value: v ?? 5 })} />
            <Typography.Text>за</Typography.Text>
            <Select
              value={cond.window}
              onChange={(window) => setCond({ ...cond, window })}
              style={{ width: 120 }}
              options={['15 минут', '1 час', '1 день'].map((v) => ({ value: v }))}
            />
          </Flex>
        ) : (
          <Input.TextArea
            rows={3}
            value={cond.text}
            onChange={(e) => setCond({ ...cond, text: e.target.value })}
            placeholder={'Например: метка «ПД» и статус «Готово к релизу»'}
          />
        ))}
      {step === 2 && (
        <Row gutter={[12, 12]}>
          {actionsList.map((a) => (
            <Col key={a} xs={24} sm={12} lg={6}>
              {choiceCard(a, undefined, action === a, () => setAction(a))}
            </Col>
          ))}
        </Row>
      )}
      {step === 3 && (
        <Flex vertical gap={12} style={{ maxWidth: 560 }}>
          <Input placeholder="Название агента" value={name} onChange={(e) => setName(e.target.value)} />
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Когда">{trigger}</Descriptions.Item>
            <Descriptions.Item label="Если">{conditionText}</Descriptions.Item>
            <Descriptions.Item label="То">{action}</Descriptions.Item>
          </Descriptions>
        </Flex>
      )}
      <Flex justify="space-between" style={{ marginTop: 24 }}>
        <Button disabled={step === 0} onClick={() => setStep(step - 1)}>
          Назад
        </Button>
        {step < 3 ? (
          <Button type="primary" onClick={() => setStep(step + 1)}>
            Далее
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => {
              const n = name.trim() || `Агент: ${trigger} → ${action}`;
              createCustomAgent({ name: n, trigger, condition: conditionText, action });
              message.success(`Агент «${n}» создан и запущен`);
              setStep(0);
              setName('');
            }}
          >
            Создать агента
          </Button>
        )}
      </Flex>
    </Card>
  );
}

export default function AgentsPage() {
  const [params, setParams] = useSearchParams();
  const { agentLogs, myAgents } = useStore();
  const tab = params.get('tab') ?? 'catalog';
  const activeCount = useMemo(() => myAgents.filter((a) => a.active).length, [myAgents]);

  return (
    <>
      <PageHeader
        title="Агенты"
        subtitle={`Автономные модули, работающие в фоне 24/7 · активно: ${activeCount}`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setParams({ tab: 'builder' })}>
            Создать агента
          </Button>
        }
      />
      <Tabs
        activeKey={tab}
        onChange={(k) => setParams({ tab: k })}
        items={[
          { key: 'catalog', label: 'Готовые агенты', children: <Catalog /> },
          { key: 'mine', label: `Мои агенты (${myAgents.length})`, children: <MyAgents /> },
          { key: 'builder', label: 'Конструктор', children: <Builder /> },
        ]}
      />
      <Card
        title={
          <Space>
            <AlertOutlined />
            Общий лог активности агентов
          </Space>
        }
        style={{ marginTop: 24 }}
      >
        <AgentLogTimeline logs={agentLogs} />
      </Card>
    </>
  );
}
