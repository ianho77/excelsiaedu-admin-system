import React, { useState, useEffect, useCallback } from 'react';
import html2pdf from 'html2pdf.js';
import JSZip from 'jszip';
import './BillingSystem.css';
import api from '../services/api';

// Excel匯出功能
const exportToExcel = async (billingData, statistics, selectedMonth, setExporting) => {
  setExporting(true);
  
  try {
  // 創建工作簿數據（暫時不使用）
  // const workbook = {
  //   SheetNames: ['賬單詳情'],
  //   Sheets: {
  //     '賬單詳情': {}
  //   }
  // };

  // 準備表頭
  const headers = [
    '學生ID',
    '學生姓名',
    '學校',
    `${selectedMonth.split('-')[1]}月學費總額`,
    '月結單狀態',
    '繳費狀態',
    '付費方式'
  ];

  // 準備數據行
  const dataRows = billingData.map(item => [
    item.studentId,
    item.studentName,
    item.school,
    `$${item.totalAmount.toLocaleString()}`,
    item.statementStatus,
    item.paymentStatus,
    item.paymentMethod
  ]);

  // 添加統計行
  const summaryRows = [
    [], // 空行
    ['統計摘要'],
    ['當月學費總額', `$${statistics.totalAmount.toLocaleString()}`],
    ['已繳金額', `$${statistics.paidAmount.toLocaleString()}`],
    ['未交金額', `$${statistics.unpaidAmount.toLocaleString()}`],
    ['已繳學生數', billingData.filter(item => item.paymentStatus === '已繳交').length],
    ['未繳學生數', billingData.filter(item => item.paymentStatus === '未繳交').length],
    ['總學生數', billingData.length]
  ];

  // 合併所有數據
  const allData = [headers, ...dataRows, ...summaryRows];

  // 創建CSV內容
  const csvContent = allData.map(row => 
    row.map(cell => {
      // 處理包含逗號、引號或換行的內容
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');

  // 添加BOM以支持中文
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;

    // 創建並下載文件
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `賬單詳情_${selectedMonth.replace('-', '年')}月.csv`);
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

const BillingSystem = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // 从 localStorage 获取保存的月份，如果没有则返回前一个月
    const savedMonth = localStorage.getItem('studentSelectedMonth');
    if (savedMonth) {
      return savedMonth;
    } else {
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = previousMonth.getFullYear();
      const month = String(previousMonth.getMonth() + 1).padStart(2, '0');
      const defaultMonth = `${year}-${month}`;
      localStorage.setItem('studentSelectedMonth', defaultMonth);
      return defaultMonth;
    }
  });
  const [billingData, setBillingData] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  // const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [studentFilter, setStudentFilter] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState('');
  // const [statistics, setStatistics] = useState({
  //   totalAmount: 0,
  //   paidAmount: 0,
  //   unpaidAmount: 0
  // });

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
    localStorage.setItem('studentSelectedMonth', month);
  };

  const calculateBillingData = useCallback(async () => {
    const filteredClasses = classes.filter(cls => {
      const classDate = new Date(cls.date);
      const classMonth = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, '0')}`;
      return classMonth === selectedMonth;
    });

    // 獲取該月份的學生賬單狀態
    let billingStatuses = [];
    try {
      billingStatuses = await api.studentBillingStatus.getByMonth(selectedMonth);
    } catch (error) {
      console.error('獲取賬單狀態失敗:', error);
    }

    const studentBilling = {};
    // let totalAmount = 0;
    // let paidAmount = 0;
    // let unpaidAmount = 0;

    filteredClasses.forEach(cls => {
      const student = students.find(s => s.studentId === cls.studentId);
      if (student) {
        if (!studentBilling[student.studentId]) {
          // 查找該學生的賬單狀態
          const status = billingStatuses.find(s => s.studentId === student.studentId);
          
          studentBilling[student.studentId] = {
            studentId: student.studentId,
            studentName: `${student.nameZh} (${student.nameEn})`,
            school: student.school || '未知學校',
            totalAmount: 0,
            paymentStatus: status ? status.paymentStatus : '未繳交',
            paymentMethod: status ? status.paymentMethod : 'N/A',
            statementStatus: status ? status.statementStatus : '未生成',
            notes: status ? status.notes : ''
          };
        }
        studentBilling[student.studentId].totalAmount += cls.price;
        // totalAmount += cls.price;
      }
    });

    const billingDataArray = Object.values(studentBilling);
    
    // 計算統計信息（已移至 getFilteredStatistics 函數中動態計算）
    // paidAmount = billingDataArray
    //   .filter(item => item.paymentStatus === '已繳交')
    //   .reduce((sum, item) => sum + item.totalAmount, 0);
    
    // unpaidAmount = totalAmount - paidAmount;

    setBillingData(billingDataArray);
    // setStatistics({
    //   totalAmount,
    //   paidAmount,
    //   unpaidAmount
    // });
  }, [selectedMonth, students, classes]);

  // 獲取學生和課堂數據
  useEffect(() => {
    const fetchAllData = async () => {
      await Promise.all([
        fetchStudents(),
        fetchClasses(),
        fetchTeachers(),
        fetchCourses()
      ]);
    };
    
    fetchAllData();
  }, []);

  // 當選擇月份或數據更新時，重新計算賬單
  useEffect(() => {
    if (selectedMonth) {
      calculateBillingData();
    } else {
          setBillingData([]);
    // setStatistics({ totalAmount: 0, paidAmount: 0, unpaidAmount: 0 });
    }
  }, [selectedMonth, students, classes, courses, calculateBillingData]);

  const fetchStudents = async () => {
    try {
      const data = await api.students.getAll();
      setStudents(data);
    } catch (error) {
      console.error('獲取學生數據失敗:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await api.classes.getAll();
      setClasses(data);
    } catch (error) {
      console.error('獲取課堂數據失敗:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const data = await api.teachers.getAll();
      setTeachers(data);
    } catch (error) {
      console.error('獲取教師數據失敗:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const data = await api.courses.getAll();
      setCourses(data);
    } catch (error) {
      console.error('獲取課程數據失敗:', error);
    }
  };

  // 处理学生筛选输入
  const handleStudentFilterChange = (value) => {
    setStudentFilter(value);
    
    if (value.trim() === '') {
      setFilteredStudents([]);
      setShowStudentDropdown(false);
      return;
    }

    // 筛选匹配的学生
    const filtered = students.filter(student => {
      const studentName = `${student.nameZh} (${student.nameEn})${student.nickname ? ` [${student.nickname}]` : ''}`;
      return student.studentId.includes(value) || 
             studentName.toLowerCase().includes(value.toLowerCase());
    });

    setFilteredStudents(filtered);
    setShowStudentDropdown(true);
  };

  // 选择学生
  const selectStudent = (student) => {
    const studentName = `${student.studentId} - ${student.nameZh} (${student.nameEn})${student.nickname ? ` [${student.nickname}]` : ''}`;
    setStudentFilter(studentName);
    setShowStudentDropdown(false);
  };

  // 清除筛选
  const clearStudentFilter = () => {
    setStudentFilter('');
    setFilteredStudents([]);
    setShowStudentDropdown(false);
  };

  const updateBillingStatus = async (studentId, field, value) => {
    try {
      await api.studentBillingStatus.create({
        studentId,
        month: selectedMonth,
        [field]: value
      });

      // 更新本地狀態
      setBillingData(prev => 
        prev.map(item => 
          item.studentId === studentId 
            ? { ...item, [field]: value }
            : item
        )
      );
    } catch (error) {
      console.error('更新狀態時發生錯誤:', error);
    }
  };

  // 一鍵確認所有學生月結單狀態
  const confirmAllStatementStatus = () => {
    setConfirmAction('statement');
    setShowConfirmModal(true);
  };

  // 執行一鍵確認
  const executeConfirmAction = async () => {
    try {
      const promises = billingData.map(item => {
        if (confirmAction === 'statement') {
          return updateBillingStatus(item.studentId, 'statementStatus', '已發送');
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

  const generateMonthOptions = () => {
    const options = [];
    const monthSet = new Set();
    
    // 从课堂数据中提取所有有数据的月份
    classes.forEach(cls => {
      if (cls.date) {
        const classDate = new Date(cls.date);
        const year = classDate.getFullYear();
        const month = String(classDate.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
        monthSet.add(value);
      }
    });
    
    // 转换为选项数组并排序（最新的月份在前）
    const sortedMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    
    sortedMonths.forEach(value => {
      const [year, month] = value.split('-');
      const label = `${year}年${parseInt(month)}月`;
      options.push({ value, label });
    });
    
    return options;
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  // 計算篩選後的統計數據
  const getFilteredStatistics = () => {
    let filteredBillingData = billingData;
    
    if (studentFilter && studentFilter.trim() !== '') {
      // 從 studentFilter 中提取學生ID
      let studentId = null;
      if (studentFilter.includes(' - ')) {
        studentId = studentFilter.split(' - ')[0];
      } else {
        studentId = studentFilter;
      }
      
      // 篩選出匹配的學生
      filteredBillingData = billingData.filter(item => 
        item.studentId === studentId ||
        item.studentName.includes(studentFilter)
      );
    }
    
    const totalAmount = filteredBillingData.reduce((sum, item) => sum + item.totalAmount, 0);
    const paidAmount = filteredBillingData
      .filter(item => item.paymentStatus === '已繳交')
      .reduce((sum, item) => sum + item.totalAmount, 0);
    const unpaidAmount = totalAmount - paidAmount;
    
    return {
      totalAmount,
      paidAmount,
      unpaidAmount
    };
  };

  // 生成月結單功能
  // 生成月結單功能（用於ZIP打包）
  const generatePDFForZip = async (studentId, studentClasses, month, zip) => {
    const student = students.find(s => s.studentId === studentId);
    if (!student) return;

    // 獲取月份信息用於標題和文件名
    const selectedDate = new Date(month);
    const monthNum = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    const currentDate = new Date();
    const issueDate = currentDate.toISOString().split('T')[0]; // yyyy-mm-dd format

    // 對課堂資料進行排序：教師ID（小到大）-> 課程ID（小到大）-> 日期（遠到近）
    const sortedClasses = studentClasses.sort((a, b) => {
      const courseA = courses.find(c => c.courseId === a.courseId);
      const courseB = courses.find(c => c.courseId === b.courseId);
      const teacherA = courseA ? teachers.find(t => t.teacherId === courseA.teacherId) : null;
      const teacherB = courseB ? teachers.find(t => t.teacherId === courseB.teacherId) : null;
      
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

    let totalAmount = 0;
    const tableRows = sortedClasses.map(cls => {
      const course = courses.find(c => c.courseId === cls.courseId);
      const teacher = course ? teachers.find(t => t.teacherId === course.teacherId) : null;
      totalAmount += parseInt(cls.price) || 0;

      return `
        <tr>
          <td style="border: 1px solid #000; padding: 12px;">${teacher ? teacher.name : ''}</td>
          <td style="border: 1px solid #000; padding: 12px;">${course ? course.subject : ''}</td>
          <td style="border: 1px solid #000; padding: 12px;">${new Date(cls.date).toLocaleDateString('zh-TW')}</td>
          <td style="border: 1px solid #000; padding: 12px;">$${cls.price}</td>
        </tr>
      `;
    }).join('');

    const html = `
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
        
        <h2 style="text-align: center; color: #333; margin: 30px 0; font-size: 28px;">${monthNum}月學費通知單</h2>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        
        <div style="margin-bottom: 30px;">
          <p style="margin: 10px 0; font-size: 14px;">
            <strong>學生名稱:</strong> ${student.studentId} - ${student.nameZh} (${student.nameEn})
          </p>
          <p style="margin: 10px 0; font-size: 14px;">
            <strong>發出日期:</strong> ${issueDate}
          </p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
            <tr style="background-color: #0F766E; color: white;">
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">教師</th>
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">科目</th>
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">日期</th>
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">總金額</th>
              </tr>
            </thead>
            <tbody>
            ${tableRows}
            <tr style="background-color: #f5f5f5;">
              <td style="border: 1px solid #000; padding: 12px;"></td>
              <td style="border: 1px solid #000; padding: 12px;"></td>
              <td style="border: 1px solid #000; padding: 12px;"><strong>總計</strong></td>
              <td style="border: 1px solid #000; padding: 12px;"><strong>$${totalAmount}</strong></td>
            </tr>
          </tbody>
          </table>
        
        <div style="margin-top: 40px; font-size: 12px; color: #666; page-break-inside: avoid;">
          <p><strong>銀行資料:</strong> Bank of East Asia 東亞銀行</p>
          <p><strong>戶口號碼:</strong> 015-514-68-10702-3</p>
          <p><strong>轉數快快速支付系統識別碼:</strong> 164089138</p>
          <p><strong>公司抬頭:</strong> Excelsia Education Centre</p>
          <p style="margin-top: 20px;">如閣下已經入了款項,請將資料/存根receipt whatsapp給予我們留檔,多謝合作,謝謝!</p>
          <p style="margin-top: 15px;">如閣下核對學費明細有誤，請聯絡我們作出修訂。</p>
          <p>如需更改時間或取消課堂，請於上課前24小時通知導師</p>
          <p>否則我們可能會收取該課堂的費用</p>
        </div>
      </div>
    `;

    const opt = {
      margin: 1,
      filename: `${year}年${monthNum}月-${student.studentId}-${student.nameZh}_月結單.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    const element = document.createElement('div');
    element.innerHTML = html;
    document.body.appendChild(element);

    // 使用html2pdf.js生成PDF並添加到ZIP
    try {
      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
      const fileName = `${year}年${monthNum}月-${student.studentId}-${student.nameZh}_月結單.pdf`;
      zip.file(fileName, pdfBlob);
      document.body.removeChild(element);
    } catch (error) {
      console.error('PDF生成錯誤:', error);
      document.body.removeChild(element);
      throw error;
    }
  };

  const generatePDF = (studentId, studentClasses, month) => {
    const student = students.find(s => s.studentId === studentId);
    if (!student) return;

    // 獲取月份信息用於標題和文件名
    const selectedDate = new Date(month);
    const monthNum = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();
    const currentDate = new Date();
    const issueDate = currentDate.toISOString().split('T')[0]; // yyyy-mm-dd format

    // 對課堂資料進行排序：教師ID（小到大）-> 課程ID（小到大）-> 日期（遠到近）
    const sortedClasses = studentClasses.sort((a, b) => {
      const courseA = courses.find(c => c.courseId === a.courseId);
      const courseB = courses.find(c => c.courseId === b.courseId);
      const teacherA = courseA ? teachers.find(t => t.teacherId === courseA.teacherId) : null;
      const teacherB = courseB ? teachers.find(t => t.teacherId === courseB.teacherId) : null;
      
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

    let totalAmount = 0;
    const tableRows = sortedClasses.map(cls => {
      const course = courses.find(c => c.courseId === cls.courseId);
      const teacher = course ? teachers.find(t => t.teacherId === course.teacherId) : null;
      totalAmount += parseInt(cls.price) || 0;

      return `
        <tr>
          <td style="border: 1px solid #000; padding: 12px;">${teacher ? teacher.name : ''}</td>
          <td style="border: 1px solid #000; padding: 12px;">${course ? course.subject : ''}</td>
          <td style="border: 1px solid #000; padding: 12px;">${new Date(cls.date).toLocaleDateString('zh-TW')}</td>
          <td style="border: 1px solid #000; padding: 12px;">$${cls.price}</td>
        </tr>
      `;
    }).join('');

    const html = `
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
        
        <h2 style="text-align: center; color: #333; margin: 30px 0; font-size: 28px;">${monthNum}月學費通知單</h2>
        
        <hr style="border: 1px solid #ddd; margin: 20px 0;">
        
        <div style="margin-bottom: 30px;">
          <p style="margin: 10px 0; font-size: 14px;">
            <strong>學生名稱:</strong> ${student.studentId} - ${student.nameZh} (${student.nameEn})
          </p>
          <p style="margin: 10px 0; font-size: 14px;">
            <strong>發出日期:</strong> ${issueDate}
          </p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
            <tr style="background-color: #0F766E; color: white;">
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">教師</th>
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">科目</th>
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">日期</th>
              <th style="border: 1px solid #000; padding: 12px; text-align: left; color: white;">總金額</th>
              </tr>
            </thead>
            <tbody>
            ${tableRows}
            <tr style="background-color: #f5f5f5;">
              <td style="border: 1px solid #000; padding: 12px;"></td>
              <td style="border: 1px solid #000; padding: 12px;"></td>
              <td style="border: 1px solid #000; padding: 12px;"><strong>總計</strong></td>
              <td style="border: 1px solid #000; padding: 12px;"><strong>$${totalAmount}</strong></td>
            </tr>
          </tbody>
          </table>
        
        <div style="margin-top: 40px; font-size: 12px; color: #666; page-break-inside: avoid;">
          <p><strong>銀行資料:</strong> Bank of East Asia 東亞銀行</p>
          <p><strong>戶口號碼:</strong> 015-514-68-10702-3</p>
          <p><strong>轉數快快速支付系統識別碼:</strong> 164089138</p>
          <p><strong>公司抬頭:</strong> Excelsia Education Centre</p>
          <p style="margin-top: 20px;">如閣下已經入了款項,請將資料/存根receipt whatsapp給予我們留檔,多謝合作,謝謝!</p>
          <p style="margin-top: 15px;">如閣下核對學費明細有誤，請聯絡我們作出修訂。</p>
          <p>如需更改時間或取消課堂，請於上課前24小時通知導師</p>
          <p>否則我們可能會收取該課堂的費用</p>
        </div>
      </div>
    `;

    const opt = {
      margin: 1,
      filename: `${year}年${monthNum}月-${student.studentId}-${student.nameZh}_月結單.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    const element = document.createElement('div');
    element.innerHTML = html;
    document.body.appendChild(element);

    // 使用html2pdf.js生成PDF
    html2pdf().set(opt).from(element).save().then(() => {
      document.body.removeChild(element);
    }).catch(error => {
      console.error('PDF生成錯誤:', error);
      document.body.removeChild(element);
    });
  };

  const generateAllStudentPDFs = async () => {
    if (!selectedMonth || billingData.length === 0) {
      alert('請先選擇月份並確保有數據');
      return;
    }
    
    const zip = new JSZip();
    const pdfPromises = [];
    
    billingData.forEach((item, index) => {
      const studentClasses = classes.filter(cls => 
        cls.studentId === item.studentId && 
        new Date(cls.date).getFullYear() === parseInt(selectedMonth.split('-')[0]) &&
        new Date(cls.date).getMonth() === parseInt(selectedMonth.split('-')[1]) - 1
      );
      
      if (studentClasses.length > 0) {
        const pdfPromise = generatePDFForZip(item.studentId, studentClasses, selectedMonth, zip);
        pdfPromises.push(pdfPromise);
      }
    });
    
    if (pdfPromises.length === 0) {
      alert('該月份沒有學生課堂數據');
      return;
    }
    
    try {
      await Promise.all(pdfPromises);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // 下載ZIP文件
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `學生月結單_${selectedMonth.replace('-', '年')}月.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      

    } catch (error) {
      console.error('生成ZIP文件時發生錯誤:', error);
      alert('生成ZIP文件時發生錯誤，請重試');
    }
  };

  const generateSingleStudentPDF = () => {
    if (!selectedMonth || !studentFilter) {
      alert('請先選擇月份和學生');
      return;
    }
    
    // 從 studentFilter 中提取學生ID
    // studentFilter 格式通常是: "學生ID - 姓名 (英文名) [暱稱]"
    let studentId = null;
    
    // 嘗試從 studentFilter 中提取學生ID
    if (studentFilter.includes(' - ')) {
      studentId = studentFilter.split(' - ')[0];
    } else {
      // 如果沒有分隔符，直接使用 studentFilter 作為學生ID
      studentId = studentFilter;
    }
    
    // 在 billingData 中查找學生
    const filteredStudent = billingData.find(item => 
      item.studentId === studentId ||
      item.studentName.includes(studentFilter)
    );
    
    if (!filteredStudent) {
      alert('找不到指定的學生');
      return;
    }
    
    const studentClasses = classes.filter(cls => 
      cls.studentId === filteredStudent.studentId && 
      new Date(cls.date).getFullYear() === parseInt(selectedMonth.split('-')[0]) &&
      new Date(cls.date).getMonth() === parseInt(selectedMonth.split('-')[1]) - 1
    );
    
    if (studentClasses.length === 0) {
      alert('該學生在指定月份沒有課堂記錄');
      return;
    }
    
    generatePDF(filteredStudent.studentId, studentClasses, selectedMonth);
  };

  return (
    <div className="billing-system">
      <div className="billing-header">
        <h2>學生賬單系統</h2>
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
              onClick={() => {
                // 根據篩選條件獲取要匯出的數據
                let filteredBillingData = billingData;
                if (studentFilter && studentFilter.trim() !== '') {
                  let studentId = null;
                  if (studentFilter.includes(' - ')) {
                    studentId = studentFilter.split(' - ')[0];
                  } else {
                    studentId = studentFilter;
                  }
                  filteredBillingData = billingData.filter(item => 
                    item.studentId === studentId ||
                    item.studentName.includes(studentFilter)
                  );
                }
                exportToExcel(filteredBillingData, getFilteredStatistics(), selectedMonth, setExporting);
              }}
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
              <h3>當月學費總額</h3>
              <p className="stat-amount">{formatCurrency(getFilteredStatistics().totalAmount)}</p>
            </div>
            <div className="stat-card">
              <h3>已繳金額</h3>
              <p className="stat-amount paid">{formatCurrency(getFilteredStatistics().paidAmount)}</p>
            </div>
            <div className="stat-card">
              <h3>未交金額</h3>
              <p className="stat-amount unpaid">{formatCurrency(getFilteredStatistics().unpaidAmount)}</p>
            </div>
          </div>

          <div className="monthly-statement-section">
            <div className="statement-content">
              <div className="statement-filters">
                <div className="filter-group">
                  <label htmlFor="student-filter">學生：</label>
                  <div className="student-search-container">
                  <input
                    id="student-filter"
                    type="text"
                    placeholder="請輸入學生ID、姓名或暱稱"
                    value={studentFilter}
                      onChange={(e) => handleStudentFilterChange(e.target.value)}
                      onFocus={() => {
                        if (studentFilter.trim() !== '') {
                          setShowStudentDropdown(true);
                        }
                      }}
                      onBlur={() => {
                        // 延迟隐藏下拉框，让用户有时间点击选项
                        setTimeout(() => setShowStudentDropdown(false), 200);
                      }}
                    />
                    {showStudentDropdown && (
                      <div className="student-dropdown">
                        <div 
                          className="dropdown-option"
                          onClick={() => clearStudentFilter()}
                        >
                          全部
                        </div>
                        {filteredStudents.map((student) => (
                          <div
                            key={student.studentId}
                            className="dropdown-option"
                            onClick={() => selectStudent(student)}
                          >
                            {student.studentId} - {student.nameZh} ({student.nameEn}){student.nickname ? ` [${student.nickname}]` : ''}
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
                  onClick={clearStudentFilter}
                >
                  清除篩選
                </button>
                <button
                  className="generate-all-button"
                  onClick={generateAllStudentPDFs}
                >
                  生成所有學生月結單
                </button>
                <button
                  className="generate-single-button"
                  onClick={generateSingleStudentPDF}
                >
                  生成學生月結單
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedMonth && billingData.length > 0 ? (
        <div className="billing-table-container">
          <table className="billing-table">
            <thead>
              <tr>
                <th>學生資料</th>
                <th>學校</th>
                <th>{selectedMonth.split('-')[1]}月學費總額</th>
                <th>
                  月結單狀態
                  <button
                    className="bulk-action-icon"
                    onClick={confirmAllStatementStatus}
                    title="一鍵確認所有月結單已發送"
                  >
                    ✓
                  </button>
                </th>
                <th>繳費狀態</th>
                <th>付費方式</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // 篩選表格數據
                let filteredBillingData = billingData;
                
                if (studentFilter && studentFilter.trim() !== '') {
                  // 從 studentFilter 中提取學生ID
                  let studentId = null;
                  if (studentFilter.includes(' - ')) {
                    studentId = studentFilter.split(' - ')[0];
                  } else {
                    studentId = studentFilter;
                  }
                  
                  // 篩選出匹配的學生
                  filteredBillingData = billingData.filter(item => {
                    return item.studentId === studentId ||
                           item.studentName.includes(studentFilter);
                  });
                }
                
                return filteredBillingData.map((item) => (
                  <tr key={item.studentId}>
                    <td className="student-info">
                      <div className="student-id">ID: {item.studentId}</div>
                      <div className="student-name">{item.studentName}</div>
                    </td>
                    <td>{item.school}</td>
                    <td className="amount">{formatCurrency(item.totalAmount)}</td>
                    <td>
                      <select
                        value={item.statementStatus}
                        onChange={(e) => updateBillingStatus(item.studentId, 'statementStatus', e.target.value)}
                        className={`status-select ${item.statementStatus === '已發送' ? 'status-sent' : 'status-not-sent'}`}
                      >
                        <option value="未發送">未發送</option>
                        <option value="已發送">已發送</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={item.paymentStatus}
                        onChange={(e) => updateBillingStatus(item.studentId, 'paymentStatus', e.target.value)}
                        className={`status-select ${item.paymentStatus === '已繳交' ? 'status-paid' : 'status-unpaid'}`}
                      >
                        <option value="未繳交">未繳交</option>
                        <option value="已繳交">已繳交</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={item.paymentMethod}
                        onChange={(e) => updateBillingStatus(item.studentId, 'paymentMethod', e.target.value)}
                        className="status-select"
                      >
                        <option value="N/A">N/A</option>
                        <option value="現金">現金</option>
                        <option value="轉數快">轉數快</option>
                        <option value="信用卡/微信/支付寶">信用卡/微信/支付寶</option>
                      </select>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      ) : selectedMonth ? (
        <div className="no-data">
          <p>該月份暫無學生學費記錄</p>
        </div>
      ) : (
        <div className="no-data">
          <p>請選擇月份查看賬單詳情</p>
        </div>
      )}

      {/* 確認彈窗 */}
      {showConfirmModal && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <h3>確認操作</h3>
            <p>
              {confirmAction === 'statement' 
                ? '確定要將所有學生的月結單狀態設為「已發送」嗎？' 
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

export default BillingSystem; 