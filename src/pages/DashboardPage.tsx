import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  App,
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Flex,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  AlertOutlined,
  DeleteOutlined,
  ExpandOutlined,
  HolderOutlined,
  MoreOutlined,
  PlusOutlined,
  RobotOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useStore, type WidgetConfig, type WidgetId } from '../store/AppStore';
import { BurndownChart, FunnelChart, Sparkline } from '../components/Charts';
import { NotificationItem } from '../components/NotificationPanel';
import PageHeader from '../components/PageHeader';
import { npsSeries, products, supportSeries } from '../data/mock';

const catalog: Record<WidgetId, { title: string; description: string; span: number }> = {
  funnel: { title: 'Воронка конверсии', description: 'Кредитная заявка по шагам, подсветка аномалий', span: 12 },
  nps: { title: 'NPS и обращения в поддержку', description: 'Спарклайны за 30 дней', span: 12 },
  velocity: { title: 'Скорость команды', description: 'Burndown спринта и прогноз по эпикам', span: 12 },
  incidents: { title: 'Активные инциденты', description: 'Карточки с цветовой индикацией', span: 12 },
  notifications: { title: 'Последние уведомления', description: 'Сводка из центра уведомлений', span: 12 },
  support: { title: 'Темы обращений', description: 'Топ кластеров тикетов поддержки за сутки', span: 12 },
};

function WidgetBody({ w, full }: { w: WidgetConfig; full?: boolean }) {
  const navigate = useNavigate();
  const { tasks, notifications, markRead } = useStore();
  const { token } = theme.useToken();
  const ask = (q: string) => navigate(`/assistant?q=${encodeURIComponent(q)}`);

  switch (w.id) {
    case 'funnel':
      return <FunnelChart threshold={w.threshold} onAsk={(step) => ask(`Почему изменилась конверсия шага «${step}»?`)} />;
    case 'nps':
      return (
        <Row gutter={16}>
          <Col span={12}>
            <Statistic title="NPS" value={npsSeries[npsSeries.length - 1]} suffix={<Tag color="red">−3 за 2 дня</Tag>} />
            <Sparkline data={npsSeries} height={full ? 120 : 56} />
          </Col>
          <Col span={12}>
            <Statistic title="Обращения/день" value={supportSeries[supportSeries.length - 1]} suffix={<Tag color="red">+50%</Tag>} />
            <Sparkline data={supportSeries} color={token.colorError} height={full ? 120 : 56} />
          </Col>
        </Row>
      );
    case 'velocity':
      return (
        <Flex vertical gap={12}>
          <BurndownChart height={full ? 260 : 140} />
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Прогноз завершения эпиков
            </Typography.Text>
            {[
              { name: 'Цифровая кредитная заявка', p: 72, eta: '12 дек', risk: false },
              { name: 'Скоринг v5', p: 45, eta: '26 дек', risk: true },
            ].map((e) => (
              <Flex key={e.name} align="center" gap={8}>
                <Typography.Text style={{ width: 190, fontSize: 12 }} ellipsis>
                  {e.name}
                </Typography.Text>
                <Progress percent={e.p} size="small" status={e.risk ? 'exception' : 'active'} style={{ flex: 1, margin: 0 }} />
                <Typography.Text type={e.risk ? 'danger' : 'secondary'} style={{ fontSize: 12, width: 52 }}>
                  {e.eta}
                </Typography.Text>
              </Flex>
            ))}
          </div>
        </Flex>
      );
    case 'incidents': {
      const inc = tasks.filter((t) => t.type === 'incident' && t.status !== 'done');
      if (!inc.length) return <Empty description="Инцидентов нет" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
      return (
        <Flex vertical gap={8}>
          {inc.map((t) => (
            <Card
              key={t.key}
              size="small"
              hoverable
              onClick={() => navigate(`/tasks/${t.key}`)}
              style={{
                borderLeft: `4px solid ${t.severity === 'critical' ? token.colorError : token.colorWarning}`,
              }}
            >
              <Flex justify="space-between" align="center" gap={8}>
                <Space>
                  <AlertOutlined style={{ color: t.severity === 'critical' ? token.colorError : token.colorWarning }} />
                  <Typography.Text strong>{t.key}</Typography.Text>
                  <Typography.Text ellipsis style={{ maxWidth: 260 }}>
                    {t.title}
                  </Typography.Text>
                </Space>
                <Tag color={t.severity === 'critical' ? 'red' : 'orange'}>{t.severity === 'critical' ? 'Критический' : 'Высокий'}</Tag>
              </Flex>
            </Card>
          ))}
        </Flex>
      );
    }
    case 'notifications':
      return (
        <div>
          {notifications.slice(0, full ? 10 : 4).map((n) => (
            <NotificationItem
              key={n.id}
              n={n}
              onClick={() => {
                markRead(n.id);
                if (n.link) navigate(n.link);
              }}
            />
          ))}
        </div>
      );
    case 'support':
      return (
        <Flex vertical gap={6}>
          {[
            { t: 'Не принимает паспорт', n: 37, d: '+320%' },
            { t: 'Долго считается решение', n: 12, d: '+10%' },
            { t: 'Не приходит СМС', n: 9, d: '−5%' },
            { t: 'Вопросы по ставке', n: 7, d: '0%' },
          ].map((r) => (
            <Flex key={r.t} justify="space-between">
              <Typography.Text>{r.t}</Typography.Text>
              <Space>
                <Typography.Text strong>{r.n}</Typography.Text>
                <Tag color={r.d.startsWith('+3') ? 'red' : 'default'}>{r.d}</Tag>
              </Space>
            </Flex>
          ))}
        </Flex>
      );
    default:
      return null;
  }
}

export default function DashboardPage() {
  const { widgets, setWidgets, productId, setProduct } = useStore();
  const [params, setParams] = useSearchParams();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [fullWidget, setFullWidget] = useState<WidgetConfig | null>(null);
  const [configWidget, setConfigWidget] = useState<WidgetConfig | null>(null);
  const [dragId, setDragId] = useState<WidgetId | null>(null);
  const [overId, setOverId] = useState<WidgetId | null>(null);
  const navigate = useNavigate();
  const { message } = App.useApp();

  useEffect(() => {
    if (params.get('addWidget')) {
      setCatalogOpen(true);
      params.delete('addWidget');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const move = (from: WidgetId, to: WidgetId) => {
    if (from === to) return;
    const list = [...widgets];
    const fi = list.findIndex((w) => w.id === from);
    const ti = list.findIndex((w) => w.id === to);
    const [item] = list.splice(fi, 1);
    list.splice(ti, 0, item);
    setWidgets(list);
  };

  const product = products.find((p) => p.id === productId);

  const card = (w: WidgetConfig): ReactNode => (
    <Card
      title={
        <Space>
          <HolderOutlined className="cp-draggable" style={{ color: '#bfbfbf' }} />
          {catalog[w.id].title}
        </Space>
      }
      extra={
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'full', icon: <ExpandOutlined />, label: 'Открыть в полном размере' },
              { key: 'config', icon: <SettingOutlined />, label: 'Настроить' },
              { key: 'ask', icon: <RobotOutlined />, label: 'Спросить ассистента' },
              { type: 'divider' },
              { key: 'delete', icon: <DeleteOutlined />, label: 'Удалить', danger: true },
            ],
            onClick: ({ key }) => {
              if (key === 'full') setFullWidget(w);
              if (key === 'config') setConfigWidget(w);
              if (key === 'ask') navigate(`/assistant?q=${encodeURIComponent(`Проанализируй виджет «${catalog[w.id].title}»`)}`);
              if (key === 'delete') {
                setWidgets(widgets.filter((x) => x.id !== w.id));
                message.success('Виджет удалён');
              }
            },
          }}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} aria-label="Меню виджета" />
        </Dropdown>
      }
      style={{ height: '100%' }}
    >
      <WidgetBody w={w} />
    </Card>
  );

  const available = (Object.keys(catalog) as WidgetId[]).filter((id) => !widgets.some((w) => w.id === id));

  return (
    <>
      <PageHeader
        title={
          <Select
            variant="borderless"
            value={productId}
            onChange={setProduct}
            style={{ fontSize: 24, minWidth: 260 }}
            options={products.map((p) => ({ value: p.id, label: `${p.name} · ${p.team}` }))}
          />
        }
        subtitle={`Сводка на ${dayjs().format('D MMMM, HH:mm')} · ${product?.team}`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCatalogOpen(true)}>
            Добавить виджет
          </Button>
        }
      />
      <Row gutter={[16, 16]}>
        {widgets.map((w) => (
          <Col
            key={w.id}
            xs={24}
            xl={catalog[w.id].span}
            draggable
            onDragStart={() => setDragId(w.id)}
            onDragOver={(e) => {
              e.preventDefault();
              setOverId(w.id);
            }}
            onDragLeave={() => setOverId(null)}
            onDrop={() => {
              if (dragId) move(dragId, w.id);
              setDragId(null);
              setOverId(null);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            className={`cp-drop-zone ${overId === w.id && dragId !== w.id ? 'is-over' : ''}`}
            style={{ opacity: dragId === w.id ? 0.5 : 1 }}
          >
            {card(w)}
          </Col>
        ))}
        {widgets.length === 0 && (
          <Col span={24}>
            <Empty description="На дашборде нет виджетов">
              <Button type="primary" onClick={() => setCatalogOpen(true)}>
                Добавить виджет
              </Button>
            </Empty>
          </Col>
        )}
      </Row>

      <Modal title="Каталог виджетов" open={catalogOpen} onCancel={() => setCatalogOpen(false)} footer={null} width={640}>
        {available.length === 0 && <Empty description="Все виджеты уже на дашборде" />}
        <Row gutter={[12, 12]}>
          {available.map((id) => (
            <Col span={12} key={id}>
              <Card
                size="small"
                hoverable
                onClick={() => {
                  setWidgets([...widgets, { id }]);
                  message.success(`Добавлен виджет «${catalog[id].title}»`);
                  setCatalogOpen(false);
                }}
              >
                <Card.Meta title={catalog[id].title} description={catalog[id].description} />
              </Card>
            </Col>
          ))}
        </Row>
      </Modal>

      <Modal
        title={fullWidget && catalog[fullWidget.id].title}
        open={!!fullWidget}
        onCancel={() => setFullWidget(null)}
        footer={null}
        width={900}
      >
        {fullWidget && <WidgetBody w={fullWidget} full />}
      </Modal>

      <Modal
        title={configWidget && `Настройка: ${catalog[configWidget.id].title}`}
        open={!!configWidget}
        onCancel={() => setConfigWidget(null)}
        onOk={() => {
          if (configWidget) setWidgets(widgets.map((w) => (w.id === configWidget.id ? configWidget : w)));
          setConfigWidget(null);
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        {configWidget && (
          <Flex vertical gap={12}>
            <div>
              <Typography.Text>Порог аномалии, %</Typography.Text>
              <InputNumber
                min={1}
                max={50}
                value={configWidget.threshold ?? 5}
                onChange={(v) => setConfigWidget({ ...configWidget, threshold: v ?? 5 })}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <Typography.Text>Период</Typography.Text>
              <Select
                defaultValue="30d"
                style={{ width: '100%' }}
                options={[
                  { value: '24h', label: '24 часа' },
                  { value: '7d', label: '7 дней' },
                  { value: '30d', label: '30 дней' },
                ]}
              />
            </div>
            <div>
              <Typography.Text>Фильтр по платформе</Typography.Text>
              <Select
                mode="multiple"
                defaultValue={['ios', 'android']}
                style={{ width: '100%' }}
                options={[
                  { value: 'ios', label: 'iOS' },
                  { value: 'android', label: 'Android' },
                  { value: 'web', label: 'Web' },
                ]}
              />
            </div>
          </Flex>
        )}
      </Modal>
    </>
  );
}
