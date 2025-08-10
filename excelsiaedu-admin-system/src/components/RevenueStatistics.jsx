import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
// import { Pie, Bar, Line } from 'react-chartjs-2';
// import * as XLSX from 'xlsx';
import './RevenueStatistics.css';
import config from '../config';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const RevenueStatistics = () => {
  const location = useLocation();
  
  // 添加調試信息
  console.log('RevenueStatistics 組件渲染，當前路徑:', location.pathname);
  
  // 立即渲染測試內容，確保組件可見
  const testRender = (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#ffeb3b', 
      margin: '20px',
      border: '3px solid #f57f17',
      borderRadius: '10px'
    }}>
      <h1>🧪 測試渲染 - RevenueStatistics 組件</h1>
      <p>如果你能看到這個黃色框，說明組件已經正常渲染！</p>
      <p>當前路徑: {location.pathname}</p>
      <p>時間: {new Date().toLocaleString()}</p>
    </div>
  );
  
  // 根據URL參數決定默認標籤頁
  const getDefaultTab = useCallback(() => {
    const path = location.pathname;
    console.log('getDefaultTab 被調用，路徑:', path);
    if (path.includes('/revenue-teacher')) return 'teacher';
    if (path.includes('/revenue-daily')) return 'daily';
    if (path.includes('/revenue-overview')) return 'overview';
    if (path.includes('/revenue-student')) return 'student';
    return 'student'; // 默認返回學生明細
  }, [location.pathname]);
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // 添加錯誤狀態
  
  // 學生課堂明細篩選
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  
  // 教師課堂明細篩選
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedTeacherMonth, setSelectedTeacherMonth] = useState('');
  
  // 每日營收篩選
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // 營運概要相關狀態
  const [selectedOverviewMonths, setSelectedOverviewMonths] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedListTab, setSelectedListTab] = useState('teacher');
  const [overviewData, setOverviewData] = useState({
    teacherRevenue: [],
    courseRevenue: [],
    gradeRevenue: [],
    monthlyRevenue: []
  });

  // 搜尋相關狀態
  const [studentSearch, setStudentSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  
  // 數據和統計
  const [studentData, setStudentData] = useState([]);
  const [teacherData, setTeacherData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);

  // 新增 useEffect 來監聽 URL 變化並更新 activeTab
  useEffect(() => {
    const defaultTab = getDefaultTab();
    console.log('設置默認標籤頁:', defaultTab);
    setActiveTab(defaultTab);
  }, [location.pathname, getDefaultTab]);

  useEffect(() => {
    console.log('組件掛載，開始獲取數據');
    fetchData();
  }, []);

  // 添加一個useEffect來監控組件狀態變化
  useEffect(() => {
    console.log('組件狀態變化:', {
      loading,
      error,
      activeTab,
      studentsCount: students.length,
      teachersCount: teachers.length,
      classesCount: classes.length,
      coursesCount: courses.length
    });
  }, [loading, error, activeTab, students.length, teachers.length, classes.length, courses.length]);

  const fetchData = async () => {
    setLoading(true);
    setError(null); // 重置錯誤狀態
    console.log('開始獲取數據，API URL:', config.API_URL);
    
    try {
      const [studentsRes, teachersRes, classesRes, coursesRes] = await Promise.all([
        fetch(`${config.API_URL}/students`),
        fetch(`${config.API_URL}/teachers`),
        fetch(`${config.API_URL}/classes`),
        fetch(`${config.API_URL}/courses`)
      ]);

      console.log('API響應狀態:', {
        students: studentsRes.status,
        teachers: teachersRes.status,
        classes: classesRes.status,
        courses: coursesRes.status
      });

      // 檢查響應狀態
      if (!studentsRes.ok || !teachersRes.ok || !classesRes.ok || !coursesRes.ok) {
        throw new Error(`API響應錯誤: students(${studentsRes.status}), teachers(${teachersRes.status}), classes(${classesRes.status}), courses(${coursesRes.status})`);
      }

      const studentsData = await studentsRes.json();
      const teachersData = await teachersRes.json();
      const classesData = await classesRes.json();
      const coursesData = await coursesRes.json();

      console.log('獲取到的數據:', {
        students: studentsData.length,
        teachers: teachersData.length,
        classes: classesData.length,
        courses: coursesData.length
      });

      setStudents(studentsData);
      setTeachers(teachersData);
      setClasses(classesData);
      setCourses(coursesData);
    } catch (error) {
      console.error('獲取數據失敗:', error);
      setError(`獲取數據失敗: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 生成月份選項（12個月+全部月份）
  const generateMonthOptionsWithAll = () => {
    const months = [
      { value: 'all', label: '全部月份' }
    ];
    
    // 根據選擇的年份生成月份選項
    const currentYear = new Date().getFullYear();
    const year = selectedYear || currentYear;
    
    for (let i = 1; i <= 12; i++) {
      const month = new Date(year, i - 1);
      months.push({
        value: i.toString(),
        label: `${month.getMonth() + 1}月`
      });
    }
    
    return months;
  };

  // 生成年份選項
  const generateYearOptions = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    
    for (let i = 0; i < 3; i++) {
      const year = currentYear - i;
      years.push({ value: year.toString(), label: `${year}年` });
    }
    
    return years;
  };

  // 生成月份選項（用於其他標籤頁）
  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const monthLabel = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      months.push({ value: monthStr, label: monthLabel });
    }
    
    return months;
  };

  // 處理月份選擇
  // const handleMonthSelection = (monthValue) => {
  //   if (monthValue === 'all') {
  //     // 如果選擇「全部月份」
  //     const allMonths = generateMonthOptionsWithAll()
  //       .filter(month => month.value !== 'all')
  //       .map(month => month.value);
      
  //     // 檢查是否所有月份都已選中
  //     const isAllSelected = allMonths.every(month => selectedOverviewMonths.includes(month));
      
  //     if (isAllSelected) {
  //       // 如果所有月份都已選中，則取消選中所有月份
  //       setSelectedOverviewMonths([]);
  //     } else {
  //       // 否則選中所有月份
  //       setSelectedOverviewMonths(allMonths);
  //     }
  //   } else {
  //     // 如果選擇個別月份
  //     setSelectedOverviewMonths(prev => {
  //       if (prev.includes(monthValue)) {
  //           // 如果已經選中，則取消選中
  //           return prev.filter(m => m !== monthValue);
  //         } else {
  //           // 如果未選中，則添加到選中列表
  //           return [...prev, monthValue];
  //         }
  //       });
  //     }
  //   }
  // };

  // 過濾學生選項
  const getFilteredStudents = () => {
    if (!studentSearch) return students;
    const filtered = students.filter(student => {
      const studentId = student.studentId || student.id || '';
      const nameZh = student.nameZh || '';
      const nameEn = student.nameEn || '';
      return String(studentId).includes(studentSearch) || 
             nameZh.toLowerCase().includes(studentSearch.toLowerCase()) ||
             nameEn.toLowerCase().includes(studentSearch.toLowerCase());
    });
    return filtered;
  };

  // 過濾教師選項
  const getFilteredTeachers = () => {
    if (!teacherSearch) return teachers;
    const filtered = teachers.filter(teacher => {
      const teacherId = teacher.teacherId || teacher.id || '';
      const name = teacher.name || '';
      return String(teacherId).includes(teacherSearch) || 
             name.toLowerCase().includes(teacherSearch.toLowerCase());
    });
    return filtered;
  };

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-dropdown')) {
        setShowStudentDropdown(false);
        setShowTeacherDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 計算學生數據
  const calculateStudentData = useCallback(() => {
    let filteredClasses = classes;

    // 學生篩選
    if (selectedStudent) {
      filteredClasses = filteredClasses.filter(cls => {
        const matches = String(cls.studentId) === String(selectedStudent);
        return matches;
      });
    }

    // 月份篩選
    if (selectedMonth) {
      filteredClasses = filteredClasses.filter(cls => {
        const classDate = new Date(cls.date);
        const classMonth = `${classDate.getFullYear()}-${classDate.getMonth() + 1}`;
        return classMonth === selectedMonth;
      });
    }

    // 按學生分組
    const groupedData = {};
    let total = 0;

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.courseId === cls.courseId);
      const teacherId = cls.teacherId || (course ? course.teacherId : null);
      const teacher = teachers.find(t => t.teacherId === teacherId);
      
      if (cls.studentId) {
        const student = students.find(s => s.studentId === cls.studentId);
        if (student) {
          if (!groupedData[student.studentId]) {
            groupedData[student.studentId] = {
              studentId: student.studentId,
              studentName: `${student.nameZh} (${student.nameEn})`,
              classes: []
            };
          }
          
          groupedData[student.studentId].classes.push({
            date: cls.date,
            subject: course ? `${course.grade}${course.subject}` : '未知科目',
            teacher: teacher ? teacher.name : '未知教師',
            amount: cls.price
          });
          
          total += cls.price;
        }
      }
    });

    const sortedStudentData = Object.values(groupedData).map(student => {
      const sortedClasses = student.classes.sort((a, b) => {
        const teacherCompare = b.teacher.localeCompare(a.teacher);
        if (teacherCompare !== 0) return teacherCompare;
        
        const aSubject = a.subject.replace(/^[中一二三四五六]/, '');
        const bSubject = b.subject.replace(/^[中一二三四五六]/, '');
        
        const aCourse = courses.find(c => c.subject === aSubject);
        const bCourse = courses.find(c => c.subject === bSubject);
        
        if (aCourse && bCourse) {
          return bCourse.courseId.localeCompare(aCourse.courseId);
        }
        
        return bSubject.localeCompare(aSubject);
      });
      
      return {
        ...student,
        classes: sortedClasses
      };
    });
    
    setStudentData(sortedStudentData);
    setTotalAmount(total);
  }, [classes, selectedStudent, selectedMonth, courses, teachers, students]);

  // 計算教師數據
  const calculateTeacherData = useCallback(() => {
    let filteredClasses = classes;

    if (selectedTeacher) {
      filteredClasses = filteredClasses.filter(cls => {
        const course = courses.find(c => c.courseId === cls.courseId);
        const teacherId = cls.teacherId || (course ? course.teacherId : null);
        return String(teacherId) === String(selectedTeacher);
      });
    }

    if (selectedTeacherMonth) {
      filteredClasses = filteredClasses.filter(cls => {
        const classDate = new Date(cls.date);
        const classMonth = `${classDate.getFullYear()}-${classDate.getMonth() + 1}`;
        return classMonth === selectedTeacherMonth;
      });
    }

    const groupedData = {};
    let total = 0;

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.courseId === cls.courseId);
      const teacherId = cls.teacherId || (course ? course.teacherId : null);
      const teacher = teachers.find(t => t.teacherId === teacherId);
      
      if (teacher) {
        if (!groupedData[teacher.teacherId]) {
          groupedData[teacher.teacherId] = {
            teacherId: teacher.teacherId,
            teacherName: teacher.name,
            classes: []
          };
        }
        
        if (cls.studentId) {
          const student = students.find(s => s.studentId === cls.studentId);
          if (student) {
            groupedData[teacher.teacherId].classes.push({
              studentName: `${student.studentId} - ${student.nameZh} (${student.nameEn})`,
              subject: course ? `${course.grade}${course.subject}` : '未知科目',
              date: cls.date,
              amount: cls.price
            });
            
            total += cls.price;
          }
        }
      }
    });

    const sortedTeacherData = Object.values(groupedData)
      .sort((a, b) => {
        const teacherIdA = parseInt(a.teacherId) || 0;
        const teacherIdB = parseInt(b.teacherId) || 0;
        return teacherIdA - teacherIdB;
      })
      .map(teacher => {
        const sortedClasses = teacher.classes.sort((a, b) => {
          const aStudentId = a.studentName.split(' - ')[0];
          const bStudentId = b.studentName.split(' - ')[0];
          return bStudentId.localeCompare(aStudentId);
        });
        
        return {
          ...teacher,
          classes: sortedClasses
        };
      });
    
    setTeacherData(sortedTeacherData);
    setTotalAmount(total);
  }, [classes, selectedTeacher, selectedTeacherMonth, courses, teachers, students]);

  // 計算每日數據
  const calculateDailyData = useCallback(() => {
    let filteredClasses = classes;

    if (startDate && endDate) {
      filteredClasses = filteredClasses.filter(cls => {
        const classDate = new Date(cls.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        classDate.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        return classDate >= start && classDate <= end;
      });
    }

    const groupedData = {};
    let total = 0;

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.courseId === cls.courseId);
      const teacherId = cls.teacherId || (course ? course.teacherId : null);
      const teacher = teachers.find(t => t.teacherId === teacherId);
      
      const classDate = new Date(cls.date);
      const normalizedDate = `${classDate.getFullYear()}-${classDate.getMonth() + 1}-${classDate.getDate()}`;
      
      if (!groupedData[normalizedDate]) {
        groupedData[normalizedDate] = {
          date: normalizedDate,
          classes: []
        };
      }
      
      if (cls.studentId) {
        const student = students.find(s => s.studentId === cls.studentId);
        if (student) {
          groupedData[normalizedDate].classes.push({
            teacher: teacher ? teacher.name : '未知教師',
            studentName: `${student.studentId} - ${student.nameZh} (${student.nameEn})`,
            subject: course ? `${course.grade}${course.subject}` : '未知科目',
            amount: cls.price
          });
          
          total += cls.price;
        }
      }
    });

    const sortedData = Object.values(groupedData).sort((a, b) => new Date(a.date) - new Date(b.date));
    setDailyData(sortedData);
    setTotalAmount(total);
  }, [classes, startDate, endDate, courses, teachers, students]);

  // 計算概覽數據
  const calculateOverviewData = useCallback(() => {
    let filteredClasses = classes;

    if (selectedYear) {
      filteredClasses = filteredClasses.filter(cls => {
        const classDate = new Date(cls.date);
        const classYear = classDate.getFullYear().toString();
        return classYear === selectedYear;
      });
    }

    if (selectedOverviewMonths.length > 0 && !selectedOverviewMonths.includes('all')) {
      filteredClasses = filteredClasses.filter(cls => {
        const classDate = new Date(cls.date);
        const classMonth = (classDate.getMonth() + 1).toString();
        return selectedOverviewMonths.includes(classMonth);
      });
    }

    const teacherRevenue = {};
    const courseRevenue = {};
    const gradeRevenue = {};
    const monthlyRevenue = {};

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.courseId === cls.courseId);
      const teacherId = cls.teacherId || (course ? course.teacherId : null);
      const teacher = teachers.find(t => t.teacherId === teacherId);
      
      if (teacher) {
        if (!teacherRevenue[teacher.teacherId]) {
          teacherRevenue[teacher.teacherId] = {
            name: teacher.name,
            amount: 0
          };
        }
        teacherRevenue[teacher.teacherId].amount += cls.price;
      }

      if (course) {
        const courseId = String(course.courseId);
        if (!courseRevenue[courseId]) {
          const grade = course.grade || '未知年級';
          const subject = course.subject || '未知科目';
          const teacher = teachers.find(t => t.teacherId === course.teacherId);
          const teacherName = teacher ? teacher.name : '未知教師';
          const courseName = `${courseId}-${grade}${subject}`;
          courseRevenue[courseId] = {
            name: courseName,
            fullName: `${courseName}（${teacherName}）`,
            amount: 0
          };
        }
        courseRevenue[courseId].amount += cls.price;
      }

      if (course && course.grade) {
        if (!gradeRevenue[course.grade]) {
          gradeRevenue[course.grade] = {
            name: course.grade,
            amount: 0
          };
        }
        gradeRevenue[course.grade].amount += cls.price;
      }

      const classDate = new Date(cls.date);
      const monthKey = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${classDate.getFullYear()}年${classDate.getMonth() + 1}月`;
      
      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = {
          month: monthLabel,
          amount: 0
        };
      }
      monthlyRevenue[monthKey].amount += cls.price;
    });
    
    const total = Object.values(teacherRevenue).reduce((sum, item) => sum + item.amount, 0);
    
    const sortedMonthlyRevenue = Object.values(monthlyRevenue)
      .sort((a, b) => {
        const aYear = parseInt(a.month.split('年')[0]);
        const aMonth = parseInt(a.month.split('年')[1].split('月')[0]);
        const bYear = parseInt(b.month.split('年')[0]);
        const bMonth = parseInt(b.month.split('年')[1].split('月')[0]);
        
        if (aYear !== bYear) return aYear - bYear;
        return aMonth - bMonth;
      });
    
    setOverviewData({
      teacherRevenue: Object.values(teacherRevenue),
      courseRevenue: Object.values(courseRevenue).sort((a, b) => b.amount - a.amount).slice(0, 8),
      gradeRevenue: Object.values(gradeRevenue),
      monthlyRevenue: sortedMonthlyRevenue
    });
    
    setTotalAmount(total);
  }, [classes, selectedYear, selectedOverviewMonths, courses, teachers]);

  useEffect(() => {
    if (activeTab === 'student') {
      calculateStudentData();
    } else if (activeTab === 'teacher') {
      calculateTeacherData();
    } else if (activeTab === 'daily') {
      calculateDailyData();
    } else if (activeTab === 'overview') {
      calculateOverviewData();
    }
  }, [
    activeTab,
    selectedStudent,
    selectedMonth,
    selectedTeacher,
    selectedTeacherMonth,
    startDate,
    endDate,
    selectedOverviewMonths,
    selectedYear,
    classes,
    students,
    teachers,
    courses,
    calculateDailyData,
    calculateOverviewData,
    calculateStudentData,
    calculateTeacherData
  ]);

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 簡化版本 - 先確保基本渲染正常
  if (loading) {
    return (
      <div className="revenue-statistics">
        {testRender}
        <div className="loading">載入中...</div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>正在從 {config.API_URL} 獲取數據...</p>
          <p>如果這個頁面消失，說明有問題！</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="revenue-statistics">
        {testRender}
        <div className="error-message" style={{ 
          padding: '20px', 
          textAlign: 'center', 
          color: 'red',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h3>錯誤</h3>
          <p>{error}</p>
          <p><strong>重要：</strong> 組件應該保持可見，如果消失說明有嚴重問題！</p>
          <button onClick={fetchData} style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}>
            重試
          </button>
        </div>
      </div>
    );
  }

  console.log('組件渲染，當前標籤頁:', activeTab);
  console.log('數據狀態:', {
    students: students.length,
    teachers: teachers.length,
    classes: classes.length,
    courses: courses.length
  });

  // 添加一個永遠顯示的調試區域
  const debugInfo = (
    <div style={{ 
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: '#4caf50',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999,
      fontSize: '12px',
      maxWidth: '300px'
    }}>
      <strong>🔍 實時調試信息</strong><br/>
      路徑: {location.pathname}<br/>
      標籤頁: {activeTab}<br/>
      載入: {loading ? '是' : '否'}<br/>
      錯誤: {error ? '是' : '否'}<br/>
      學生: {students.length}<br/>
      教師: {teachers.length}<br/>
      課堂: {classes.length}<br/>
      課程: {courses.length}
    </div>
  );

  // 創建一個永遠顯示的內容區域，即使API調用失敗也不會消失
  const safeContent = (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#fff3cd', 
      margin: '20px',
      border: '2px solid #ffc107',
      borderRadius: '10px'
    }}>
      <h2>🛡️ 安全內容區域</h2>
      <p>這個區域應該永遠可見，即使有錯誤也不會消失！</p>
      <p>當前時間: {new Date().toLocaleString()}</p>
      <p>組件狀態: {loading ? '載入中' : error ? '有錯誤' : '正常'}</p>
    </div>
  );

  return (
    <div className="revenue-statistics">
      {/* 測試渲染 - 確保組件可見 */}
      {testRender}
      
      {/* 實時調試信息 */}
      {debugInfo}
      
      {/* 安全內容區域 - 永遠可見 */}
      {safeContent}
      
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#e3f2fd', 
        marginBottom: '20px', 
        borderRadius: '5px',
        border: '2px solid #2196f3'
      }}>
        <h2>🔧 調試信息</h2>
        <p><strong>當前路徑:</strong> {location.pathname}</p>
        <p><strong>當前標籤頁:</strong> {activeTab}</p>
        <p><strong>載入狀態:</strong> {loading ? '載入中...' : '載入完成'}</p>
        <p><strong>錯誤狀態:</strong> {error ? error : '無錯誤'}</p>
        <p><strong>API URL:</strong> {config.API_URL}</p>
        <p><strong>數據狀態:</strong> 學生: {students.length}, 教師: {teachers.length}, 課堂: {classes.length}, 課程: {courses.length}</p>
        <p><strong>重要提示:</strong> 如果這個區域消失，請檢查控制台錯誤！</p>
      </div>
      
      <div className="tabs">
        <button 
          className={activeTab === 'student' ? 'active' : ''} 
          onClick={() => setActiveTab('student')}
        >
          學生課堂明細
        </button>
        <button 
          className={activeTab === 'teacher' ? 'active' : ''} 
          onClick={() => setActiveTab('teacher')}
        >
          教師課堂明細
        </button>
        <button 
          className={activeTab === 'daily' ? 'active' : ''} 
          onClick={() => setActiveTab('daily')}
        >
          每日營收
        </button>
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          營運概要
        </button>
      </div>

      {activeTab === 'student' && (
        <div className="tab-content">
          <h2>學生課堂明細</h2>
          <div className="filters">
            <div className="filter-group">
              <label>選擇學生：</label>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="搜尋學生..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  onFocus={() => setShowStudentDropdown(true)}
                />
                {showStudentDropdown && (
                  <div className="dropdown">
                    {getFilteredStudents().map(student => (
                      <div
                        key={student.studentId}
                        className="dropdown-item"
                        onClick={() => {
                          setSelectedStudent(student.studentId);
                          setStudentSearch(student.nameZh || student.nameEn);
                          setShowStudentDropdown(false);
                        }}
                      >
                        {student.nameZh || student.nameEn}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="filter-group">
              <label>選擇月份：</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="">全部月份</option>
                {generateMonthOptionsWithAll()}
              </select>
            </div>
          </div>
          
          {studentData.length > 0 && (
            <div className="data-summary">
              <h3>總計：{formatCurrency(totalAmount)}</h3>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>學生</th>
                      <th>課程</th>
                      <th>教師</th>
                      <th>金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentData.map((item, index) => (
                      <tr key={index}>
                        <td>{formatDate(item.date)}</td>
                        <td>{item.studentName}</td>
                        <td>{item.courseName}</td>
                        <td>{item.teacherName}</td>
                        <td>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'teacher' && (
        <div className="tab-content">
          <h2>教師課堂明細</h2>
          <div className="filters">
            <div className="filter-group">
              <label>選擇教師：</label>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="搜尋教師..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  onFocus={() => setShowTeacherDropdown(true)}
                />
                {showTeacherDropdown && (
                  <div className="dropdown">
                    {getFilteredTeachers().map(teacher => (
                      <div
                        key={teacher.teacherId}
                        className="dropdown-item"
                        onClick={() => {
                          setSelectedTeacher(teacher.teacherId);
                          setTeacherSearch(teacher.name);
                          setShowTeacherDropdown(false);
                        }}
                      >
                        {teacher.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="filter-group">
              <label>選擇月份：</label>
              <select
                value={selectedTeacherMonth}
                onChange={(e) => setSelectedTeacherMonth(e.target.value)}
              >
                <option value="">全部月份</option>
                {generateMonthOptions()}
              </select>
            </div>
          </div>
          
          {teacherData.length > 0 && (
            <div className="data-summary">
              <h3>總計：{formatCurrency(totalAmount)}</h3>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>教師</th>
                      <th>課程</th>
                      <th>學生</th>
                      <th>金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherData.map((item, index) => (
                      <tr key={index}>
                        <td>{formatDate(item.date)}</td>
                        <td>{item.teacherName}</td>
                        <td>{item.courseName}</td>
                        <td>{item.studentName}</td>
                        <td>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'daily' && (
        <div className="tab-content">
          <h2>每日營收</h2>
          <div className="filters">
            <div className="filter-group">
              <label>開始日期：</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>結束日期：</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          
          {dailyData.length > 0 && (
            <div className="data-summary">
              <h3>總計：{formatCurrency(totalAmount)}</h3>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>課堂數量</th>
                      <th>總金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyData.map((item, index) => (
                      <tr key={index}>
                        <td>{formatDate(item.date)}</td>
                        <td>{item.classCount}</td>
                        <td>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="tab-content">
          <h2>營運概要</h2>
          <div className="filters">
            <div className="filter-group">
              <label>選擇年份：</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">全部年份</option>
                {generateYearOptions()}
              </select>
            </div>
            <div className="filter-group">
              <label>選擇月份：</label>
              <select
                multiple
                value={selectedOverviewMonths}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setSelectedOverviewMonths(values);
                }}
              >
                {generateMonthOptions()}
              </select>
            </div>
          </div>
          
          <div className="overview-tabs">
            <button
              className={selectedListTab === 'teacher' ? 'active' : ''}
              onClick={() => setSelectedListTab('teacher')}
            >
              教師營收
            </button>
            <button
              className={selectedListTab === 'course' ? 'active' : ''}
              onClick={() => setSelectedListTab('course')}
            >
              課程營收
            </button>
            <button
              className={selectedListTab === 'grade' ? 'active' : ''}
              onClick={() => setSelectedListTab('grade')}
            >
              年級營收
            </button>
            <button
              className={selectedListTab === 'monthly' ? 'active' : ''}
              onClick={() => setSelectedListTab('monthly')}
            >
              月度營收
            </button>
          </div>
          
          {selectedListTab === 'teacher' && overviewData.teacherRevenue.length > 0 && (
            <div className="data-summary">
              <h3>教師營收統計</h3>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>教師</th>
                      <th>營收金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.teacherRevenue.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {selectedListTab === 'course' && overviewData.courseRevenue.length > 0 && (
            <div className="data-summary">
              <h3>課程營收統計</h3>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>課程</th>
                      <th>營收金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.courseRevenue.map((item, index) => (
                      <tr key={index}>
                        <td>{item.fullName}</td>
                        <td>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {selectedListTab === 'grade' && overviewData.gradeRevenue.length > 0 && (
            <div className="data-summary">
              <h3>年級營收統計</h3>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>年級</th>
                      <th>營收金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.gradeRevenue.map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {selectedListTab === 'monthly' && overviewData.monthlyRevenue.length > 0 && (
            <div className="data-summary">
              <h3>月度營收統計</h3>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>月份</th>
                      <th>營收金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.monthlyRevenue.map((item, index) => (
                      <tr key={index}>
                        <td>{item.month}</td>
                        <td>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RevenueStatistics;