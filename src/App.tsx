import { App as AntApp, ConfigProvider, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import { useStore } from './store/AppStore';
import DashboardPage from './pages/DashboardPage';
import AssistantPage from './pages/AssistantPage';
import AgentsPage from './pages/AgentsPage';
import ServicesPage from './pages/ServicesPage';
import TasksPage from './pages/TasksPage';
import TaskDetailPage from './pages/TaskDetailPage';
import RoomsPage from './pages/RoomsPage';
import RoomPage from './pages/RoomPage';
import KnowledgePage from './pages/KnowledgePage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function Root() {
  const { settings } = useStore();
  const algorithms = [settings.theme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm];
  if (settings.compact) algorithms.push(theme.compactAlgorithm);

  return (
    <ConfigProvider
      locale={settings.language === 'ru' ? ruRU : enUS}
      theme={{
        algorithm: algorithms,
        token: { colorPrimary: '#1677ff', borderRadius: 8 },
      }}
    >
      <AntApp>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="tasks/:key" element={<TaskDetailPage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="rooms/:id" element={<RoomPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AntApp>
    </ConfigProvider>
  );
}
