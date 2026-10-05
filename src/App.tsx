import AppRouter from './router/AppRouter';
import { ConfigProvider, App as AntdApp } from 'antd';
import esES from 'antd/locale/es_ES';
import './App.css';

// Tema personalizado con color #50EBEC
const themeConfig = {
  token: {
    colorPrimary: '#50EBEC',
    colorPrimaryHover: '#36C6C7',
    colorPrimaryActive: '#2BA1A2',
    colorLink: '#50EBEC',
    colorLinkHover: '#36C6C7',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#50EBEC',
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  },
  components: {
    Button: {
      primaryShadow: '0 2px 8px rgba(80, 235, 236, 0.3)',
      borderRadius: 8,
    },
    Card: {
      borderRadiusLG: 16,
    },
    Input: {
      borderRadius: 8,
    },
    Select: {
      borderRadius: 8,
    },
    DatePicker: {
      borderRadius: 8,
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Table: {
      borderRadius: 8,
    },
    Menu: {
      itemBorderRadius: 8,
    },
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#001529',
    },
  },
};

function App() {
  return (
    <ConfigProvider
      locale={esES}
      theme={themeConfig}
    >
      <AntdApp>
        <AppRouter />
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;