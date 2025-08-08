import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SimplePDFTest = () => {
  const generateSimplePDF = () => {
    try {
      const doc = new jsPDF();
      
      // 簡單的測試內容
      doc.setFontSize(16);
      doc.text('Test PDF Generation', 20, 20);
      
      doc.setFontSize(12);
      doc.text('This is a simple test to verify PDF generation works.', 20, 40);
      
      // 簡單表格
      autoTable(doc, {
        startY: 60,
        head: [['Name', 'Value']],
        body: [
          ['Test 1', 'Value 1'],
          ['Test 2', 'Value 2'],
          ['Total', 'Value 3']
        ],
        theme: 'grid'
      });
      
      doc.save('test.pdf');
      alert('測試PDF生成成功！');
    } catch (error) {
      console.error('PDF生成錯誤:', error);
      alert('PDF生成失敗: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px', background: 'white', margin: '20px', borderRadius: '8px' }}>
      <h3>PDF生成測試</h3>
      <button 
        onClick={generateSimplePDF}
        style={{
          padding: '10px 20px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        生成測試PDF
      </button>
    </div>
  );
};

export default SimplePDFTest; 