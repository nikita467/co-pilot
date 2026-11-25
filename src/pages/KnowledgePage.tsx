import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  App,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Input,
  List,
  Segmented,
  Select,
  Space,
  Tabs,
  Tag,
  Timeline,
  Typography,
  theme,
} from 'antd';
import { AimOutlined, LinkOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useStore } from '../store/AppStore';
import PageHeader from '../components/PageHeader';
import { knowledgeNodes } from '../data/mock';
import type { KnowledgeNode, NodeType } from '../data/types';

export const nodeMeta: Record<NodeType, { label: string; color: string }> = {
  epic: { label: 'Эпик', color: '#722ed1' },
  task: { label: 'Задача', color: '#1677ff' },
  pr: { label: 'PR', color: '#52c41a' },
  metric: { label: 'Метрика', color: '#fa8c16' },
  confluence: { label: 'Confluence', color: '#13c2c2' },
  research: { label: 'Исследование', color: '#eb2f96' },
};

const NODE_W = 190;
const NODE_H = 46;

export default function KnowledgePage() {
  const { edges, addEdge } = useStore();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState<NodeType[]>(Object.keys(nodeMeta) as NodeType[]);
  const [view, setView] = useState<'graph' | 'list'>('graph');
  const [nodes, setNodes] = useState<KnowledgeNode[]>(knowledgeNodes);
  const [selected, setSelected] = useState<string | null>(null);
  const [opened, setOpened] = useState<KnowledgeNode | null>(null);
  const [linkTarget, setLinkTarget] = useState<string>();
  const [linkLabel, setLinkLabel] = useState('связан с');
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const id = params.get('node');
    if (id) {
      const n = knowledgeNodes.find((x) => x.id === id);
      if (n) {
        setSelected(id);
        setOpened(n);
      }
      params.delete('node');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const visible = nodes.filter((n) => types.includes(n.type));
  const visibleIds = new Set(visible.map((n) => n.id));
  const matches = (n: KnowledgeNode) => !!query && (n.title + n.description).toLowerCase().includes(query.toLowerCase());
  const neighbours = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(edges.flatMap((e) => (e.source === selected ? [e.target] : e.target === selected ? [e.source] : [])));
  }, [edges, selected]);

  const pos = (id: string) => nodes.find((n) => n.id === id)!;

  const toSvg = (e: ReactMouseEvent) => {
    const pt = svgRef.current!.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svgRef.current!.getScreenCTM()!.inverse());
  };

  const related = opened
    ? edges
        .filter((e) => e.source === opened.id || e.target === opened.id)
        .map((e) => ({ edge: e, node: pos(e.source === opened.id ? e.target : e.source), out: e.source === opened.id }))
    : [];

  return (
    <>
      <PageHeader title="База знаний" subtitle="Граф всех продуктовых артефактов и связей между ними" />
      <Flex gap={12} wrap align="center" style={{ marginBottom: 12 }}>
        <Input.Search
          placeholder="Поиск по задачам, документам, коду, метрикам, макетам, исследованиям"
          allowClear
          style={{ maxWidth: 480 }}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Segmented
          value={view}
          onChange={(v) => setView(v as 'graph' | 'list')}
          options={[
            { label: 'Граф', value: 'graph' },
            { label: 'Список', value: 'list' },
          ]}
        />
      </Flex>
      <Checkbox.Group
        value={types}
        onChange={(v) => setTypes(v as NodeType[])}
        style={{ marginBottom: 12 }}
        options={(Object.keys(nodeMeta) as NodeType[]).map((t) => ({
          value: t,
          label: <Tag color={nodeMeta[t].color}>{nodeMeta[t].label}</Tag>,
        }))}
      />

      {view === 'graph' ? (
        <Card styles={{ body: { padding: 0, position: 'relative' } }}>
          <Typography.Text type="secondary" style={{ position: 'absolute', margin: 12, fontSize: 12 }}>
            Клик — подсветить связи · двойной клик — открыть карточку · перетаскивайте узлы
          </Typography.Text>
          <svg
            ref={svgRef}
            viewBox="0 0 900 600"
            width="100%"
            style={{ display: 'block', minHeight: 420, userSelect: 'none' }}
            onMouseMove={(e) => {
              if (!drag.current) return;
              const p = toSvg(e);
              drag.current.moved = true;
              const { id, dx, dy } = drag.current;
              setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, x: p.x - dx, y: p.y - dy } : n)));
            }}
            onMouseUp={() => (drag.current = null)}
            onMouseLeave={() => (drag.current = null)}
            onClick={(e) => e.target === svgRef.current && setSelected(null)}
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={token.colorTextQuaternary} />
              </marker>
            </defs>
            {edges
              .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
              .map((e) => {
                const a = pos(e.source);
                const b = pos(e.target);
                const active = selected && (e.source === selected || e.target === selected);
                const dim = selected && !active;
                const ax = a.x + NODE_W / 2;
                const ay = a.y + NODE_H;
                const bx = b.x + NODE_W / 2;
                const by = b.y;
                return (
                  <g key={`${e.source}-${e.target}`} opacity={dim ? 0.2 : 1}>
                    <path
                      d={`M${ax},${ay} C${ax},${(ay + by) / 2} ${bx},${(ay + by) / 2} ${bx},${by}`}
                      fill="none"
                      stroke={active ? token.colorPrimary : token.colorBorder}
                      strokeWidth={active ? 2 : 1.5}
                      markerEnd="url(#arrow)"
                    />
                    <text x={(ax + bx) / 2} y={(ay + by) / 2 - 4} fontSize={11} textAnchor="middle" fill={token.colorTextTertiary}>
                      {e.label}
                    </text>
                  </g>
                );
              })}
            {visible.map((n) => {
              const meta = nodeMeta[n.type];
              const isSel = n.id === selected;
              const dim = (selected && !isSel && !neighbours.has(n.id)) || (query && !matches(n));
              return (
                <g
                  key={n.id}
                  className="cp-graph-node"
                  transform={`translate(${n.x},${n.y})`}
                  opacity={dim ? 0.3 : 1}
                  onMouseDown={(e) => {
                    const p = toSvg(e);
                    drag.current = { id: n.id, dx: p.x - n.x, dy: p.y - n.y, moved: false };
                  }}
                  onClick={() => {
                    if (!drag.current?.moved) setSelected(n.id);
                  }}
                  onDoubleClick={() => setOpened(n)}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    fill={token.colorBgContainer}
                    stroke={isSel || matches(n) ? token.colorPrimary : meta.color}
                    strokeWidth={isSel || matches(n) ? 2.5 : 1.5}
                  />
                  <rect width={6} height={NODE_H} rx={3} fill={meta.color} />
                  <text x={14} y={18} fontSize={10} fill={meta.color} fontWeight={600}>
                    {meta.label.toUpperCase()}
                  </text>
                  <text x={14} y={35} fontSize={12} fill={token.colorText}>
                    {n.title.length > 26 ? `${n.title.slice(0, 25)}…` : n.title}
                  </text>
                </g>
              );
            })}
          </svg>
        </Card>
      ) : (
        <Card>
          <List
            dataSource={visible.filter((n) => !query || matches(n))}
            locale={{ emptyText: <Empty description="Ничего не найдено" /> }}
            renderItem={(n) => (
              <List.Item actions={[<Button key="o" type="link" onClick={() => setOpened(n)}>Открыть</Button>]}>
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color={nodeMeta[n.type].color}>{nodeMeta[n.type].label}</Tag>
                      {n.title}
                    </Space>
                  }
                  description={n.description}
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      <Drawer
        width={520}
        open={!!opened}
        onClose={() => setOpened(null)}
        title={
          opened && (
            <Space>
              <Tag color={nodeMeta[opened.type].color}>{nodeMeta[opened.type].label}</Tag>
              {opened.title}
            </Space>
          )
        }
        extra={
          opened?.type === 'task' && (
            <Button icon={<AimOutlined />} onClick={() => navigate(`/tasks/${opened.id}`)}>
              К задаче
            </Button>
          )
        }
      >
        {opened && (
          <Tabs
            items={[
              {
                key: 'overview',
                label: 'Обзор',
                children: (
                  <>
                    <Typography.Paragraph>{opened.description}</Typography.Paragraph>
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="Тип">{nodeMeta[opened.type].label}</Descriptions.Item>
                      <Descriptions.Item label="Автор">{opened.author}</Descriptions.Item>
                      <Descriptions.Item label="Обновлено">{dayjs(opened.updated).format('DD.MM.YYYY HH:mm')}</Descriptions.Item>
                      <Descriptions.Item label="Связей">{related.length}</Descriptions.Item>
                    </Descriptions>
                  </>
                ),
              },
              {
                key: 'related',
                label: `Связанные объекты (${related.length})`,
                children: (
                  <>
                    <List
                      size="small"
                      dataSource={related}
                      renderItem={(r) => (
                        <List.Item style={{ cursor: 'pointer' }} onClick={() => setOpened(r.node)}>
                          <Space>
                            <Typography.Text type="secondary">{r.out ? r.edge.label : `← ${r.edge.label}`}</Typography.Text>
                            <Tag color={nodeMeta[r.node.type].color}>{nodeMeta[r.node.type].label}</Tag>
                            {r.node.title}
                          </Space>
                        </List.Item>
                      )}
                    />
                    <Typography.Text strong style={{ display: 'block', marginTop: 16 }}>
                      Добавить связь вручную
                    </Typography.Text>
                    <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                      <Select
                        value={linkLabel}
                        onChange={setLinkLabel}
                        style={{ width: 140 }}
                        options={['связан с', 'влияет', 'зависит от', 'описан в', 'вызван'].map((v) => ({ value: v }))}
                      />
                      <Select
                        placeholder="Артефакт"
                        value={linkTarget}
                        onChange={setLinkTarget}
                        style={{ flex: 1 }}
                        showSearch
                        optionFilterProp="label"
                        options={nodes
                          .filter((n) => n.id !== opened.id && !related.some((r) => r.node.id === n.id))
                          .map((n) => ({ value: n.id, label: n.title }))}
                      />
                      <Button
                        type="primary"
                        icon={<LinkOutlined />}
                        disabled={!linkTarget}
                        onClick={() => {
                          addEdge({ source: opened.id, target: linkTarget!, label: linkLabel });
                          setLinkTarget(undefined);
                          message.success('Связь добавлена');
                        }}
                      />
                    </Space.Compact>
                  </>
                ),
              },
              {
                key: 'history',
                label: 'История изменений',
                children: (
                  <Timeline
                    items={opened.history.map((h) => ({
                      children: (
                        <>
                          {h.text}
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
        )}
      </Drawer>
    </>
  );
}
