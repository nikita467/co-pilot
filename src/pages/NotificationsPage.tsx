import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, DatePicker, Flex, Input, Segmented, Select, Space, Table, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useStore } from '../store/AppStore';
import PageHeader from '../components/PageHeader';
import { notificationMeta } from '../components/NotificationPanel';
import type { AppNotification, NotificationType } from '../data/types';

export default function NotificationsPage() {
  const { notifications, markRead, markAllRead } = useStore();
  const navigate = useNavigate();
  const [read, setRead] = useState<'all' | 'unread' | 'read'>('all');
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [q, setQ] = useState('');

  const list = useMemo(
    () =>
      notifications.filter((n) => {
        const t = dayjs(n.time);
        return (
          (read === 'all' || (read === 'unread' ? !n.read : n.read)) &&
          (!types.length || types.includes(n.type)) &&
          (!range?.[0] || !t.isBefore(range[0].startOf('day'))) &&
          (!range?.[1] || !t.isAfter(range[1].endOf('day'))) &&
          (!q || (n.title + n.description).toLowerCase().includes(q.toLowerCase()))
        );
      }),
    [notifications, read, types, range, q],
  );

  return (
    <>
      <PageHeader title="Все уведомления" extra={<Button onClick={markAllRead}>Отметить все прочитанными</Button>} />
      <Card>
        <Flex gap={8} wrap style={{ marginBottom: 16 }}>
          <Segmented
            value={read}
            onChange={(v) => setRead(v as typeof read)}
            options={[
              { label: 'Все', value: 'all' },
              { label: 'Непрочитанные', value: 'unread' },
              { label: 'Прочитанные', value: 'read' },
            ]}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="Тип"
            style={{ minWidth: 220 }}
            value={types}
            onChange={setTypes}
            options={Object.entries(notificationMeta).map(([value, m]) => ({ value, label: m.label }))}
          />
          <DatePicker.RangePicker format="DD.MM.YYYY" value={range} onChange={(v) => setRange(v)} />
          <Input.Search placeholder="Поиск" allowClear style={{ width: 220 }} onChange={(e) => setQ(e.target.value)} />
        </Flex>
        <Table<AppNotification>
          rowKey="id"
          dataSource={list}
          onRow={(n) => ({
            onClick: () => {
              markRead(n.id);
              if (n.link) navigate(n.link);
            },
            style: { cursor: 'pointer' },
          })}
          columns={[
            {
              title: 'Тип',
              dataIndex: 'type',
              width: 180,
              render: (t: NotificationType) => (
                <Space>
                  <Avatar size="small" style={{ background: notificationMeta[t].color }} icon={notificationMeta[t].icon} />
                  {notificationMeta[t].label}
                </Space>
              ),
            },
            {
              title: 'Уведомление',
              render: (_, n) => (
                <div>
                  <Typography.Text strong={!n.read}>{n.title}</Typography.Text>
                  <div>
                    <Typography.Text type="secondary">{n.description}</Typography.Text>
                  </div>
                </div>
              ),
            },
            {
              title: 'Время',
              dataIndex: 'time',
              width: 170,
              sorter: (a, b) => a.time.localeCompare(b.time),
              defaultSortOrder: 'descend',
              render: (t: string) => dayjs(t).format('DD.MM.YYYY HH:mm'),
            },
            {
              title: 'Статус',
              width: 140,
              render: (_, n) => (n.read ? <Badge status="default" text="Прочитано" /> : <Badge status="processing" text="Новое" />),
            },
          ]}
        />
      </Card>
    </>
  );
}
