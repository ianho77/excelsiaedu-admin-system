const config = {
  // 前端部署在 Vercel，後端部署在 Render
  // 開發環境使用本地後端，生產環境使用 Render 後端
  API_URL: process.env.NODE_ENV === 'production' 
    ? (process.env.REACT_APP_API_URL || 'https://your-backend-service.onrender.com')
    : 'http://localhost:4000'
};

export default config;
