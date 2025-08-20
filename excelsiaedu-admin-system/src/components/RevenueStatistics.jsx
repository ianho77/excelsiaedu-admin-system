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
        return; // 跳过无效数据
      }

             // 直接使用已经关联好的教师信息
       let teacher = null;
       if (cls.teacherId && cls.teacherName) {
         // 如果已经有教师姓名，直接使用
         teacher = {
           teacherId: cls.teacherId,
           name: cls.teacherName
         };
       } else if (cls.teacherId) {
         // 如果没有教师姓名但有ID，尝试查找
         teacher = teachers.find(t => String(t.teacherId) === String(cls.teacherId));
       }
      const course = courses.find(c => String(c.courseId) === String(cls.courseId));
      

      
      if (teacher) {
        if (!teacherRevenue[teacher.teacherId]) {
          teacherRevenue[teacher.teacherId] = {
            name: teacher.name,
            amount: 0
          };
        }
        teacherRevenue[teacher.teacherId].amount += parseFloat(cls.price) || 0;
      }

      if (course) {
        if (!courseRevenue[course.courseId]) {
          const teacherName = teacher ? teacher.name : '未知教師';
          const courseName = `${course.courseId}-${course.grade}${course.subject}`;
          courseRevenue[course.courseId] = {
            name: courseName,
            fullName: `${courseName}（${teacherName}）`,
            amount: 0
          };
        }
        courseRevenue[course.courseId].amount += parseFloat(cls.price) || 0;
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
    

  }, [classes, selectedYear, selectedOverviewMonths, courses, teachers]);

  // 将 fetchData 函数定义移到 useEffect 之前
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {

      
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



            // 为课堂数据添加教师ID字段（通过课程关联）
      if (classesData.length > 0 && coursesData.length > 0) {
        // 创建新的数组，完成完整的教师关联（ID + 姓名）
        const enrichedClassesData = classesData.map(cls => {
          const course = coursesData.find(c => c.courseId === cls.courseId);
          if (course && course.teacherId) {
            // 通过teacherId找到教师信息
            const teacher = teachersData.find(t => String(t.teacherId) === String(course.teacherId));
            if (teacher) {
        return { 
          ...cls, 
          teacherId: course.teacherId,
          teacherName: teacher.name  // 直接添加教师姓名
        };
            } else {
              return { ...cls, teacherId: course.teacherId, teacherName: '未知教師' };
            }
          } else {
            return { ...cls, teacherId: null, teacherName: '未知教師' };
          }
        });
        
        // 使用更新后的数据
        classesData = enrichedClassesData;
      }

      // 检查数据关联
      if (classesData.length > 0 && teachersData.length > 0) {
        const classTeacherIds = new Set(classesData.map(cls => cls.teacherId).filter(id => id !== null));
        const teacherIds = new Set(teachersData.map(t => t.teacherId));
        const missingTeacherIds = Array.from(classTeacherIds).filter(id => !teacherIds.has(id));
        
        if (missingTeacherIds.length > 0) {
          // 尝试修复ID类型不匹配的问题
          classesData.forEach(cls => {
            if (cls.teacherId !== null && cls.teacherId !== undefined) {
              // 尝试转换为数字类型
              const numericTeacherId = parseInt(cls.teacherId);
              if (!isNaN(numericTeacherId)) {
                const foundTeacher = teachersData.find(t => t.teacherId === numericTeacherId);
                if (foundTeacher) {
                  cls.teacherId = numericTeacherId;
                }
              }
            }
          });
        }
      }

      setStudents(studentsData);
      setTeachers(teachersData);
      setClasses(classesData);
      setCourses(coursesData);
      

      

    } catch (error) {
      console.error('獲取數據失敗:', error);
      
      // 提供更详细的错误信息
      let errorMessage = `獲取數據失敗: ${error.message}`;
      if (error.message.includes('Failed to fetch')) {
        errorMessage = `無法連接到後端服務器 (${config.API_URL})。請檢查：\n1. 後端服務器是否正在運行\n2. API地址是否正確\n3. 網絡連接是否正常`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []); // 移除所有依赖，避免无限循环

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
    

    
    let filteredData = classes.filter(cls => {
      if (selectedStudent && cls.studentId !== selectedStudent) return false;
      if (selectedMonth) {
        const classDate = new Date(cls.date);
        const classMonth = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, '0')}`;
        if (classMonth !== selectedMonth) return false;
      }
      return true;
    });

    // 直接构建学生明细数据，不分组
    const studentDetails = [];
    filteredData.forEach(cls => {
      const student = students.find(s => s.studentId === cls.studentId);
      const course = courses.find(c => c.courseId === cls.courseId);
      // 优先使用已经关联好的教师信息，如果没有则尝试查找
      let teacherName = '未知教師';
      if (cls.teacherName) {
        teacherName = cls.teacherName;
      } else if (cls.teacherId) {
        const teacher = teachers.find(t => t.teacherId === cls.teacherId);
        teacherName = teacher ? teacher.name : '未知教師';
      }
      
      // 按照指定格式构建学生名称：id-中文名(英文名)[暱稱]
      let studentName = '未知學生';
      if (student) {
        const nameZh = student.nameZh || '';
        const nameEn = student.nameEn || '';
        const nickname = student.nickname || '';
        studentName = `${student.studentId}-${nameZh}${nameEn ? `(${nameEn})` : ''}${nickname ? `[${nickname}]` : ''}`;
      }
      
      studentDetails.push({
        studentName,
        courseName: course ? `${course.grade}${course.subject}` : '未知課程',
        teacherName: teacherName,
        date: cls.date,
        amount: parseFloat(cls.price) || 0
      });
    });
    
    // 按学生名称排序
    const sortedData = studentDetails.sort((a, b) => a.studentName.localeCompare(b.studentName));
    
    setStudentData(sortedData);
    setTotalAmount(sortedData.reduce((sum, item) => sum + item.amount, 0));
  }, [classes, students, courses, teachers, selectedStudent, selectedMonth]);

  const calculateTeacherData = useCallback(() => {
    if (!classes.length || !teachers.length || !courses.length || !students.length) return;
    
    let filteredData = classes.filter(cls => {
      if (selectedTeacher) {
        // 修复教师筛选逻辑：通过教师ID或教师姓名进行筛选
        const teacher = teachers.find(t => t.teacherId === selectedTeacher);
        if (teacher) {
          const teacherName = teacher.name || '';
          if (cls.teacherName !== teacherName && cls.teacherId !== selectedTeacher) {
            return false;
          }
        } else {
          return false;
        }
      }
      if (selectedTeacherMonth) {
        const classDate = new Date(cls.date);
        const classMonth = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, '0')}`;
        if (classMonth !== selectedTeacherMonth) return false;
      }
      return true;
    });

    // 直接构建教师明细数据，不分组
    const teacherDetails = [];
    filteredData.forEach(cls => {
      // 优先使用已经关联好的教师信息，如果没有则尝试查找
      let teacherName = '未知教師';
      let teacherId = '';
      if (cls.teacherName) {
        teacherName = cls.teacherName;
        // 尝试从教师数据中找到对应的ID
        const teacher = teachers.find(t => t.name === cls.teacherName);
        teacherId = teacher ? teacher.teacherId : '';
      } else if (cls.teacherId) {
        const teacher = teachers.find(t => t.teacherId === cls.teacherId);
        if (teacher) {
          teacherName = teacher.name;
          teacherId = teacher.teacherId;
        }
      }
      
      const course = courses.find(c => c.courseId === cls.courseId);
      const student = students.find(s => s.studentId === cls.studentId);
      
      // 按照指定格式构建学生名称：id-中文名(英文名)[暱稱]
      let studentName = '未知學生';
      if (student) {
        const nameZh = student.nameZh || '';
        const nameEn = student.nameEn || '';
        const nickname = student.nickname || '';
        studentName = `${student.studentId}-${nameZh}${nameEn ? `(${nameEn})` : ''}${nickname ? `[${nickname}]` : ''}`;
      }
      
      teacherDetails.push({
        teacherName: teacherId ? `${teacherId}-${teacherName}` : teacherName,
        courseName: course ? `${course.grade}${course.subject}` : '未知課程',
        studentName,
        date: cls.date,
        amount: parseFloat(cls.price) || 0
      });
    });
    
    // 按教师名称排序
    const sortedData = teacherDetails.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
    
    setTeacherData(sortedData);
    setTotalAmount(sortedData.reduce((sum, item) => sum + item.amount, 0));
  }, [classes, teachers, courses, students, selectedTeacher, selectedTeacherMonth]);

  const calculateDailyData = useCallback(() => {
    if (!classes.length || !students.length || !teachers.length || !courses.length) return;

    let filteredData = classes;
    if (startDate && endDate) {
      filteredData = classes.filter(cls => {
        const classDate = new Date(cls.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return classDate >= start && classDate <= end;
      });
    }

    // 直接构建每日营收数据，不分组
    const dailyDetails = [];
    filteredData.forEach(cls => {
      // 获取学生、教师、课程信息
      const student = students.find(s => s.studentId === cls.studentId);
      const course = courses.find(c => c.courseId === cls.courseId);
      let teacherName = '未知教師';
      if (cls.teacherName) {
        teacherName = cls.teacherName;
      } else if (cls.teacherId) {
        const teacher = teachers.find(t => t.teacherId === cls.teacherId);
        teacherName = teacher ? teacher.name : '未知教師';
      }
      
      // 按照指定格式构建学生名称：id-中文名(英文名)[暱稱]
      let studentName = '未知學生';
      if (student) {
        const nameZh = student.nameZh || '';
        const nameEn = student.nameEn || '';
        const nickname = student.nickname || '';
        studentName = `${student.studentId}-${nameZh}${nameEn ? `(${nameEn})` : ''}${nickname ? `[${nickname}]` : ''}`;
      }
      
      dailyDetails.push({
        date: cls.date,
        teacherName,
        studentName,
        courseName: course ? `${course.grade}${course.subject}` : '未知課程',
        amount: parseFloat(cls.price) || 0
      });
    });

    // 按日期排序
    const sortedData = dailyDetails.sort((a, b) => new Date(a.date) - new Date(b.date));

    setDailyData(sortedData);
    setTotalAmount(sortedData.reduce((sum, item) => sum + item.amount, 0));
  }, [classes, students, teachers, courses, startDate, endDate]);

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
    const monthMap = new Map(); // 使用 Map 來避免重複
    classes.forEach(cls => {
      const date = new Date(cls.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      monthMap.set(monthKey, monthLabel); // 使用 key 作為 Map 的鍵，自動去重
    });
    
    return Array.from(monthMap.entries())
      .sort(([aKey], [bKey]) => {
        const [aYear, aMonth] = aKey.split('-').map(Number);
        const [bYear, bMonth] = bKey.split('-').map(Number);
        
        if (aYear !== bYear) return aYear - bYear;
        return aMonth - bMonth;
      })
      .map(([key, label]) => (
        <option key={key} value={key}>
          {label}
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
    const monthMap = new Map(); // 使用 Map 來避免重複
    classes.forEach(cls => {
      const date = new Date(cls.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      monthMap.set(monthKey, monthLabel); // 使用 key 作為 Map 的鍵，自動去重
    });
    
    return Array.from(monthMap.entries())
      .sort(([aKey], [bKey]) => {
        const [aYear, aMonth] = aKey.split('-').map(Number);
        const [bYear, bMonth] = bKey.split('-').map(Number);
        
        if (aYear !== bYear) return aYear - bYear;
        return aMonth - bMonth;
      })
      .map(([key, label]) => (
        <option key={key} value={key}>
          {label}
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
      const searchText = teacherSearch.toLowerCase();
      const teacherId = (teacher.teacherId || '').toString();
      const name = (teacher.name || '').toLowerCase();
      
      return teacherId.includes(searchText) || name.includes(searchText);
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
            <h2>學生</h2>
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
              {/* 按学生分组显示 */}
              {(() => {
                // 按学生分组数据
                const groupedByStudent = {};
                studentData.forEach(item => {
                  const studentId = item.studentName.split('-')[0]; // 提取学生ID
                  if (!groupedByStudent[studentId]) {
                    groupedByStudent[studentId] = [];
                  }
                  groupedByStudent[studentId].push(item);
                });

                return Object.entries(groupedByStudent).map(([studentId, items]) => {
                  const student = students.find(s => s.studentId === studentId);
                  const studentName = student ? `${student.nameZh}${student.nameEn ? `(${student.nameEn})` : ''}${student.nickname ? `[${student.nickname}]` : ''}` : '未知學生';
                  const studentTotal = items.reduce((sum, item) => sum + item.amount, 0);
                  
                  return (
                    <div key={studentId} className="student-section">
                      <div className="compact-table">
                        <table>
                          <thead>
                            <tr className="student-header-row">
                              <th colSpan="4" className="student-header">
                                {studentId} - {studentName}
                              </th>
                            </tr>
                            <tr className="subtitle-row">
                              <th>科目</th>
                              <th>教師</th>
                              <th>日期</th>
                              <th>金額</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                                <td className="course-cell">{item.courseName}</td>
                                <td className="teacher-cell">{item.teacherName}</td>
                                <td className="date-cell">{formatDate(item.date)}</td>
                                <td className="amount-cell">{formatCurrency(item.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan="3" className="total-label">合計</td>
                              <td className="total-amount">{formatCurrency(studentTotal)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* 教師課堂明細內容 */}
      {activeTab === 'teacher' && (
        <div className="tab-content">
          <div className="content-header">
            <h2>教師</h2>
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
              {/* 按教師分組顯示 */}
              {(() => {
                // 按教師分組數據
                const groupedByTeacher = {};
                teacherData.forEach(item => {
                  // 從教師名稱中提取ID作為分組鍵
                  const teacherId = item.teacherName.split('-')[0]; // 提取教師ID
                  if (!groupedByTeacher[teacherId]) {
                    groupedByTeacher[teacherId] = [];
                  }
                  groupedByTeacher[teacherId].push(item);
                });

                return Object.entries(groupedByTeacher).map(([teacherId, items]) => {
                  // 從第一個項目中獲取完整的教師名稱顯示
                  const firstItem = items[0];
                  const displayTeacherName = firstItem.teacherName;
                  const teacherTotal = items.reduce((sum, item) => sum + item.amount, 0);
                  
                  return (
                    <div key={teacherId} className="teacher-section">
                      <div className="compact-table">
                        <table>
                          <thead>
                            <tr className="teacher-header-row">
                              <th colSpan="4" className="teacher-header">
                                {displayTeacherName}
                              </th>
                            </tr>
                            <tr className="subtitle-row">
                              <th>科目</th>
                              <th>學生</th>
                              <th>日期</th>
                              <th>金額</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                                <td className="course-cell">{item.courseName}</td>
                                <td className="student-cell">{item.studentName}</td>
                                <td className="date-cell">{formatDate(item.date)}</td>
                                <td className="amount-cell">{formatCurrency(item.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan="3" className="total-label">合計</td>
                              <td className="total-amount">{formatCurrency(teacherTotal)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                });
              })()}
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
              {/* 按日期分組顯示 */}
              {(() => {
                // 按日期分組數據
                const groupedByDate = {};
                dailyData.forEach(item => {
                  const dateKey = item.date; // 使用日期作為分組鍵
                  if (!groupedByDate[dateKey]) {
                    groupedByDate[dateKey] = [];
                  }
                  groupedByDate[dateKey].push(item);
                });

                return Object.entries(groupedByDate).map(([dateKey, items]) => {
                  const dateTotal = items.reduce((sum, item) => sum + item.amount, 0);
                  
                  return (
                    <div key={dateKey} className="daily-section">
                      <div className="compact-table">
                        <table>
                          <thead>
                            <tr className="daily-header-row">
                              <th colSpan="4" className="daily-header">
                                {formatDate(dateKey)}
                              </th>
                            </tr>
                            <tr className="subtitle-row">
                              <th>教師</th>
                              <th>學生</th>
                              <th>科目</th>
                              <th>金額</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                                <td className="teacher-cell">{item.teacherName}</td>
                                <td className="student-cell">{item.studentName}</td>
                                <td className="course-cell">{item.courseName}</td>
                                <td className="amount-cell">{formatCurrency(item.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan="3" className="total-label">合計</td>
                              <td className="total-amount">{formatCurrency(dateTotal)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                });
              })()}
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