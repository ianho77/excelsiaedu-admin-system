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
    fetchData();
  }, []); // 只在組件掛載時執行一次

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
      const classesData = await classesRes.json();
      const coursesData = await coursesRes.json();

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
          <div className="section-header">
            <h2>學生課堂明細</h2>
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
          <div className="section-header">
            <h2>教師課堂明細</h2>
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
          <div className="section-header">
            <h2>每日營收</h2>
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
          <div className="section-header">
            <h2>營運概要</h2>
          </div>
          
          {/* 總計金額顯示在上方 */}
          <div className="overview-total">
            <h3>總計金額: <span className="total-amount">{formatCurrency(totalAmount)}</span></h3>
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
            <div className="filter-group">
              <label>選擇月份：</label>
              <div className="month-checkboxes">
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
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                  <label key={month} className="month-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedOverviewMonths.includes(month.toString())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOverviewMonths([...selectedOverviewMonths, month.toString()]);
                        } else {
                          setSelectedOverviewMonths(selectedOverviewMonths.filter(m => m !== month.toString()));
                        }
                      }}
                    />
                    <span>{month}月</span>
                  </label>
                ))}
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
              <div className="section-header">
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
              <div className="section-header">
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
              <div className="section-header">
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
              <div className="section-header">
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