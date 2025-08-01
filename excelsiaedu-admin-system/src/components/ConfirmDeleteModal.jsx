import React from 'react';
import './ConfirmDeleteModal.css';

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-delete-modal-overlay">
      <div className="confirm-delete-modal-container">
        <div className="confirm-delete-modal-header">
          <h3>{title}</h3>
        </div>
        
        <div className="confirm-delete-modal-content">
          <p>{message}</p>
        </div>
        
        <div className="confirm-delete-modal-footer">
          <button 
            type="button" 
            className="cancel-button" 
            onClick={onClose}
          >
            取消
          </button>
          <button 
            type="button" 
            className="confirm-button" 
            onClick={onConfirm}
          >
            確定
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal; 