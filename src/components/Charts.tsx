import { useState } from 'react';
import { Button, Flex, Tooltip, Typography, theme } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { burndown, funnel } from '../data/mock';

/** Лёгкие SVG-графики без сторонних библиотек — цвета берутся из токенов Ant Design. */

export function Sparkline({ data, color, height = 56 }: { data: number[]; color?: string; height?: number }) {
  const { token } = theme.useToken();
  const stroke = color ?? token.colorPrimary;
  const w = 300;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, height - 4 - ((v - min) / (max - min || 1)) * (height - 8)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="Спарклайн">
      <path d={`${d} L${w},${height} L0,${height} Z`} fill={stroke} opacity={0.08} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={stroke} />
    </svg>
  );
}

export function FunnelChart({ onAsk, threshold = 5 }: { onAsk?: (step: string) => void; threshold?: number }) {
  const { token } = theme.useToken();
  const [selected, setSelected] = useState<string | null>(null);
  const max = funnel[0].value;
  return (
    <Flex vertical gap={8}>
      {funnel.map((s, i) => {
        const prev = i ? funnel[i - 1].value : s.value;
        const stepConv = Math.round((s.value / prev) * 100);
        const isAlert = s.alert && 100 - stepConv > threshold;
        return (
          <Tooltip
            key={s.step}
            title={`${s.value.toLocaleString('ru-RU')} польз. · ${Math.round((s.value / max) * 100)}% от старта · шаг ${stepConv}%`}
          >
            <div style={{ cursor: 'pointer' }} onClick={() => setSelected(s.step === selected ? null : s.step)}>
              <Flex justify="space-between">
                <Typography.Text style={{ fontSize: 12 }} type={isAlert ? 'danger' : undefined}>
                  {s.step}
                </Typography.Text>
                <Typography.Text style={{ fontSize: 12 }} type="secondary">
                  {i ? `${stepConv}%` : '100%'}
                </Typography.Text>
              </Flex>
              <div style={{ background: token.colorFillTertiary, borderRadius: 4, height: 14 }}>
                <div
                  style={{
                    width: `${(s.value / max) * 100}%`,
                    height: '100%',
                    borderRadius: 4,
                    background: isAlert ? token.colorError : token.colorPrimary,
                    opacity: selected && selected !== s.step ? 0.4 : 1,
                    transition: 'all .2s',
                  }}
                />
              </div>
            </div>
          </Tooltip>
        );
      })}
      {selected && onAsk && (
        <Button size="small" type="primary" ghost icon={<RobotOutlined />} onClick={() => onAsk(selected)}>
          Спросить ассистента о шаге «{selected}»
        </Button>
      )}
    </Flex>
  );
}

export function BurndownChart({ height = 140 }: { height?: number }) {
  const { token } = theme.useToken();
  const w = 320;
  const pad = 20;
  const { total, days, actual } = burndown;
  const x = (d: number) => pad + (d / days) * (w - pad * 2);
  const y = (v: number) => pad / 2 + (1 - v / total) * (height - pad * 1.5);
  const actualPath = actual.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  // прогноз по средней скорости
  const speed = (actual[0] - actual[actual.length - 1]) / (actual.length - 1);
  const lastDay = actual.length - 1;
  const forecastEnd = lastDay + actual[lastDay] / speed;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} role="img" aria-label="Burndown спринта">
        <line x1={x(0)} y1={y(total)} x2={x(days)} y2={y(0)} stroke={token.colorTextQuaternary} strokeDasharray="4 4" />
        <path d={actualPath} fill="none" stroke={token.colorPrimary} strokeWidth={2.5} />
        <line
          x1={x(lastDay)}
          y1={y(actual[lastDay])}
          x2={x(Math.min(forecastEnd, days + 1))}
          y2={y(Math.max(0, actual[lastDay] - speed * (Math.min(forecastEnd, days + 1) - lastDay)))}
          stroke={token.colorWarning}
          strokeWidth={2}
          strokeDasharray="6 3"
        />
        <line x1={pad} y1={y(0)} x2={w - pad} y2={y(0)} stroke={token.colorBorder} />
        {Array.from({ length: days + 1 }, (_, d) => (
          <text key={d} x={x(d)} y={height - 2} fontSize={9} textAnchor="middle" fill={token.colorTextTertiary}>
            {d + 1}
          </text>
        ))}
      </svg>
      <Flex gap={12} wrap style={{ fontSize: 12 }}>
        <Typography.Text type="secondary">— — идеал</Typography.Text>
        <Typography.Text style={{ color: token.colorPrimary }}>━ факт: {actual[lastDay]} SP осталось</Typography.Text>
        <Typography.Text style={{ color: token.colorWarning }}>
          ┅ прогноз: день {Math.ceil(forecastEnd + 1)} из {days + 1}
        </Typography.Text>
      </Flex>
    </div>
  );
}
