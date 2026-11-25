import { App, DatePicker, Form, Input, Modal, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { useStore } from '../store/AppStore';
import { priorityMeta, team } from '../data/mock';
import type { Task, Room } from '../data/types';

export function CreateTaskModal() {
  const { createTaskOpen, setCreateTaskOpen, createTask } = useStore();
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const navigate = useNavigate();

  return (
    <Modal
      title="Создать задачу"
      open={createTaskOpen}
      okText="Создать"
      cancelText="Отмена"
      onCancel={() => setCreateTaskOpen(false)}
      onOk={() =>
        form.validateFields().then((v) => {
          const { dueDate, ...rest } = v;
          const t = createTask({ ...rest, ...(dueDate ? { dueDate: (dueDate as Dayjs).format('YYYY-MM-DD') } : {}) });
          message.success(`Задача ${t.key} создана`);
          form.resetFields();
          setCreateTaskOpen(false);
          navigate(`/tasks/${t.key}`);
        })
      }
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ type: 'story', priority: 'medium', assignee: team[2].name }}>
        <Form.Item name="title" label="Заголовок" rules={[{ required: true, message: 'Введите заголовок' }]}>
          <Input placeholder="Например: Автозаполнение адреса по индексу" />
        </Form.Item>
        <Form.Item name="description" label="Описание">
          <Input.TextArea rows={3} placeholder="Как <роль>, я хочу <действие>, чтобы <ценность>" />
        </Form.Item>
        <Form.Item name="type" label="Тип">
          <Select<Task['type']>
            options={[
              { value: 'story', label: 'История' },
              { value: 'bug', label: 'Баг' },
              { value: 'tech', label: 'Техдолг' },
              { value: 'incident', label: 'Инцидент' },
            ]}
          />
        </Form.Item>
        <Form.Item name="priority" label="Приоритет">
          <Select options={Object.entries(priorityMeta).map(([value, m]) => ({ value, label: m.label }))} />
        </Form.Item>
        <Form.Item name="assignee" label="Исполнитель">
          <Select options={team.map((m) => ({ value: m.name, label: `${m.name} · ${m.role}` }))} />
        </Form.Item>
        <Form.Item name="dueDate" label="Срок">
          <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function CreateRoomModal() {
  const { createRoomOpen, setCreateRoomOpen, createRoom } = useStore();
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const navigate = useNavigate();

  return (
    <Modal
      title="Создать комнату"
      open={createRoomOpen}
      okText="Создать"
      cancelText="Отмена"
      onCancel={() => setCreateRoomOpen(false)}
      onOk={() =>
        form.validateFields().then((v) => {
          const r = createRoom({
            type: v.type as Room['type'],
            title: v.title,
            status: 'scheduled',
            date: (v.date as Dayjs).toISOString(),
            participants: v.participants,
          });
          message.success('Комната создана');
          form.resetFields();
          setCreateRoomOpen(false);
          navigate(`/rooms/${r.id}`);
        })
      }
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ type: 'planning', date: dayjs().add(1, 'day').hour(11).minute(0), participants: team.map((m) => m.name) }}
      >
        <Form.Item name="type" label="Тип церемонии">
          <Select
            options={[
              { value: 'planning', label: 'Планирование спринта' },
              { value: 'retro', label: 'Ретроспектива' },
              { value: 'grooming', label: 'Груминг' },
            ]}
          />
        </Form.Item>
        <Form.Item name="title" label="Название" rules={[{ required: true, message: 'Введите название' }]}>
          <Input placeholder="Планирование спринта 26" />
        </Form.Item>
        <Form.Item name="date" label="Дата и время" rules={[{ required: true }]}>
          <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="participants" label="Участники">
          <Select mode="multiple" options={team.map((m) => ({ value: m.name, label: m.name }))} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
