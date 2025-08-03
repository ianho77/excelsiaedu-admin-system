import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// 添加中文字體支持
const addChineseFont = (doc) => {
  // 使用系統默認字體，避免亂碼
  doc.setFont('helvetica');
  return doc;
};

const MonthlyStatement = ({ classes, students, courses, teachers, selectedMonth, onMonthChange, selectedStudent }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // 根據月份和學生篩選課堂數據
  const getFilteredClasses = () => {
    let filtered = classes.filter(cls => {
      const classDate = new Date(cls.date);
      const classMonth = classDate.getMonth() + 1; // getMonth() 返回 0-11
      const classYear = classDate.getFullYear();
      const selectedDate = new Date(selectedMonth);
      const selectedMonthNum = selectedDate.getMonth() + 1;
      const selectedYear = selectedDate.getFullYear();
      
      return classMonth === selectedMonthNum && classYear === selectedYear;
    });

    // 如果指定了學生，進一步篩選
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

  // 生成單個學生的月結單PDF
  const generateStudentPDF = (studentId, studentClasses) => {
    try {
      const student = getStudentInfo(studentId);
      if (!student) {
        console.error('Student not found:', studentId);
        return null;
      }

      const doc = new jsPDF();
      
      // 頁面設置
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;

      // 公司信息
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Excelsia Education', margin, 25);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Bo Shan Education', margin, 35);

      // 地址
      doc.setFontSize(10);
      doc.text('Room 804, 8/F., 89 King\'s Road, North Point, Hong Kong', pageWidth - margin - 60, 25);
      doc.text('Paotai Shan, North Point, Hong Kong', pageWidth - margin - 60, 30);

      // 標題
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Tuition Fee Notice', pageWidth / 2, 50, { align: 'center' });

      // 分隔線
      doc.line(margin, 60, pageWidth - margin, 60);

      // 學生信息
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const studentDisplayName = `${student.studentId} - ${student.nameEn} (${student.nameZh})${student.nickname ? ` [${student.nickname}]` : ''}`;
      doc.text('Student Name:', margin, 75);
      doc.text(studentDisplayName, margin + 30, 75);

          // 對課堂資料進行排序：教師ID（小到大）-> 課程ID（小到大）-> 日期（遠到近）
    const sortedClasses = studentClasses.sort((a, b) => {
      const courseA = getCourseInfo(a.courseId);
      const courseB = getCourseInfo(b.courseId);
      // 優先使用課堂的teacherId，如果沒有則使用課程的teacherId
      const teacherA = a.teacherId ? getTeacherInfo(a.teacherId) : (courseA ? getTeacherInfo(courseA.teacherId) : null);
      const teacherB = b.teacherId ? getTeacherInfo(b.teacherId) : (courseB ? getTeacherInfo(courseB.teacherId) : null);
      
      // 第一優先度：教師ID（小到大）- 數值比較
      if (teacherA && teacherB) {
        const teacherIdA = parseInt(teacherA.teacherId) || 0;
        const teacherIdB = parseInt(teacherB.teacherId) || 0;
        if (teacherIdA !== teacherIdB) return teacherIdA - teacherIdB;
      }
      
      // 如果只有一個教師有ID，優先顯示有ID的
      if (teacherA && !teacherB) return -1;
      if (!teacherA && teacherB) return 1;
      
      // 第二優先度：課程ID（小到大）- 數值比較
      if (courseA && courseB) {
        const courseIdA = parseInt(courseA.courseId) || 0;
        const courseIdB = parseInt(courseB.courseId) || 0;
        if (courseIdA !== courseIdB) return courseIdA - courseIdB;
      }
      
      // 如果只有一個課程有ID，優先顯示有ID的
      if (courseA && !courseB) return -1;
      if (!courseA && courseB) return 1;
      
      // 第三優先度：日期（遠到近）
      return new Date(b.date) - new Date(a.date);
    });

    // 課程表格
    const tableData = [];
    let totalAmount = 0;

    sortedClasses.forEach(cls => {
      const course = getCourseInfo(cls.courseId);
      // 優先使用課堂的teacherId，如果沒有則使用課程的teacherId
      const teacher = cls.teacherId ? getTeacherInfo(cls.teacherId) : (course ? getTeacherInfo(course.teacherId) : null);
      
      tableData.push([
        teacher ? teacher.name : 'N/A',
        course ? course.subject : 'N/A',
        new Date(cls.date).toLocaleDateString('en-US'),
        `$${cls.price}`
      ]);
      
      totalAmount += parseInt(cls.price) || 0;
    });

      // 添加總計行
      tableData.push(['', '', 'Total', `$${totalAmount}`]);

      // 生成表格
      autoTable(doc, {
        startY: 90,
        head: [['Teacher', 'Subject', 'Date', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 40 },
          2: { cellWidth: 40 },
          3: { cellWidth: 30 }
        }
      });

              // 底部銀行信息
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 170;
    doc.setFontSize(10);
    doc.text('Bank: Bank of East Asia', margin, finalY);
    doc.text('Account: 015-514-68-10702-3', margin, finalY + 8);
    doc.text('FPS ID: 164089138', margin, finalY + 16);
    doc.text('Pay to: Excelsia Education Centre', margin, finalY + 24);
    doc.text('Please WhatsApp payment receipt to us for records. Thank you!', margin, finalY + 35);

      return doc;
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
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

      // 為每個學生生成PDF
      Object.keys(groupedClasses).forEach((studentId, index) => {
        const studentClasses = groupedClasses[studentId];
        const doc = generateStudentPDF(studentId, studentClasses);
        
        if (doc) {
          try {
            const student = getStudentInfo(studentId);
            const fileName = `${selectedMonth}_${student.nameZh}_月結單.pdf`;
            doc.save(fileName);
            successCount++;
          } catch (saveError) {
            console.error('Error saving PDF for student:', studentId, saveError);
            errorCount++;
          }
        } else {
          errorCount++;
        }
      });

      if (errorCount > 0) {
        alert(`月結單生成完成！成功: ${successCount}個，失敗: ${errorCount}個`);
      } else {
        alert('月結單生成完成！');
      }
    } catch (error) {
      console.error('生成PDF時發生錯誤:', error);
      alert('生成PDF時發生錯誤，請重試');
    } finally {
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

      const doc = generateStudentPDF(selectedStudent, studentClasses);
      if (doc) {
        try {
          const student = getStudentInfo(selectedStudent);
          const fileName = `${selectedMonth}_${student.nameZh}_月結單.pdf`;
          doc.save(fileName);
          alert('月結單生成完成！');
        } catch (saveError) {
          console.error('Error saving PDF:', saveError);
          alert('保存PDF時發生錯誤，請重試');
        }
      } else {
        alert('生成PDF失敗，請檢查數據');
      }
    } catch (error) {
      console.error('生成PDF時發生錯誤:', error);
      alert('生成PDF時發生錯誤，請重試');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="monthly-statement">
      <h3>生成月結單</h3>
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

export default MonthlyStatement; 