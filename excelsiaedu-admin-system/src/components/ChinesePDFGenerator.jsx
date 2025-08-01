import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';

const ChinesePDFGenerator = ({ classes, students, courses, teachers, selectedMonth, onMonthChange, selectedStudent }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // 根據月份和學生篩選課堂數據
  const getFilteredClasses = () => {
    let filtered = classes.filter(cls => {
      const classDate = new Date(cls.date);
      const classMonth = classDate.getMonth() + 1;
      const classYear = classDate.getFullYear();
      const selectedDate = new Date(selectedMonth);
      const selectedMonthNum = selectedDate.getMonth() + 1;
      const selectedYear = selectedDate.getFullYear();
      
      return classMonth === selectedMonthNum && classYear === selectedYear;
    });

    if (selectedStudent) {
      filtered = filtered.filter(cls => cls.studentId === selectedStudent);
    }

    return filtered;
  };

  // 按學生分組課堂數據
  const groupClassesByStudent = (filteredClasses) => {
    const grouped = {};
    filteredClasses.forEach(cls => {
      const studentId = cls.studentId;
      if (!grouped[studentId]) {
        grouped[studentId] = [];
      }
      grouped[studentId].push(cls);
    });
    return grouped;
  };

  // 獲取學生信息
  const getStudentInfo = (studentId) => {
    return students.find(s => s.studentId === studentId);
  };

  // 獲取課程信息
  const getCourseInfo = (courseId) => {
    return courses.find(c => c.courseId === courseId);
  };

  // 獲取教師信息
  const getTeacherInfo = (teacherId) => {
    return teachers.find(t => t.teacherId === teacherId);
  };

  // 生成HTML內容
  const generateHTMLContent = (studentId, studentClasses) => {
    const student = getStudentInfo(studentId);
    if (!student) return '';

    // 對課堂資料進行排序：教師ID -> 課程ID -> 日期
    const sortedClasses = studentClasses.sort((a, b) => {
      const courseA = getCourseInfo(a.courseId);
      const courseB = getCourseInfo(b.courseId);
      const teacherA = courseA ? getTeacherInfo(courseA.teacherId) : null;
      const teacherB = courseB ? getTeacherInfo(courseB.teacherId) : null;
      
      // 首先按教師ID排序
      if (teacherA && teacherB) {
        const teacherIdCompare = teacherA.teacherId.localeCompare(teacherB.teacherId);
        if (teacherIdCompare !== 0) return teacherIdCompare;
      }
      
      // 然後按課程ID排序
      if (courseA && courseB) {
        const courseIdCompare = courseA.courseId.localeCompare(courseB.courseId);
        if (courseIdCompare !== 0) return courseIdCompare;
      }
      
      // 最後按日期排序（從早到晚）
      return new Date(a.date) - new Date(b.date);
    });

    let totalAmount = 0;
    const tableRows = sortedClasses.map(cls => {
      const course = getCourseInfo(cls.courseId);
      const teacher = course ? getTeacherInfo(course.teacherId) : null;
      totalAmount += parseInt(cls.price) || 0;
      
      return `
        <tr>
          <td>${teacher ? teacher.name : ''}</td>
          <td>${course ? course.subject : ''}</td>
          <td>${new Date(cls.date).toLocaleDateString('zh-TW')}</td>
          <td>$${cls.price}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <h1 style="margin: 0; color: #333; font-size: 24px;">博善教育</h1>
            <p style="margin: 5px 0; color: #666; font-size: 16px;">Excelsia Education</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 5px 0; color: #666; font-size: 12px;">炮台山英皇道89號桂洪集團中心804室</p>
            <p style="margin: 5px 0; color: #666; font-size: 12px;">Room 804, 8/F., 89 King's Road, North Point, Hong Kong</p>
          </div>
        </div>
        
        <h2 style="text-align: center; color: #333; margin: 30px 0; font-size: 28px;">學費通知單</h2>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        
        <div style="margin-bottom: 30px;">
          <p style="margin: 10px 0; font-size: 14px;">
            <strong>學生名稱:</strong> ${student.studentId} - ${student.nameZh} (${student.nameEn})${student.nickname ? ` [${student.nickname}]` : ''}
          </p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #4285f4; color: white;">
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">教師</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">科目</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">日期</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">總金額</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr style="background-color: #f5f5f5;">
              <td style="border: 1px solid #ddd; padding: 12px;"></td>
              <td style="border: 1px solid #ddd; padding: 12px;"></td>
              <td style="border: 1px solid #ddd; padding: 12px;"><strong>總計</strong></td>
              <td style="border: 1px solid #ddd; padding: 12px;"><strong>$${totalAmount}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div style="margin-top: 40px; font-size: 12px; color: #666;">
          <p><strong>銀行資料:</strong> Bank of East Asia 東亞銀行</p>
          <p><strong>戶口號碼:</strong> 015-514-68-10702-3</p>
          <p><strong>轉數快快速支付系統識別碼:</strong> 164089138</p>
          <p><strong>公司抬頭:</strong> Excelsia Education Centre</p>
          <p style="margin-top: 20px;">如閣下已經入了款項,請將資料/存根receipt whatsapp給予我們留檔,多謝合作,謝謝!</p>
        </div>
      </div>
    `;

    return html;
  };

  // 生成PDF
  const generatePDF = (studentId, studentClasses) => {
    const student = getStudentInfo(studentId);
    if (!student) return;

    const htmlContent = generateHTMLContent(studentId, studentClasses);
    
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    document.body.appendChild(element);

    const opt = {
      margin: 1,
      filename: `${selectedMonth}_${student.nameZh}_月結單.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      document.body.removeChild(element);
    });
  };

  // 生成所有學生的月結單
  const generateAllStudentsPDF = () => {
    setIsGenerating(true);
    
    try {
      const filteredClasses = getFilteredClasses();
      const groupedClasses = groupClassesByStudent(filteredClasses);
      
      if (Object.keys(groupedClasses).length === 0) {
        alert('該月份沒有找到課堂數據');
        setIsGenerating(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      Object.keys(groupedClasses).forEach((studentId, index) => {
        const studentClasses = groupedClasses[studentId];
        try {
          generatePDF(studentId, studentClasses);
          successCount++;
        } catch (error) {
          console.error('Error generating PDF for student:', studentId, error);
          errorCount++;
        }
      });

      setTimeout(() => {
        if (errorCount > 0) {
          alert(`月結單生成完成！成功: ${successCount}個，失敗: ${errorCount}個`);
        } else {
          alert('月結單生成完成！');
        }
        setIsGenerating(false);
      }, 1000);

    } catch (error) {
      console.error('生成PDF時發生錯誤:', error);
      alert('生成PDF時發生錯誤，請重試');
      setIsGenerating(false);
    }
  };

  // 生成指定學生的月結單
  const generateSelectedStudentPDF = () => {
    if (!selectedStudent) {
      alert('請先選擇學生');
      return;
    }

    setIsGenerating(true);
    
    try {
      const filteredClasses = getFilteredClasses();
      const studentClasses = filteredClasses.filter(cls => cls.studentId === selectedStudent);
      
      if (studentClasses.length === 0) {
        alert('該學生在該月份沒有課堂記錄');
        setIsGenerating(false);
        return;
      }

      generatePDF(selectedStudent, studentClasses);
      
      setTimeout(() => {
        alert('月結單生成完成！');
        setIsGenerating(false);
      }, 1000);

    } catch (error) {
      console.error('生成PDF時發生錯誤:', error);
      alert('生成PDF時發生錯誤，請重試');
      setIsGenerating(false);
    }
  };

  return (
    <div className="monthly-statement">
      <h3>📄 生成月結單</h3>
      <div className="statement-controls">
        <div className="control-group">
          <label>選擇月份:</label>
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => onMonthChange(e.target.value)}
          />
        </div>
        
        <div className="statement-buttons">
          <button 
            onClick={generateAllStudentsPDF}
            disabled={isGenerating}
            className="btn btn-primary"
          >
            {isGenerating ? '生成中...' : '生成全部學生月結單'}
          </button>
          
          <button 
            onClick={generateSelectedStudentPDF}
            disabled={isGenerating || !selectedStudent}
            className="btn btn-secondary"
          >
            {isGenerating ? '生成中...' : '生成指定學生月結單'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChinesePDFGenerator; 