import React, { useState, useEffect, useCallback } from 'react';
import './TeacherBillingSystem.css';
import html2pdf from 'html2pdf.js';
import JSZip from 'jszip';

const TeacherBillingSystem = () => {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // 从 localStorage 获取保存的月份，如果没有则返回前一个月
    const savedMonth = localStorage.getItem('teacherSelectedMonth');
    if (savedMonth) {
      return savedMonth;
    } else {
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = previousMonth.getFullYear();
      const month = String(previousMonth.getMonth() + 1).padStart(2, '0');
      const defaultMonth = `${year}-${month}`;
      localStorage.setItem('teacherSelectedMonth', defaultMonth);
      return defaultMonth;
    }
  });
  const [billingData, setBillingData] = useState([]);
  const [statistics, setStatistics] = useState({
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [teacherFilter, setTeacherFilter] = useState('');
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState('');

  // 获取前一个月的默认值（暫時不使用）
  // const getPreviousMonth = () => {
  //   const now = new Date();
  //   const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  //   const year = previousMonth.getFullYear();
  //   const month = String(previousMonth.getMonth() + 1).padStart(2, '0');
  //   return `${year}-${month}`;
  // };

  // 处理月份选择，同时保存到 localStorage
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    localStorage.setItem('teacherSelectedMonth', month);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateBillingData = useCallback(async () => {
    const filteredClasses = classes.filter(cls => {
      const classDate = new Date(cls.date);
      const classMonth = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, '0')}`;
      return classMonth === selectedMonth;
    });

    // 獲取該月份的教師賬單狀態
    let billingStatuses = [];
    try {
      const statusResponse = await fetch(`http://localhost:4000/api/teacher-billing-status?month=${selectedMonth}`);
      if (statusResponse.ok) {
        billingStatuses = await statusResponse.json();
      }
    } catch (error) {
      console.error('獲取教師賬單狀態失敗:', error);
    }

    const teacherBilling = {};
    let totalAmount = 0;
    let paidAmount = 0;
    let unpaidAmount = 0;

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.courseId === cls.courseId);
      const teacherId = cls.teacherId || (course ? course.teacherId : null);
      const teacher = teachers.find(t => t.teacherId === teacherId);
      
      if (teacher) {
        if (!teacherBilling[teacher.teacherId]) {
          // 查找該教師的賬單狀態
          const status = billingStatuses.find(s => s.teacherId === teacher.teacherId);
          
          teacherBilling[teacher.teacherId] = {
            teacherId: teacher.teacherId,
            teacherName: teacher.name,
            totalAmount: 0,
            isVerified: status ? status.isVerified : false,
            isPaid: status ? status.isPaid : false,
            notes: status ? status.notes : '',
            classes: []
          };
        }
        const price = cls.price || 0;
        teacherBilling[teacher.teacherId].totalAmount += price;
        teacherBilling[teacher.teacherId].classes.push(cls);
        totalAmount += price;
      }
    });

    const billingDataArray = Object.values(teacherBilling);
    
    // 計算統計信息
    paidAmount = billingDataArray
      .filter(item => item.isPaid)
      .reduce((sum, item) => sum + item.totalAmount, 0);
    
    unpaidAmount = totalAmount - paidAmount;

    setBillingData(billingDataArray);
    setStatistics({
      totalAmount,
      paidAmount,
      unpaidAmount
    });
  }, [selectedMonth, teachers, classes, courses]);

  useEffect(() => {
    if (selectedMonth) {
      calculateBillingData();
    } else {
      setBillingData([]);
      setStatistics({ totalAmount: 0, paidAmount: 0, unpaidAmount: 0 });
    }
  }, [selectedMonth, teachers, classes, courses, students, calculateBillingData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teachersRes, classesRes, coursesRes, studentsRes] = await Promise.all([
        fetch('http://localhost:4000/api/teachers'),
        fetch('http://localhost:4000/api/classes'),
        fetch('http://localhost:4000/api/courses'),
        fetch('http://localhost:4000/api/students')
      ]);

      const teachersData = await teachersRes.json();
      const classesData = await classesRes.json();
      const coursesData = await coursesRes.json();
      const studentsData = await studentsRes.json();

      setTeachers(teachersData);
      setClasses(classesData);
      setCourses(coursesData);
      setStudents(studentsData);
    } catch (error) {
      console.error('獲取數據失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthOptions = () => {
    const months = [];
    const monthSet = new Set();
    
    // 从课堂数据中提取所有有数据的月份
    classes.forEach(cls => {
      if (cls.date) {
        const classDate = new Date(cls.date);
        const monthStr = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, '0')}`;
        monthSet.add(monthStr);
      }
    });
    
    // 转换为选项数组并排序
    const sortedMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    
    sortedMonths.forEach(monthStr => {
      const [year, month] = monthStr.split('-');
      const monthLabel = `${year}年${parseInt(month)}月`;
      months.push({ value: monthStr, label: monthLabel });
    });
    
    return months;
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  // const formatDate = (dateStr) => {
  //   const date = new Date(dateStr);
  //   return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  // };

  const handleVerificationChange = async (teacherId, isVerified) => {
    try {
      const response = await fetch('http://localhost:4000/api/teacher-billing-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          month: selectedMonth,
          isVerified
        }),
      });

      if (response.ok) {
        // 更新本地狀態
        setBillingData(prev => 
          prev.map(item => 
            item.teacherId === teacherId 
              ? { ...item, isVerified }
              : item
          )
        );
      } else {
        console.error('更新驗證狀態失敗');
      }
    } catch (error) {
      console.error('更新驗證狀態時發生錯誤:', error);
    }
  };

  const handlePaymentChange = async (teacherId, isPaid) => {
    try {
      const response = await fetch('http://localhost:4000/api/teacher-billing-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          month: selectedMonth,
          isPaid
        }),
      });

      if (response.ok) {
        // 更新本地狀態
        setBillingData(prev => 
          prev.map(item => 
            item.teacherId === teacherId 
              ? { ...item, isPaid }
              : item
          )
        );
        
        // 重新計算統計信息
        const updatedData = billingData.map(item => 
          item.teacherId === teacherId 
            ? { ...item, isPaid }
            : item
        );
        
        const totalAmount = updatedData.reduce((sum, item) => sum + item.totalAmount, 0);
        const paidAmount = updatedData
          .filter(item => item.isPaid)
          .reduce((sum, item) => sum + item.totalAmount, 0);
        
        setStatistics({
          totalAmount,
          paidAmount,
          unpaidAmount: totalAmount - paidAmount
        });
      } else {
        console.error('更新付款狀態失敗');
      }
    } catch (error) {
      console.error('更新付款狀態時發生錯誤:', error);
    }
  };

  // 一鍵確認所有教師核對狀態
  const confirmAllVerificationStatus = () => {
    setConfirmAction('verification');
    setShowConfirmModal(true);
  };

  // 一鍵確認所有教師薪金發放狀態
  const confirmAllPaymentStatus = () => {
    setConfirmAction('payment');
    setShowConfirmModal(true);
  };

  // 執行一鍵確認
  const executeConfirmAction = async () => {
    try {
      const promises = billingData.map(item => {
        if (confirmAction === 'verification') {
          return handleVerificationChange(item.teacherId, true);
        } else if (confirmAction === 'payment') {
          return handlePaymentChange(item.teacherId, true);
        }
        return null;
      });

      await Promise.all(promises);
      setShowConfirmModal(false);
      setConfirmAction('');
    } catch (error) {
      console.error('一鍵確認失敗:', error);
    }
  };

  // 取消確認
  const cancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmAction('');
  };

  // 当billingData变化时重新计算统计数据
  useEffect(() => {
    if (billingData.length > 0) {
      let totalAmount = 0;
      let paidAmount = 0;
      let unpaidAmount = 0;

      billingData.forEach(teacher => {
        totalAmount += teacher.totalAmount;
        if (teacher.isPaid) {
          paidAmount += teacher.totalAmount;
        } else {
          unpaidAmount += teacher.totalAmount;
        }
      });

      setStatistics({ totalAmount, paidAmount, unpaidAmount });
    }
  }, [billingData]);

  // 处理教师筛选输入
  const handleTeacherFilterChange = (value) => {
    setTeacherFilter(value);
    
    if (value.trim() === '') {
      setFilteredTeachers([]);
      setShowTeacherDropdown(false);
      return;
    }

    // 筛选匹配的教师
    const filtered = billingData.filter(teacher => {
      return teacher.teacherId.includes(value) || 
             teacher.teacherName.toLowerCase().includes(value.toLowerCase());
    });

    setFilteredTeachers(filtered);
    setShowTeacherDropdown(true);
  };

  // 选择教师
  const selectTeacher = (teacher) => {
    setTeacherFilter(teacher.teacherName);
    setShowTeacherDropdown(false);
  };

  // 清除教师筛选
  const clearTeacherFilter = () => {
    setTeacherFilter('');
    setFilteredTeachers([]);
    setShowTeacherDropdown(false);
  };

  const generateTeacherMonthlyStatement = async () => {
    if (!selectedMonth || billingData.length === 0) {
      alert('請先選擇月份並確保有數據');
      return;
    }

    const zip = new JSZip();
    const pdfPromises = [];

    // 为每个教师分别生成月结单
    billingData.forEach((teacher, index) => {
      const teacherClasses = teacher.classes.map(cls => {
        const course = courses.find(c => c.courseId === cls.courseId);
        const student = students.find(s => s.studentId === cls.studentId);
        return {
          courseName: course ? course.subject : '未知課程',
          studentName: student ? `${student.nameZh} (${student.nameEn})` : '未知學生',
          date: cls.date,
          amount: cls.price || 0,
          teacherName: teacher.teacherName
        };
      });

      if (teacherClasses.length > 0) {
        const pdfPromise = generatePDFForZip(teacherClasses, teacher.teacherName, zip);
        pdfPromises.push(pdfPromise);
      }
    });

    if (pdfPromises.length === 0) {
      alert('該月份沒有教師課堂數據');
      return;
    }

    try {
      await Promise.all(pdfPromises);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // 下載ZIP文件
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `教師月結單_${selectedMonth.replace('-', '年')}月.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      

    } catch (error) {
      console.error('生成ZIP文件時發生錯誤:', error);
      alert('生成ZIP文件時發生錯誤，請重試');
    }
  };

  const generateSingleTeacherMonthlyStatement = () => {
    if (!selectedMonth || billingData.length === 0) {
      alert('請先選擇月份並確保有數據');
      return;
    }

    if (!teacherFilter.trim()) {
      alert('請先選擇教師');
      return;
    }

    // 获取选中教师的课堂数据
    const selectedTeacher = billingData.find(teacher => teacher.teacherName === teacherFilter);
    if (!selectedTeacher) {
      alert('找不到選中的教師');
      return;
    }

    const teacherClasses = selectedTeacher.classes.map(cls => {
      const course = courses.find(c => c.courseId === cls.courseId);
      const student = students.find(s => s.studentId === cls.studentId);
      return {
        courseName: course ? course.subject : '未知課程',
        studentName: student ? `${student.nameZh} (${student.nameEn})` : '未知學生',
        date: cls.date,
        amount: cls.price || 0,
        teacherName: selectedTeacher.teacherName
      };
    });

    generatePDF(teacherClasses, selectedTeacher.teacherName);
  };

  // 生成教師月結單PDF（用於ZIP打包）
  const generatePDFForZip = async (teacherClasses, teacherName, zip) => {
    // 按优先级排序：1.课程 2.学生 3.日期
    teacherClasses.sort((a, b) => {
      // 1. 首先按课程名称排序
      if (a.courseName !== b.courseName) {
        return a.courseName.localeCompare(b.courseName, 'zh-CN');
      }
      // 2. 然后按学生姓名排序
      if (a.studentName !== b.studentName) {
        return a.studentName.localeCompare(b.studentName, 'zh-CN');
      }
      // 3. 最后按日期排序
      return new Date(a.date) - new Date(b.date);
    });

    // 计算总金额
    const totalAmount = teacherClasses.reduce((sum, cls) => sum + (cls.amount || 0), 0);

    // 创建PDF内容
    const pdfContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <img src="/EE_logoname_simple color.png" alt="Excelsia Education" style="height: 80px; width: auto;">
          </div>
          <div style="text-align: right;">
            <p style="margin: 5px 0; color: #666; font-size: 12px;">炮台山英皇道89號桂洪集團中心804室</p>
            <p style="margin: 5px 0; color: #666; font-size: 12px;">Room 804, 8/F., 89 King's Road,</p>
            <p style="margin: 5px 0; color: #666; font-size: 12px;">North Point, Hong Kong</p>
          </div>
        </div>
        
        <h2 style="text-align: center; color: #333; margin: 30px 0; font-size: 28px;">教師月結單</h2>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        
        <div style="margin-bottom: 30px;">
          <p style="margin: 10px 0; font-size: 14px;">
            <strong>教師名稱:</strong> ${teacherName}
          </p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
            <tr style="background-color: #0F766E; color: white;">
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">課程</th>
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">學生</th>
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">日期</th>
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">總金額</th>
              </tr>
            </thead>
            <tbody>
            ${teacherClasses.map(cls => `
              <tr>
                <td style="border: 1px solid #000; padding: 12px;">${cls.courseName || ''}</td>
                <td style="border: 1px solid #000; padding: 12px;">${cls.studentName || ''}</td>
                <td style="border: 1px solid #000; padding: 12px;">${new Date(cls.date).toLocaleDateString('zh-TW')}</td>
                <td style="border: 1px solid #000; padding: 12px;">$${(cls.amount || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f5f5f5;">
              <td style="border: 1px solid #000; padding: 12px;"></td>
              <td style="border: 1px solid #000; padding: 12px;"></td>
              <td style="border: 1px solid #000; padding: 12px;"><strong>總計</strong></td>
              <td style="border: 1px solid #000; padding: 12px;"><strong>$${(totalAmount || 0).toFixed(2)}</strong></td>
            </tr>
          </tbody>
          </table>
        </div>
      </div>
    `;

    // 创建临时DOM元素
    const element = document.createElement('div');
    element.innerHTML = pdfContent;
    document.body.appendChild(element);

    // 配置PDF选项
    const opt = {
      margin: 10,
      filename: `教師月結單_${teacherName}_${selectedMonth.split('-')[0]}年${selectedMonth.split('-')[1]}月.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 使用html2pdf.js生成PDF並添加到ZIP
    try {
      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
      const fileName = `教師月結單_${teacherName}_${selectedMonth.split('-')[0]}年${selectedMonth.split('-')[1]}月.pdf`;
      zip.file(fileName, pdfBlob);
      document.body.removeChild(element);
    } catch (error) {
      console.error('PDF生成錯誤:', error);
      document.body.removeChild(element);
      throw error;
    }
  };

  const generatePDF = (teacherClasses, teacherName) => {

    // 按优先级排序：1.课程 2.学生 3.日期
    teacherClasses.sort((a, b) => {
      // 1. 首先按课程名称排序
      if (a.courseName !== b.courseName) {
        return a.courseName.localeCompare(b.courseName, 'zh-CN');
      }
      // 2. 然后按学生姓名排序
      if (a.studentName !== b.studentName) {
        return a.studentName.localeCompare(b.studentName, 'zh-CN');
      }
      // 3. 最后按日期排序
      return new Date(a.date) - new Date(b.date);
    });

    // 计算总金额
    const totalAmount = teacherClasses.reduce((sum, cls) => sum + (cls.amount || 0), 0);

    // 创建PDF内容
    const pdfContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <img src="/EE_logoname_simple color.png" alt="Excelsia Education" style="height: 80px; width: auto;">
          </div>
          <div style="text-align: right;">
            <p style="margin: 5px 0; color: #666; font-size: 12px;">炮台山英皇道89號桂洪集團中心804室</p>
            <p style="margin: 5px 0; color: #666; font-size: 12px;">Room 804, 8/F., 89 King's Road,</p>
            <p style="margin: 5px 0; color: #666; font-size: 12px;">North Point, Hong Kong</p>
          </div>
        </div>
        
        <h2 style="text-align: center; color: #333; margin: 30px 0; font-size: 28px;">教師月結單</h2>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        
        <div style="margin-bottom: 30px;">
          <p style="margin: 10px 0; font-size: 14px;">
            <strong>教師名稱:</strong> ${teacherName}
          </p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
            <tr style="background-color: #0F766E; color: white;">
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">課程</th>
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">學生</th>
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">日期</th>
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">總金額</th>
              </tr>
            </thead>
            <tbody>
            ${teacherClasses.map(cls => `
              <tr>
                <td style="border: 1px solid #000; padding: 12px;">${cls.courseName || ''}</td>
                <td style="border: 1px solid #000; padding: 12px;">${cls.studentName || ''}</td>
                <td style="border: 1px solid #000; padding: 12px;">${new Date(cls.date).toLocaleDateString('zh-TW')}</td>
                <td style="border: 1px solid #000; padding: 12px;">$${(cls.amount || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f5f5f5;">
              <td style="border: 1px solid #000; padding: 12px;"></td>
              <td style="border: 1px solid #000; padding: 12px;"></td>
              <td style="border: 1px solid #000; padding: 12px;"><strong>總計</strong></td>
              <td style="border: 1px solid #000; padding: 12px;"><strong>$${(totalAmount || 0).toFixed(2)}</strong></td>
            </tr>
                      </tbody>
          </table>
        </div>
      </div>
    `;

    // 创建临时DOM元素
    const element = document.createElement('div');
    element.innerHTML = pdfContent;
    document.body.appendChild(element);

    // 配置PDF选项
    const opt = {
      margin: 10,
      filename: `教師月結單_${teacherName}_${selectedMonth.split('-')[0]}年${selectedMonth.split('-')[1]}月.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 生成PDF
    html2pdf().set(opt).from(element).save().then(() => {
      document.body.removeChild(element);
    });
  };

  const exportToExcel = async (data, stats, month) => {
    setExporting(true);
    try {
      const monthLabel = generateMonthOptions().find(m => m.value === month)?.label || month;
      
      // 創建CSV內容
      let csvContent = '\ufeff'; // UTF-8 BOM for Chinese support
      csvContent += `教師賬單系統 - ${monthLabel}\n\n`;
      
      // 統計信息
      csvContent += `薪金總額,${stats.totalAmount}\n`;
      csvContent += `已發放薪金,${stats.paidAmount}\n`;
      csvContent += `未發放薪金,${stats.unpaidAmount}\n\n`;
      
      // 表頭
      csvContent += `教師ID,教師姓名,總金額,核對狀態,薪金發放狀態\n`;
      
      // 數據行
      data.forEach(teacher => {
        csvContent += `${teacher.teacherId},${teacher.teacherName},${teacher.totalAmount},${teacher.isVerified ? '已核對' : '未核對'},${teacher.isPaid ? '已發放' : '未發放'}\n`;
      });
      
      // 創建並下載文件
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `教師賬單_${monthLabel}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('匯出失敗:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="teacher-billing-system">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-billing-system">
      <div className="billing-header">
        <h2>教師賬單系統</h2>
        <div className="header-controls">
          <div className="month-selector">
            <label htmlFor="month-select">選擇月份：</label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
            >
              <option value="">請選擇月份</option>
              {generateMonthOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {selectedMonth && billingData.length > 0 && (
            <button
              className="export-button"
              onClick={() => exportToExcel(billingData, statistics, selectedMonth)}
              disabled={exporting}
            >
              {exporting ? '匯出中...' : '匯出Excel'}
            </button>
          )}
        </div>
      </div>

      {selectedMonth && (
        <>
          <div className="billing-statistics">
            <div className="stat-card">
              <h3>薪金總額</h3>
              <p className="stat-amount">{formatCurrency(statistics.totalAmount)}</p>
            </div>
            <div className="stat-card">
              <h3>已發放薪金</h3>
              <p className="stat-amount paid">{formatCurrency(statistics.paidAmount)}</p>
            </div>
            <div className="stat-card">
              <h3>未發放薪金</h3>
              <p className="stat-amount unpaid">{formatCurrency(statistics.unpaidAmount)}</p>
            </div>
          </div>

          <div className="monthly-statement-section">
            <div className="statement-content">
              <div className="statement-filters">
                <div className="filter-group">
                  <label htmlFor="teacher-filter">教師：</label>
                  <div className="teacher-search-container">
                    <input
                      id="teacher-filter"
                      type="text"
                      placeholder="請輸入教師ID或姓名"
                      value={teacherFilter}
                      onChange={(e) => handleTeacherFilterChange(e.target.value)}
                      onFocus={() => {
                        if (teacherFilter.trim() !== '') {
                          setShowTeacherDropdown(true);
                        }
                      }}
                      onBlur={() => {
                        // 延迟隐藏下拉框，让用户有时间点击选项
                        setTimeout(() => setShowTeacherDropdown(false), 200);
                      }}
                    />
                    {showTeacherDropdown && (
                      <div className="teacher-dropdown">
                        <div 
                          className="dropdown-option"
                          onClick={() => clearTeacherFilter()}
                        >
                          全部
                        </div>
                        {filteredTeachers.map((teacher) => (
                          <div
                            key={teacher.teacherId}
                            className="dropdown-option"
                            onClick={() => selectTeacher(teacher)}
                          >
                            {teacher.teacherId} - {teacher.teacherName}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="statement-buttons">
                <button
                  className="clear-filter-button"
                  onClick={clearTeacherFilter}
                >
                  清除篩選
                </button>
                <button
                  className="generate-all-button"
                  onClick={generateTeacherMonthlyStatement}
                >
                  生成所有教師月結單
                </button>
                <button
                  className="generate-single-button"
                  onClick={generateSingleTeacherMonthlyStatement}
                >
                  生成教師月結單
                </button>
              </div>
            </div>
          </div>

          {billingData.length > 0 ? (
            <div className="billing-table-container">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>教師資料</th>
                    <th>總金額</th>
                    <th>
                      核對狀態
                      <button
                        className="bulk-action-icon"
                        onClick={confirmAllVerificationStatus}
                        title="一鍵確認所有教師已核對"
                      >
                        ✓
                      </button>
                    </th>
                    <th>
                      薪金發放狀態
                      <button
                        className="bulk-action-icon"
                        onClick={confirmAllPaymentStatus}
                        title="一鍵確認所有教師薪金已發放"
                      >
                        ✓
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {billingData.map(teacher => (
                    <tr key={teacher.teacherId}>
                      <td className="teacher-info">
                        <div className="teacher-id">{teacher.teacherId}</div>
                        <div className="teacher-name">{teacher.teacherName}</div>
                      </td>
                      <td className="amount">{formatCurrency(teacher.totalAmount)}</td>
                      <td>
                        <select
                          className={`status-badge ${teacher.isVerified ? 'verified' : 'unverified'}`}
                          value={teacher.isVerified ? '已核對' : '未核對'}
                          onChange={(e) => handleVerificationChange(teacher.teacherId, e.target.value === '已核對')}
                        >
                          <option value="未核對">未核對</option>
                          <option value="已核對">已核對</option>
                        </select>
                      </td>
                      <td>
                        <select
                          className={`status-badge ${teacher.isPaid ? 'paid' : 'unpaid'}`}
                          value={teacher.isPaid ? '已發放' : '未發放'}
                          onChange={(e) => handlePaymentChange(teacher.teacherId, e.target.value === '已發放')}
                        >
                          <option value="未發放">未發放</option>
                          <option value="已發放">已發放</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data">
              <p>該月份沒有教師課堂數據</p>
            </div>
          )}
        </>
      )}

      {!selectedMonth && (
        <div className="no-data">
          <p>請選擇月份查看教師賬單數據</p>
        </div>
      )}

      {/* 確認彈窗 */}
      {showConfirmModal && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <h3>確認操作</h3>
            <p>
              {confirmAction === 'verification' 
                ? '確定要將所有教師的核對狀態設為「已核對」嗎？' 
                : confirmAction === 'payment'
                ? '確定要將所有教師的薪金發放狀態設為「已發放」嗎？'
                : ''
              }
            </p>
            <div className="confirm-modal-buttons">
              <button 
                className="confirm-button"
                onClick={executeConfirmAction}
              >
                確認
              </button>
              <button 
                className="cancel-button"
                onClick={cancelConfirm}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherBillingSystem; 