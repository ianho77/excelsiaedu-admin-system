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
  console.log('🚀 RevenueStatistics 組件開始渲染');
  console.log('🚀 當前路徑 (pathname):', location.pathname);
  console.log('🚀 當前hash:', location.hash);
  console.log('📍 組件渲染時間:', new Date().toISOString());
  
  // 根據URL參數決定默認標籤頁 - 修復HashRouter路徑問題
  const getDefaultTab = useCallback(() => {
    const hash = location.hash;
    console.log('getDefaultTab 被調用，hash:', hash);
    if (hash.includes('/revenue-teacher')) return 'teacher';
    if (hash.includes('/revenue-daily')) return 'daily';
    if (hash.includes('/revenue-overview')) return 'overview';
    if (hash.includes('/revenue-student')) return 'student';
    return 'overview'; // 默認返回營運概要
  }, [location.hash]);
  
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

  // 新增 useEffect 來監聽 URL 變化並更新 activeTab
  useEffect(() => {
    const defaultTab = getDefaultTab();
    console.log('設置默認標籤頁:', defaultTab);
    setActiveTab(defaultTab);
  }, [getDefaultTab]);

  useEffect(() => {
    fetchData();
  }, []); // 只在組件掛載時執行一次

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

    const data = filteredData.map(cls => {
      const student = students.find(s => s.studentId === cls.studentId);
      const course = courses.find(c => c.courseId === cls.courseId);
      const teacher = teachers.find(t => t.teacherId === cls.teacherId);
      
      return {
        date: cls.date,
        studentName: student ? (student.nameZh || student.nameEn) : '未知學生',
        courseName: course ? `${course.grade}${course.subject}` : '未知課程',
        teacherName: teacher ? (teacher.nameZh || teacher.nameEn) : '未知教師',
        amount: cls.price
      };
    });

    setStudentData(data);
    setTotalAmount(data.reduce((sum, item) => sum + item.amount, 0));
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
        amount: cls.price
      };
    });

    setTeacherData(data);
    setTotalAmount(data.reduce((sum, item) => sum + item.amount, 0));
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
      dailyRevenue[date] += cls.price;
    });

    const data = Object.entries(dailyRevenue).map(([date, amount]) => ({
      date,
      amount
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    setDailyData(data);
    setTotalAmount(data.reduce((sum, item) => sum + item.amount, 0));
  }, [classes, startDate, endDate]);

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
        const classMonth = `${classDate.getFullYear()}-${String(classDate.getMonth() + 1).padStart(2, '0')}`;
        return selectedOverviewMonths.includes(classMonth);
      });
    }

    const teacherRevenue = {};
    const courseRevenue = {};
    const gradeRevenue = {};
    const monthlyRevenue = {};

    filteredClasses.forEach(cls => {
      const teacher = teachers.find(t => t.teacherId === cls.teacherId);
      const course = courses.find(c => c.courseId === cls.courseId);
      
      if (teacher) {
        if (!teacherRevenue[teacher.teacherId]) {
          teacherRevenue[teacher.teacherId] = {
            name: teacher.nameZh || teacher.nameEn,
            amount: 0
          };
        }
        teacherRevenue[teacher.teacherId].amount += cls.price;
      }

      if (course) {
        if (!courseRevenue[course.courseId]) {
          const teacher = teachers.find(t => t.teacherId === cls.teacherId);
          const teacherName = teacher ? (teacher.nameZh || teacher.nameEn) : '未知教師';
          const courseName = `${course.courseId}-${course.grade}${course.subject}`;
          courseRevenue[course.courseId] = {
            name: courseName,
            fullName: `${courseName}（${teacherName}）`,
            amount: 0
          };
        }
        courseRevenue[course.courseId].amount += cls.price;
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

  const fetchData = async () => {
    console.log('🔄 fetchData 開始執行');
    setLoading(true);
    setError(null); // 重置錯誤狀態
    console.log('開始獲取數據，API URL:', config.API_URL);
    
    try {
      console.log('📡 發送API請求...');
      const [studentsRes, teachersRes, classesRes, coursesRes] = await Promise.all([
        fetch(`${config.API_URL}/students`),
        fetch(`${config.API_URL}/teachers`),
        fetch(`${config.API_URL}/classes`),
        fetch(`${config.API_URL}/courses`)
      ]);

      console.log('📊 API響應狀態:', {
        students: studentsRes.status,
        teachers: teachersRes.status,
        classes: classesRes.status,
        courses: coursesRes.status
      });

      // 檢查響應狀態
      if (!studentsRes.ok || !teachersRes.ok || !classesRes.ok || !coursesRes.ok) {
        throw new Error(`API響應錯誤: students(${studentsRes.status}), teachers(${teachersRes.status}), classes(${classesRes.status}), courses(${coursesRes.status})`);
      }

      console.log('📥 開始解析JSON數據...');
      const studentsData = await studentsRes.json();
      const teachersData = await teachersRes.json();
      const classesData = await classesRes.json();
      const coursesData = await coursesRes.json();

      console.log('✅ 獲取到的數據:', {
        students: studentsData.length,
        teachers: teachersData.length,
        classes: classesData.length,
        courses: coursesData.length
      });

      console.log('🔄 開始更新狀態...');
      setStudents(studentsData);
      setTeachers(teachersData);
      setClasses(classesData);
      setCourses(coursesData);
      
      console.log('✅ 狀態更新完成');
    } catch (error) {
      console.error('❌ 獲取數據失敗:', error);
      setError(`獲取數據失敗: ${error.message}`);
    } finally {
      console.log('🏁 fetchData 執行完成，設置 loading 為 false');
      setLoading(false);
    }
  };

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
      const name = (student.nameZh || student.nameEn || '').toLowerCase();
      return name.includes(studentSearch.toLowerCase());
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
      {/* 調試信息區域 */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#e3f2fd', 
        marginBottom: '20px', 
        borderRadius: '5px',
        border: '2px solid #2196f3'
      }}>
        <h2>🔧 調試信息</h2>
        <p><strong>當前路徑 (pathname):</strong> {location.pathname}</p>
        <p><strong>當前Hash:</strong> {location.hash}</p>
        <p><strong>當前標籤頁:</strong> {activeTab}</p>
        <p><strong>載入狀態:</strong> {loading ? '載入中...' : '載入完成'}</p>
        <p><strong>錯誤狀態:</strong> {error ? error : '無錯誤'}</p>
        <p><strong>API URL:</strong> {config.API_URL}</p>
        <p><strong>數據狀態:</strong> 學生: {students ? students.length : '未定義'}, 教師: {teachers ? teachers.length : '未定義'}, 課堂: {classes ? classes.length : '未定義'}, 課程: {courses ? courses.length : '未定義'}</p>
      </div>
      
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

      {/* 標籤頁 */}
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

      {/* 學生課堂明細內容 */}
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

      {/* 教師課堂明細內容 */}
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
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                  setSelectedOverviewMonths(selectedOptions);
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