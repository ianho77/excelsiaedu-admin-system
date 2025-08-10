import React, { useState, useEffect } from 'react';
import './LoginManagement.css';
import config from '../config';

const LoginManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${config.API_URL}/auth/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('獲取用戶列表失敗');
      }
    } catch (error) {
      console.error('獲取用戶列表錯誤:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      alert('請輸入新密碼');
      return;
    }

    try {
      const response = await fetch(`${config.API_URL}/auth/users/${selectedUser.username}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setShowEditModal(false);
        setSelectedUser(null);
        setNewPassword('');
      } else {
        alert(data.error || '更新密碼失敗');
      }
    } catch (error) {
      console.error('更新密碼錯誤:', error);
      alert('更新密碼失敗');
    }
  };

  const handleEditPassword = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowEditModal(true);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setSelectedUser(null);
    setNewPassword('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '從未登入';
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW');
  };

  const getUserTypeText = (userType) => {
    return userType === 'admin' ? '管理員' : '教師';
  };

  if (loading) {
    return (
      <div className="login-management">
        <h2>登入管理</h2>
        <div className="loading">載入中...</div>
      </div>
    );
  }

  return (
    <div className="login-management">
      <h2>登入管理</h2>
      <p className="description">管理系統用戶的登入信息</p>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>用戶名</th>
              <th>姓名</th>
              <th>用戶類型</th>
              <th>創建時間</th>
              <th>最後登入</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.username}</td>
                <td>{user.name}</td>
                <td>
                  <span className={`user-type ${user.userType}`}>
                    {getUserTypeText(user.userType)}
                  </span>
                </td>
                <td>{formatDate(user.createdAt)}</td>
                <td>{formatDate(user.lastLogin)}</td>
                <td>
                  <button
                    className="edit-button"
                    onClick={() => handleEditPassword(user)}
                  >
                    修改密碼
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 修改密碼彈窗 */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>修改密碼</h3>
            <p>用戶：{selectedUser.username} ({selectedUser.name})</p>
            <form onSubmit={handleUpdatePassword}>
              <div className="form-group">
                <label>新密碼：</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="請輸入新密碼"
                  required
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="confirm-button">
                  確認修改
                </button>
                <button type="button" className="cancel-button" onClick={handleCancelEdit}>
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginManagement; 