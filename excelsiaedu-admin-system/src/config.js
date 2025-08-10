const config = {
  // 在生產環境中使用相對路徑，在開發環境中使用本地服務器
  API_URL: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001'
};

export default config;
