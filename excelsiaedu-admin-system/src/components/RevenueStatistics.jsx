import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import './RevenueStatistics.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const RevenueStatistics = () => {
  const location = useLocation();
  
  // 根據URL參數決定默認標籤頁
  const getDefaultTab = () => {
    const path = location.pathname;
    if (path.includes('/revenue-teacher')) return 'teacher';
    if (path.includes('/revenue-daily')) return 'daily';
    if (path.includes('/revenue-overview')) return 'overview';
    if (path.includes('/revenue-student')) return 'student';
    return 'student'; // 默認返回學生明細
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());

  // 新增 useEffect 來監聽 URL 變化並更新 activeTab
  useEffect(() => {
    setActiveTab(getDefaultTab());
  }, [location.pathname]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
  const [selectedListTab, setSelectedListTab] = useState('teacher'); // 新增：列表切換狀態
  const [overviewData, setOverviewData] = useState({
    teacherRevenue: [],
    courseRevenue: [],
    gradeRevenue: []
  });

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

  // 處理月份選擇
  const handleMonthSelection = (monthValue) => {
    if (monthValue === 'all') {
      // 如果選擇「全部月份」
      const allMonths = generateMonthOptionsWithAll()
        .filter(month => month.value !== 'all')
        .map(month => month.value);
      
      // 檢查是否所有月份都已選中
      const isAllSelected = allMonths.every(month => selectedOverviewMonths.includes(month));
      
      if (isAllSelected) {
        // 如果所有月份都已選中，則取消選中所有月份
        setSelectedOverviewMonths([]);
      } else {
        // 否則選中所有月份
        setSelectedOverviewMonths(allMonths);
      }
    } else {
      // 如果選擇個別月份
      setSelectedOverviewMonths(prev => {
        if (prev.includes(monthValue)) {
          // 如果已經選中，則取消選中
          return prev.filter(m => m !== monthValue);
        } else {
          // 如果未選中，則添加到選中列表
          return [...prev, monthValue];
        }
      });
    }
  };

  // 獲取已選擇月份的顯示文字
  const getSelectedMonthsDisplay = () => {
    if (selectedOverviewMonths.length === 0) return '';
    if (selectedOverviewMonths.includes('all')) return '全部月份';
    
    const selectedLabels = selectedOverviewMonths.map(monthValue => {
      const month = generateMonthOptionsWithAll().find(m => m.value === monthValue);
      return month ? month.label : monthValue;
    });
    
    if (selectedLabels.length <= 2) {
      return selectedLabels.join(', ');
    } else {
      return `${selectedLabels[0]} 等 ${selectedLabels.length} 個月`;
    }
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



  useEffect(() => {
    fetchData();
  }, []);

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
  }, [activeTab, selectedStudent, selectedMonth, selectedTeacher, selectedTeacherMonth, startDate, endDate, selectedOverviewMonths, selectedYear, classes, students, teachers, courses]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, teachersRes, classesRes, coursesRes] = await Promise.all([
        fetch('http://localhost:4000/api/students'),
        fetch('http://localhost:4000/api/teachers'),
        fetch('http://localhost:4000/api/classes'),
        fetch('http://localhost:4000/api/courses')
      ]);

      const studentsData = await studentsRes.json();
      const teachersData = await teachersRes.json();
      const classesData = await classesRes.json();
      const coursesData = await coursesRes.json();

      setStudents(studentsData);
      setTeachers(teachersData);
      setClasses(classesData);
      setCourses(coursesData);
    } catch (error) {
      console.error('獲取數據失敗:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const calculateStudentData = () => {
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
      // 嘗試從課程資料中獲取教師ID，如果課堂資料沒有 teacherId
      const teacherId = cls.teacherId || (course ? course.teacherId : null);
      const teacher = teachers.find(t => t.teacherId === teacherId);
      
      // 使用 studentId 查找學生
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

    // 按教師排序（第一優先度），然後按科目ID排序（第二優先度）
    const sortedStudentData = Object.values(groupedData).map(student => {
      // 對每個學生的課堂按教師和科目ID排序
      const sortedClasses = student.classes.sort((a, b) => {
        // 第一優先度：教師姓名（降序）
        const teacherCompare = b.teacher.localeCompare(a.teacher);
        
        if (teacherCompare !== 0) {
          return teacherCompare;
        }
        
        // 第二優先度：科目ID（降序）
        const aSubject = a.subject.replace(/^[中一二三四五六]/, '');
        const bSubject = b.subject.replace(/^[中一二三四五六]/, '');
        
        const aCourse = courses.find(c => c.subject === aSubject);
        const bCourse = courses.find(c => c.subject === bSubject);
        
        if (aCourse && bCourse) {
          return bCourse.courseId.localeCompare(aCourse.courseId);
        }
        
        // 如果找不到課程，按科目名稱排序（降序）
        return bSubject.localeCompare(aSubject);
      });
      
      return {
        ...student,
        classes: sortedClasses
      };
    });
    
    setStudentData(sortedStudentData);
    setTotalAmount(total);
  };

  const calculateTeacherData = () => {
    let filteredClasses = classes;

    // 教師篩選
    if (selectedTeacher) {
      filteredClasses = filteredClasses.filter(cls => {
        const course = courses.find(c => c.courseId === cls.courseId);
        const teacherId = cls.teacherId || (course ? course.teacherId : null);
        return String(teacherId) === String(selectedTeacher);
      });
    }

    // 月份篩選
    if (selectedTeacherMonth) {
      filteredClasses = filteredClasses.filter(cls => {
        const classDate = new Date(cls.date);
        const classMonth = `${classDate.getFullYear()}-${classDate.getMonth() + 1}`;
        return classMonth === selectedTeacherMonth;
      });
    }

    // 按教師分組
    const groupedData = {};
    let total = 0;

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.courseId === cls.courseId);
      // 嘗試從課程資料中獲取教師ID，如果課堂資料沒有 teacherId
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
        
        // 使用 studentId 查找學生
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

    // 按教師ID排序（第一優先度），然後按學生ID排序（第二優先度）
    const sortedTeacherData = Object.values(groupedData).sort((a, b) => {
      // 第一優先度：教師ID（升序）
      const teacherIdCompare = a.teacherId.localeCompare(b.teacherId);
      
      if (teacherIdCompare !== 0) {
        return teacherIdCompare;
      }
      
      // 第二優先度：學生ID（降序）
      const aFirstClass = a.classes[0];
      const bFirstClass = b.classes[0];
      
      if (aFirstClass && bFirstClass) {
        const aStudentId = aFirstClass.studentName.split(' - ')[0];
        const bStudentId = bFirstClass.studentName.split(' - ')[0];
        return bStudentId.localeCompare(aStudentId);
      }
      
      return 0;
    }).map(teacher => {
      // 對每個教師的課堂按學生ID和課程ID排序
      const sortedClasses = teacher.classes.sort((a, b) => {
        // 第一優先度：學生ID（降序）
        const aStudentId = a.studentName.split(' - ')[0];
        const bStudentId = b.studentName.split(' - ')[0];
        const studentIdCompare = bStudentId.localeCompare(aStudentId);
        
        if (studentIdCompare !== 0) {
          return studentIdCompare;
        }
        
        // 第二優先度：課程ID（降序）
        const aSubject = a.subject.replace(/^[中一二三四五六]/, '');
        const bSubject = b.subject.replace(/^[中一二三四五六]/, '');
        
        const aCourse = courses.find(c => c.subject === aSubject);
        const bCourse = courses.find(c => c.subject === bSubject);
        
        if (aCourse && bCourse) {
          return bCourse.courseId.localeCompare(aCourse.courseId);
        }
        
        // 如果找不到課程，按科目名稱排序（降序）
        return bSubject.localeCompare(aSubject);
      });
      
      return {
        ...teacher,
        classes: sortedClasses
      };
    });
    
    setTeacherData(sortedTeacherData);
    setTotalAmount(total);
  };

  const calculateDailyData = () => {
    let filteredClasses = classes;

    // 日期範圍篩選
    if (startDate && endDate) {
      filteredClasses = filteredClasses.filter(cls => {
        const classDate = new Date(cls.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // 重置時間部分，只比較日期
        classDate.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        return classDate >= start && classDate <= end;
      });
    }

    // 按日期分組，使用標準化的日期格式
    const groupedData = {};
    let total = 0;

    filteredClasses.forEach(cls => {
      const course = courses.find(c => c.courseId === cls.courseId);
      // 嘗試從課程資料中獲取教師ID，如果課堂資料沒有 teacherId
      const teacherId = cls.teacherId || (course ? course.teacherId : null);
      const teacher = teachers.find(t => t.teacherId === teacherId);
      
      // 標準化日期格式，確保同一天不會被分開
      const classDate = new Date(cls.date);
      const normalizedDate = `${classDate.getFullYear()}-${classDate.getMonth() + 1}-${classDate.getDate()}`;
      
      if (!groupedData[normalizedDate]) {
        groupedData[normalizedDate] = {
          date: normalizedDate,
          classes: []
        };
      }
      
      // 使用 studentId 查找學生
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

    // 按日期排序
    const sortedData = Object.values(groupedData).sort((a, b) => new Date(a.date) - new Date(b.date));
    setDailyData(sortedData);
    setTotalAmount(total);
  };

  const calculateOverviewData = () => {
    let filteredClasses = classes;

    // 年份篩選
    if (selectedYear) {
      filteredClasses = filteredClasses.filter(cls => {
        const classDate = new Date(cls.date);
        const classYear = classDate.getFullYear().toString();
        return classYear === selectedYear;
      });
    }

    // 月份篩選
    if (selectedOverviewMonths.length > 0) {
      // 如果選擇了「全部月份」，不進行月份篩選
      if (!selectedOverviewMonths.includes('all')) {
        filteredClasses = filteredClasses.filter(cls => {
          const classDate = new Date(cls.date);
          const classMonth = (classDate.getMonth() + 1).toString();
          return selectedOverviewMonths.includes(classMonth);
        });
      }
    }

    // 按教師統計營業額
    const teacherRevenue = {};
    const courseRevenue = {};
    const gradeRevenue = {};

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
        const courseId = String(course.courseId); // 確保課程ID是字符串
        if (!courseRevenue[courseId]) {
          const grade = course.grade || '未知年級';
          const subject = course.subject || '未知科目';
          const courseName = `${courseId}-${grade}${subject}`;
          courseRevenue[courseId] = {
            name: courseName,
            amount: 0
          };
        }
        courseRevenue[courseId].amount += cls.price;
      } else {
        // 如果找不到課程，使用課堂ID
        const fallbackId = String(cls.courseId || '未知課程'); // 確保是字符串
        if (!courseRevenue[fallbackId]) {
          courseRevenue[fallbackId] = {
            name: `課程ID: ${fallbackId}`,
            amount: 0
          };
        }
        courseRevenue[fallbackId].amount += cls.price;
      }

      if (course && course.grade) {
        if (!gradeRevenue[course.grade]) {
          gradeRevenue[course.grade] = {
            name: course.grade,
            amount: 0
          };
        }
        gradeRevenue[course.grade].amount += cls.price;
      } else if (course) {
        // 如果課程存在但沒有年級信息，歸類為「未知年級」
        if (!gradeRevenue['未知年級']) {
          gradeRevenue['未知年級'] = {
            name: '未知年級',
            amount: 0
          };
        }
        gradeRevenue['未知年級'].amount += cls.price;
      }
    });
    
    // 計算總金額
    const total = Object.values(teacherRevenue).reduce((sum, item) => sum + item.amount, 0);
    
    setOverviewData({
      teacherRevenue: Object.values(teacherRevenue),
      courseRevenue: Object.values(courseRevenue).sort((a, b) => b.amount - a.amount).slice(0, 8),
      gradeRevenue: Object.values(gradeRevenue)
    });
    
    setTotalAmount(total);
  };

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 生成餅圖數據
  const generatePieChartData = (data, title) => {
    // 確保數據是有效的
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderColor: [],
          borderWidth: 2
        }]
      };
    }
    
    // 過濾掉沒有名稱或名稱為undefined的數據
    const validData = data.filter(item => item && item.name && item.name !== 'undefined' && item.name !== undefined);
    
    if (validData.length === 0) {
      return {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderColor: [],
          borderWidth: 2
        }]
      };
    }
    
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ];

    return {
      labels: validData.map(item => item.name || '未知'),
      datasets: [{
        data: validData.map(item => item.amount),
        backgroundColor: colors.slice(0, validData.length),
        borderColor: colors.slice(0, validData.length).map(color => color + '80'),
        borderWidth: 2
      }]
    };
  };

  // 生成柱狀圖數據
  const generateBarChartData = (data, title) => {
    // 確保數據是有效的
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderColor: [],
          borderWidth: 1
        }]
      };
    }
    
    // 過濾掉沒有名稱或名稱為undefined的數據
    const validData = data.filter(item => item && item.name && item.name !== 'undefined' && item.name !== undefined);
    
    if (validData.length === 0) {
      return {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderColor: [],
          borderWidth: 1
        }]
      };
    }
    
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
    ];

    return {
      labels: validData.map(item => item.name || '未知'),
      datasets: [{
        label: '營業額',
        data: validData.map(item => item.amount),
        backgroundColor: colors.slice(0, validData.length),
        borderColor: colors.slice(0, validData.length).map(color => color + '80'),
        borderWidth: 1
      }]
    };
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed.y;
            return `${label}: $${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="revenue-statistics">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">載入中...</p>
        </div>
      </div>
    );
  }

  const exportToExcel = () => {
    // 格式化教師營業額數據
    const teacherTotal = overviewData.teacherRevenue.reduce((sum, item) => sum + item.amount, 0);
    const teacherData = overviewData.teacherRevenue.map(item => ({
      名稱: item.name,
      營業額: item.amount,
      比例: teacherTotal > 0 ? `${((item.amount / teacherTotal) * 100).toFixed(1)}%` : '0%'
    }));

    // 格式化課程營業額數據
    const courseTotal = overviewData.courseRevenue.reduce((sum, item) => sum + item.amount, 0);
    const courseData = overviewData.courseRevenue.map(item => ({
      名稱: item.name,
      營業額: item.amount,
      比例: courseTotal > 0 ? `${((item.amount / courseTotal) * 100).toFixed(1)}%` : '0%'
    }));

    // 格式化年級營業額數據
    const gradeTotal = overviewData.gradeRevenue.reduce((sum, item) => sum + item.amount, 0);
    const gradeData = overviewData.gradeRevenue.map(item => ({
      名稱: item.name,
      營業額: item.amount,
      比例: gradeTotal > 0 ? `${((item.amount / gradeTotal) * 100).toFixed(1)}%` : '0%'
    }));

    // 創建工作表
    const teacherWorksheet = XLSX.utils.json_to_sheet(teacherData);
    const courseWorksheet = XLSX.utils.json_to_sheet(courseData);
    const gradeWorksheet = XLSX.utils.json_to_sheet(gradeData);

    // 創建工作簿
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, teacherWorksheet, "老師營業額");
    XLSX.utils.book_append_sheet(workbook, courseWorksheet, "課程營業額");
    XLSX.utils.book_append_sheet(workbook, gradeWorksheet, "年級營業額");

    // 生成文件名（包含日期）
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const fileName = `營運概要_${dateStr}_${timeStr}.xlsx`;

    // 下載文件
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="revenue-statistics">
      <div className="revenue-header">
        <h2>
          {activeTab === 'student' && '學生課堂明細'}
          {activeTab === 'teacher' && '教師課堂明細'}
          {activeTab === 'daily' && '每日營收'}
          {activeTab === 'overview' && '營運概要'}
        </h2>
        <div className="total-amount">
          <span className="total-label">總金額：</span>
          <span className="total-value">{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      {/* 營運概要 */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="filter-section">
            <div className="filter-group">
              <label>年份：</label>
              <select 
                value={selectedYear} 
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedOverviewMonths([]); // 選擇年份時清空月份
                  // setMonthSearch(''); // This line was removed
                  // setShowMonthDropdown(false); // This line was removed
                }}
              >
                <option value="">全部年份</option>
                {generateYearOptions().map(year => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>月份：</label>
              <div className="month-options-container">
                {generateMonthOptionsWithAll().map(month => {
                       // 對於「全部月份」，檢查是否所有月份都已選中
                       const isAllSelected = month.value === 'all' ? 
                         generateMonthOptionsWithAll()
                           .filter(m => m.value !== 'all')
                           .every(m => selectedOverviewMonths.includes(m.value)) :
                         selectedOverviewMonths.includes(month.value);
                       
                       return (
                         <div 
                           key={month.value}
                           className={`month-option ${isAllSelected ? 'selected' : ''}`}
                           onClick={() => handleMonthSelection(month.value)}
                         >
                           <div 
                             className={`checkbox-square ${isAllSelected ? 'checked' : ''}`}
                             onClick={(e) => {
                               e.stopPropagation();
                               handleMonthSelection(month.value);
                             }}
                           >
                             {isAllSelected && '✓'}
                           </div>
                           <span>{month.label}</span>
                         </div>
                       );
                     })}
              </div>
            </div>
            <div className="filter-group">
              <button 
                className="export-button"
                onClick={exportToExcel}
                disabled={overviewData.teacherRevenue.length === 0 && overviewData.courseRevenue.length === 0 && overviewData.gradeRevenue.length === 0}
              >
                匯出Excel
              </button>
            </div>
          </div>

          <div className="overview-charts">
            <div className="chart-container">
              <h3>老師營業額比例</h3>
              <div className="chart-wrapper" style={{ height: '400px', overflowX: 'auto' }}>
                {overviewData.teacherRevenue.length > 0 ? (
                  <Bar data={generateBarChartData(overviewData.teacherRevenue, '老師營業額')} options={barChartOptions} />
                ) : (
                  <div className="no-data">無數據</div>
                )}
              </div>
            </div>

            <div className="chart-container">
              <h3>課程營業額比例</h3>
              <div className="chart-wrapper" style={{ height: '400px', overflowX: 'auto' }}>
                {overviewData.courseRevenue.length > 0 ? (
                  <Bar data={generateBarChartData(overviewData.courseRevenue, '課程營業額')} options={barChartOptions} />
                ) : (
                  <div className="no-data">無數據</div>
                )}
              </div>
            </div>

            <div className="chart-container">
              <h3>年級營業額比例</h3>
              <div className="chart-wrapper">
                {overviewData.gradeRevenue.length > 0 ? (
                  <Pie data={generatePieChartData(overviewData.gradeRevenue, '年級營業額')} options={pieChartOptions} />
                ) : (
                  <div className="no-data">無數據</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 列表顯示區域 */}
      {activeTab === 'overview' && (
        <div className="list-section">
          <div className="list-tab-container">
            <button 
              className={`list-tab-button ${selectedListTab === 'teacher' ? 'active' : ''}`}
              onClick={() => setSelectedListTab('teacher')}
            >
              教師列表
            </button>
            <button 
              className={`list-tab-button ${selectedListTab === 'course' ? 'active' : ''}`}
              onClick={() => setSelectedListTab('course')}
            >
              課程列表
            </button>
            <button 
              className={`list-tab-button ${selectedListTab === 'grade' ? 'active' : ''}`}
              onClick={() => setSelectedListTab('grade')}
            >
              年級列表
            </button>
          </div>

          <div className="list-content">
            {/* 教師列表 */}
            {selectedListTab === 'teacher' && (
              <div className="list-table-container">
                <table className="list-table">
                  <thead>
                    <tr>
                      <th>教師名稱</th>
                      <th>營業額</th>
                      <th>比例</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.teacherRevenue.map((item, index) => {
                      const total = overviewData.teacherRevenue.reduce((sum, i) => sum + i.amount, 0);
                      const percentage = total > 0 ? ((item.amount / total) * 100).toFixed(1) : '0';
                      return (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td>{formatCurrency(item.amount)}</td>
                          <td>{percentage}%</td>
                        </tr>
                      );
                    })}
                    <tr className="total-row">
                      <td>總計</td>
                      <td>{formatCurrency(overviewData.teacherRevenue.reduce((sum, item) => sum + item.amount, 0))}</td>
                      <td>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* 課程列表 */}
            {selectedListTab === 'course' && (
              <div className="list-table-container">
                <table className="list-table">
                  <thead>
                    <tr>
                      <th>課程名稱</th>
                      <th>營業額</th>
                      <th>比例</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.courseRevenue.map((item, index) => {
                      const total = overviewData.courseRevenue.reduce((sum, i) => sum + i.amount, 0);
                      const percentage = total > 0 ? ((item.amount / total) * 100).toFixed(1) : '0';
                      return (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td>{formatCurrency(item.amount)}</td>
                          <td>{percentage}%</td>
                        </tr>
                      );
                    })}
                    <tr className="total-row">
                      <td>總計</td>
                      <td>{formatCurrency(overviewData.courseRevenue.reduce((sum, item) => sum + item.amount, 0))}</td>
                      <td>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* 年級列表 */}
            {selectedListTab === 'grade' && (
              <div className="list-table-container">
                <table className="list-table">
                  <thead>
                    <tr>
                      <th>年級</th>
                      <th>營業額</th>
                      <th>比例</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.gradeRevenue.map((item, index) => {
                      const total = overviewData.gradeRevenue.reduce((sum, i) => sum + i.amount, 0);
                      const percentage = total > 0 ? ((item.amount / total) * 100).toFixed(1) : '0';
                      return (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td>{formatCurrency(item.amount)}</td>
                          <td>{percentage}%</td>
                        </tr>
                      );
                    })}
                    <tr className="total-row">
                      <td>總計</td>
                      <td>{formatCurrency(overviewData.gradeRevenue.reduce((sum, item) => sum + item.amount, 0))}</td>
                      <td>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 學生課堂明細 */}
      {activeTab === 'student' && (
        <div className="tab-content">
          <div className="filter-section">
            <div className="filter-group">
              <label>學生：</label>
              <div className="search-dropdown">
                <input
                  type="text"
                  placeholder="搜尋學生..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowStudentDropdown(true);
                  }}
                  onFocus={() => setShowStudentDropdown(true)}
                />
                {showStudentDropdown && (
                  <div className="dropdown-options">
                    <div 
                      className="dropdown-option"
                      onClick={() => {
                        setSelectedStudent('');
                        setStudentSearch('');
                        setShowStudentDropdown(false);
                      }}
                    >
                      全部學生
                    </div>
                    {getFilteredStudents().map(student => (
                      <div 
                        key={student.studentId}
                        className="dropdown-option"
                        onClick={() => {
                          setSelectedStudent(student.studentId);
                          setStudentSearch(`${student.studentId} - ${student.nameZh} (${student.nameEn})`);
                          setShowStudentDropdown(false);
                        }}
                      >
                        {student.studentId} - {student.nameZh} ({student.nameEn})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="filter-group">
              <label>月份：</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="">全部月份</option>
                {generateMonthOptions().map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="data-table">
            {studentData.map(student => (
              <div key={student.studentId} className="student-section">
                <div className="section-header">
                  <h3>{student.studentId} - {student.studentName}</h3>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>科目</th>
                        <th>教師</th>
                        <th>日期</th>
                        <th>金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.classes.map((cls, index) => (
                        <tr key={index}>
                          <td>{cls.subject}</td>
                          <td>{cls.teacher}</td>
                          <td>{formatDate(cls.date)}</td>
                          <td>{formatCurrency(cls.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="section-total">
                  <strong>合計：{formatCurrency(student.classes.reduce((sum, cls) => sum + cls.amount, 0))}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 教師課堂明細 */}
      {activeTab === 'teacher' && (
        <div className="tab-content">
          <div className="filter-section">
            <div className="filter-group">
              <label>教師：</label>
              <div className="search-dropdown">
                <input
                  type="text"
                  placeholder="搜尋教師..."
                  value={teacherSearch}
                  onChange={(e) => {
                    setTeacherSearch(e.target.value);
                    setShowTeacherDropdown(true);
                  }}
                  onFocus={() => setShowTeacherDropdown(true)}
                />
                {showTeacherDropdown && (
                  <div className="dropdown-options">
                    <div 
                      className="dropdown-option"
                      onClick={() => {
                        setSelectedTeacher('');
                        setTeacherSearch('');
                        setShowTeacherDropdown(false);
                      }}
                    >
                      全部教師
                    </div>
                    {getFilteredTeachers().map(teacher => (
                      <div 
                        key={teacher.teacherId}
                        className="dropdown-option"
                        onClick={() => {
                          setSelectedTeacher(teacher.teacherId);
                          setTeacherSearch(`${teacher.teacherId} - ${teacher.name}`);
                          setShowTeacherDropdown(false);
                        }}
                      >
                        {teacher.teacherId} - {teacher.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="filter-group">
              <label>月份：</label>
              <select 
                value={selectedTeacherMonth} 
                onChange={(e) => setSelectedTeacherMonth(e.target.value)}
              >
                <option value="">全部月份</option>
                {generateMonthOptions().map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="data-table">
            {teacherData.map(teacher => (
              <div key={teacher.teacherId} className="teacher-section">
                <div className="section-header">
                  <h3>{teacher.teacherId} - {teacher.teacherName}</h3>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>學生名稱</th>
                        <th>科目</th>
                        <th>日期</th>
                        <th>金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacher.classes.map((cls, index) => (
                        <tr key={index}>
                          <td>{cls.studentName}</td>
                          <td>{cls.subject}</td>
                          <td>{formatDate(cls.date)}</td>
                          <td>{formatCurrency(cls.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="section-total">
                  <strong>合計：{formatCurrency(teacher.classes.reduce((sum, cls) => sum + cls.amount, 0))}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 每日營收 */}
      {activeTab === 'daily' && (
        <div className="tab-content">
          <div className="filter-section">
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

          <div className="data-table">
            {dailyData.map(day => (
              <div key={day.date} className="daily-section">
                <div className="section-header">
                  <h3>{formatDate(day.date)}</h3>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>教師</th>
                        <th>學生名稱</th>
                        <th>科目</th>
                        <th>金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.classes.map((cls, index) => (
                        <tr key={index}>
                          <td>{cls.teacher}</td>
                          <td>{cls.studentName}</td>
                          <td>{cls.subject}</td>
                          <td>{formatCurrency(cls.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="section-total">
                  <strong>合計：{formatCurrency(day.classes.reduce((sum, cls) => sum + cls.amount, 0))}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueStatistics; 