import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({ isOpen, onConfirm, onCancel, title, message, confirmText = "確定", cancelText = "取消" }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-content">
          <div className="modal-message" dangerouslySetInnerHTML={{ __html: message }} />
        </div>
        <div className="modal-footer">
          <button className="modal-button cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="modal-button confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal; 