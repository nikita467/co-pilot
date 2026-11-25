import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { App, AutoComplete, Avatar, Badge, Button, Dropdown, Flex, Input, Layout, Menu, Popover, Typography, theme } from 'antd';
import {
  ApiOutlined,
  AppstoreOutlined,
  BellOutlined,
  BookOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MessageOutlined,
  PlusOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/AppStore';
import NotificationPanel from '../components/NotificationPanel';
import { CreateRoomModal, CreateTaskModal } from '../components/GlobalModals';
import { CURRENT_USER, initials, knowledgeNodes } from '../data/mock';

const { Header, Sider, Content } = Layout;

const navItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Дашборд' },
  { key: '/assistant', icon: <MessageOutlined />, label: 'Ассистент' },
  { key: '/agents', icon: <RobotOutlined />, label: 'Агенты' },
  { key: '/services', icon: <ApiOutlined />, label: 'ИИ-сервисы' },
  { key: '/tasks', icon: <CheckSquareOutlined />, label: 'Задачи' },
  { key: '/rooms', icon: <TeamOutlined />, label: 'Комнаты' },
  { key: '/knowledge', icon: <BookOutlined />, label: 'База знаний' },
];

function Logo({ collapsed }: { collapsed: boolean }) {
  const { token } = theme.useToken();
  return (
    <Flex align="center" gap={10} style={{ width: collapsed ? 48 : 200, transition: 'width .2s', flex: 'none' }}>
      <svg width={32} height={32} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill={token.colorPrimary} />
        <path d="M8 20l8-12 8 12-8-3z" fill="#fff" />
      </svg>
      {!collapsed && (
        <Typography.Text strong style={{ fontSize: 18 }}>
          Ко-Пилот
        </Typography.Text>
      )}
    </Flex>
  );
}

function GlobalSearch() {
  const { tasks, dialogs, services } = useStore();
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  const options = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    const match = (s: string) => s.toLowerCase().includes(q);
    const group = (label: string, items: { value: string; label: string }[]) =>
      items.length ? [{ label, options: items.slice(0, 5) }] : [];
    return [
      ...group(
        'Задачи',
        tasks.filter((t) => match(t.key + t.title)).map((t) => ({ value: `/tasks/${t.key}`, label: `${t.key} · ${t.title}` })),
      ),
      ...group(
        'Документы, код и метрики',
        knowledgeNodes.filter((n) => match(n.title)).map((n) => ({ value: `/knowledge?node=${n.id}`, label: n.title })),
      ),
      ...group(
        'Диалоги',
        dialogs.filter((d) => match(d.title) || d.messages.some((m) => match(m.text))).map((d) => ({ value: `/assistant?dialog=${d.id}`, label: d.title })),
      ),
      ...group(
        'ИИ-сервисы',
        services.filter((s) => match(s.name + s.description)).map((s) => ({ value: `/services?id=${s.id}`, label: s.name })),
      ),
    ];
  }, [value, tasks, dialogs, services]);

  return (
    <AutoComplete
      style={{ width: '100%', maxWidth: 560 }}
      options={options}
      value={value}
      onChange={setValue}
      onSelect={(v: string) => {
        navigate(v);
        setValue('');
      }}
      notFoundContent={value ? 'Ничего не найдено' : null}
    >
      <Input
        prefix={<SearchOutlined />}
        placeholder="Поиск по задачам, документам, коду, метрикам, диалогам"
        allowClear
        onPressEnter={() => value && navigate(`/assistant?q=${encodeURIComponent(value)}`)}
      />
    </AutoComplete>
  );
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const { token } = theme.useToken();
  const { unreadCount, setCreateTaskOpen, setCreateRoomOpen } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  const selected = navItems
    .map((i) => i.key)
    .filter((k) => (k === '/' ? location.pathname === '/' : location.pathname.startsWith(k)));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 16px',
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Logo collapsed={collapsed} />
        <Flex flex={1} justify="center">
          <GlobalSearch />
        </Flex>
        <Flex align="center" gap={16}>
          <Popover
            open={bellOpen}
            onOpenChange={setBellOpen}
            trigger="click"
            placement="bottomRight"
            content={<NotificationPanel onClose={() => setBellOpen(false)} />}
          >
            <Badge count={unreadCount} size="small">
              <Button type="text" shape="circle" icon={<BellOutlined style={{ fontSize: 18 }} />} aria-label="Уведомления" />
            </Badge>
          </Popover>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'profile', icon: <UserOutlined />, label: 'Профиль' },
                { key: 'settings', icon: <SettingOutlined />, label: 'Настройки' },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: 'Выход', danger: true },
              ],
              onClick: ({ key }) => {
                if (key === 'logout') message.info('Демо-режим: выход отключён');
                else navigate(`/settings${key === 'profile' ? '?tab=profile' : ''}`);
              },
            }}
          >
            <Avatar style={{ background: token.colorPrimary, cursor: 'pointer' }}>{initials(CURRENT_USER)}</Avatar>
          </Dropdown>
        </Flex>
      </Header>
      <Layout>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="light"
          width={220}
          breakpoint="lg"
          style={{ borderRight: `1px solid ${token.colorBorderSecondary}`, position: 'sticky', top: 64, height: 'calc(100vh - 64px)' }}
        >
          <Flex vertical style={{ height: '100%' }}>
            <Menu
              mode="inline"
              selectedKeys={selected}
              items={navItems}
              onClick={({ key }) => navigate(key)}
              style={{ borderInlineEnd: 'none', flex: 1, paddingTop: 8 }}
            />
            <div style={{ padding: 12 }}>
              <Dropdown
                placement="topLeft"
                trigger={['click']}
                menu={{
                  items: [
                    { key: 'task', icon: <CheckSquareOutlined />, label: 'Задачу' },
                    { key: 'agent', icon: <RobotOutlined />, label: 'Агента' },
                    { key: 'widget', icon: <AppstoreOutlined />, label: 'Виджет дашборда' },
                    { key: 'room', icon: <TeamOutlined />, label: 'Комнату' },
                  ],
                  onClick: ({ key }) => {
                    if (key === 'task') setCreateTaskOpen(true);
                    if (key === 'room') setCreateRoomOpen(true);
                    if (key === 'agent') navigate('/agents?tab=builder');
                    if (key === 'widget') navigate('/?addWidget=1');
                  },
                }}
              >
                <Button type="primary" block icon={<PlusOutlined />}>
                  {!collapsed && 'Создать'}
                </Button>
              </Dropdown>
            </div>
          </Flex>
        </Sider>
        <Content style={{ padding: 24, minWidth: 0 }}>
          <Outlet />
        </Content>
      </Layout>
      <CreateTaskModal />
      <CreateRoomModal />
    </Layout>
  );
}
