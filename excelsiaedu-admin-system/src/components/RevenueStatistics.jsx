import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import './RevenueStatistics.css';
import config from '../config';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

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
    setActiveTab(getDefaultTab());
  }, [location.pathname]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, teachersRes, classesRes, coursesRes] = await Promise.all([
        fetch(`${config.API_URL}/api/students`),
        fetch(`${config.API_URL}/api/teachers`),
        fetch(`${config.API_URL}/api/classes`),
        fetch(`${config.API_URL}/api/courses`)
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
  };

  // 計算教師數據
  const calculateTeacherData = () => {
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
  };

  // 計算每日數據
  const calculateDailyData = () => {
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
  };

  // 計算概覽數據
  const calculateOverviewData = () => {
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
  };

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
    courses
  ]);

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };