import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  App,
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Flex,
  Input,
  List,
  Result,
  Row,
  Select,
  Space,
  Statistic,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { BgColorsOutlined, BranchesOutlined, FileTextOutlined, PlusOutlined, RobotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useStore } from '../store/AppStore';
import { colorOf, initials, npsSeries, priorityMeta, statusLabels, supportSeries, taskScore, team } from '../data/mock';
import { MiniAssistantChat } from '../components/Chat';
import { Sparkline } from '../components/Charts';
import { riskMeta, typeLabel } from './TasksPage';
import type { TaskStatus } from '../data/types';

const relatedIcon = { pr: <BranchesOutlined />, figma: <BgColorsOutlined />, confluence: <FileTextOutlined /> };

const complianceItems = [
  'Согласие на обработку ПД (152-ФЗ)',
  'Идентификация клиента не ослаблена (115-ФЗ)',
  'Изменения логируются для аудита',
  'Тексты согласованы с юристами',
  'Проверка службой ИБ',
];

export default function TaskDetailPage() {
  const { key } = useParams();
  const { tasks, updateTask } = useStore();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const t = tasks.find((x) => x.key === key);
  const [newAc, setNewAc] = useState('');
  const [acDone, setAcDone] = useState<string[]>([]);
  const [compl, setCompl] = useState<string[]>([]);

  if (!t)
    return (
      <Result
        status="404"
        title="Задача не найдена"
        extra={
          <Button type="primary" onClick={() => navigate('/tasks')}>
            К задачам
          </Button>
        }
      />
    );

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[{ title: <a onClick={() => navigate('/tasks')}>Задачи</a> }, { title: t.key }]}
      />
      {t.type === 'incident' && (
        <Alert
          type={t.severity === 'critical' ? 'error' : 'warning'}
          showIcon
          message={`Инцидент · ${t.severity === 'critical' ? 'критический' : 'высокий'} уровень`}
          description="Создан агентом «Метрический дозорный». Связанные данные собраны автоматически."
          style={{ marginBottom: 16 }}
        />
      )}
      <Flex justify="space-between" align="flex-start" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Space>
            <Tag>{typeLabel[t.type]}</Tag>
            <Typography.Text type="secondary">{t.key}</Typography.Text>
          </Space>
          <Typography.Title level={3} style={{ margin: '4px 0 0' }}>
            {t.title}
          </Typography.Title>
        </div>
        <Space wrap>
          <Select<TaskStatus>
            value={t.status}
            style={{ width: 170 }}
            onChange={(status) => {
              updateTask(t.key, { status });
              message.success(`Статус: ${statusLabels[status]}`);
            }}
            options={(Object.keys(statusLabels) as TaskStatus[]).map((s) => ({ value: s, label: statusLabels[s] }))}
          />
          <Button icon={<RobotOutlined />} onClick={() => navigate(`/assistant?q=${encodeURIComponent(`/история для ${t.key}`)}`)}>
            Спросить ассистента
          </Button>
        </Space>
      </Flex>

      <Row gutter={16}>
        <Col xs={24} lg={17}>
          <Card>
            <Tabs
              items={[
                {
                  key: 'desc',
                  label: 'Описание',
                  children: (
                    <>
                      <Typography.Paragraph>{t.description}</Typography.Paragraph>
                      <Descriptions column={{ xs: 1, md: 2 }} bordered size="small">
                        <Descriptions.Item label="Связанная метрика">{t.metric}</Descriptions.Item>
                        <Descriptions.Item label="Прогноз влияния">{t.impact}</Descriptions.Item>
                        <Descriptions.Item label="Story Points">{t.storyPoints}</Descriptions.Item>
                        <Descriptions.Item label="Скор приоритета">{taskScore(t)}</Descriptions.Item>
                        <Descriptions.Item label="Метки">
                          {t.labels.map((l) => (
                            <Tag key={l}>{l}</Tag>
                          ))}
                        </Descriptions.Item>
                        <Descriptions.Item label="Спринт">{t.sprint}</Descriptions.Item>
                      </Descriptions>
                    </>
                  ),
                },
                {
                  key: 'ac',
                  label: `Acceptance Criteria (${t.acceptance.length})`,
                  children: (
                    <>
                      <Checkbox.Group value={acDone} onChange={(v) => setAcDone(v as string[])} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {t.acceptance.map((a) => (
                          <Checkbox key={a} value={a}>
                            {a}
                          </Checkbox>
                        ))}
                      </Checkbox.Group>
                      <Space.Compact style={{ marginTop: 16, width: '100%' }}>
                        <Input value={newAc} onChange={(e) => setNewAc(e.target.value)} placeholder="Новый критерий приёмки" />
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() => {
                            if (!newAc.trim()) return;
                            updateTask(t.key, { acceptance: [...t.acceptance, newAc.trim()], ready: { ...t.ready, criteria: true } });
                            setNewAc('');
                          }}
                        >
                          Добавить
                        </Button>
                        <Button
                          icon={<RobotOutlined />}
                          onClick={() => {
                            updateTask(t.key, {
                              acceptance: [...t.acceptance, 'Ошибки валидации озвучиваются скринридером', 'Метрика проверена через 24 ч после релиза'],
                              ready: { ...t.ready, criteria: true },
                            });
                            message.success('Ассистент добавил 2 критерия');
                          }}
                        >
                          Сгенерировать
                        </Button>
                      </Space.Compact>
                    </>
                  ),
                },
                {
                  key: 'chat',
                  label: 'Обсуждение',
                  children: (
                    <MiniAssistantChat
                      height={360}
                      intro={`Я в контексте задачи ${t.key}. Могу сгенерировать User Story, тест-кейсы или compliance-чеклист.`}
                      suggestions={['/история', '/тесты', '/compliance', 'Какие риски у задачи?']}
                    />
                  ),
                },
                {
                  key: 'compliance',
                  label: 'Compliance',
                  children: (
                    <>
                      <Alert
                        type={t.compliance >= 6 ? 'warning' : 'info'}
                        showIcon
                        message={`Регуляторная значимость: ${t.compliance}/10`}
                        style={{ marginBottom: 16 }}
                      />
                      <Checkbox.Group value={compl} onChange={(v) => setCompl(v as string[])} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {complianceItems.map((c) => (
                          <Checkbox key={c} value={c}>
                            {c}
                          </Checkbox>
                        ))}
                      </Checkbox.Group>
                      <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
                        Выполнено {compl.length} из {complianceItems.length}. Релиз заблокирован до закрытия чеклиста.
                      </Typography.Paragraph>
                    </>
                  ),
                },
                {
                  key: 'metrics',
                  label: 'Метрики',
                  children: (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Card size="small">
                          <Statistic title={t.metric} value={68} suffix="%" />
                          <Sparkline data={npsSeries.map((v) => v + 25)} height={80} />
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card size="small">
                          <Statistic title="Обращения по теме" value={supportSeries[supportSeries.length - 1]} />
                          <Sparkline data={supportSeries} color="#ff4d4f" height={80} />
                        </Card>
                      </Col>
                    </Row>
                  ),
                },
                {
                  key: 'history',
                  label: 'История изменений',
                  children: (
                    <Timeline
                      items={[...t.history].reverse().map((h) => ({
                        children: (
                          <>
                            <Typography.Text strong>{h.author}</Typography.Text> — {h.text}
                            <div>
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {dayjs(h.time).format('DD.MM.YYYY HH:mm')}
                              </Typography.Text>
                            </div>
                          </>
                        ),
                      }))}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={7}>
          <Card size="small" title="Детали" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Исполнитель">
                <Select
                  size="small"
                  variant="borderless"
                  value={t.assignee}
                  onChange={(assignee) => updateTask(t.key, { assignee })}
                  style={{ minWidth: 160 }}
                  options={team.map((m) => ({
                    value: m.name,
                    label: (
                      <Space size={4}>
                        <Avatar size={18} style={{ background: colorOf(m.name), fontSize: 10 }}>
                          {initials(m.name)}
                        </Avatar>
                        {m.name}
                      </Space>
                    ),
                  }))}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Приоритет">
                <Tag color={priorityMeta[t.priority].color}>{priorityMeta[t.priority].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Риск">
                <Tag color={riskMeta[t.risk].color}>{riskMeta[t.risk].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Срок">{dayjs(t.dueDate).format('DD.MM.YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Продукт">{t.product}</Descriptions.Item>
            </Descriptions>
          </Card>
          <Card size="small" title="Связанные артефакты">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Подтянуты автоматически из Git, Figma и Confluence
            </Typography.Text>
            <List
              size="small"
              dataSource={t.related}
              locale={{ emptyText: 'Нет связанных артефактов' }}
              renderItem={(r) => (
                <List.Item style={{ cursor: 'pointer' }} onClick={() => navigate('/knowledge')}>
                  <Space>
                    {relatedIcon[r.type]}
                    {r.title}
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
