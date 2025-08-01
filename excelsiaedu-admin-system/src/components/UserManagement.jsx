import React, { useState, useEffect } from 'react';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    userType: 'teacher',
    name: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/auth/users');
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

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:4000/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        alert('用戶創建成功！');
        setShowAddModal(false);
        setFormData({ username: '', password: '', userType: 'teacher', name: '' });
        fetchUsers();
      } else {
        alert(data.error || '創建用戶失敗');
      }
    } catch (error) {
      console.error('創建用戶錯誤:', error);
      alert('創建用戶失敗');
    }
  };

  const handleUpdatePassword = async (username, newPassword) => {
    try {
      const response = await fetch(`http://localhost:4000/api/auth/users/${username}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        alert('密碼更新成功！');
        setShowEditModal(false);
        setSelectedUser(null);
      } else {
        alert(data.error || '更新密碼失敗');
      }
    } catch (error) {
      console.error('更新密碼錯誤:', error);
      alert('更新密碼失敗');
    }
  };

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`確定要刪除用戶 "${username}" 嗎？`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/auth/users/${username}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('用戶刪除成功！');
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || '刪除用戶失敗');
      }
    } catch (error) {
      console.error('刪除用戶錯誤:', error);
      alert('刪除用戶失敗');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '從未登入';
    return new Date(dateString).toLocaleString('zh-TW');
  };

  if (loading) {
    return (
      <div className="content">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="user-management-header">
        <h1>用戶管理</h1>
        <button 
          className="add-user-button"
          onClick={() => setShowAddModal(true)}
        >
          新增用戶
        </button>
      </div>

      <div className="user-table-container">
        <table className="user-table">
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
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.username}</td>
                <td>{user.name}</td>
                <td>
                  <span className={`user-type ${user.userType}`}>
                    {user.userType === 'admin' ? '管理員' : '教師'}
                  </span>
                </td>
                <td>{formatDate(user.createdAt)}</td>
                <td>{formatDate(user.lastLogin)}</td>
                <td>
                  <button
                    className="edit-button"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowEditModal(true);
                    }}
                  >
                    修改密碼
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteUser(user.username)}
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新增用戶彈窗 */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>新增用戶</h2>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label>用戶名：</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>密碼：</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>姓名：</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>用戶類型：</label>
                <select
                  value={formData.userType}
                  onChange={(e) => setFormData({...formData, userType: e.target.value})}
                >
                  <option value="teacher">教師</option>
                  <option value="admin">管理員</option>
                </select>
              </div>
              <div className="modal-buttons">
                <button type="submit">新增</button>
                <button type="button" onClick={() => setShowAddModal(false)}>取消</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 修改密碼彈窗 */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>修改密碼 - {selectedUser.username}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const newPassword = e.target.newPassword.value;
              handleUpdatePassword(selectedUser.username, newPassword);
            }}>
              <div className="form-group">
                <label>新密碼：</label>
                <input
                  type="password"
                  name="newPassword"
                  required
                />
              </div>
              <div className="modal-buttons">
                <button type="submit">更新</button>
                <button type="button" onClick={() => setShowEditModal(false)}>取消</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 