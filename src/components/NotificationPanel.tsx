import { useMemo, useState, type ReactNode } from 'react';
import { Avatar, Badge, Button, Empty, Flex, Segmented, Select, Typography, theme } from 'antd';
import { AlertOutlined, ApiOutlined, MessageOutlined, RobotOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useStore } from '../store/AppStore';
import type { AppNotification, NotificationType } from '../data/types';

export const notificationMeta: Record<NotificationType, { label: string; icon: ReactNode; color: string }> = {
  incident: { label: 'Инцидент', icon: <AlertOutlined />, color: '#ff4d4f' },
  agent: { label: 'Агент', icon: <RobotOutlined />, color: '#722ed1' },
  mention: { label: 'Упоминание', icon: <MessageOutlined />, color: '#1677ff' },
  service: { label: 'Результат сервиса', icon: <ApiOutlined />, color: '#52c41a' },
};

export const groupByDate = (items: AppNotification[]) => {
  const groups: Record<string, AppNotification[]> = {};
  items.forEach((n) => {
    const d = dayjs(n.time);
    const key = d.isSame(dayjs(), 'day') ? 'Сегодня' : d.isSame(dayjs().subtract(1, 'day'), 'day') ? 'Вчера' : d.format('D MMMM');
    (groups[key] ??= []).push(n);
  });
  return Object.entries(groups);
};

export function NotificationItem({ n, onClick }: { n: AppNotification; onClick: () => void }) {
  const { token } = theme.useToken();
  const meta = notificationMeta[n.type];
  return (
    <Flex
      gap={12}
      align="flex-start"
      onClick={onClick}
      style={{
        padding: '10px 12px',
        borderRadius: token.borderRadius,
        cursor: 'pointer',
        background: n.read ? undefined : token.colorPrimaryBg,
      }}
    >
      <Avatar size="small" style={{ background: meta.color, flex: 'none' }} icon={meta.icon} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Flex justify="space-between" gap={8}>
          <Typography.Text strong={!n.read} ellipsis>
            {n.title}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12, flex: 'none' }}>
            {dayjs(n.time).format('HH:mm')}
          </Typography.Text>
        </Flex>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {n.description}
        </Typography.Text>
      </div>
      {!n.read && <Badge status="processing" />}
    </Flex>
  );
}

/** Выпадающая панель центра уведомлений (~400px) */
export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, markRead, markAllRead } = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [type, setType] = useState<NotificationType | 'any'>('any');

  const items = useMemo(
    () => notifications.filter((n) => (filter === 'unread' ? !n.read : true) && (type === 'any' || n.type === type)),
    [notifications, filter, type],
  );

  return (
    <div style={{ width: 400, maxWidth: 'calc(100vw - 32px)' }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Уведомления
        </Typography.Title>
        <Button type="link" size="small" onClick={markAllRead}>
          Прочитать все
        </Button>
      </Flex>
      <Flex gap={8} style={{ marginBottom: 8 }}>
        <Segmented
          size="small"
          value={filter}
          onChange={(v) => setFilter(v as 'all' | 'unread')}
          options={[
            { label: 'Все', value: 'all' },
            { label: 'Непрочитанные', value: 'unread' },
          ]}
        />
        <Select
          size="small"
          value={type}
          onChange={setType}
          style={{ flex: 1 }}
          options={[
            { value: 'any', label: 'Любой тип' },
            ...Object.entries(notificationMeta).map(([value, m]) => ({ value, label: m.label })),
          ]}
        />
      </Flex>
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {items.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет уведомлений" />}
        {groupByDate(items).map(([date, group]) => (
          <div key={date}>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', margin: '8px 12px 4px' }}>
              {date}
            </Typography.Text>
            {group.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                onClick={() => {
                  markRead(n.id);
                  if (n.link) navigate(n.link);
                  onClose();
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <Button
        block
        style={{ marginTop: 8 }}
        onClick={() => {
          navigate('/notifications');
          onClose();
        }}
      >
        Открыть все уведомления
      </Button>
    </div>
  );
}
