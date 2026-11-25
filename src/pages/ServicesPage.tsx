import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  List,
  Modal,
  Rate,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { ExportOutlined, FireOutlined, PlusOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { useStore } from '../store/AppStore';
import PageHeader from '../components/PageHeader';
import type { AiService, ServiceCategory } from '../data/types';
import { colorOf, initials } from '../data/mock';

const categories: ServiceCategory[] = [
  'Текст и документация',
  'Дизайн',
  'Код',
  'Аналитика',
  'Исследования',
  'Прототипирование',
  'Автоматизация',
];

const Logo = ({ s, size = 44 }: { s: AiService; size?: number }) => (
  <Avatar shape="square" size={size} style={{ background: s.color, fontWeight: 600, flex: 'none' }}>
    {s.name.slice(0, 2)}
  </Avatar>
);

export default function ServicesPage() {
  const { services, favorites, toggleFavorite, rateService, proposeService } = useStore();
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [cats, setCats] = useState<ServiceCategory[]>([]);
  const [sort, setSort] = useState<'rating' | 'name'>('rating');
  const [selected, setSelected] = useState<AiService | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [comment, setComment] = useState('');
  const [form] = Form.useForm();

  useEffect(() => {
    const id = params.get('id');
    if (id) {
      setSelected(services.find((s) => s.id === id) ?? null);
      params.delete('id');
      setParams(params, { replace: true });
    }
  }, [params, setParams, services]);

  // держим открытую карточку в синхроне с обновлениями рейтинга
  const current = selected && services.find((s) => s.id === selected.id);

  const list = useMemo(
    () =>
      services
        .filter(
          (s) =>
            (!cats.length || cats.includes(s.category)) &&
            (!query || (s.name + s.description + s.category).toLowerCase().includes(query.toLowerCase())),
        )
        .sort((a, b) => (sort === 'rating' ? b.rating - a.rating : a.name.localeCompare(b.name))),
    [services, cats, query, sort],
  );

  const favList = services.filter((s) => favorites.includes(s.id));
  const popular = services.filter((s) => s.popularInBank);

  return (
    <>
      <PageHeader
        title="ИИ-сервисы"
        subtitle="Управляемый каталог сторонних ИИ-решений по корпоративной подписке"
        extra={
          <Button icon={<PlusOutlined />} onClick={() => setProposeOpen(true)}>
            Предложить сервис
          </Button>
        }
      />
      <Flex gap={12} wrap style={{ marginBottom: 12 }}>
        <Input.Search placeholder="Поиск сервиса" allowClear style={{ maxWidth: 320 }} onChange={(e) => setQuery(e.target.value)} />
        <Select
          value={sort}
          onChange={setSort}
          style={{ width: 200 }}
          options={[
            { value: 'rating', label: 'По оценке коллег' },
            { value: 'name', label: 'По названию' },
          ]}
        />
      </Flex>
      <Flex gap={6} wrap style={{ marginBottom: 16 }}>
        {categories.map((c) => (
          <Tag.CheckableTag
            key={c}
            checked={cats.includes(c)}
            onChange={(checked) => setCats(checked ? [...cats, c] : cats.filter((x) => x !== c))}
            style={{ padding: '4px 10px' }}
          >
            {c}
          </Tag.CheckableTag>
        ))}
      </Flex>

      <Row gutter={16}>
        <Col xs={24} lg={18}>
          {list.length === 0 && <Empty description="Сервисы не найдены" />}
          <Row gutter={[16, 16]}>
            {list.map((s) => (
              <Col key={s.id} xs={24} sm={12} xl={8}>
                <Card
                  hoverable
                  onClick={() => setSelected(s)}
                  style={{ height: '100%' }}
                  actions={[
                    <Button
                      key="fav"
                      type="text"
                      icon={favorites.includes(s.id) ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(s.id);
                      }}
                    >
                      Избранное
                    </Button>,
                    <Button
                      key="go"
                      type="link"
                      icon={<ExportOutlined />}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Перейти
                    </Button>,
                  ]}
                >
                  <Flex gap={12}>
                    <Logo s={s} />
                    <div style={{ minWidth: 0 }}>
                      <Typography.Text strong>{s.name}</Typography.Text>
                      <div>
                        <Tag style={{ marginTop: 4 }}>{s.category}</Tag>
                      </div>
                    </div>
                  </Flex>
                  <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginTop: 12, minHeight: 44 }}>
                    {s.description}
                  </Typography.Paragraph>
                  <Space>
                    <Rate disabled allowHalf value={s.rating} style={{ fontSize: 14 }} />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {s.rating || '—'} ({s.votes})
                    </Typography.Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>
        <Col xs={24} lg={6}>
          <Card title="Избранные сервисы" size="small" style={{ marginBottom: 16 }}>
            {favList.length === 0 ? (
              <Typography.Text type="secondary">Отметьте сервисы звёздочкой</Typography.Text>
            ) : (
              <List
                size="small"
                dataSource={favList}
                renderItem={(s) => (
                  <List.Item style={{ cursor: 'pointer' }} onClick={() => setSelected(s)}>
                    <Space>
                      <Logo s={s} size={24} />
                      {s.name}
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
          <Card
            title={
              <Space>
                <FireOutlined style={{ color: '#fa541c' }} />
                Популярное в банке
              </Space>
            }
            size="small"
          >
            <List
              size="small"
              dataSource={popular}
              renderItem={(s, i) => (
                <List.Item style={{ cursor: 'pointer' }} onClick={() => setSelected(s)}>
                  <Space>
                    <Typography.Text type="secondary">{i + 1}</Typography.Text>
                    <Logo s={s} size={24} />
                    {s.name}
                  </Space>
                  <Typography.Text type="secondary">★ {s.rating}</Typography.Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Drawer
        width={560}
        open={!!current}
        onClose={() => {
          setSelected(null);
          setMyRating(0);
          setComment('');
        }}
        title={
          current && (
            <Space>
              <Logo s={current} size={32} />
              {current.name}
            </Space>
          )
        }
        extra={
          current && (
            <Button type="primary" icon={<ExportOutlined />} href={current.url} target="_blank" rel="noopener noreferrer">
              Перейти
            </Button>
          )
        }
      >
        {current && (
          <>
            <Typography.Paragraph>{current.fullDescription}</Typography.Paragraph>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Категория">{current.category}</Descriptions.Item>
              <Descriptions.Item label="Стоимость">{current.price}</Descriptions.Item>
              <Descriptions.Item label="Корпоративная подписка">
                {current.corporate ? <Tag color="green">Есть</Tag> : <Tag>Нет — нужна заявка</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Оценка коллег">
                <Rate disabled allowHalf value={current.rating} /> {current.rating} ({current.votes})
              </Descriptions.Item>
            </Descriptions>
            {current.examples.length > 0 && (
              <>
                <Divider orientation="left">Примеры использования</Divider>
                <List size="small" dataSource={current.examples} renderItem={(e) => <List.Item>💡 {e}</List.Item>} />
              </>
            )}
            <Divider orientation="left">Комментарии команды</Divider>
            <Flex vertical gap={8} style={{ marginBottom: 16 }}>
              <Rate value={myRating} onChange={setMyRating} />
              <Input.TextArea rows={2} placeholder="Ваш отзыв" value={comment} onChange={(e) => setComment(e.target.value)} />
              <Button
                disabled={!myRating}
                onClick={() => {
                  rateService(current.id, myRating, comment);
                  message.success('Спасибо за оценку!');
                  setMyRating(0);
                  setComment('');
                }}
              >
                Оценить
              </Button>
            </Flex>
            {current.comments.length === 0 && <Typography.Text type="secondary">Пока нет комментариев</Typography.Text>}
            {current.comments.map((c, i) => (
              <Flex key={i} gap={10} style={{ marginBottom: 12 }}>
                <Avatar size="small" style={{ background: colorOf(c.author), flex: 'none' }}>
                  {initials(c.author)}
                </Avatar>
                <div>
                  <Space>
                    <Typography.Text strong>{c.author}</Typography.Text>
                    <Rate disabled value={c.rating} style={{ fontSize: 11 }} />
                  </Space>
                  <div>{c.text}</div>
                </div>
              </Flex>
            ))}
          </>
        )}
      </Drawer>

      <Modal
        title="Предложить сервис"
        open={proposeOpen}
        okText="Отправить"
        cancelText="Отмена"
        onCancel={() => setProposeOpen(false)}
        onOk={() =>
          form.validateFields().then((v) => {
            proposeService(v);
            message.success('Сервис отправлен на рассмотрение и добавлен в каталог');
            form.resetFields();
            setProposeOpen(false);
          })
        }
      >
        <Form form={form} layout="vertical" initialValues={{ category: 'Аналитика' }}>
          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Укажите название' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="url" label="Ссылка" rules={[{ required: true, type: 'url', message: 'Укажите корректный URL' }]}>
            <Input placeholder="https://" />
          </Form.Item>
          <Form.Item name="category" label="Категория">
            <Select options={categories.map((c) => ({ value: c, label: c }))} />
          </Form.Item>
          <Form.Item name="description" label="Чем полезен команде" rules={[{ required: true, message: 'Опишите пользу' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
