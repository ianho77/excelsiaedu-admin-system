import React, { useState, useEffect, useCallback } from 'react';
import './CostManagement.css';
import api from '../services/api';

const CostManagement = () => {
  // 狀態管理
  const [activeTab, setActiveTab] = useState('addCost');
  const [costs, setCosts] = useState([]);
  const [profitStats, setProfitStats] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [loading, setLoading] = useState(false);

  // 新增成本表單狀態
  const [newCost, setNewCost] = useState({
    category: '',
    date: '',
    amount: '',
    notes: ''
  });

  // 成本類別選項
  const costCategories = [
    { value: '薪金', label: '薪金' },
    { value: '租金', label: '租金' },
    { value: '電費', label: '電費' },
    { value: '雜費', label: '雜費' },
    { value: '影印費', label: '影印費' }
  ];

  // 獲取成本數據
  const fetchCosts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.costs.getByMonth(selectedMonth);
      setCosts(data);
    } catch (error) {
      console.error('獲取成本數據失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  // 獲取利潤統計
  const fetchProfitStats = useCallback(async () => {
    try {
      const data = await api.profit.getStatistics();
      setProfitStats(data);
    } catch (error) {
      console.error('獲取利潤統計失敗:', error);
    }
  }, []);

  // 組件載入時獲取數據
  useEffect(() => {
    fetchCosts();
    fetchProfitStats();
  }, [selectedMonth, fetchCosts, fetchProfitStats]);

  // 處理新增成本
  const handleAddCost = async (e) => {
    e.preventDefault();
    
    if (!newCost.category || !newCost.date || !newCost.amount) {
      alert('請填寫所有必填欄位');
      return;
    }

    try {
      console.log('正在新增成本記錄:', newCost);
      
      const costData = {
        ...newCost,
        amount: parseFloat(newCost.amount)
      };
      
      console.log('發送數據:', costData);
      
      const result = await api.costs.create(costData);
      console.log('新增成功:', result);
      
      // 重置表單
      setNewCost({
        category: '',
        date: '',
        amount: '',
        notes: ''
      });
      
      // 重新獲取數據
      fetchCosts();
      fetchProfitStats();
      
      alert('成本記錄已成功新增');
    } catch (error) {
      console.error('新增成本失敗:', error);
      console.error('錯誤詳情:', error.message);
      console.error('錯誤響應:', error.response);
      
      let errorMessage = '新增成本失敗，請重試';
      if (error.message) {
        errorMessage += `\n錯誤信息: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  // 處理刪除成本
  const handleDeleteCost = async (id) => {
    if (!window.confirm('確定要刪除此成本記錄嗎？')) {
      return;
    }

    try {
      await api.costs.delete(id);
      fetchCosts();
      fetchProfitStats();
      alert('成本記錄已刪除');
    } catch (error) {
      console.error('刪除成本失敗:', error);
      alert('刪除成本失敗，請重試');
    }
  };

  // 計算當月總成本
  const getTotalCost = () => {
    return costs.reduce((total, cost) => total + (cost.amount || 0), 0);
  };

  // 生成月份選項
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    // 生成過去12個月的選項
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = `${year}年${parseInt(month)}月`;
      options.push({ value, label });
    }
    
    return options;
  };

  // 格式化金額
  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className="cost-management">
      <div className="cost-header">
        <h2>營運成本管理</h2>
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'addCost' ? 'active' : ''}`}
            onClick={() => setActiveTab('addCost')}
          >
            新增成本
          </button>
          <button 
            className={`tab-button ${activeTab === 'costOverview' ? 'active' : ''}`}
            onClick={() => setActiveTab('costOverview')}
          >
            成本概覽
          </button>
          <button 
            className={`tab-button ${activeTab === 'profitStats' ? 'active' : ''}`}
            onClick={() => setActiveTab('profitStats')}
          >
            利潤統計
          </button>
        </div>
      </div>

      {/* 新增成本 */}
      {activeTab === 'addCost' && (
        <div className="add-cost-section">
          <h3>新增成本記錄</h3>
          <form onSubmit={handleAddCost} className="cost-form">
            <div className="form-group">
              <label htmlFor="category">成本類別 *</label>
              <select
                id="category"
                value={newCost.category}
                onChange={(e) => setNewCost({...newCost, category: e.target.value})}
                required
              >
                <option value="">請選擇成本類別</option>
                {costCategories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date">日期 *</label>
              <input
                type="date"
                id="date"
                value={newCost.date}
                onChange={(e) => setNewCost({...newCost, date: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="amount">金額 *</label>
              <input
                type="number"
                id="amount"
                value={newCost.amount}
                onChange={(e) => setNewCost({...newCost, amount: e.target.value})}
                placeholder="請輸入金額"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">備註</label>
              <textarea
                id="notes"
                value={newCost.notes}
                onChange={(e) => setNewCost({...newCost, notes: e.target.value})}
                placeholder="可選填"
                rows="3"
              />
            </div>

            <button type="submit" className="submit-button">
              新增成本記錄
            </button>
          </form>
        </div>
      )}

      {/* 成本概覽 */}
      {activeTab === 'costOverview' && (
        <div className="cost-overview-section">
          <div className="overview-header">
            <div className="month-filter">
              <label htmlFor="month-select">選擇月份：</label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {generateMonthOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="total-cost">
              <span>總計金額：</span>
              <span className="total-amount">{formatCurrency(getTotalCost())}</span>
            </div>
          </div>

          <div className="cost-list">
            <table className="cost-table">
              <thead>
                <tr>
                  <th>成本類別</th>
                  <th>日期</th>
                  <th>金額</th>
                  <th>備註</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="loading-cell">載入中...</td>
                  </tr>
                ) : costs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data-cell">該月份暫無成本記錄</td>
                  </tr>
                ) : (
                  costs.map(cost => (
                    <tr key={cost._id}>
                      <td>{cost.category}</td>
                      <td>{new Date(cost.date).toLocaleDateString('zh-TW')}</td>
                      <td className="amount">{formatCurrency(cost.amount)}</td>
                      <td>{cost.notes || '-'}</td>
                      <td>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteCost(cost._id)}
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 利潤統計 */}
      {activeTab === 'profitStats' && (
        <div className="profit-stats-section">
          <h3>利潤統計</h3>
          <div className="stats-table">
            <table className="profit-table">
              <thead>
                <tr>
                  <th>月份</th>
                  <th>收入</th>
                  <th>支出</th>
                  <th>淨利潤</th>
                </tr>
              </thead>
              <tbody>
                {profitStats.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-data-cell">暫無統計數據</td>
                  </tr>
                ) : (
                  profitStats.map(stat => (
                    <tr key={stat.month}>
                      <td>{stat.month}</td>
                      <td className="income">{formatCurrency(stat.income)}</td>
                      <td className="expense">{formatCurrency(stat.expense)}</td>
                      <td className={`profit ${stat.profit >= 0 ? 'positive' : 'negative'}`}>
                        {formatCurrency(stat.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostManagement;
