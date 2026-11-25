import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import relativeTime from 'dayjs/plugin/relativeTime';
import { AppStoreProvider } from './store/AppStore';
import Root from './App';
import './styles.css';

dayjs.extend(relativeTime);
dayjs.locale('ru');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AppStoreProvider>
        <Root />
      </AppStoreProvider>
    </HashRouter>
  </React.StrictMode>,
);
