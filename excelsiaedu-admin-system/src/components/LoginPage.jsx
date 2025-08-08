import React, { useState } from 'react';
import './LoginPage.css';

const LoginPage = ({ onLogin }) => {
  const [loginType, setLoginType] = useState('teacher'); // 'teacher' or 'admin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 簡單的驗證邏輯
    if (!username.trim() || !password.trim()) {
      setError('請輸入用戶名和密碼');
      return;
    }

    try {
      // 使用API進行驗證
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          userType: loginType
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 登入成功
        onLogin(loginType, data.user.name);
      } else {
        // 登入失敗
        setError(data.error || '登入失敗，請檢查用戶名和密碼');
      }
    } catch (error) {
      console.error('登入錯誤:', error);
      setError('網絡錯誤，請稍後重試');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/EE_Logo SIMPLE COLOR PNG.png" alt="Logo" className="login-logo" />
          <h1>Excelsia Education</h1>
          <p>教育管理系統</p>
        </div>

        <div className="login-type-selector">
          <button
            className={`type-button ${loginType === 'teacher' ? 'active' : ''}`}
            onClick={() => setLoginType('teacher')}
          >
            教師登入
          </button>
          <button
            className={`type-button ${loginType === 'admin' ? 'active' : ''}`}
            onClick={() => setLoginType('admin')}
          >
            管理員登入
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">用戶名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={loginType === 'teacher' ? '教師用戶名' : '管理員用戶名'}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密碼</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button">
            {loginType === 'teacher' ? '教師登入' : '管理員登入'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage; 