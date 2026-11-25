import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Col, Empty, Flex, Row, Segmented, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { CalendarOutlined, CarryOutOutlined, PlusOutlined, RetweetOutlined, ScheduleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useStore } from '../store/AppStore';
import PageHeader from '../components/PageHeader';
import { colorOf, initials } from '../data/mock';
import type { Room } from '../data/types';

export const roomTypeMeta: Record<Room['type'], { label: string; icon: ReactNode; color: string }> = {
  planning: { label: 'Планирование', icon: <ScheduleOutlined />, color: '#1677ff' },
  retro: { label: 'Ретроспектива', icon: <RetweetOutlined />, color: '#722ed1' },
  grooming: { label: 'Груминг', icon: <CarryOutOutlined />, color: '#13c2c2' },
};

const statusMeta: Record<Room['status'], { text: string; status: 'processing' | 'default' | 'success' }> = {
  live: { text: 'Идёт сейчас', status: 'processing' },
  scheduled: { text: 'Запланирована', status: 'default' },
  finished: { text: 'Завершена', status: 'success' },
};

export default function RoomsPage() {
  const { rooms, setCreateRoomOpen } = useStore();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [type, setType] = useState<Room['type'] | 'all'>('all');
  const list = rooms.filter((r) => type === 'all' || r.type === type);

  return (
    <>
      <PageHeader
        title="Комнаты"
        subtitle="Виртуальные пространства для командных церемоний"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateRoomOpen(true)}>
            Создать комнату
          </Button>
        }
      />
      <Segmented
        style={{ marginBottom: 16 }}
        value={type}
        onChange={(v) => setType(v as typeof type)}
        options={[{ value: 'all', label: 'Все' }, ...Object.entries(roomTypeMeta).map(([value, m]) => ({ value, label: m.label }))]}
      />
      {list.length === 0 && <Empty description="Комнат нет" />}
      <Row gutter={[16, 16]}>
        {list.map((r) => {
          const m = roomTypeMeta[r.type];
          return (
            <Col key={r.id} xs={24} sm={12} xl={8}>
              <Card hoverable onClick={() => navigate(`/rooms/${r.id}`)} style={{ borderTop: `3px solid ${m.color}` }}>
                <Flex justify="space-between">
                  <Tag icon={m.icon} color={m.color}>
                    {m.label}
                  </Tag>
                  <Badge status={statusMeta[r.status].status} text={statusMeta[r.status].text} />
                </Flex>
                <Typography.Title level={5} style={{ marginTop: 12 }}>
                  {r.title}
                </Typography.Title>
                <Flex justify="space-between" align="center">
                  <Space style={{ color: token.colorTextSecondary }}>
                    <CalendarOutlined />
                    {dayjs(r.date).format('D MMM, HH:mm')}
                  </Space>
                  <Avatar.Group max={{ count: 4 }} size="small">
                    {r.participants.map((p) => (
                      <Tooltip key={p} title={p}>
                        <Avatar style={{ background: colorOf(p) }}>{initials(p)}</Avatar>
                      </Tooltip>
                    ))}
                  </Avatar.Group>
                </Flex>
              </Card>
            </Col>
          );
        })}
      </Row>
    </>
  );
}
