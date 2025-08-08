import React from 'react';
import './EditModal.css';

const EditModal = ({ isOpen, onClose, onSave, title, fields, data, setData }) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(data);
  };

  const renderField = (field) => {
    const { name, label, type, options, required = false } = field;
    
    switch (type) {
      case 'select':
        return (
          <div key={name} className="form-group">
            <label>{label}{required && <span className="required">*</span>}</label>
            <select
              value={data[name] || ''}
              onChange={(e) => setData({...data, [name]: e.target.value})}
              required={required}
            >
              <option value="">請選擇</option>
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
      
      case 'textarea':
        return (
          <div key={name} className="form-group">
            <label>{label}{required && <span className="required">*</span>}</label>
            <textarea
              value={data[name] || ''}
              onChange={(e) => setData({...data, [name]: e.target.value})}
              required={required}
              rows={3}
            />
          </div>
        );
      
      default:
        return (
          <div key={name} className="form-group">
            <label>{label}{required && <span className="required">*</span>}</label>
            <input
              type={type}
              value={data[name] || ''}
              onChange={(e) => setData({...data, [name]: e.target.value})}
              required={required}
            />
          </div>
        );
    }
  };

  return (
    <div className="edit-modal-overlay">
      <div className="edit-modal-container">
        <div className="edit-modal-header">
          <h3>{title}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="edit-modal-form">
          <div className="edit-modal-content">
            {fields.map(renderField)}
          </div>
          
          <div className="edit-modal-footer">
            <button type="button" className="cancel-button" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="save-button">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModal; 