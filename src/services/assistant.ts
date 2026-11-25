import type { ChatMessage, Task } from '../data/types';
import { taskScore } from '../data/mock';

/**
 * Демо-«мозг» ассистента. Возвращает ответ по ключевым словам.
 * В реальной платформе здесь вызов backend → LLM с контекстом из Jira/Confluence/Git/метрик.
 */
export type AssistantReply = Omit<ChatMessage, 'id' | 'time'>;

const reply = (text: string, extra: Partial<AssistantReply> = {}): AssistantReply => ({
  role: 'assistant',
  author: 'Ко-Пилот',
  text,
  ...extra,
});

export const slashCommands = [
  { value: '/задача', label: '/задача — создать задачу из описания' },
  { value: '/отчёт', label: '/отчёт — сводка по спринту' },
  { value: '/метрики', label: '/метрики — воронка конверсии' },
  { value: '/история', label: '/история — сгенерировать User Story' },
  { value: '/compliance', label: '/compliance — чеклист требований' },
  { value: '/тесты', label: '/тесты — сгенерировать тест-кейсы' },
];

export function generateReply(input: string, tasks: Task[], detail = 2): AssistantReply {
  const q = input.toLowerCase();

  if (q.startsWith('/задача')) {
    const title = input.replace(/^\/задача\s*/i, '') || 'Новая задача из диалога';
    return reply(`Подготовил черновик задачи «${title}». Нажмите «Создать задачу», чтобы добавить её в бэклог.`, {
      cards: [{ title, type: 'task', meta: 'черновик' }],
    });
  }

  if (q.startsWith('/история') || q.includes('user story')) {
    return reply(
      'User Story:\nКак клиент, оформляющий кредит в мобильном приложении, я хочу вводить серию паспорта в привычном формате (с пробелом или без), чтобы не застревать на шаге идентификации.\n\nКритерии приёмки:\n1. Поле принимает «45 08», «4508» и «45-08».\n2. При ошибке показывается пример правильного формата.\n3. Конверсия шага ≥ 78% через 24 ч после релиза.\n\nImpact Map: цель — конверсия заявки 35% → актор — клиент → влияние — меньше ошибок ввода → результат — гибкая маска поля.',
    );
  }

  if (q.startsWith('/compliance') || q.includes('compliance') || q.includes('регулят')) {
    return reply(
      'Compliance-чеклист:\n☐ Согласие на обработку ПД (152-ФЗ) зафиксировано\n☐ Идентификация клиента по 115-ФЗ не ослаблена\n☐ Логирование изменений анкеты\n☐ ПСК отображается до подписания\n☐ Ревью службы ИБ',
      { cards: [{ title: 'Требования ЦБ к идентификации клиента', type: 'confluence' }] },
    );
  }

  if (q.startsWith('/тест')) {
    return reply(
      'Тест-кейсы:\nTC-1 Ввод серии «4508» → принимается\nTC-2 Ввод «45 08» → принимается, нормализуется\nTC-3 Ввод «45-08» → принимается\nTC-4 Ввод «AB12» → ошибка с примером формата\nTC-5 Пустое поле → кнопка «Далее» неактивна\nTC-6 Озвучка ошибки скринридером (accessibility)',
    );
  }

  if (q.startsWith('/отчёт') || q.startsWith('/отчет') || q.includes('спринт') || q.includes('burndown')) {
    const open = tasks.filter((t) => t.sprint === 'Спринт 24' && t.status !== 'done');
    const risky = open.filter((t) => t.risk !== 'none');
    return reply(
      `Спринт 24: осталось ${open.length} задач, ${risky.length} под риском (${risky.map((t) => t.key).join(', ') || 'нет'}). ` +
        'По текущей скорости спринт завершится с опозданием на 1 день; рекомендую перенести CP-217 в следующий спринт.',
      { chart: 'burndown' },
    );
  }

  if (q.startsWith('/метрики') || q.includes('конверс') || q.includes('воронк') || q.includes('паспорт')) {
    return reply(
      'Конверсия шага «Ввод паспорта» — 68% (норма 78%). Падение началось сразу после мержа PR #4521. ' +
        (detail >= 2 ? '41% пользователей вводят серию с пробелом, новая валидация это запрещает. 37 тикетов в поддержке за час. ' : '') +
        'Рекомендация: hotfix валидации, затем задача на автозаполнение из Госуслуг (CP-214).',
      {
        chart: 'funnel',
        cards: [
          { title: 'PR #4521 — Новая валидация паспорта', type: 'pr', meta: 'подозрительный' },
          { title: 'INC-101 Падение конверсии', type: 'task', meta: 'критический' },
        ],
      },
    );
  }

  if (q.includes('nps') || q.includes('поддерж') || q.includes('обращен')) {
    return reply('NPS за 30 дней: 41 → 44 (пик 47). Обращения в поддержку выросли на 50% за последние 2 дня — основная тема «не принимает паспорт».', {
      chart: 'sparkline',
    });
  }

  if (q.includes('приоритет') || q.includes('бэклог') || q.includes('backlog')) {
    const top = [...tasks]
      .filter((t) => t.status !== 'done')
      .sort((a, b) => taskScore(b) - taskScore(a))
      .slice(0, 3);
    return reply(`Топ-3 по скору (RICE + compliance + стратегия): ${top.map((t) => `${t.key} (${taskScore(t)})`).join(', ')}.`, {
      cards: top.map((t) => ({ title: `${t.key} ${t.title}`, type: 'task' as const })),
    });
  }

  if (q.includes('ретро') || q.includes('улучшен')) {
    return reply(
      'Идеи улучшений:\n1. Добавить в Definition of Done проверку метрик через 1 ч после релиза.\n2. Включить агента «Страж PR» для обязательной проверки валидаций.\n3. Канареечные релизы на 5% аудитории для изменений в анкете.',
    );
  }

  if (q.includes('идеи') || q.includes('брейншторм') || q.includes('фич')) {
    return reply(
      'Предлагаю технику «Как мы могли бы…». Идеи из «Банка возможностей»:\n• Автозаполнение из Госуслуг (сигнал от Разведчика рынка)\n• Предодобренный лимит в профиле\n• Калькулятор платежа на главном\n• Сканирование паспорта камерой (OCR)',
    );
  }

  return reply(
    `Понял запрос: «${input}». Я учту контекст продукта и спринта. Попробуйте команды: /метрики, /отчёт, /история, /compliance, /тесты — или спросите про конверсию, NPS, бэклог.`,
  );
}
