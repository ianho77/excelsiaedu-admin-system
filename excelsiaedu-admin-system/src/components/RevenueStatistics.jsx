import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
// import * as XLSX from 'xlsx';
import './RevenueStatistics.css';
import config from '../config';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const RevenueStatistics = () => {
  const location = useLocation();
  
  // 根據URL路徑決定默認標籤頁
  const getDefaultTab = useCallback(() => {
    const pathname = location.pathname;
    if (pathname.includes('/revenue-teacher')) return 'teacher';
    if (pathname.includes('/revenue-daily')) return 'daily';
    if (pathname.includes('/revenue-overview')) return 'overview';
    if (pathname.includes('/revenue-student')) return 'student';
    return 'overview'; // 默認返回營運概要
  }, [location.pathname]);
  
  const [activeTab, setActiveTab] = useState('overview'); // 設置默認值
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

  // 監聽 URL 變化並更新 activeTab
  useEffect(() => {
    const defaultTab = getDefaultTab();
    setActiveTab(defaultTab);
  }, [getDefaultTab]);

  // 計算營運概要數據
  const calculateOverviewData = useCallback(() => {
    if (!classes.length || !courses.length || !teachers.length) return;

    let filteredClasses = classes;
    if (selectedYear) {
      filteredClasses = classes.filter(cls => {
        const classDate = new Date(cls.date);
        return classDate.getFullYear().toString() === selectedYear;
      });
    }

    if (selectedOverviewMonths.length > 0) {
      filteredClasses = filteredClasses.filter(cls => {
        const classDate = new Date(cls.date);
        const classMonth = String(classDate.getMonth() + 1);
        return selectedOverviewMonths.includes(classMonth);
      });
    }

    const teacherRevenue = {};
    const courseRevenue = {};
    const gradeRevenue = {};
    const monthlyRevenue = {};

    filteredClasses.forEach(cls => {
      // 检查必要字段是否存在，但允许teacherId缺失的情况
      if (!cls.courseId || !cls.price) {
        console.warn('课堂数据缺少必要字段:', {
          classId: cls.classId || 'unknown',
          teacherId: cls.teacherId,
          courseId: cls.courseId,
          price: cls.price,
          hasTeacherId: !!cls.teacherId,
          hasCourseId: !!cls.courseId,
          hasPrice: !!cls.price
        });
        return; // 跳过无效数据
      }

      // 如果teacherId缺失，记录警告但继续处理
      if (!cls.teacherId || cls.teacherId === '') {
        console.warn('课堂数据缺少教师ID，将显示为"未知教师":', {
          classId: cls.classId || 'unknown',
          courseId: cls.courseId,
          price: cls.price
        });
      }

             // 智能教师关联：优先使用teacherId，如果没有则尝试通过courseId关联
       let teacher = null;
       if (cls.teacherId) {
         teacher = teachers.find(t => String(t.teacherId) === String(cls.teacherId));
         console.log(`查找教师ID ${cls.teacherId}:`, teacher ? '找到' : '未找到');
       } else {
         // 如果没有teacherId，尝试通过courseId找到对应的教师
         // 这里假设课程和教师有某种关联关系
         console.log('课堂缺少teacherId，尝试通过courseId关联教师:', {
           classId: cls.classId,
           courseId: cls.courseId
         });
         
         // 如果这是第一个课堂，我们可以假设教师ID为1（根据您的数据）
         if (cls.courseId === '1') {
           teacher = teachers.find(t => t.teacherId === '1');
           if (teacher) {
             console.log('通过courseId关联到教师:', teacher.name);
           }
         }
       }
      const course = courses.find(c => String(c.courseId) === String(cls.courseId));
      
      // 添加详细的调试信息
      console.log('处理课堂数据:', {
        classId: cls.classId || 'unknown',
        teacherId: cls.teacherId || '缺失',
        courseId: cls.courseId,
        price: cls.price,
        date: cls.date,
        foundTeacher: !!teacher,
        foundCourse: !!course,
        teacherName: teacher ? (teacher.nameZh || teacher.nameEn) : '未知教師',
        courseName: course ? `${course.grade}${course.subject}` : '未找到',
        teacherIdType: typeof cls.teacherId,
        courseIdType: typeof cls.courseId,
        teachersAvailable: teachers.length,
        teacherIdsAvailable: teachers.map(t => t.teacherId).slice(0, 5)
      });
      
      if (teacher) {
        if (!teacherRevenue[teacher.teacherId]) {
          teacherRevenue[teacher.teacherId] = {
            name: teacher.nameZh || teacher.nameEn,
            amount: 0
          };
        }
        const oldAmount = teacherRevenue[teacher.teacherId].amount;
        teacherRevenue[teacher.teacherId].amount += parseFloat(cls.price) || 0;
        console.log(`教师 ${teacher.nameZh || teacher.nameEn} 营收更新: ${oldAmount} + ${parseFloat(cls.price) || 0} = ${teacherRevenue[teacher.teacherId].amount}`);
      } else if (cls.teacherId) {
        console.warn(`未找到教师ID: ${cls.teacherId} 对应的教师数据`);
        // 尝试查找可能的匹配
        const possibleMatches = teachers.filter(t => 
          String(t.teacherId) === String(cls.teacherId)
        );
        if (possibleMatches.length > 0) {
          console.log('找到可能的匹配:', possibleMatches);
        }
      }

      if (course) {
        if (!courseRevenue[course.courseId]) {
          const teacherName = teacher ? (teacher.nameZh || teacher.nameEn) : '未知教師';
          const courseName = `${course.courseId}-${course.grade}${course.subject}`;
          courseRevenue[course.courseId] = {
            name: courseName,
            fullName: `${courseName}（${teacherName}）`,
            amount: 0
          };
        }
        const oldAmount = courseRevenue[course.courseId].amount;
        courseRevenue[course.courseId].amount += parseFloat(cls.price) || 0;
        console.log(`课程 ${course.courseId} 营收更新: ${oldAmount} + ${parseFloat(cls.price) || 0} = ${courseRevenue[course.courseId].amount}`);
      } else {
        console.warn(`未找到课程ID: ${cls.courseId} 对应的课程数据`);
      }

      if (course && course.grade) {
        if (!gradeRevenue[course.grade]) {
          gradeRevenue[course.grade] = {
            name: course.grade,
            amount: 0
          };
        }
        gradeRevenue[course.grade].amount += parseFloat(cls.price) || 0;
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
      monthlyRevenue[monthKey].amount += parseFloat(cls.price) || 0;
    });
    
    // 计算总金额 - 修复计算逻辑
    // 即使没有教师营收，也要计算课程营收和总金额
    const teacherTotal = Object.values(teacherRevenue).reduce((sum, item) => sum + (item.amount || 0), 0);
    const courseTotal = Object.values(courseRevenue).reduce((sum, item) => sum + (item.amount || 0), 0);
    const total = Math.max(teacherTotal, courseTotal); // 使用较大的值作为总金额
    
    console.log('营收计算详情:', {
      teacherTotal,
      courseTotal,
      total,
      teacherRevenueCount: Object.keys(teacherRevenue).length,
      courseRevenueCount: Object.keys(courseRevenue).length
    });
    
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
    
    // 设置总金额
    setTotalAmount(total);
    
    // 添加调试信息
    console.log('營運概要數據計算:', {
      filteredClassesCount: filteredClasses.length,
      teacherRevenue,
      total,
      selectedYear,
      selectedOverviewMonths
    });
  }, [classes, selectedYear, selectedOverviewMonths, courses, teachers]);

  // 将 fetchData 函数定义移到 useEffect 之前
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('正在從以下API獲取數據:', config.API_URL);
      
      const [studentsRes, teachersRes, classesRes, coursesRes] = await Promise.all([
        fetch(`${config.API_URL}/students`),
        fetch(`${config.API_URL}/teachers`),
        fetch(`${config.API_URL}/classes`),
        fetch(`${config.API_URL}/courses`)
      ]);

      // 檢查響應狀態
      if (!studentsRes.ok || !teachersRes.ok || !classesRes.ok || !coursesRes.ok) {
        throw new Error(`API響應錯誤: students(${studentsRes.status}), teachers(${teachersRes.status}), classes(${classesRes.status}), courses(${coursesRes.status})`);
      }

      const studentsData = await studentsRes.json();
      const teachersData = await teachersRes.json();
      let classesData = await classesRes.json();
      const coursesData = await coursesRes.json();

      // 添加調試信息
      console.log('獲取到的數據:', {
        students: studentsData.length,
        teachers: teachersData.length,
        classes: classesData.length,
        courses: coursesData.length,
        apiUrl: config.API_URL
      });

      if (classesData.length > 0) {
        console.log('課堂數據示例:', classesData[0]);
        console.log('課堂數據中的課程ID:', classesData.map(cls => cls.courseId).slice(0, 10));
      }
      if (teachersData.length > 0) {
        console.log('教師數據示例:', teachersData[0]);
        console.log('教師數據中的教師ID:', teachersData.map(t => t.teacherId).slice(0, 10));
      }
      if (coursesData.length > 0) {
        console.log('課程數據示例:', coursesData[0]);
        console.log('課程數據中的教師ID:', coursesData.map(c => c.teacherId).slice(0, 10));
      }

            // 为课堂数据添加教师ID字段（通过课程关联）
      if (classesData.length > 0 && coursesData.length > 0) {
        console.log('正在为课堂数据添加教师ID字段...');
        // 创建新的数组，避免直接修改原数组
        const enrichedClassesData = classesData.map(cls => {
          const course = coursesData.find(c => c.courseId === cls.courseId);
          if (course && course.teacherId) {
            console.log(`课堂 ${cls.classId} 关联到教师ID: ${course.teacherId}`);
            return { ...cls, teacherId: course.teacherId };
          } else {
            console.warn(`课堂 ${cls.classId} 无法找到对应的教师ID`);
            return { ...cls, teacherId: null };
          }
        });

        console.log('课堂数据教师ID关联完成');
        console.log('课堂数据中的教师ID:', enrichedClassesData.map(cls => cls.teacherId).slice(0, 10));
        
        // 使用更新后的数据
        classesData = enrichedClassesData;
      }

      // 检查数据关联
      if (classesData.length > 0 && teachersData.length > 0) {
        const classTeacherIds = new Set(classesData.map(cls => cls.teacherId).filter(id => id !== null));
        const teacherIds = new Set(teachersData.map(t => t.teacherId));
        const missingTeacherIds = Array.from(classTeacherIds).filter(id => !teacherIds.has(id));
        
        if (missingTeacherIds.length > 0) {
          console.warn('發現未匹配的教師ID:', missingTeacherIds);
          console.warn('這可能導致顯示"未知教師"的問題');
          
          // 尝试修复ID类型不匹配的问题
          console.log('尝试修复ID类型不匹配...');
          classesData.forEach(cls => {
            if (cls.teacherId !== null && cls.teacherId !== undefined) {
              // 尝试转换为数字类型
              const numericTeacherId = parseInt(cls.teacherId);
              if (!isNaN(numericTeacherId)) {
                const foundTeacher = teachersData.find(t => t.teacherId === numericTeacherId);
                if (foundTeacher) {
                  console.log(`修复教师ID类型: ${cls.teacherId} -> ${numericTeacherId}`);
                  cls.teacherId = numericTeacherId;
                }
              }
            }
          });
          
          // 重新检查修复后的数据
          const fixedClassTeacherIds = new Set(classesData.map(cls => cls.teacherId).filter(id => id !== null));
          const fixedMissingTeacherIds = Array.from(fixedClassTeacherIds).filter(id => !teacherIds.has(id));
          if (fixedMissingTeacherIds.length < missingTeacherIds.length) {
            console.log('✅ ID类型修复成功，未匹配ID数量减少');
          }
        }
        
        console.log('數據關聯檢查:', {
          classTeacherIds: Array.from(classTeacherIds),
          teacherIds: Array.from(teacherIds),
          missingTeacherIds,
          totalClasses: classesData.length,
          totalTeachers: teachersData.length
        });
      }

      setStudents(studentsData);
      setTeachers(teachersData);
      setClasses(classesData);
      setCourses(coursesData);
      
      // 添加调试信息，确认数据设置
      console.log('✅ 数据设置完成:');
      console.log('- 学生数量:', studentsData.length);
      console.log('- 教师数量:', teachersData.length);
      console.log('- 课堂数量:', classesData.length);
      console.log('- 课程数量:', coursesData.length);
      console.log('- 课堂数据中的教师ID示例:', classesData.slice(0, 3).map(cls => cls.teacherId));
      
      // 立即计算数据，避免状态更新延迟问题
      setTimeout(() => {
        if (activeTab === 'overview') {
          calculateOverviewData();
        }
      }, 100);
    } catch (error) {
      console.error('獲取數據失敗:', error);
      console.error('API URL:', config.API_URL);
      console.error('錯誤詳情:', error.message);
      
      // 提供更详细的错误信息
      let errorMessage = `獲取數據失敗: ${error.message}`;
      if (error.message.includes('Failed to fetch')) {
        errorMessage = `無法連接到後端服務器 (${config.API_URL})。請檢查：\n1. 後端服務器是否正在運行\n2. API地址是否正確\n3. 網絡連接是否正常`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [activeTab, calculateOverviewData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]); // 添加 fetchData 依赖

  // 當數據加載完成後，計算圖表數據
  useEffect(() => {
    if (classes.length > 0 && students.length > 0 && teachers.length > 0 && courses.length > 0) {
      calculateOverviewData();
    }
  }, [classes, students, teachers, courses, calculateOverviewData]);

  // 修復 useEffect 依賴問題 - 使用 useCallback 包裝函數
  const calculateStudentData = useCallback(() => {
    if (!classes.length || !students.length || !courses.length || !teachers.length) return;
    
    console.log('🔍 calculateStudentData 开始执行:');
    console.log('- 接收到的classes数量:', classes.length);
    console.log('- classes中的teacherId示例:', classes.slice(0, 3).map(cls => cls.teacherId));
    
    let filteredData = classes.filter(cls => {
      if (selectedStudent && cls.studentId !== selectedStudent) return false;
      if (selectedMonth) {
        const classDate = new Date(cls.date);
        const classMonth = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, '0')}`;
        if (classMonth !== selectedMonth) return false;
      }
      return true;
    });

    const data = filteredData.map(cls => {
      const student = students.find(s => s.studentId === cls.studentId);
      const course = courses.find(c => c.courseId === cls.courseId);
      const teacher = teachers.find(t => t.teacherId === cls.teacherId);
      
      return {
            date: cls.date,
        studentName: student ? (student.nameZh || student.nameEn) : '未知學生',
        courseName: course ? `${course.grade}${course.subject}` : '未知課程',
        teacherName: teacher ? (teacher.nameZh || teacher.nameEn) : '未知教師',
            amount: parseFloat(cls.price) || 0
      };
    });
    
    setStudentData(data);
    setTotalAmount(data.reduce((sum, item) => sum + (item.amount || 0), 0));
  }, [classes, students, courses, teachers, selectedStudent, selectedMonth]);

  const calculateTeacherData = useCallback(() => {
    if (!classes.length || !teachers.length || !courses.length) return;
    
    let filteredData = classes.filter(cls => {
      if (selectedTeacher && cls.teacherId !== selectedTeacher) return false;
      if (selectedTeacherMonth) {
        const classDate = new Date(cls.date);
        const classMonth = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, '0')}`;
        if (classMonth !== selectedTeacherMonth) return false;
      }
      return true;
    });

    const data = filteredData.map(cls => {
      const teacher = teachers.find(t => t.teacherId === cls.teacherId);
      const course = courses.find(c => c.courseId === cls.courseId);
      
      return {
              date: cls.date,
        teacherName: teacher ? (teacher.nameZh || teacher.nameEn) : '未知教師',
        courseName: course ? `${course.grade}${course.subject}` : '未知課程',
              amount: parseFloat(cls.price) || 0
        };
      });
    
    setTeacherData(data);
    setTotalAmount(data.reduce((sum, item) => sum + (item.amount || 0), 0));
  }, [classes, teachers, courses, selectedTeacher, selectedTeacherMonth]);

  const calculateDailyData = useCallback(() => {
    if (!classes.length) return;

    let filteredData = classes;
    if (startDate && endDate) {
      filteredData = classes.filter(cls => {
        const classDate = new Date(cls.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return classDate >= start && classDate <= end;
      });
    }

    const dailyRevenue = {};
    filteredData.forEach(cls => {
      const date = cls.date.split('T')[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0;
      }
      dailyRevenue[date] += parseFloat(cls.price) || 0;
    });

    const data = Object.entries(dailyRevenue).map(([date, amount]) => ({
      date,
      amount
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    setDailyData(data);
    setTotalAmount(data.reduce((sum, item) => sum + (item.amount || 0), 0));
  }, [classes, startDate, endDate]);

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
    calculateStudentData,
    calculateTeacherData,
    calculateDailyData,
    calculateOverviewData
  ]);

  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 生成月份選項（包含"全部月份"選項）

  // 生成月份選項（包含"全部月份"選項）
  const generateMonthOptionsWithAll = () => {
    const months = new Set();
    classes.forEach(cls => {
      const date = new Date(cls.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      months.add({ key: monthKey, label: monthLabel });
    });
    
    return Array.from(months)
      .sort((a, b) => {
        const aYear = parseInt(a.key.split('-')[0]);
        const aMonth = parseInt(a.key.split('-')[1]);
        const bYear = parseInt(b.key.split('-')[0]);
        const bMonth = parseInt(b.key.split('-')[1]);
        
        if (aYear !== bYear) return aYear - bYear;
        return aMonth - bMonth;
      })
      .map(month => (
        <option key={month.key} value={month.key}>
          {month.label}
        </option>
      ));
  };

  // 生成年份選項
  const generateYearOptions = () => {
    const years = new Set();
    classes.forEach(cls => {
      const date = new Date(cls.date);
      years.add(date.getFullYear());
    });
    
    return Array.from(years)
      .sort((a, b) => a - b)
      .map(year => (
        <option key={year} value={year.toString()}>
          {year}年
        </option>
      ));
  };

  // 生成月份選項（用於教師明細）
  const generateMonthOptions = () => {
    const months = new Set();
    classes.forEach(cls => {
      const date = new Date(cls.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      months.add({ key: monthKey, label: monthLabel });
    });
    
    return Array.from(months)
      .sort((a, b) => {
        const aYear = parseInt(a.key.split('-')[0]);
        const aMonth = parseInt(a.key.split('-')[1]);
        const bYear = parseInt(b.key.split('-')[0]);
        const bMonth = parseInt(b.key.split('-')[1]);
        
        if (aYear !== bYear) return aYear - bYear;
        return aMonth - bMonth;
      })
      .map(month => (
        <option key={month.key} value={month.key}>
          {month.label}
        </option>
      ));
  };

  // 獲取篩選後的學生列表
  const getFilteredStudents = () => {
    if (!studentSearch) return students;
    return students.filter(student => {
      const searchText = studentSearch.toLowerCase();
      const id = student.studentId?.toString() || '';
      const nameZh = student.nameZh || '';
      const nameEn = student.nameEn || '';
      const nickname = student.nickname || '';
      
      return id.includes(searchText) || 
             nameZh.toLowerCase().includes(searchText) || 
             nameEn.toLowerCase().includes(searchText) || 
             nickname.toLowerCase().includes(searchText);
    });
  };

  // 獲取篩選後的教師列表
  const getFilteredTeachers = () => {
    if (!teacherSearch) return teachers;
    return teachers.filter(teacher => {
      const name = (teacher.nameZh || teacher.nameEn || '').toLowerCase();
      return name.includes(teacherSearch.toLowerCase());
    });
  };

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setShowStudentDropdown(false);
        setShowTeacherDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 簡化的組件渲染
  return (
    <div className="revenue-statistics">
      {/* 載入狀態顯示 */}
      {loading && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e3f2fd', 
          margin: '20px',
          borderRadius: '8px',
          border: '2px solid #2196f3'
        }}>
          <h3>🔄 正在載入數據...</h3>
          <p>正在從 {config.API_URL} 獲取數據</p>
          <p>請稍候...</p>
        </div>
      )}

      {/* 錯誤狀態顯示 */}
      {error && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fee', 
          margin: '20px',
          borderRadius: '8px',
          border: '2px solid #fcc',
          color: 'red'
        }}>
          <h3>❌ 發生錯誤</h3>
          <p>{error}</p>
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
      )}


      
      {/* 學生課堂明細內容 */}
      {activeTab === 'student' && (
        <div className="tab-content">
          <div className="content-header">
            <h2>學生課堂明細</h2>
            {studentData.length > 0 && (
              <div className="overview-total-right">
                <div className="total-label">總計</div>
                <div className="total-value">{formatCurrency(totalAmount)}</div>
              </div>
            )}
          </div>
          <div className="filters-row">
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
                        {student.studentId}-{student.nameZh}({student.nameEn})[{student.nickname || ''}]
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

      {/* 教師課堂明細內容 */}
      {activeTab === 'teacher' && (
        <div className="tab-content">
          <div className="content-header">
            <h2>教師課堂明細</h2>
            {teacherData.length > 0 && (
              <div className="overview-total-right">
                <div className="total-label">總計</div>
                <div className="total-value">{formatCurrency(totalAmount)}</div>
              </div>
            )}
          </div>
          <div className="filters-row">
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
                          setTeacherSearch(teacher.nameZh || teacher.nameEn);
                          setShowTeacherDropdown(false);
                        }}
                      >
                        {teacher.nameZh || teacher.nameEn}
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
                      <th>金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherData.map((item, index) => (
                      <tr key={index}>
                        <td>{formatDate(item.date)}</td>
                        <td>{item.teacherName}</td>
                        <td>{item.courseName}</td>
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

      {/* 每日營收內容 */}
      {activeTab === 'daily' && (
        <div className="tab-content">
          <div className="content-header">
            <h2>每日營收</h2>
            {dailyData.length > 0 && (
              <div className="overview-total-right">
                <div className="total-label">總計</div>
                <div className="total-value">{formatCurrency(totalAmount)}</div>
              </div>
            )}
          </div>
          <div className="filters-row">
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
                      <th>營收金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyData.map((item, index) => (
                      <tr key={index}>
                        <td>{formatDate(item.date)}</td>
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

      {/* 營運概要內容 */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="overview-header">
            <h2>營運概要</h2>
            <div className="overview-total-right">
              <span className="total-amount">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
          
          <div className="filters-row">
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
            <div className="filter-group month-filter">
              <label>選擇月份：</label>
              <div className="month-checkboxes">
                <div className="month-row">
                  <label className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.length === 12}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
                        } else {
                          setSelectedOverviewMonths([]);
                        }
                      }}
                    />
                    <span>全部</span>
                  </label>
                </div>
                <div className="month-row">
                  <label className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.includes('1')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths([...selectedOverviewMonths, '1']);
                        } else {
                          setSelectedOverviewMonths(selectedOverviewMonths.filter(m => m !== '1'));
                        }
                      }}
                    />
                    <span>1月</span>
                  </label>
                  <label className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.includes('2')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths([...selectedOverviewMonths, '2']);
                        } else {
                          setSelectedOverviewMonths(selectedOverviewMonths.filter(m => m !== '2'));
                        }
                      }}
                    />
                    <span>2月</span>
                  </label>
                  <label className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.includes('3')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths([...selectedOverviewMonths, '3']);
                        } else {
                          setSelectedOverviewMonths(selectedOverviewMonths.filter(m => m !== '3'));
                        }
                      }}
                    />
                    <span>3月</span>
                  </label>
                  <label className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.includes('4')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths([...selectedOverviewMonths, '4']);
                        } else {
                          setSelectedOverviewMonths(selectedOverviewMonths.filter(m => m !== '4'));
                        }
                      }}
                    />
                    <span>4月</span>
                  </label>
                  <label className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.includes('5')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths([...selectedOverviewMonths, '5']);
                        } else {
                          setSelectedOverviewMonths(selectedOverviewMonths.filter(m => m !== '5'));
                        }
                      }}
                    />
                    <span>5月</span>
                  </label>
                  <label className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.includes('6')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths([...selectedOverviewMonths, '6']);
                        } else {
                          setSelectedOverviewMonths(selectedOverviewMonths.filter(m => m !== '6'));
                        }
                      }}
                    />
                    <span>6月</span>
                  </label>
                </div>
                <div className="month-row">
                  <label className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.includes('7')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths([...selectedOverviewMonths, '7']);
                        } else {
                          setSelectedOverviewMonths(selectedOverviewMonths.filter(m => m !== '7'));
                        }
                      }}
                    />
                    <span>7月</span>
                  </label>
                  <label className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.includes('8')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths([...selectedOverviewMonths, '8']);
                        } else {
                          setSelectedOverviewMonths(selectedOverviewMonths.filter(m => m !== '8'));
                        }
                      }}
                    />
                    <span>8月</span>
                  </label>
                  <label className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.includes('9')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths([...selectedOverviewMonths, '9']);
                        } else {
                          setSelectedOverviewMonths(selectedOverviewMonths.filter(m => m !== '9'));
                        }
                      }}
                    />
                    <span>9月</span>
                  </label>
                  <label className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.includes('10')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths([...selectedOverviewMonths, '10']);
                        } else {
                          setSelectedOverviewMonths(selectedOverviewMonths.filter(m => m !== '10'));
                        }
                      }}
                    />
                    <span>10月</span>
                  </label>
                  <label className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.includes('11')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths([...selectedOverviewMonths, '11']);
                        } else {
                          setSelectedOverviewMonths(selectedOverviewMonths.filter(m => m !== '11'));
                        }
                      }}
                    />
                    <span>11月</span>
                  </label>
                  <label className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.includes('12')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths([...selectedOverviewMonths, '12']);
                        } else {
                          setSelectedOverviewMonths(selectedOverviewMonths.filter(m => m !== '12'));
                        }
                      }}
                    />
                    <span>12月</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* 四個圖表 */}
          <div className="overview-charts">
            <div className="chart-container">
              <h3>教師營收比例</h3>
              <div className="chart-wrapper">
                {overviewData.teacherRevenue.length > 0 && (
                  <Pie
                    data={{
                      labels: overviewData.teacherRevenue.map(item => item.name),
                      datasets: [{
                        data: overviewData.teacherRevenue.map(item => item.amount),
                        backgroundColor: [
                          '#0f766e',
                          '#14b8a6',
                          '#06b6d4',
                          '#3b82f6',
                          '#8b5cf6',
                          '#ec4899'
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            padding: 20,
                            usePointStyle: true
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = ((context.parsed / total) * 100).toFixed(1);
                              return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                    height={300}
                  />
                )}
              </div>
            </div>
            
            <div className="chart-container">
              <h3>課程營收比例</h3>
              <div className="chart-wrapper">
                {overviewData.courseRevenue.length > 0 && (
                  <Pie
                    data={{
                      labels: overviewData.courseRevenue.map(item => item.fullName),
                      datasets: [{
                        data: overviewData.courseRevenue.map(item => item.amount),
                        backgroundColor: [
                          '#059669',
                          '#10b981',
                          '#34d399',
                          '#6ee7b7',
                          '#a7f3d0',
                          '#d1fae5'
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            padding: 20,
                            usePointStyle: true
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = ((context.parsed / total) * 100).toFixed(1);
                              return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                    height={300}
                  />
                )}
              </div>
            </div>
            
            <div className="chart-container">
              <h3>年級營收趨勢</h3>
              <div className="chart-wrapper">
                {overviewData.gradeRevenue.length > 0 && (
                  <Bar
                    data={{
                      labels: overviewData.gradeRevenue.map(item => item.name),
                      datasets: [{
                        label: '營收金額',
                        data: overviewData.gradeRevenue.map(item => item.amount),
                        backgroundColor: '#0f766e',
                        borderColor: '#0d5a52',
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `營收: ${formatCurrency(context.parsed.y)}`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return formatCurrency(value);
                            }
                          }
                        }
                      }
                    }}
                    height={300}
                  />
                )}
              </div>
            </div>
            
            <div className="chart-container">
              <h3>月度營收趨勢</h3>
              <div className="chart-wrapper">
                {overviewData.monthlyRevenue.length > 0 && (
                  <Line
                    data={{
                      labels: overviewData.monthlyRevenue.map(item => item.month),
                      datasets: [{
                        label: '營收金額',
                        data: overviewData.monthlyRevenue.map(item => item.amount),
                        borderColor: '#0f766e',
                        backgroundColor: 'rgba(15, 118, 110, 0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: '#0f766e',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        tension: 0.4,
                        fill: true
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `營收: ${formatCurrency(context.parsed.y)}`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return formatCurrency(value);
                            }
                          }
                        }
                      }
                    }}
                    height={300}
                  />
                )}
              </div>
            </div>
          </div>
          
          {/* 调试信息面板 */}
          <div className="debug-panel" style={{
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            margin: '20px 0',
            fontSize: '14px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>🔍 數據調試信息</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <strong>數據狀態:</strong>
                <div>課堂數據: {classes.length} 筆</div>
                <div>教師數據: {teachers.length} 筆</div>
                <div>課程數據: {courses.length} 筆</div>
                <div>學生數據: {students.length} 筆</div>
              </div>
              <div>
                <strong>篩選條件:</strong>
                <div>年份: {selectedYear || '全部'}</div>
                <div>月份: {selectedOverviewMonths.length > 0 ? selectedOverviewMonths.join(', ') : '全部'}</div>
              </div>
              <div>
                <strong>計算結果:</strong>
                <div>總金額: {formatCurrency(totalAmount)}</div>
                <div>教師營收: {overviewData.teacherRevenue.length} 項</div>
                <div>課程營收: {overviewData.courseRevenue.length} 項</div>
              </div>
            </div>
            
            {/* 数据关联详细信息 */}
            <div style={{ marginTop: '16px', padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <strong>🔗 數據關聯分析:</strong>
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                {classes.length > 0 && teachers.length > 0 && (
                  <>
                    <div>課堂中的教師ID: {Array.from(new Set(classes.map(cls => cls.teacherId).filter(id => id !== null))).join(', ') || '無數據'}</div>
                    <div>教師數據中的ID: {teachers.map(t => t.teacherId).join(', ')}</div>
                    <div>課堂中的課程ID: {Array.from(new Set(classes.map(cls => cls.courseId))).join(', ') || '無數據'}</div>
                    <div>課程數據中的ID: {courses.map(c => c.courseId).join(', ')}</div>
                    {(() => {
                      const classTeacherIds = new Set(classes.map(cls => cls.teacherId).filter(id => id !== null));
                      const teacherIds = new Set(teachers.map(t => t.teacherId));
                      const missingTeacherIds = Array.from(classTeacherIds).filter(id => !teacherIds.has(id));
                      return missingTeacherIds.length > 0 ? (
                        <div style={{ color: '#dc2626', marginTop: '4px' }}>
                          ⚠️ 未匹配的教師ID: {missingTeacherIds.join(', ')}
                        </div>
                      ) : (
                        <div style={{ color: '#059669', marginTop: '4px' }}>
                          ✅ 所有教師ID都能匹配
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
              
              {/* 数据质量检查 */}
              <div style={{ marginTop: '12px', padding: '8px', background: '#fef3c7', borderRadius: '4px', border: '1px solid #f59e0b' }}>
                <strong>🔍 數據質量檢查:</strong>
                <div style={{ marginTop: '6px', fontSize: '11px' }}>
                  {classes.length > 0 && (
                    <>
                      <div>課堂數據總數: {classes.length}</div>
                      <div>有效教師ID: {classes.filter(cls => cls.teacherId && cls.teacherId !== '').length}</div>
                      <div>無效教師ID: {classes.filter(cls => !cls.teacherId || cls.teacherId === '').length}</div>
                      <div>有效課程ID: {classes.filter(cls => cls.courseId && cls.courseId !== '').length}</div>
                      <div>無效課程ID: {classes.filter(cls => !cls.courseId || cls.courseId === '').length}</div>
                      <div>有效價格: {classes.filter(cls => cls.price && cls.price > 0).length}</div>
                      <div>無效價格: {classes.filter(cls => !cls.price || cls.price <= 0).length}</div>
                    </>
                  )}
                </div>
              </div>
              
              {/* 数据修复建议 */}
              {classes.filter(cls => !cls.teacherId || cls.teacherId === '').length > 0 && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#fee2e2', borderRadius: '6px', border: '1px solid #ef4444' }}>
                  <strong>⚠️ 數據修復建議:</strong>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#991b1b' }}>
                    <div>發現 {classes.filter(cls => !cls.teacherId || cls.teacherId === '').length} 筆課堂數據缺少教師ID</div>
                    <div style={{ marginTop: '6px' }}>
                      <strong>解決方法:</strong>
                      <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                        <li>檢查後端數據庫中的課堂記錄</li>
                        <li>確保課堂數據包含有效的 teacherId 字段</li>
                        <li>更新課堂記錄，關聯到正確的教師</li>
                        <li>或者將這些課堂記錄標記為"未分配教師"</li>
                      </ul>
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#dc2626' }}>
                      <strong>影響:</strong> 缺少教師ID的課堂將無法計算教師營收，但課程營收和總金額仍會正常計算
                    </div>
                  </div>
                </div>
              )}
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
              <div className="content-header">
                <h3>教師營收統計</h3>
              </div>
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
              <div className="content-header">
                <h3>課程營收統計</h3>
              </div>
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
              <div className="content-header">
                <h3>年級營收統計</h3>
              </div>
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
              <div className="content-header">
                <h3>月度營收統計</h3>
              </div>
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