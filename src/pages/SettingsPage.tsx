import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  App,
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Flex,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Slider,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  theme,
} from 'antd';
import { ApiOutlined, BranchesOutlined, BgColorsOutlined, FileTextOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAgentInfo, useStore } from '../store/AppStore';
import PageHeader from '../components/PageHeader';
import { CURRENT_USER, initials, products as initialProducts, team } from '../data/mock';
import type { Product } from '../data/types';

const events = [
  { key: 'incident', label: 'Инциденты' },
  { key: 'agent', label: 'Срабатывания агентов' },
  { key: 'mention', label: 'Упоминания' },
  { key: 'service', label: 'Результаты сервисов' },
  { key: 'task', label: 'Изменения в моих задачах' },
  { key: 'room', label: 'Начало церемоний' },
];
const channels = ['Платформа', 'E-mail', 'Мессенджер', 'Push'];

function NotificationsTab() {
  const [matrix, setMatrix] = useState<Record<string, string[]>>(
    Object.fromEntries(events.map((e) => [e.key, e.key === 'incident' ? channels : ['Платформа']])),
  );
  return (
    <>
      <Table
        rowKey="key"
        pagination={false}
        dataSource={events}
        columns={[
          { title: 'Событие', dataIndex: 'label' },
          ...channels.map((c) => ({
            title: c,
            align: 'center' as const,
            render: (_: unknown, e: (typeof events)[number]) => (
              <Checkbox
                checked={matrix[e.key].includes(c)}
                onChange={(ev) =>
                  setMatrix({ ...matrix, [e.key]: ev.target.checked ? [...matrix[e.key], c] : matrix[e.key].filter((x) => x !== c) })
                }
              />
            ),
          })),
        ]}
      />
      <Form layout="inline" style={{ marginTop: 16 }}>
        <Form.Item label="Тихие часы">
          <Switch defaultChecked />
        </Form.Item>
        <Form.Item label="Только критичные ночью">
          <Switch defaultChecked />
        </Form.Item>
      </Form>
    </>
  );
}

const integrations = [
  { key: 'jira', name: 'Jira', icon: <ApiOutlined />, desc: 'Задачи, спринты, статусы', connected: true },
  { key: 'confluence', name: 'Confluence', icon: <FileTextOutlined />, desc: 'Документация и требования', connected: true },
  { key: 'git', name: 'Git', icon: <BranchesOutlined />, desc: 'Репозитории и pull requests', connected: false },
  { key: 'figma', name: 'Figma', icon: <BgColorsOutlined />, desc: 'Макеты и дизайн-система', connected: false },
];

function IntegrationsTab() {
  const [state, setState] = useState(Object.fromEntries(integrations.map((i) => [i.key, i.connected])));
  const { message } = App.useApp();
  const { token } = theme.useToken();
  return (
    <Row gutter={[16, 16]}>
      {integrations.map((i) => (
        <Col key={i.key} xs={24} md={12}>
          <Card>
            <Flex justify="space-between" align="center">
              <Space>
                <Avatar shape="square" size={44} icon={i.icon} style={{ background: token.colorPrimaryBg, color: token.colorPrimary }} />
                <div>
                  <Typography.Text strong>{i.name}</Typography.Text>
                  <div>
                    <Typography.Text type="secondary">{i.desc}</Typography.Text>
                  </div>
                </div>
              </Space>
              {state[i.key] ? (
                <Space>
                  <Tag color="green">Подключено</Tag>
                  <Button size="small" onClick={() => setState({ ...state, [i.key]: false })}>
                    Отключить
                  </Button>
                </Space>
              ) : (
                <Button
                  type="primary"
                  onClick={() => {
                    setState({ ...state, [i.key]: true });
                    message.success(`${i.name} подключён (демо)`);
                  }}
                >
                  Подключить
                </Button>
              )}
            </Flex>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

function PersonalizationTab() {
  const { settings, updateSettings, resetDemo } = useStore();
  const { message } = App.useApp();
  return (
    <Form layout="vertical" style={{ maxWidth: 520 }}>
      <Form.Item label="Язык интерфейса">
        <Select
          value={settings.language}
          onChange={(language) => updateSettings({ language })}
          options={[
            { value: 'ru', label: 'Русский' },
            { value: 'en', label: 'English (локаль компонентов)' },
          ]}
        />
      </Form.Item>
      <Form.Item label="Тема">
        <Segmented
          value={settings.theme}
          onChange={(v) => updateSettings({ theme: v as 'light' | 'dark' })}
          options={[
            { label: 'Светлая', value: 'light' },
            { label: 'Тёмная', value: 'dark' },
          ]}
        />
      </Form.Item>
      <Form.Item label="Компактный режим">
        <Switch checked={settings.compact} onChange={(compact) => updateSettings({ compact })} />
      </Form.Item>
      <Form.Item label="Уровень детализации ответов ассистента">
        <Slider
          min={1}
          max={3}
          value={settings.detail}
          onChange={(detail) => updateSettings({ detail })}
          marks={{ 1: 'Кратко', 2: 'Стандарт', 3: 'Подробно' }}
        />
      </Form.Item>
      <Popconfirm
        title="Сбросить демо-данные?"
        okText="Сбросить"
        cancelText="Отмена"
        onConfirm={() => {
          resetDemo();
          message.success('Демо-данные сброшены');
        }}
      >
        <Button icon={<ReloadOutlined />}>Сбросить демо-данные</Button>
      </Popconfirm>
    </Form>
  );
}

function AgentsServicesTab() {
  const { myAgents, toggleAgent, services, favorites, toggleFavorite } = useStore();
  const info = useAgentInfo();
  return (
    <Row gutter={16}>
      <Col xs={24} md={12}>
        <Card title="Подписки на агентов" size="small">
          <List
            dataSource={myAgents}
            renderItem={(a) => (
              <List.Item actions={[<Switch key="s" size="small" checked={a.active} onChange={(v) => toggleAgent(a.agentId, v)} />]}>
                {info(a.agentId).name}
              </List.Item>
            )}
          />
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="Избранные внешние сервисы" size="small">
          <List
            dataSource={services}
            renderItem={(s) => (
              <List.Item actions={[<Switch key="s" size="small" checked={favorites.includes(s.id)} onChange={() => toggleFavorite(s.id)} />]}>
                {s.name}
              </List.Item>
            )}
          />
        </Card>
      </Col>
    </Row>
  );
}

function TeamsTab() {
  const [list, setList] = useState<(Product & { members: string[] })[]>(
    initialProducts.map((p, i) => ({ ...p, members: i === 0 ? team.map((m) => m.name) : team.slice(0, 2).map((m) => m.name) })),
  );
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => setOpen(true)}>
        Добавить продукт
      </Button>
      <Table
        rowKey="id"
        dataSource={list}
        pagination={false}
        columns={[
          { title: 'Продукт', dataIndex: 'name' },
          { title: 'Команда', dataIndex: 'team' },
          {
            title: 'Доступ',
            render: (_, p) => (
              <Select
                mode="multiple"
                value={p.members}
                style={{ minWidth: 280 }}
                maxTagCount={2}
                onChange={(members) => setList(list.map((x) => (x.id === p.id ? { ...x, members } : x)))}
                options={team.map((m) => ({ value: m.name, label: m.name }))}
              />
            ),
          },
        ]}
      />
      <Modal
        title="Новый продукт"
        open={open}
        onCancel={() => setOpen(false)}
        okText="Добавить"
        cancelText="Отмена"
        onOk={() =>
          form.validateFields().then((v) => {
            setList([...list, { id: String(Date.now()), name: v.name, team: v.team, members: [CURRENT_USER] }]);
            form.resetFields();
            setOpen(false);
          })
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="team" label="Команда" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function ProfileTab() {
  const { token } = theme.useToken();
  return (
    <Flex gap={24} align="flex-start" wrap>
      <Avatar size={96} style={{ background: token.colorPrimary, fontSize: 36 }}>
        {initials(CURRENT_USER)}
      </Avatar>
      <Descriptions column={1} bordered style={{ minWidth: 320 }}>
        <Descriptions.Item label="Имя">{CURRENT_USER}</Descriptions.Item>
        <Descriptions.Item label="Роль">Product Owner</Descriptions.Item>
        <Descriptions.Item label="Команда">Кредитные продукты</Descriptions.Item>
        <Descriptions.Item label="E-mail">a.petrova@bank.example</Descriptions.Item>
      </Descriptions>
    </Flex>
  );
}

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  return (
    <>
      <PageHeader title="Профиль и настройки" />
      <Card>
        <Tabs
          activeKey={params.get('tab') ?? 'notifications'}
          onChange={(tab) => setParams({ tab })}
          items={[
            { key: 'profile', label: 'Профиль', children: <ProfileTab /> },
            { key: 'notifications', label: 'Уведомления', children: <NotificationsTab /> },
            { key: 'integrations', label: 'Интеграции', children: <IntegrationsTab /> },
            { key: 'personalization', label: 'Персонализация', children: <PersonalizationTab /> },
            { key: 'agents', label: 'Агенты и сервисы', children: <AgentsServicesTab /> },
            { key: 'teams', label: 'Команды и продукты', children: <TeamsTab /> },
          ]}
        />
      </Card>
    </>
  );
}
