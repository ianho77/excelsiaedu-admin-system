import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Papa from 'papaparse';
import config from './config';
import ConfirmModal from './components/ConfirmModal';
import EditModal from './components/EditModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import BillingSystem from './components/BillingSystem';
import TeacherBillingSystem from './components/TeacherBillingSystem';
import RevenueStatistics from './components/RevenueStatistics';
import LoginPage from './components/LoginPage';
// import MonthlyStatement from './components/MonthlyStatement';
import UserManagement from './components/UserManagement';
import CostManagement from './components/CostManagement';
import './App.css';

function Sidebar({ userType }) {
  // const location = useLocation();
  const [isRevenueDropdownOpen, setIsRevenueDropdownOpen] = React.useState(false);

  const toggleRevenueDropdown = () => {
    setIsRevenueDropdownOpen(!isRevenueDropdownOpen);
  };

  return (
    <nav>
      <ul>
        {/* 教師和管理員都可以看到主要資料頁面 */}
        <li><Link to="/classes" className="nav-link">課堂</Link></li>
        <li><Link to="/add-group" className="nav-link">群組</Link></li>
        <li><Link to="/courses" className="nav-link">課程</Link></li>
        <li><Link to="/students" className="nav-link">學生</Link></li>
        <li><Link to="/teachers" className="nav-link">教師</Link></li>

        {/* 只有管理員可以看到賬單系統 */}
        {userType === 'admin' && (
          <li>
            <Link to="/billing-system" className="nav-link">
              賬單系統
            </Link>
          </li>
        )}

        {/* 只有管理員可以看到營收統計 */}
        {userType === 'admin' && (
          <li>
            <div className="dropdown-container">
              <button className="dropdown-button" onClick={toggleRevenueDropdown}>
                營收統計
                <span className={`dropdown-arrow ${isRevenueDropdownOpen ? 'rotated' : ''}`}>▶</span>
              </button>
              {isRevenueDropdownOpen && (
                <ul className="dropdown-menu">
                  <li><Link to="/revenue-overview">營運概要</Link></li>
                  <li><Link to="/revenue-teacher">教師明細</Link></li>
                  <li><Link to="/revenue-student">學生明細</Link></li>
                  <li><Link to="/revenue-daily">每日營收</Link></li>
                </ul>
              )}
            </div>
          </li>
        )}

        {/* 只有管理員可以看到營運成本管理 */}
        {userType === 'admin' && (
          <li>
            <Link to="/cost-management" className="nav-link">
              營運成本管理
            </Link>
          </li>
        )}

        {/* 只有管理員可以看到用戶管理 */}
        {userType === 'admin' && (
          <li>
            <Link to="/user-management" className="nav-link">
              用戶管理
            </Link>
          </li>
        )}

      </ul>
    </nav>
  );
}

function BillingPage({ initialTab = 'student' }) {
  const [activeTab, setActiveTab] = React.useState(initialTab);

  const billingTabSwitch = (
    <div className="mode-toggle">
      <button
        type="button"
        className={activeTab === 'student' ? 'active' : ''}
        onClick={() => setActiveTab('student')}
      >
        學生
      </button>
      <button
        type="button"
        className={activeTab === 'teacher' ? 'active' : ''}
        onClick={() => setActiveTab('teacher')}
      >
        教師
      </button>
    </div>
  );

  return (
    <div>
      {activeTab === 'student'
        ? <BillingSystem tabSwitch={billingTabSwitch} />
        : <TeacherBillingSystem tabSwitch={billingTabSwitch} />}
    </div>
  );
}

function ClassPage({ initialTab = 'add' }) {
  const [activeTab, setActiveTab] = React.useState(initialTab);

  return (
    <div>
      <div className="page-tab-header">
        <h1>課堂</h1>
        <div className="mode-toggle">
          <button
            type="button"
            className={activeTab === 'add' ? 'active' : ''}
            onClick={() => setActiveTab('add')}
          >
            新增
          </button>
          <button
            type="button"
            className={activeTab === 'manage' ? 'active' : ''}
            onClick={() => setActiveTab('manage')}
          >
            管理
          </button>
        </div>
      </div>
      {activeTab === 'add' ? <AddClass embedded /> : <ClassList embedded />}
    </div>
  );
}

function AddClass({ embedded = false }) {
  const [form, setForm] = React.useState({
    courseId: '',
    price: '',
    studentCount: '',
    studentNames: [],
    dateCount: '',
    dates: []
  });
  const [students, setStudents] = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [teachers, setTeachers] = React.useState([]);
  const [groups, setGroups] = React.useState([]);
  // const [classes, setClasses] = React.useState([]);
  const [studentFilters, setStudentFilters] = React.useState([]);
  const [studentCountError, setStudentCountError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [courseFilter, setCourseFilter] = React.useState('');
  const [courseDisplay, setCourseDisplay] = React.useState('');
  const [csvLoading, setCsvLoading] = React.useState(false);
  const [csvMessage, setCsvMessage] = React.useState('');
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [confirmData, setConfirmData] = React.useState(null);
  const [formErrors, setFormErrors] = React.useState({
    courseId: '',
    price: '',
    studentCount: '',
    studentNames: [],
    dateCount: '',
    dates: []
  });
  // 新增：課程選擇的鍵盤導航狀態
  const [selectedCourseIndex, setSelectedCourseIndex] = React.useState(-1);
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = React.useState(false);
  // 新增：課程下拉選單的 ref
  const courseDropdownRef = React.useRef(null);
  // 新增：學生選擇的鍵盤導航狀態
  const [selectedStudentIndices, setSelectedStudentIndices] = React.useState({});
  const [isStudentDropdownsOpen, setIsStudentDropdownsOpen] = React.useState({});
  // 新增：學生下拉選單的 refs
  const studentDropdownRefs = React.useRef({});

  React.useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [studentsRes, coursesRes, teachersRes, groupsRes] = await Promise.all([
        fetch(`${config.API_URL}/students`),
        fetch(`${config.API_URL}/courses`),
        fetch(`${config.API_URL}/teachers`),
        fetch(`${config.API_URL}/groups`)
      ]);

      const studentsData = await studentsRes.json();
      const coursesData = await coursesRes.json();
      const teachersData = await teachersRes.json();
      const groupsData = await groupsRes.json();

      setStudents(studentsData);
      setCourses(coursesData);
      setTeachers(teachersData);
      setGroups(groupsData);
    } catch (error) {
      console.error('獲取數據失敗:', error);
    }
  };

  // 產生課程下拉選單
  // const courseOptions = courses.map(c => ({ value: c.id, label: `${c.id} - ${c.subject}` }));

  // 產生學生下拉選單（每個輸入框都可篩選）
  // const getFilteredStudents = (filter) => {
  //   if (!filter) return students;
  //   return students.filter(s =>
  //     s.id.toString().includes(filter) ||
  //     s.nameZh.includes(filter) ||
  //     s.nameEn.toLowerCase().includes(filter.toLowerCase())
  //   );
  // };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'studentCount') {
      // 只接受正整數或空字串，且最大20
      let count = value === '' ? '' : value.replace(/[^0-9]/g, '');
      if (count !== '' && Number(count) > 20) {
        count = '20';
        setStudentCountError('學生人數上限為20');
      } else {
        setStudentCountError('');
      }
      setForm(prev => ({
        ...prev,
        studentCount: count,
        studentNames: count === ''
          ? prev.studentNames
          : Array.from({ length: Number(count) }, (_, i) => prev.studentNames[i] || '')
      }));
      setStudentFilters(prev => (
        count === ''
          ? prev
          : Array.from({ length: Number(count) }, (_, i) => prev[i] || '')
      ));
      // 重置學生選擇的鍵盤導航狀態
      if (count === '') {
        setSelectedStudentIndices({});
        setIsStudentDropdownsOpen({});
      }
    } else if (name === 'dateCount') {
      let count = value === '' ? '' : value.replace(/[^0-9]/g, '');
      if (count !== '' && Number(count) > 50) {
        count = '50';
      }
      setForm(prev => ({
        ...prev,
        dateCount: count,
        dates: count === ''
          ? prev.dates
          : Array.from({ length: Number(count) }, (_, i) => prev.dates[i] || '')
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // 處理學生名稱輸入變更
  const handleStudentNameChange = (idx, value) => {
    setForm(prev => {
      const arr = [...prev.studentNames];
      arr[idx] = value;
      return { ...prev, studentNames: arr };
    });
    setStudentFilters(prev => {
      const arr = [...prev];
      arr[idx] = value;
      return arr;
    });
    
    const shouldOpen = value.trim() !== '';
    setIsStudentDropdownsOpen(prev => ({ ...prev, [idx]: shouldOpen }));
    
    // 如果輸入為空，關閉下拉選單並重置選中索引
    if (!shouldOpen) {
      setSelectedStudentIndices(prev => ({ ...prev, [idx]: -1 }));
    } else {
      // 如果有輸入內容，預選第一個選項
      setSelectedStudentIndices(prev => ({ ...prev, [idx]: 0 }));
    }
  };

  // 選擇學生下拉選單
  const handleSelectStudent = (idx, s) => {
    setForm(prev => {
      const arr = [...prev.studentNames];
      arr[idx] = `${s.studentId ? s.studentId : ''} ${s.nameZh ? s.nameZh : ''}（${s.nameEn ? s.nameEn : ''}）`;
      return { ...prev, studentNames: arr };
    });
    setStudentFilters(prev => {
      const arr = [...prev];
      arr[idx] = '';
      return arr;
    });
    // 關閉下拉選單並重置選中索引
    setIsStudentDropdownsOpen(prev => ({ ...prev, [idx]: false }));
    setSelectedStudentIndices(prev => ({ ...prev, [idx]: -1 }));
  };

  const removeStudentField = (idx) => {
    setForm(prev => {
      const nextStudentNames = prev.studentNames.filter((_, i) => i !== idx);
      return {
        ...prev,
        studentCount: nextStudentNames.length === 0 ? '' : String(nextStudentNames.length),
        studentNames: nextStudentNames
      };
    });
    setStudentFilters(prev => prev.filter((_, i) => i !== idx));
    setFormErrors(prev => ({
      ...prev,
      studentCount: prev.studentCount && form.studentNames.length <= 1 ? '' : prev.studentCount,
      studentNames: prev.studentNames.filter((_, i) => i !== idx)
    }));
    setSelectedStudentIndices({});
    setIsStudentDropdownsOpen({});
  };

  const handleClassDateChange = (idx, value) => {
    setForm(prev => {
      const nextDates = [...prev.dates];
      nextDates[idx] = value;
      return { ...prev, dates: nextDates };
    });
  };

  const removeDateField = (idx) => {
    setForm(prev => {
      const nextDates = prev.dates.filter((_, i) => i !== idx);
      return {
        ...prev,
        dateCount: nextDates.length === 0 ? '' : String(nextDates.length),
        dates: nextDates
      };
    });
    setFormErrors(prev => ({
      ...prev,
      dateCount: prev.dateCount && form.dates.length <= 1 ? '' : prev.dateCount,
      dates: prev.dates.filter((_, i) => i !== idx)
    }));
  };

  const filterValue = courseFilter.trim().toLowerCase();
  const filteredCourses = courses.filter(c => {
    const teacher = teachers.find(t => t.teacherId === c.teacherId);
    const teacherName = teacher ? teacher.name : '';
    return (
      (c.courseId && c.courseId.toLowerCase().includes(filterValue)) ||
      (c.subject && c.subject.toLowerCase().includes(filterValue)) ||
      (c.grade && c.grade.toLowerCase().includes(filterValue)) ||
      (teacherName && teacherName.toLowerCase().includes(filterValue))
    );
  });

  const handleCourseInput = (e) => {
    setCourseDisplay(e.target.value);
    setCourseFilter(e.target.value);
    setForm(prev => ({ ...prev, courseId: '' }));
    
    const shouldOpen = e.target.value.trim() !== '';
    setIsCourseDropdownOpen(shouldOpen);
    
    // 如果輸入為空，關閉下拉選單並重置選中索引
    if (!shouldOpen) {
      setSelectedCourseIndex(-1);
    } else {
      // 如果有輸入內容，預選第一個選項
      setSelectedCourseIndex(0);
    }
  };

  const handleSelectCourse = (courseId) => {
    const c = courses.find(c => c.courseId === courseId);
    const teacher = teachers.find(t => t.teacherId === c.teacherId);
    setForm(prev => ({ ...prev, courseId }));
    setCourseDisplay(`${c.courseId} - ${c.grade}${c.subject} ${teacher ? teacher.name : ''}`);
    setCourseFilter('');
    // 關閉下拉選單並重置選中索引
    setIsCourseDropdownOpen(false);
    setSelectedCourseIndex(-1);
  };

  const handleSelectGroup = (groupId) => {
    if (!groupId) return;
    const group = groups.find(item => item._id === groupId);
    if (!group) return;

    const groupStudentNames = (group.studentIds || []).map(studentId => {
      const student = students.find(item => item.studentId === studentId);
      return student
        ? `${student.studentId} ${student.nameZh || ''}（${student.nameEn || ''}）`
        : studentId;
    });

    setForm(prev => ({
      ...prev,
      studentCount: String(groupStudentNames.length),
      studentNames: groupStudentNames
    }));
    setStudentFilters(Array(groupStudentNames.length).fill(''));
    setSelectedStudentIndices({});
    setIsStudentDropdownsOpen({});
  };

  // 新增：處理課程選擇的鍵盤事件
  const handleCourseKeyDown = (e) => {
    if (!isCourseDropdownOpen || filteredCourses.length === 0 || !courseFilter.trim()) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // 如果當前沒有選中索引，直接選中第一個選項
        const nextIndex = selectedCourseIndex < 0 ? 0 : (selectedCourseIndex < filteredCourses.length - 1 ? selectedCourseIndex + 1 : 0);
        setSelectedCourseIndex(nextIndex);
        // 自動滾動到選中的選項
        setTimeout(() => scrollToSelectedOption(nextIndex), 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        // 如果當前沒有選中索引，直接選中最後一個選項
        const prevIndex = selectedCourseIndex < 0 ? filteredCourses.length - 1 : (selectedCourseIndex > 0 ? selectedCourseIndex - 1 : filteredCourses.length - 1);
        setSelectedCourseIndex(prevIndex);
        // 自動滾動到選中的選項
        setTimeout(() => scrollToSelectedOption(prevIndex), 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedCourseIndex >= 0 && selectedCourseIndex < filteredCourses.length) {
          handleSelectCourse(filteredCourses[selectedCourseIndex].courseId);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsCourseDropdownOpen(false);
        setSelectedCourseIndex(-1);
        break;
      default:
        // 忽略其他按鍵
        break;
    }
  };

  // 新增：滾動到選中的選項
  const scrollToSelectedOption = (index) => {
    if (courseDropdownRef.current) {
      const dropdown = courseDropdownRef.current;
      const selectedItem = dropdown.children[index];
      if (selectedItem) {
        selectedItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  };

  // 新增：處理學生選擇的鍵盤事件
  const handleStudentKeyDown = (e, idx) => {
    const isOpen = isStudentDropdownsOpen[idx];
    const filteredStudents = students.filter(s =>
      (s.studentId && s.studentId.includes(studentFilters[idx])) ||
      (s.nameZh && s.nameZh.includes(studentFilters[idx])) ||
      (s.nameEn && s.nameEn.toLowerCase().includes(studentFilters[idx].toLowerCase())) ||
      (s.nickname && s.nickname.includes(studentFilters[idx]))
    );

    if (!isOpen || filteredStudents.length === 0 || !studentFilters[idx]?.trim()) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // 如果當前沒有選中索引，直接選中第一個選項
        const currentIndex = selectedStudentIndices[idx] ?? -1;
        const nextIndex = currentIndex < filteredStudents.length - 1 ? currentIndex + 1 : 0;
        setSelectedStudentIndices(prev => ({
          ...prev,
          [idx]: nextIndex
        }));
        // 自動滾動到選中的選項
        setTimeout(() => scrollToSelectedStudentOption(idx, nextIndex), 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        // 如果當前沒有選中索引，直接選中最後一個選項
        const currentIndexUp = selectedStudentIndices[idx] ?? -1;
        const prevIndex = currentIndexUp > 0 ? currentIndexUp - 1 : filteredStudents.length - 1;
        setSelectedStudentIndices(prev => ({
          ...prev,
          [idx]: prevIndex
        }));
        // 自動滾動到選中的選項
        setTimeout(() => scrollToSelectedStudentOption(idx, prevIndex), 0);
        break;
      case 'Enter':
        e.preventDefault();
        const selectedIndex = selectedStudentIndices[idx];
        if (selectedIndex >= 0 && selectedIndex < filteredStudents.length) {
          handleSelectStudent(idx, filteredStudents[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsStudentDropdownsOpen(prev => ({ ...prev, [idx]: false }));
        setSelectedStudentIndices(prev => ({ ...prev, [idx]: -1 }));
        break;
      default:
        // 忽略其他按鍵
        break;
    }
  };

  // 新增：滾動到選中的學生選項
  const scrollToSelectedStudentOption = (idx, index) => {
    const dropdownRef = studentDropdownRefs.current[idx];
    if (dropdownRef) {
      const selectedItem = dropdownRef.children[index];
      if (selectedItem) {
        selectedItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 重置錯誤狀態
    const newErrors = {
      courseId: '',
      price: '',
      studentCount: '',
      studentNames: [],
      dateCount: '',
      dates: []
    };
    
    // 驗證必填欄位
    if (!form.courseId) {
      newErrors.courseId = '請選擇課程';
    }
    if (!form.price) {
      newErrors.price = '請輸入價格';
    }
    if (!form.studentCount) {
      newErrors.studentCount = '請輸入學生人數';
    } else if (Number(form.studentCount) < 1) {
      newErrors.studentCount = '學生人數最少為1';
    }
    if (!form.dateCount) {
      newErrors.dateCount = '請輸入日期數量';
    } else if (Number(form.dateCount) < 1) {
      newErrors.dateCount = '日期數量最少為1';
    }
    
    // 驗證學生名稱是否都已填寫
    const studentNameErrors = [];
    form.studentNames.forEach((name, index) => {
      if (!name.trim()) {
        studentNameErrors[index] = '請填寫學生名稱';
      }
    });
    newErrors.studentNames = studentNameErrors;

    const dateErrors = [];
    form.dates.forEach((date, index) => {
      if (!date) {
        dateErrors[index] = '請選擇日期';
      }
    });
    newErrors.dates = dateErrors;
    
    setFormErrors(newErrors);
    
    // 如果有錯誤，不繼續提交
    if (
      newErrors.courseId ||
      newErrors.price ||
      newErrors.studentCount ||
      newErrors.dateCount ||
      studentNameErrors.some(error => error) ||
      dateErrors.some(error => error)
    ) {
      return;
    }
    
    // 準備確認訊息
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    };
    
    const course = courses.find(c => c.courseId === form.courseId);
    const courseInfo = course ? `${course.courseId} - ${course.grade}${course.subject}` : form.courseId;
    
    const studentInfo = form.studentNames.map(name => {
      const idMatch = name.match(/^([\w\d]+)/);
      const studentId = idMatch ? idMatch[1] : '';
      const student = students.find(s => s.studentId === studentId);
      return student ? `${student.studentId} - ${student.nameZh}（${student.nameEn}）${student.nickname ? ` [${student.nickname}]` : ''}` : name;
    });
    const dateInfo = form.dates.map(formatDate);
    
    // 設置確認數據並顯示彈窗
    setConfirmData({
      courseInfo,
      dateInfo,
      price: form.price,
      studentCount: studentInfo.length,
      studentInfo,
      recordCount: form.dates.length * form.studentNames.length
    });
    setShowConfirmModal(true);
  };

  // 處理確認彈窗的確認操作
  const handleConfirmSubmit = async () => {
    setLoading(true);
    setShowConfirmModal(false);
    
    try {
      for (const date of form.dates) {
        for (const name of form.studentNames) {
          const idMatch = name.match(/^([\w\d]+)/);
          const studentId = idMatch ? idMatch[1] : '';
          await fetch(`${config.API_URL}/classes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              courseId: form.courseId,
              date,
              price: Number(form.price),
              studentId
            })
          });
        }
      }
      
      // 重置表單
      setForm({ courseId: '', price: '', studentCount: '', studentNames: [], dateCount: '', dates: [] });
      setCourseDisplay('');
      setStudentFilters([]);
    } catch (error) {
      console.error('新增課堂時發生錯誤:', error);
      alert('❌ 新增課堂時發生錯誤，請重試');
    } finally {
      setLoading(false);
      fetchAllData();
    }
  };

    // 處理確認彈窗的取消操作
  const handleCancelSubmit = () => {
    setShowConfirmModal(false);
    setConfirmData(null);
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvLoading(true);
    setCsvMessage('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: async (results) => {
        try {
          const classes = results.data;
          let successCount = 0;
          let errorCount = 0;

          for (const classData of classes) {
            // 驗證必要欄位
            if (!classData.courseId || !classData.date || !classData.price || !classData.studentId) {
              errorCount++;
              continue;
            }

            // 檢查課程是否存在
            const courseExists = courses.some(c => c.courseId === classData.courseId);
            if (!courseExists) {
              errorCount++;
              continue;
            }

            // 檢查學生是否存在
            const studentExists = students.some(s => s.studentId === classData.studentId);
            if (!studentExists) {
              errorCount++;
              continue;
            }

            try {
              const res = await fetch(`${config.API_URL}/classes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  courseId: classData.courseId,
                  date: classData.date,
                  price: Number(classData.price),
                  studentId: classData.studentId
                })
              });

              if (res.ok) {
                successCount++;
              } else {
                errorCount++;
              }
            } catch (error) {
              errorCount++;
            }
          }

          setCsvMessage(`匯入完成！成功：${successCount} 筆，失敗：${errorCount} 筆`);
          // 重新載入課堂資料
          if (successCount > 0) {
            fetchAllData();
          }
        } catch (error) {
          setCsvMessage('匯入失敗：' + error.message);
        } finally {
          setCsvLoading(false);
        }
      },
      error: (error) => {
        setCsvMessage('CSV 解析失敗：' + error.message);
        setCsvLoading(false);
      }
    });

    // 清除文件輸入
    event.target.value = '';
  };

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        {!embedded && <h1>新增課堂資料</h1>}
        <div style={{ position: 'relative' }}>
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            disabled={csvLoading}
            style={{ display: 'none' }}
            id="csv-upload-class"
          />
          <label 
            htmlFor="csv-upload-class"
            style={{
              padding: '8px 16px',
              background: csvLoading ? '#6c757d' : '#0f766e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: csvLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!csvLoading) {
                e.target.style.background = '#0d5a52';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(15, 118, 110, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!csvLoading) {
                e.target.style.background = '#0f766e';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            {csvLoading ? '匯入中...' : '匯入 CSV'}
          </label>
        </div>
      </div>
      {csvMessage && (
        <div style={{ 
          marginBottom: '20px',
          padding: '8px 12px',
          color: csvMessage.includes('成功') ? '#155724' : '#721c24',
          background: csvMessage.includes('成功') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${csvMessage.includes('成功') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {csvMessage}
        </div>
      )}
      <div className="class-main-flex">
        <form onSubmit={handleSubmit} className="course-form class-form-left">
          <div className="form-group" style={{position:'relative'}}>
            <label>課程ID</label>
            <input
              type="text"
              name="courseId"
              value={courseDisplay}
              onChange={handleCourseInput}
              onKeyDown={handleCourseKeyDown}
              onFocus={() => {
                setIsCourseDropdownOpen(true);
                // 當聚焦時，如果有過濾結果，預選第一個選項
                if (filteredCourses.length > 0) {
                  setSelectedCourseIndex(0);
                } else {
                  setSelectedCourseIndex(-1);
                }
              }}
              onBlur={() => {
                // 延遲關閉，讓點擊事件有機會觸發
                setTimeout(() => {
                  // 如果沒有選擇課程，清空顯示
                  if (!form.courseId) {
                    setCourseDisplay('');
                  }
                  setIsCourseDropdownOpen(false);
                  setSelectedCourseIndex(-1);
                }, 100);
              }}
              placeholder="請輸入課程ID、年級、科目或教師姓名"
              autoComplete="off"
              required
            />
            {formErrors.courseId && <div style={{color: 'red', fontSize: '0.9em', marginTop: 4}}>{formErrors.courseId}</div>}
            {isCourseDropdownOpen && courseFilter && courseFilter.trim() !== '' && (
              <ul className="dropdown" ref={courseDropdownRef}>
                {filteredCourses.map((c, index) => {
                  const teacher = teachers.find(t => t.teacherId === c.teacherId);
                  return (
                    <li 
                      key={c.courseId} 
                      onClick={() => handleSelectCourse(c.courseId)}
                      onMouseDown={(e) => e.preventDefault()} // 防止 onBlur 觸發
                      className={index === selectedCourseIndex ? 'selected' : ''}
                      style={{
                        backgroundColor: selectedCourseIndex === index ? '#e3f2fd' : 'transparent',
                        color: selectedCourseIndex === index ? '#1976d2' : 'inherit'
                      }}
                    >
                      {c.courseId} - {c.grade}{c.subject} {teacher ? teacher.name : ''}
                    </li>
                  );
                })}
                {filteredCourses.length === 0 && <li>無符合選項</li>}
              </ul>
            )}
          </div>
          <div className="form-group">
            <label>價格</label>
            <input type="number" name="price" value={form.price} onChange={handleChange} step="1" placeholder="請輸入價格" required />
            {formErrors.price && <div style={{color: 'red', fontSize: '0.9em', marginTop: 4}}>{formErrors.price}</div>}
          </div>
          <div className="form-group">
            <label>日期數量</label>
            <input
              type="number"
              name="dateCount"
              value={form.dateCount}
              onChange={handleChange}
              min="1"
              max="50"
              step="1"
              placeholder="請輸入日期數量"
              required
            />
            {formErrors.dateCount && <div style={{color: 'red', fontSize: '0.9em', marginTop: 4}}>{formErrors.dateCount}</div>}
          </div>
          <div className="form-group">
            <label>學生人數</label>
            <input
              type="number"
              name="studentCount"
              value={form.studentCount}
              onChange={handleChange}
              min="1"
              max="20"
              step="1"
              placeholder="請輸入學生人數"
              required
            />
            {formErrors.studentCount && <div style={{color: 'red', fontSize: '0.9em', marginTop: 4}}>{formErrors.studentCount}</div>}
            {studentCountError && <div style={{color: 'red', fontSize: '0.95em', marginTop: 4}}>{studentCountError}</div>}
          </div>
          <div className="form-group">
            <label>選擇群組</label>
            <select onChange={e => handleSelectGroup(e.target.value)} defaultValue="">
              <option value="">不使用群組</option>
              {groups.map(group => (
                <option key={group._id} value={group._id}>
                  {group.groupName}（{group.studentCount || group.studentIds?.length || 0}人）
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={loading}>{loading ? '新增中...' : '新增課堂'}</button>
        </form>
        <div className="class-form-right">
          <div className="class-form-right-title">課堂日期</div>
          <div className="student-names-scroll">
            <div className="student-names-wrap">
              {form.dateCount !== '' && Array.from({ length: Number(form.dateCount) }).map((_, idx) => (
                <div className="form-group" key={`date-${idx}`}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="date"
                      value={form.dates[idx] || ''}
                      onChange={e => handleClassDateChange(idx, e.target.value)}
                      required
                      style={{ minWidth: 120, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeDateField(idx)}
                      style={{
                        padding: '8px 10px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      刪除
                    </button>
                  </div>
                  {formErrors.dates[idx] && <div style={{color: 'red', fontSize: '0.9em', marginTop: 4}}>{formErrors.dates[idx]}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="class-form-right">
          <div className="class-form-right-title">學生名稱</div>
          <div className="student-names-scroll">
            <div className="student-names-wrap">
              {form.studentCount !== '' && Array.from({ length: Number(form.studentCount) }).map((_, idx) => (
                <div className="form-group" key={idx} style={{position:'relative'}}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={form.studentNames[idx] || ''}
                      onChange={e => handleStudentNameChange(idx, e.target.value)}
                      onKeyDown={e => handleStudentKeyDown(e, idx)}
                      onFocus={() => {
                        if (studentFilters[idx]) {
                          setIsStudentDropdownsOpen(prev => ({ ...prev, [idx]: true }));
                          const filteredStudents = students.filter(s =>
                            (s.studentId && s.studentId.includes(studentFilters[idx])) ||
                            (s.nameZh && s.nameZh.includes(studentFilters[idx])) ||
                            (s.nameEn && s.nameEn.toLowerCase().includes(studentFilters[idx].toLowerCase())) ||
                            (s.nickname && s.nickname.includes(studentFilters[idx]))
                          );
                          if (filteredStudents.length > 0) {
                            setSelectedStudentIndices(prev => ({ ...prev, [idx]: 0 }));
                          }
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setIsStudentDropdownsOpen(prev => ({ ...prev, [idx]: false }));
                          setSelectedStudentIndices(prev => ({ ...prev, [idx]: -1 }));
                        }, 100);
                      }}
                      placeholder={`學生名稱 #${idx + 1}`}
                      autoComplete="off"
                      required
                      style={{minWidth: 120, flex: 1}}
                    />
                    <button
                      type="button"
                      onClick={() => removeStudentField(idx)}
                      style={{
                        padding: '8px 10px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      刪除
                    </button>
                  </div>
                  {formErrors.studentNames[idx] && <div style={{color: 'red', fontSize: '0.9em', marginTop: 4}}>{formErrors.studentNames[idx]}</div>}
                  {isStudentDropdownsOpen[idx] && studentFilters[idx] && studentFilters[idx].trim() !== '' && (
                    <ul className="dropdown" ref={el => studentDropdownRefs.current[idx] = el}>
                      {students.filter(s =>
                        (s.studentId && s.studentId.includes(studentFilters[idx])) ||
                        (s.nameZh && s.nameZh.includes(studentFilters[idx])) ||
                        (s.nameEn && s.nameEn.toLowerCase().includes(studentFilters[idx].toLowerCase())) ||
                        (s.nickname && s.nickname.includes(studentFilters[idx]))
                      ).map((s, studentIndex) => (
                        <li
                          key={s._id || s.studentId}
                          onClick={() => handleSelectStudent(idx, s)}
                          onMouseDown={(e) => e.preventDefault()}
                          className={studentIndex === selectedStudentIndices[idx] ? 'selected' : ''}
                          style={{
                            backgroundColor: selectedStudentIndices[idx] === studentIndex ? '#e3f2fd' : 'transparent',
                            color: selectedStudentIndices[idx] === studentIndex ? '#1976d2' : 'inherit'
                          }}
                        >
                          {s.studentId} {s.nameZh}（{s.nameEn}）{s.nickname ? ` [${s.nickname}]` : ''}
                        </li>
                      ))}
                      {students.filter(s =>
                        (s.studentId && s.studentId.includes(studentFilters[idx])) ||
                        (s.nameZh && s.nameZh.includes(studentFilters[idx])) ||
                        (s.nameEn && s.nameEn.toLowerCase().includes(studentFilters[idx].toLowerCase())) ||
                        (s.nickname && s.nickname.includes(studentFilters[idx]))
                      ).length === 0 && <li>無符合選項</li>}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* 確認彈窗 */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="確認新增課堂"
        message={confirmData ? `
          <div style="margin-bottom: 16px;">
            <strong>課程：</strong>${confirmData.courseInfo}
          </div>
          <div style="margin-bottom: 16px;">
            <strong>價格：</strong>$${confirmData.price}
          </div>
          <div style="margin-bottom: 16px;">
            <strong>日期名單：</strong>
          </div>
          <div style="margin-bottom: 20px; padding-left: 16px;">
            ${confirmData.dateInfo.map(date => `<div style="margin-bottom: 4px;">${date}</div>`).join('')}
          </div>
          <div style="margin-bottom: 16px;">
            <strong>學生人數：</strong>${confirmData.studentCount}人
          </div>
          <div style="margin-bottom: 16px;">
            <strong>學生名單：</strong>
          </div>
          <div style="margin-bottom: 20px; padding-left: 16px;">
            ${confirmData.studentInfo.map(student => `<div style="margin-bottom: 4px;">${student}</div>`).join('')}
          </div>
          <div style="margin-top: 20px; text-align: center; font-weight: 600; color: #495057;">
            確定要新增這${confirmData.recordCount}筆課堂記錄嗎？
          </div>
        ` : ''}
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
        confirmText="確定新增"
        cancelText="取消"
      />
    </div>
  );
}

function AddGroup({ initialTab = 'add' }) {
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [form, setForm] = React.useState({
    groupName: '',
    studentCount: '',
    studentNames: []
  });
  const [editForm, setEditForm] = React.useState({
    groupName: '',
    studentCount: '',
    studentNames: []
  });
  const [students, setStudents] = React.useState([]);
  const [groups, setGroups] = React.useState([]);
  const [studentFilters, setStudentFilters] = React.useState([]);
  const [editStudentFilters, setEditStudentFilters] = React.useState([]);
  const [selectedStudentIndices, setSelectedStudentIndices] = React.useState({});
  const [editSelectedStudentIndices, setEditSelectedStudentIndices] = React.useState({});
  const [isStudentDropdownsOpen, setIsStudentDropdownsOpen] = React.useState({});
  const [isEditStudentDropdownsOpen, setIsEditStudentDropdownsOpen] = React.useState({});
  const studentDropdownRefs = React.useRef({});
  const editStudentDropdownRefs = React.useRef({});
  const [studentCountError, setStudentCountError] = React.useState('');
  const [editStudentCountError, setEditStudentCountError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  React.useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [studentsRes, groupsRes] = await Promise.all([
        fetch(`${config.API_URL}/students`),
        fetch(`${config.API_URL}/groups`)
      ]);
      setStudents(await studentsRes.json());
      setGroups(await groupsRes.json());
    } catch (error) {
      console.error('獲取群組資料失敗:', error);
    }
  };

  const updateStudentCount = (value, setTargetForm, setTargetFilters, setError) => {
    let count = value === '' ? '' : value.replace(/[^0-9]/g, '');
    if (count !== '' && Number(count) > 50) {
      count = '50';
      setError('學生人數上限為50');
    } else {
      setError('');
    }

    setTargetForm(prev => ({
      ...prev,
      studentCount: count,
      studentNames: count === ''
        ? prev.studentNames
        : Array.from({ length: Number(count) }, (_, i) => prev.studentNames[i] || '')
    }));
    setTargetFilters(prev => (
      count === '' ? prev : Array.from({ length: Number(count) }, (_, i) => prev[i] || '')
    ));
  };

  const handleStudentCountChange = (e) => {
    updateStudentCount(e.target.value, setForm, setStudentFilters, setStudentCountError);
  };

  const handleEditStudentCountChange = (e) => {
    updateStudentCount(e.target.value, setEditForm, setEditStudentFilters, setEditStudentCountError);
  };

  const updateStudentName = (idx, value, setTargetForm, setTargetFilters, setTargetOpen, setTargetSelected) => {
    setTargetForm(prev => {
      const next = [...prev.studentNames];
      next[idx] = value;
      return { ...prev, studentNames: next };
    });
    setTargetFilters(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
    const shouldOpen = value.trim() !== '';
    setTargetOpen(prev => ({ ...prev, [idx]: shouldOpen }));
    setTargetSelected(prev => ({ ...prev, [idx]: shouldOpen ? 0 : -1 }));
  };

  const handleStudentNameChange = (idx, value) => {
    updateStudentName(idx, value, setForm, setStudentFilters, setIsStudentDropdownsOpen, setSelectedStudentIndices);
  };

  const handleEditStudentNameChange = (idx, value) => {
    updateStudentName(idx, value, setEditForm, setEditStudentFilters, setIsEditStudentDropdownsOpen, setEditSelectedStudentIndices);
  };

  const selectStudent = (idx, student, setTargetForm, setTargetFilters, setTargetOpen, setTargetSelected) => {
    setTargetForm(prev => {
      const next = [...prev.studentNames];
      next[idx] = `${student.studentId} ${student.nameZh || ''}（${student.nameEn || ''}）`;
      return { ...prev, studentNames: next };
    });
    setTargetFilters(prev => {
      const next = [...prev];
      next[idx] = '';
      return next;
    });
    setTargetOpen(prev => ({ ...prev, [idx]: false }));
    setTargetSelected(prev => ({ ...prev, [idx]: -1 }));
  };

  const handleSelectStudent = (idx, student) => {
    selectStudent(idx, student, setForm, setStudentFilters, setIsStudentDropdownsOpen, setSelectedStudentIndices);
  };

  const handleEditSelectStudent = (idx, student) => {
    selectStudent(idx, student, setEditForm, setEditStudentFilters, setIsEditStudentDropdownsOpen, setEditSelectedStudentIndices);
  };

  const removeStudentField = (idx) => {
    setForm(prev => {
      const next = prev.studentNames.filter((_, i) => i !== idx);
      return {
        ...prev,
        studentCount: next.length === 0 ? '' : String(next.length),
        studentNames: next
      };
    });
    setStudentFilters(prev => prev.filter((_, i) => i !== idx));
    setSelectedStudentIndices({});
    setIsStudentDropdownsOpen({});
  };

  const removeEditStudentField = (idx) => {
    setEditForm(prev => {
      const next = prev.studentNames.filter((_, i) => i !== idx);
      return {
        ...prev,
        studentCount: next.length === 0 ? '' : String(next.length),
        studentNames: next
      };
    });
    setEditStudentFilters(prev => prev.filter((_, i) => i !== idx));
    setEditSelectedStudentIndices({});
    setIsEditStudentDropdownsOpen({});
  };

  const getFilteredStudents = (idx, filters = studentFilters) => {
    const filter = filters[idx] || '';
    return students.filter(s =>
      (s.studentId && s.studentId.includes(filter)) ||
      (s.nameZh && s.nameZh.includes(filter)) ||
      (s.nameEn && s.nameEn.toLowerCase().includes(filter.toLowerCase())) ||
      (s.nickname && s.nickname.includes(filter))
    );
  };

  const getGroupStudentIds = (targetForm) => {
    if (!targetForm.groupName.trim()) {
      alert('請輸入群組名稱');
      return null;
    }
    if (!targetForm.studentCount || Number(targetForm.studentCount) < 1) {
      alert('請輸入學生人數');
      return null;
    }

    const studentIds = targetForm.studentNames.map(name => {
      const idMatch = name.match(/^([\w\d]+)/);
      return idMatch ? idMatch[1] : '';
    }).filter(Boolean);

    if (studentIds.length !== Number(targetForm.studentCount)) {
      alert('請填寫所有學生名稱');
      return null;
    }

    return studentIds;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const studentIds = getGroupStudentIds(form);
    if (!studentIds) return;

    setLoading(true);
    try {
      const res = await fetch(`${config.API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: form.groupName,
          studentIds
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || '新增群組失敗');
      }
      setForm({ groupName: '', studentCount: '', studentNames: [] });
      setStudentFilters([]);
      fetchAllData();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditGroup = (group) => {
    const groupStudentNames = (group.studentIds || []).map(studentId => {
      const student = students.find(item => item.studentId === studentId);
      return student
        ? `${student.studentId} ${student.nameZh || ''}（${student.nameEn || ''}）`
        : studentId;
    });

    setEditingGroup(group);
    setEditForm({
      groupName: group.groupName || '',
      studentCount: String(groupStudentNames.length),
      studentNames: groupStudentNames
    });
    setEditStudentFilters(Array(groupStudentNames.length).fill(''));
    setEditSelectedStudentIndices({});
    setIsEditStudentDropdownsOpen({});
    setEditStudentCountError('');
    setShowEditModal(true);
  };

  const handleSaveEditGroup = async (e) => {
    e.preventDefault();
    if (!editingGroup) return;

    const studentIds = getGroupStudentIds(editForm);
    if (!studentIds) return;

    setEditLoading(true);
    try {
      const res = await fetch(`${config.API_URL}/groups/${editingGroup._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupName: editForm.groupName,
          studentIds
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || '更新群組失敗');
      }
      handleCancelEditGroup();
      fetchAllData();
    } catch (error) {
      alert(error.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEditGroup = () => {
    setEditingGroup(null);
    setShowEditModal(false);
    setEditForm({ groupName: '', studentCount: '', studentNames: [] });
    setEditStudentFilters([]);
    setEditSelectedStudentIndices({});
    setIsEditStudentDropdownsOpen({});
    setEditStudentCountError('');
  };

  const handleDeleteGroup = (groupId) => {
    setDeleteTarget(groupId);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteGroup = async () => {
    try {
      const res = await fetch(`${config.API_URL}/groups/${deleteTarget}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('刪除群組失敗');
      }
      setShowDeleteModal(false);
      setDeleteTarget(null);
      if (editingGroup?._id === deleteTarget) {
        handleCancelEditGroup();
      }
      fetchAllData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleCancelDeleteGroup = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const renderStudentFields = ({
    targetForm,
    filters,
    openDropdowns,
    selectedIndices,
    refs,
    onNameChange,
    onSelectStudent,
    onRemoveStudent,
    setOpenDropdowns,
    setSelectedIndices
  }) => (
    <div className="student-names-scroll">
      <div className="student-names-wrap">
        {targetForm.studentCount !== '' && Array.from({ length: Number(targetForm.studentCount) }).map((_, idx) => {
          const filteredStudents = getFilteredStudents(idx, filters);
          return (
            <div className="form-group" key={idx} style={{position:'relative'}}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  value={targetForm.studentNames[idx] || ''}
                  onChange={e => onNameChange(idx, e.target.value)}
                  onBlur={() => {
                    setTimeout(() => {
                      setOpenDropdowns(prev => ({ ...prev, [idx]: false }));
                      setSelectedIndices(prev => ({ ...prev, [idx]: -1 }));
                    }, 100);
                  }}
                  placeholder={`學生名稱 #${idx + 1}`}
                  autoComplete="off"
                  required
                  style={{ minWidth: 120, flex: 1 }}
                />
                <button type="button" className="action-button delete" onClick={() => onRemoveStudent(idx)}>
                  刪除
                </button>
              </div>
              {openDropdowns[idx] && filters[idx] && filters[idx].trim() !== '' && (
                <ul className="dropdown" ref={el => refs.current[idx] = el}>
                  {filteredStudents.map((student, studentIndex) => (
                    <li
                      key={student._id || student.studentId}
                      onClick={() => onSelectStudent(idx, student)}
                      onMouseDown={(event) => event.preventDefault()}
                      className={studentIndex === selectedIndices[idx] ? 'selected' : ''}
                    >
                      {student.studentId} {student.nameZh}（{student.nameEn}）{student.nickname ? ` [${student.nickname}]` : ''}
                    </li>
                  ))}
                  {filteredStudents.length === 0 && <li>無符合選項</li>}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-tab-header">
        <h1>群組</h1>
        <div className="mode-toggle">
          <button
            type="button"
            className={activeTab === 'add' ? 'active' : ''}
            onClick={() => setActiveTab('add')}
          >
            新增
          </button>
          <button
            type="button"
            className={activeTab === 'manage' ? 'active' : ''}
            onClick={() => setActiveTab('manage')}
          >
            管理
          </button>
        </div>
      </div>
      <div className="content">
        {activeTab === 'add' ? (
          <div className="class-main-flex">
            <form onSubmit={handleSubmit} className="course-form class-form-left">
              <div className="form-group">
                <label>群組名稱</label>
                <input
                  type="text"
                  value={form.groupName}
                  onChange={e => setForm(prev => ({ ...prev, groupName: e.target.value }))}
                  placeholder="請輸入群組名稱"
                  required
                />
              </div>
              <div className="form-group">
                <label>學生人數</label>
                <input
                  type="number"
                  value={form.studentCount}
                  onChange={handleStudentCountChange}
                  min="1"
                  max="50"
                  step="1"
                  placeholder="請輸入學生人數"
                  required
                />
                {studentCountError && <div style={{color: 'red', fontSize: '0.95em', marginTop: 4}}>{studentCountError}</div>}
              </div>
              <button type="submit" disabled={loading}>
                {loading ? '儲存中...' : '新增群組'}
              </button>
            </form>

            <div className="class-form-right">
              <div className="class-form-right-title">學生名稱</div>
              {renderStudentFields({
                targetForm: form,
                filters: studentFilters,
                openDropdowns: isStudentDropdownsOpen,
                selectedIndices: selectedStudentIndices,
                refs: studentDropdownRefs,
                onNameChange: handleStudentNameChange,
                onSelectStudent: handleSelectStudent,
                onRemoveStudent: removeStudentField,
                setOpenDropdowns: setIsStudentDropdownsOpen,
                setSelectedIndices: setSelectedStudentIndices
              })}
            </div>
          </div>
        ) : (
          <div className="class-form-right">
            <div className="class-form-right-title">群組列表</div>
            <div className="course-list-scroll">
              <table className="course-table">
                <thead>
                  <tr>
                    <th>群組名稱</th>
                    <th>學生人數</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(group => (
                    <tr key={group._id}>
                      <td>{group.groupName}</td>
                      <td>{group.studentCount || group.studentIds?.length || 0}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-button edit" onClick={() => handleEditGroup(group)}>編輯</button>
                          <button className="action-button delete" onClick={() => handleDeleteGroup(group._id)}>刪除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {showEditModal && (
        <div className="edit-modal-overlay">
          <div className="edit-modal-container">
            <div className="edit-modal-header">
              <h3>編輯群組</h3>
              <button className="close-button" onClick={handleCancelEditGroup}>×</button>
            </div>
            <form onSubmit={handleSaveEditGroup} className="edit-modal-form">
              <div className="edit-modal-content">
                <div className="form-group">
                  <label>群組名稱</label>
                  <input
                    type="text"
                    value={editForm.groupName}
                    onChange={e => setEditForm(prev => ({ ...prev, groupName: e.target.value }))}
                    placeholder="請輸入群組名稱"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>學生人數</label>
                  <input
                    type="number"
                    value={editForm.studentCount}
                    onChange={handleEditStudentCountChange}
                    min="1"
                    max="50"
                    step="1"
                    placeholder="請輸入學生人數"
                    required
                  />
                  {editStudentCountError && <div style={{color: 'red', fontSize: '0.95em', marginTop: 4}}>{editStudentCountError}</div>}
                </div>
                <div className="class-form-right-title">學生名稱</div>
                {renderStudentFields({
                  targetForm: editForm,
                  filters: editStudentFilters,
                  openDropdowns: isEditStudentDropdownsOpen,
                  selectedIndices: editSelectedStudentIndices,
                  refs: editStudentDropdownRefs,
                  onNameChange: handleEditStudentNameChange,
                  onSelectStudent: handleEditSelectStudent,
                  onRemoveStudent: removeEditStudentField,
                  setOpenDropdowns: setIsEditStudentDropdownsOpen,
                  setSelectedIndices: setEditSelectedStudentIndices
                })}
              </div>
              <div className="edit-modal-footer">
                <button type="button" className="cancel-button" onClick={handleCancelEditGroup}>
                  取消
                </button>
                <button type="submit" className="save-button" disabled={editLoading}>
                  {editLoading ? '儲存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={handleCancelDeleteGroup}
        onConfirm={handleConfirmDeleteGroup}
        title="確認刪除"
        message="確定要刪除這個群組嗎？"
      />
    </div>
  );
}

function CoursePage({ initialTab = 'add' }) {
  const [activeTab, setActiveTab] = React.useState(initialTab);

  return (
    <div>
      <div className="page-tab-header">
        <h1>課程</h1>
        <div className="mode-toggle">
          <button
            type="button"
            className={activeTab === 'add' ? 'active' : ''}
            onClick={() => setActiveTab('add')}
          >
            新增
          </button>
          <button
            type="button"
            className={activeTab === 'manage' ? 'active' : ''}
            onClick={() => setActiveTab('manage')}
          >
            管理
          </button>
        </div>
      </div>
      {activeTab === 'add' ? <AddCourse embedded /> : <CourseList embedded />}
    </div>
  );
}

function AddCourse({ embedded = false }) {
  const [form, setForm] = React.useState({
    teacherId: '',
    grade: '',
    subject: ''
  });
  const [teachers, setTeachers] = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  // const [courseFilter, setCourseFilter] = React.useState('');
  // const [courseDisplay, setCourseDisplay] = React.useState('');
  const [csvLoading, setCsvLoading] = React.useState(false);
  const [csvMessage, setCsvMessage] = React.useState('');
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [confirmData, setConfirmData] = React.useState(null);
  const [teacherFilter, setTeacherFilter] = React.useState('');
  const [teacherDisplay, setTeacherDisplay] = React.useState('');
  // 新增：教師選擇的鍵盤導航狀態
  const [selectedTeacherIndex, setSelectedTeacherIndex] = React.useState(-1);
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = React.useState(false);
  // 新增：教師下拉選單的 ref
  const teacherDropdownRef = React.useRef(null);

  React.useEffect(() => {
    fetchTeachers();
    fetchCourses();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await fetch(`${config.API_URL}/teachers`);
      const data = await response.json();
      setTeachers(data);
    } catch (error) {
      console.error('獲取教師數據失敗:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${config.API_URL}/courses`);
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('獲取課程數據失敗:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // const handleSelectTeacher = (teacherId) => {
  //   setForm(prev => ({ ...prev, teacherId }));
  // };

  const handleTeacherInput = (e) => {
    setTeacherDisplay(e.target.value);
    setTeacherFilter(e.target.value);
    setForm(prev => ({ ...prev, teacherId: '' }));
    
    const shouldOpen = e.target.value.trim() !== '';
    setIsTeacherDropdownOpen(shouldOpen);
    
    // 如果輸入為空，關閉下拉選單並重置選中索引
    if (!shouldOpen) {
      setSelectedTeacherIndex(-1);
    } else {
      // 如果有輸入內容，預選第一個選項
      setSelectedTeacherIndex(0);
    }
  };

  const handleSelectTeacherFromDropdown = (teacherId) => {
    const teacher = teachers.find(t => t.teacherId === teacherId);
    setForm(prev => ({ ...prev, teacherId }));
    setTeacherDisplay(`${teacher.teacherId}-${teacher.name}`);
    setTeacherFilter('');
    // 關閉下拉選單並重置選中索引
    setIsTeacherDropdownOpen(false);
    setSelectedTeacherIndex(-1);
  };

  // 新增：處理教師選擇的鍵盤事件
  const handleTeacherKeyDown = (e) => {
    const filteredTeachers = teachers.filter(t => 
      t.teacherId.includes(teacherFilter) || 
      t.name.includes(teacherFilter)
    );

    if (!isTeacherDropdownOpen || filteredTeachers.length === 0 || !teacherFilter.trim()) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // 如果當前沒有選中索引，直接選中第一個選項
        const nextIndex = selectedTeacherIndex < 0 ? 0 : (selectedTeacherIndex < filteredTeachers.length - 1 ? selectedTeacherIndex + 1 : 0);
        setSelectedTeacherIndex(nextIndex);
        // 自動滾動到選中的選項
        setTimeout(() => scrollToSelectedTeacherOption(nextIndex), 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        // 如果當前沒有選中索引，直接選中最後一個選項
        const prevIndex = selectedTeacherIndex < 0 ? filteredTeachers.length - 1 : (selectedTeacherIndex > 0 ? selectedTeacherIndex - 1 : filteredTeachers.length - 1);
        setSelectedTeacherIndex(prevIndex);
        // 自動滾動到選中的選項
        setTimeout(() => scrollToSelectedTeacherOption(prevIndex), 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedTeacherIndex >= 0 && selectedTeacherIndex < filteredTeachers.length) {
          handleSelectTeacherFromDropdown(filteredTeachers[selectedTeacherIndex].teacherId);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsTeacherDropdownOpen(false);
        setSelectedTeacherIndex(-1);
        break;
      default:
        // 忽略其他按鍵
        break;
    }
  };

  // 新增：滾動到選中的教師選項
  const scrollToSelectedTeacherOption = (index) => {
    if (teacherDropdownRef.current) {
      const dropdown = teacherDropdownRef.current;
      const selectedItem = dropdown.children[index];
      if (selectedItem) {
        selectedItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 驗證必填欄位
    if (!form.teacherId || !form.grade || !form.subject) {
      alert('請填寫所有必填欄位');
      return;
    }
    
    // 準備確認訊息
    const teacher = teachers.find(t => t.teacherId === form.teacherId);
    const teacherInfo = teacher ? `${teacher.teacherId} - ${teacher.name}` : form.teacherId;
    
    // 設置確認數據並顯示彈窗
    const confirmDataToSet = {
      teacherId: form.teacherId,  // 添加teacherId
      teacherInfo,
      grade: form.grade,
      subject: form.subject
    };
    
    setConfirmData(confirmDataToSet);
    setShowConfirmModal(true);
  };

  // 處理確認彈窗的確認操作
  const handleConfirmSubmit = async () => {
    try {
      const res = await fetch(`${config.API_URL}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: confirmData.teacherId,
          grade: confirmData.grade,
          subject: confirmData.subject
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCourses(prev => [...prev, data]);
        setForm({ teacherId: '', grade: '', subject: '' });
        // 重置教師選擇的狀態
        setTeacherDisplay('');
        setTeacherFilter('');
        setSelectedTeacherIndex(-1);
        setIsTeacherDropdownOpen(false);
      } else {
        alert('❌ 新增課程時發生錯誤，請重試');
      }
    } catch (error) {
      console.error('新增課程時發生錯誤:', error);
      alert('❌ 新增課程時發生錯誤，請重試');
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
      setConfirmData(null);
    }
  };

  // 處理確認彈窗的取消操作
  const handleCancelSubmit = () => {
    setShowConfirmModal(false);
    setConfirmData(null);
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvLoading(true);
    setCsvMessage('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: async (results) => {
        try {
          const courses = results.data;
          let successCount = 0;
          let errorCount = 0;

          for (const course of courses) {
            // 驗證必要欄位
            if (!course.teacherId || !course.grade || !course.subject) {
              errorCount++;
              continue;
            }

            // 檢查教師是否存在
            const teacherExists = teachers.some(t => t.teacherId === course.teacherId);
            if (!teacherExists) {
              errorCount++;
              continue;
            }

            try {
              const res = await fetch(`${config.API_URL}/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  teacherId: course.teacherId,
                  grade: course.grade,
                  subject: course.subject
                })
              });

              if (res.ok) {
                const newCourse = await res.json();
                setCourses(prev => [...prev, newCourse]);
                successCount++;
              } else {
                errorCount++;
              }
            } catch (error) {
              errorCount++;
            }
          }

          setCsvMessage(`匯入完成！成功：${successCount} 筆，失敗：${errorCount} 筆`);
        } catch (error) {
          setCsvMessage('匯入失敗：' + error.message);
        } finally {
          setCsvLoading(false);
        }
      },
      error: (error) => {
        setCsvMessage('CSV 解析失敗：' + error.message);
        setCsvLoading(false);
      }
    });

    // 清除文件輸入
    event.target.value = '';
  };

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      {!embedded && <h1>新增課程資料</h1>}
        <div style={{ position: 'relative' }}>
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            disabled={csvLoading}
            style={{ display: 'none' }}
            id="csv-upload"
          />
          <label 
            htmlFor="csv-upload"
            style={{
              padding: '8px 16px',
              background: csvLoading ? '#6c757d' : '#0f766e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: csvLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!csvLoading) {
                e.target.style.background = '#0d5a52';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(15, 118, 110, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!csvLoading) {
                e.target.style.background = '#0f766e';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            {csvLoading ? '匯入中...' : '匯入 CSV'}
          </label>
        </div>
      </div>
      {csvMessage && (
        <div style={{ 
          marginBottom: '20px',
          padding: '8px 12px',
          color: csvMessage.includes('成功') ? '#155724' : '#721c24',
          background: csvMessage.includes('成功') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${csvMessage.includes('成功') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {csvMessage}
        </div>
      )}
      <div className="class-main-flex">
        <div className="class-form-left">
      <form onSubmit={handleSubmit} className="course-form">
        <div className="form-group">
          <label>課程ID</label>
          <input type="text" value={courses.length + 1} disabled />
        </div>
        <div className="form-group">
          <label>老師ID</label>
          <input
            type="text"
            name="teacherId"
            value={teacherDisplay}
            onChange={handleTeacherInput}
            onKeyDown={handleTeacherKeyDown}
            onFocus={() => {
              setIsTeacherDropdownOpen(true);
              // 當聚焦時，如果有過濾結果，預選第一個選項
              const filteredTeachers = teachers.filter(t => 
                t.teacherId.includes(teacherFilter) || 
                t.name.includes(teacherFilter)
              );
              if (filteredTeachers.length > 0) {
                setSelectedTeacherIndex(0);
              }
            }}
            onBlur={() => {
              // 延遲關閉，讓點擊事件有機會觸發
              setTimeout(() => {
                // 如果沒有選擇教師，清空顯示
                if (!form.teacherId) {
                  setTeacherDisplay('');
                }
                setIsTeacherDropdownOpen(false);
                setSelectedTeacherIndex(-1);
              }, 100);
            }}
            placeholder="請輸入老師ID或姓名"
            autoComplete="off"
          />
          {isTeacherDropdownOpen && teacherFilter && teacherFilter.trim() !== '' && (
            <ul className="dropdown" ref={teacherDropdownRef}>
                {teachers.filter(t => 
                  t.teacherId.includes(teacherFilter) || 
                  t.name.includes(teacherFilter)
                ).map((t, index) => (
                  <li 
                    key={t.teacherId} 
                    onClick={() => handleSelectTeacherFromDropdown(t.teacherId)}
                    onMouseDown={(e) => e.preventDefault()} // 防止 onBlur 觸發
                    className={index === selectedTeacherIndex ? 'selected' : ''}
                    style={{
                      backgroundColor: selectedTeacherIndex === index ? '#e3f2fd' : 'transparent',
                      color: selectedTeacherIndex === index ? '#1976d2' : 'inherit'
                    }}
                  >
                    {t.teacherId}-{t.name}
                  </li>
              ))}
              {teachers.filter(t => 
                t.teacherId.includes(teacherFilter) || 
                t.name.includes(teacherFilter)
              ).length === 0 && <li>無符合選項</li>}
            </ul>
          )}
        </div>
        <div className="form-group">
          <label>年級</label>
          <select name="grade" value={form.grade} onChange={handleChange} required>
            <option value="">請選擇年級</option>
            <option value="初中">初中</option>
            <option value="高中">高中</option>
            <option value="試堂">試堂</option>
            <option value="中一">中一</option>
            <option value="中二">中二</option>
            <option value="中三">中三</option>
            <option value="中四">中四</option>
            <option value="中五">中五</option>
            <option value="中六">中六</option>
          </select>
        </div>
        <div className="form-group">
          <label>科目</label>
          <input
            type="text"
            name="subject"
            value={form.subject}
            onChange={handleChange}
            placeholder="請輸入科目"
            required
          />
        </div>
          <button type="submit" disabled={loading}>{loading ? '新增中...' : '新增課程'}</button>
      </form>
      </div>
      
      <div className="class-form-right">
        <div className="class-form-right-title">課程列表</div>
        <div className="course-list-scroll">
          <table className="course-table">
            <thead>
              <tr>
                <th>課程ID</th>
                <th>教師</th>
                <th>年級</th>
                <th>科目</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => {
                const teacher = teachers.find(t => t.teacherId === course.teacherId);
                return (
                  <tr key={course._id || course.courseId}>
                    <td>{course.courseId}</td>
                    <td>{teacher ? `${teacher.teacherId}-${teacher.name}` : `查無教師 (ID: ${course.teacherId})`}</td>
                    <td>{course.grade}</td>
                    <td>{course.subject}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      
      {/* 確認彈窗 */}
      {showConfirmModal && confirmData && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onConfirm={handleConfirmSubmit}
          onCancel={handleCancelSubmit}
          title="確認新增課程"
          message={`
            <div style="text-align: left; line-height: 1.6;">
              <p><strong>教師：</strong>${confirmData.teacherInfo}</p>
              <p><strong>年級：</strong>${confirmData.grade}</p>
              <p><strong>科目：</strong>${confirmData.subject}</p>
              <p style="margin-top: 16px; color: #666; font-size: 14px;">
                請確認以上資料是否正確，確認後將新增此課程。
              </p>
            </div>
          `}
        />
      )}
    </div>
  );
}
function StudentPage({ initialTab = 'add' }) {
  const [activeTab, setActiveTab] = React.useState(initialTab);

  return (
    <div>
      <div className="page-tab-header">
        <h1>學生</h1>
        <div className="mode-toggle">
          <button
            type="button"
            className={activeTab === 'add' ? 'active' : ''}
            onClick={() => setActiveTab('add')}
          >
            新增
          </button>
          <button
            type="button"
            className={activeTab === 'manage' ? 'active' : ''}
            onClick={() => setActiveTab('manage')}
          >
            管理
          </button>
        </div>
      </div>
      {activeTab === 'add' ? <AddStudent embedded /> : <StudentList embedded />}
    </div>
  );
}

function AddStudent({ embedded = false }) {
  const [form, setForm] = React.useState({
    nameZh: '',
    nameEn: '',
    grade: '',
    nickname: '',
    phone: '',
    wechat: '',
    contactMethod: '',
    school: '',
    notes: ''
  });
  const [students, setStudents] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [csvLoading, setCsvLoading] = React.useState(false);
  const [csvMessage, setCsvMessage] = React.useState('');
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [confirmData, setConfirmData] = React.useState(null);

  React.useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/students`);
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error('獲取學生數據失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 驗證必填欄位（英文姓名改為非必填）
    if (!form.nameZh || !form.grade) {
      alert('請填寫中文姓名和年級');
      return;
    }
    
    // 設置確認數據並顯示彈窗
    setConfirmData({
      nameZh: form.nameZh,
      nameEn: form.nameEn || '無',
      grade: form.grade,
      nickname: form.nickname || '無',
      phone: form.phone || '無',
      wechat: form.wechat || '無',
      contactMethod: form.contactMethod || '無',
      school: form.school || '無',
      notes: form.notes || '無'
    });
    setShowConfirmModal(true);
  };

  // 處理確認彈窗的確認操作
  const handleConfirmSubmit = async () => {
    setLoading(true);
    setShowConfirmModal(false);
    
    try {
      const res = await fetch(`${config.API_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setStudents(prev => [...prev, data]);
      setForm({ nameZh: '', nameEn: '', grade: '', nickname: '', phone: '', wechat: '', contactMethod: '', school: '', notes: '' });
    } catch (error) {
      console.error('新增學生時發生錯誤:', error);
      alert('❌ 新增學生時發生錯誤，請重試');
    } finally {
      setLoading(false);
    }
  };

  // 處理確認彈窗的取消操作
  const handleCancelSubmit = () => {
    setShowConfirmModal(false);
    setConfirmData(null);
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvLoading(true);
    setCsvMessage('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: async (results) => {
        try {
          const students = results.data;
          let successCount = 0;
          let errorCount = 0;
          let errorDetails = [];

          console.log('CSV解析結果:', students); // 調試用

          for (const student of students) {
            console.log('處理學生資料:', student); // 調試用
            
            // 驗證必要欄位（只要求中文姓名和年級）
            if (!student.nameZh || !student.grade) {
              const errorMsg = `學生資料缺少必要欄位: nameZh=${student.nameZh}, grade=${student.grade}`;
              console.log(errorMsg);
              errorDetails.push(errorMsg);
              errorCount++;
              continue;
            }

            try {
              const res = await fetch(`${config.API_URL}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  studentId: student.studentId || '', // 如果CSV中有studentId則使用
                  nameZh: student.nameZh,
                  nameEn: student.nameEn || '',
                  grade: student.grade,
                  nickname: student.nickname || '',
                  phone: student.phone || '',
                  wechat: student.wechat || '',
                  contactMethod: student.contactMethod || '',
                  school: student.school || '',
                  notes: student.notes || ''
                })
              });

              if (res.ok) {
                const newStudent = await res.json();
                setStudents(prev => [...prev, newStudent]);
                successCount++;
                console.log('成功創建學生:', newStudent);
              } else {
                const errorData = await res.json();
                const errorMsg = `創建學生失敗: ${errorData.message || '未知錯誤'}`;
                console.log(errorMsg);
                errorDetails.push(errorMsg);
                errorCount++;
              }
            } catch (error) {
              const errorMsg = `網路錯誤: ${error.message}`;
              console.log(errorMsg);
              errorDetails.push(errorMsg);
              errorCount++;
            }
          }

          const message = `匯入完成！成功：${successCount} 筆，失敗：${errorCount} 筆`;
          if (errorDetails.length > 0) {
            console.log('錯誤詳情:', errorDetails);
            setCsvMessage(message + '\n錯誤詳情請查看瀏覽器控制台');
          } else {
            setCsvMessage(message);
          }
        } catch (error) {
          setCsvMessage('匯入失敗：' + error.message);
        } finally {
          setCsvLoading(false);
        }
      },
      error: (error) => {
        setCsvMessage('CSV 解析失敗：' + error.message);
        setCsvLoading(false);
      }
    });

    // 清除文件輸入
    event.target.value = '';
  };

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        {!embedded && <h1>新增學生資料</h1>}
        <div style={{ position: 'relative' }}>
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            disabled={csvLoading}
            style={{ display: 'none' }}
            id="csv-upload-student"
          />
          <label 
            htmlFor="csv-upload-student"
            style={{
              padding: '8px 16px',
              background: csvLoading ? '#6c757d' : '#0f766e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: csvLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!csvLoading) {
                e.target.style.background = '#0d5a52';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(15, 118, 110, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!csvLoading) {
                e.target.style.background = '#0f766e';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            {csvLoading ? '匯入中...' : '匯入 CSV'}
          </label>
        </div>
      </div>
      {csvMessage && (
        <div style={{ 
          marginBottom: '20px',
          padding: '8px 12px',
          color: csvMessage.includes('成功') ? '#155724' : '#721c24',
          background: csvMessage.includes('成功') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${csvMessage.includes('成功') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {csvMessage}
        </div>
      )}
      <form onSubmit={handleSubmit} className="course-form student-add-form">
        <div className="form-group">
          <label>學生ID</label>
          <input type="text" value={(() => {
            if (students.length === 0) return '1';
            const maxId = Math.max(...students.map(s => parseInt(s.studentId.replace(/\D/g, '')) || 0));
            return (maxId + 1).toString();
          })()} disabled />
        </div>
        <div className="form-group">
          <label>學生姓名（中文）</label>
          <input
            type="text"
            name="nameZh"
            value={form.nameZh}
            onChange={handleChange}
            placeholder="請輸入中文姓名"
            required
          />
        </div>
        <div className="form-group">
          <label>學生姓名（英文）</label>
          <input
            type="text"
            name="nameEn"
            value={form.nameEn}
            onChange={handleChange}
            placeholder="請輸入英文姓名"
          />
        </div>
        <div className="form-group">
          <label>暱稱</label>
          <input
            type="text"
            name="nickname"
            value={form.nickname}
            onChange={handleChange}
            placeholder="請輸入暱稱"
          />
        </div>
        <div className="form-group">
          <label>電話號碼</label>
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="請輸入電話號碼"
          />
        </div>
        <div className="form-group">
          <label>微信號碼</label>
          <input
            type="text"
            name="wechat"
            value={form.wechat}
            onChange={handleChange}
            placeholder="請輸入微信號碼"
          />
        </div>
        <div className="form-group">
          <label>聯絡方式</label>
          <select name="contactMethod" value={form.contactMethod} onChange={handleChange}>
            <option value="">請選擇聯絡方式</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="微信">微信</option>
          </select>
        </div>
        <div className="form-group">
          <label>年級</label>
          <select name="grade" value={form.grade} onChange={handleChange} required>
            <option value="">請選擇年級</option>
            <option value="中一">中一</option>
            <option value="中二">中二</option>
            <option value="中三">中三</option>
            <option value="中四">中四</option>
            <option value="中五">中五</option>
            <option value="中六">中六</option>
          </select>
        </div>
        <div className="form-group">
          <label>學校</label>
          <input
            type="text"
            name="school"
            value={form.school}
            onChange={handleChange}
            placeholder="請輸入學校名稱"
          />
        </div>
        <div className="form-group student-notes-field">
          <label>備註</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="請輸入備註"
            rows="1"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div className="student-submit-row">
          <button type="submit" disabled={loading}>{loading ? '新增中...' : '新增學生'}</button>
        </div>
      </form>
      
      {/* 確認彈窗 */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="確認新增學生"
        message={confirmData ? `
          <div style="text-align: left; line-height: 1.6;">
            <p><strong>中文姓名：</strong>${confirmData.nameZh}</p>
            <p><strong>英文姓名：</strong>${confirmData.nameEn}</p>
            <p><strong>年級：</strong>${confirmData.grade}</p>
            <p><strong>暱稱：</strong>${confirmData.nickname}</p>
            <p><strong>電話號碼：</strong>${confirmData.phone}</p>
            <p><strong>微信號碼：</strong>${confirmData.wechat}</p>
            <p><strong>聯絡方式：</strong>${confirmData.contactMethod}</p>
            <p><strong>學校：</strong>${confirmData.school}</p>
            <p><strong>備註：</strong>${confirmData.notes}</p>
            <p style="margin-top: 16px; color: #666; font-size: 14px;">
              請確認以上資料是否正確，確認後將新增此學生。
            </p>
          </div>
        ` : ''}
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
        confirmText="確定新增"
        cancelText="取消"
      />
    </div>
  );
}

function TeacherPage({ initialTab = 'add' }) {
  const [activeTab, setActiveTab] = React.useState(initialTab);

  return (
    <div>
      <div className="page-tab-header">
        <h1>教師</h1>
        <div className="mode-toggle">
          <button
            type="button"
            className={activeTab === 'add' ? 'active' : ''}
            onClick={() => setActiveTab('add')}
          >
            新增
          </button>
          <button
            type="button"
            className={activeTab === 'manage' ? 'active' : ''}
            onClick={() => setActiveTab('manage')}
          >
            管理
          </button>
        </div>
      </div>
      {activeTab === 'add' ? <AddTeacher embedded /> : <TeacherList embedded />}
    </div>
  );
}

function AddTeacher({ embedded = false }) {
  const [form, setForm] = React.useState({
    name: '',
    phone: ''
  });
  const [teachers, setTeachers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [csvLoading, setCsvLoading] = React.useState(false);
  const [csvMessage, setCsvMessage] = React.useState('');
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [confirmData, setConfirmData] = React.useState(null);

  React.useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await fetch(`${config.API_URL}/teachers`);
      const data = await response.json();
      setTeachers(data);
    } catch (error) {
      console.error('獲取教師數據失敗:', error);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 驗證必填欄位
    if (!form.name) {
      alert('請填寫教師姓名');
      return;
    }
    
    // 設置確認數據並顯示彈窗
    setConfirmData({
      name: form.name,
      phone: form.phone || '無'
    });
    setShowConfirmModal(true);
  };

  // 處理確認彈窗的確認操作
  const handleConfirmSubmit = async () => {
    setLoading(true);
    setShowConfirmModal(false);
    
    try {
      const res = await fetch(`${config.API_URL}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setTeachers((prev) => [...prev, data]);
      setForm({ name: '', phone: '' });
    } catch (error) {
      console.error('新增教師時發生錯誤:', error);
      alert('❌ 新增教師時發生錯誤，請重試');
    } finally {
      setLoading(false);
    }
  };

  // 處理確認彈窗的取消操作
  const handleCancelSubmit = () => {
    setShowConfirmModal(false);
    setConfirmData(null);
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvLoading(true);
    setCsvMessage('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: async (results) => {
        try {
          const teachers = results.data;
          let successCount = 0;
          let errorCount = 0;

          for (const teacher of teachers) {
            // 驗證必要欄位
            if (!teacher.name) {
              errorCount++;
              continue;
            }

            try {
              const res = await fetch(`${config.API_URL}/teachers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: teacher.name,
                  phone: teacher.phone || ''
                })
              });

              if (res.ok) {
                const newTeacher = await res.json();
                setTeachers(prev => [...prev, newTeacher]);
                successCount++;
              } else {
                errorCount++;
              }
            } catch (error) {
              errorCount++;
            }
          }

          setCsvMessage(`匯入完成！成功：${successCount} 筆，失敗：${errorCount} 筆`);
        } catch (error) {
          setCsvMessage('匯入失敗：' + error.message);
        } finally {
          setCsvLoading(false);
        }
      },
      error: (error) => {
        setCsvMessage('CSV 解析失敗：' + error.message);
        setCsvLoading(false);
      }
    });

    // 清除文件輸入
    event.target.value = '';
  };

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        {!embedded && <h1>新增教師資料</h1>}
        <div style={{ position: 'relative' }}>
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            disabled={csvLoading}
            style={{ display: 'none' }}
            id="csv-upload-teacher"
          />
          <label 
            htmlFor="csv-upload-teacher"
            style={{
              padding: '8px 16px',
              background: csvLoading ? '#6c757d' : '#0f766e',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: csvLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!csvLoading) {
                e.target.style.background = '#0d5a52';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(15, 118, 110, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!csvLoading) {
                e.target.style.background = '#0f766e';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            {csvLoading ? '匯入中...' : '匯入 CSV'}
          </label>
        </div>
      </div>
      {csvMessage && (
        <div style={{ 
          marginBottom: '20px',
          padding: '8px 12px',
          color: csvMessage.includes('成功') ? '#155724' : '#721c24',
          background: csvMessage.includes('成功') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${csvMessage.includes('成功') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          {csvMessage}
        </div>
      )}
      <div className="class-main-flex">
        <form onSubmit={handleSubmit} className="course-form class-form-left">
          <div className="form-group">
            <label>教師ID（自動生成）</label>
            <input type="text" value={teachers.length + 1} disabled />
          </div>
          <div className="form-group">
            <label>教師姓名</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="請輸入教師姓名" />
          </div>
          <div className="form-group">
            <label>電話號碼</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="請輸入電話號碼" />
          </div>
          <button type="submit" disabled={loading}>{loading ? '新增中...' : '新增教師'}</button>
        </form>
        <div className="class-form-right">
          <div className="class-form-right-title">教師列表</div>
          <div className="course-list-scroll">
            <table className="course-table">
              <thead>
                <tr>
                  <th>教師ID</th>
                  <th>教師姓名</th>
                  <th>電話號碼</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => (
                  <tr key={t._id || t.teacherId}>
                    <td>{t.teacherId}</td>
                    <td>{t.name}</td>
                    <td>{t.phone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* 確認彈窗 */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="確認新增教師"
        message={confirmData ? `
          <div style="text-align: left; line-height: 1.6;">
            <p><strong>教師姓名：</strong>${confirmData.name}</p>
            <p><strong>電話號碼：</strong>${confirmData.phone}</p>
            <p style="margin-top: 16px; color: #666; font-size: 14px;">
              請確認以上資料是否正確，確認後將新增此教師。
            </p>
          </div>
        ` : ''}
        onConfirm={handleConfirmSubmit}
        onCancel={handleCancelSubmit}
        confirmText="確定新增"
        cancelText="取消"
      />
    </div>
  );
}

function ClassList({ embedded = false }) {
  const [classes, setClasses] = React.useState([]);
  const [students, setStudents] = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [teachers, setTeachers] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [editingClass, setEditingClass] = React.useState(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  // 新增：勾選刪除功能狀態
  const [selectedClasses, setSelectedClasses] = React.useState(new Set());
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = React.useState(false);
  // 新增：排序功能狀態
  const [sortConfig, setSortConfig] = React.useState({
    date: 'default',
    student: 'default',
    course: 'default'
  });
  const pageSize = 100;
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [classesRes, studentsRes, coursesRes, teachersRes] = await Promise.all([
        fetch(`${config.API_URL}/classes`),
        fetch(`${config.API_URL}/students`),
        fetch(`${config.API_URL}/courses`),
        fetch(`${config.API_URL}/teachers`)
      ]);

      const classesData = await classesRes.json();
      const studentsData = await studentsRes.json();
      const coursesData = await coursesRes.json();
      const teachersData = await teachersRes.json();

      setClasses(classesData);
      setStudents(studentsData);
      setCourses(coursesData);
      setTeachers(teachersData);
    } catch (error) {
      console.error('獲取數據失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (classId) => {
    setDeleteTarget(classId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`${config.API_URL}/classes/${deleteTarget}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setShowDeleteModal(false);
        fetchAllData();
      } else {
        alert('刪除失敗');
      }
    } catch (error) {
      alert('刪除失敗');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const toDateInputValue = (dateStr) => {
    if (!dateStr) return '';
    const text = String(dateStr).trim();
    const dateMatch = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleEdit = (cls) => {
    // 將各種日期格式轉換為 YYYY-MM-DD，以適應 date input。
    const formattedClass = {
      ...cls,
      date: toDateInputValue(cls.date)
    };
    setEditingClass(formattedClass);
    setShowEditModal(true);
  };

  const handleSave = async (data) => {
    try {
      // 將日期格式從 YYYY-MM-DD 轉換回 YYYY/MM/DD
      const formattedData = {
        ...data,
        date: data.date ? data.date.replace(/-/g, '/') : data.date
      };
      
      const response = await fetch(`${config.API_URL}/classes/${editingClass._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formattedData)
      });
      if (response.ok) {
        setShowEditModal(false);
        fetchAllData();
      } else {
        alert('更新失敗');
      }
    } catch (error) {
      alert('更新失敗');
    }
  };

  const handleCancel = () => {
    setShowEditModal(false);
    setEditingClass(null);
  };

  // 新增：處理勾選刪除功能
  const handleSelectClass = (classId) => {
    setSelectedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  const handleSelectAllClasses = () => {
    const currentPageIds = paginatedClasses.map(cls => cls._id);
    const isCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedClasses.has(id));

    setSelectedClasses(prev => {
      const next = new Set(prev);
      if (isCurrentPageSelected) {
        currentPageIds.forEach(id => next.delete(id));
      } else {
        currentPageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedClasses.size === 0) {
      alert('請先勾選要刪除的課堂資料');
      return;
    }
    setShowDeleteSelectedModal(true);
  };

  const handleConfirmDeleteSelected = async () => {
    try {
      const deletePromises = Array.from(selectedClasses).map(classId =>
        fetch(`${config.API_URL}/classes/${classId}`, {
          method: 'DELETE'
        })
      );

      await Promise.all(deletePromises);
      
      setShowDeleteSelectedModal(false);
      setSelectedClasses(new Set());
      fetchAllData(); // 重新載入數據
    } catch (error) {
      console.error('刪除失敗:', error);
      alert('刪除失敗，請重試');
    }
  };

  const handleCancelDeleteSelected = () => {
    setShowDeleteSelectedModal(false);
  };

  // 格式化日期顯示
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const classFields = [
    { name: 'date', label: '課堂日期', type: 'date', required: true },
    { 
      name: 'courseId', 
      label: '課程', 
      type: 'select', 
      required: true,
      options: courses.map(c => ({
        value: c.courseId,
        label: `${c.courseId} ${c.grade}${c.subject}`
      }))
    },
    { name: 'price', label: '價格', type: 'number', required: true },
    { 
      name: 'studentId', 
      label: '學生', 
      type: 'select', 
      required: true,
      options: students.map(s => ({
        value: s.studentId,
        label: `${s.studentId} - ${s.nameZh} (${s.nameEn})${s.nickname ? ` [${s.nickname}]` : ''}`
      }))
    }
  ];


  const studentMap = React.useMemo(
    () => Object.fromEntries(students.map(s => [s.studentId, s])),
    [students]
  );
  const courseMap = React.useMemo(
    () => Object.fromEntries(courses.map(c => [c.courseId, c])),
    [courses]
  );
  const teacherMap = React.useMemo(
    () => Object.fromEntries(teachers.map(t => [t.teacherId, t])),
    [teachers]
  );

  const [studentFilter, setStudentFilter] = React.useState('');
  const [studentDisplay, setStudentDisplay] = React.useState('');
  const [monthFilter, setMonthFilter] = React.useState('');
  const [monthDisplay, setMonthDisplay] = React.useState('');
  const [teacherFilter, setTeacherFilter] = React.useState('');
  const [teacherDisplay, setTeacherDisplay] = React.useState('');
  const [courseFilter, setCourseFilter] = React.useState('');
  const [courseDisplay, setCourseDisplay] = React.useState('');
  const allMonths = React.useMemo(() => (
    Array.from(new Set(classes.map(cls => {
      if (!cls.date) return null;
      const date = new Date(cls.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // getMonth() 返回 0-11，所以 +1
      return `${year}/${month}`;
    }))).filter(Boolean)
  ), [classes]);

  // 學生選項過濾
  const filteredStudents = students.filter(s =>
    s.studentId.includes(studentFilter) ||
    (s.nameZh && s.nameZh.includes(studentFilter)) ||
    (s.nameEn && s.nameEn.toLowerCase().includes(studentFilter.toLowerCase())) ||
    (s.nickname && s.nickname.includes(studentFilter))
  );
  // 月份選項過濾
  const filteredMonths = allMonths.filter(m => m.includes(monthFilter));
  // 教師選項過濾
  const filteredTeachers = teachers.filter(t =>
    t.teacherId.includes(teacherFilter) ||
    (t.name && t.name.includes(teacherFilter))
  );
  // 課程選項過濾
  const filteredCourses = courses.filter(c =>
    c.courseId.includes(courseFilter) ||
    (c.subject && c.subject.includes(courseFilter)) ||
    (c.grade && c.grade.includes(courseFilter))
  );

  // 新增：排序功能
  const sortClasses = React.useCallback((classesToSort) => {
    if (
      sortConfig.date === 'default' &&
      sortConfig.student === 'default' &&
      sortConfig.course === 'default'
    ) {
      return [...classesToSort].reverse();
    }

    return [...classesToSort].sort((a, b) => {
      // 課堂日期排序
      if (sortConfig.date !== 'default') {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (sortConfig.date === '由遠至近') {
          return dateA - dateB;
        } else if (sortConfig.date === '由近至遠') {
          return dateB - dateA;
        }
      }

      // 學生資料排序（按ID）
      if (sortConfig.student !== 'default') {
        const studentA = studentMap[String(a.studentId)] || {};
        const studentB = studentMap[String(b.studentId)] || {};
        const idA = parseInt(studentA.studentId) || 0;
        const idB = parseInt(studentB.studentId) || 0;
        if (sortConfig.student === '由大至小') {
          return idB - idA;
        } else if (sortConfig.student === '由小至大') {
          return idA - idB;
        }
      }

      // 課程資料排序（按ID）
      if (sortConfig.course !== 'default') {
        const courseA = courseMap[String(a.courseId)] || {};
        const courseB = courseMap[String(b.courseId)] || {};
        const idA = parseInt(courseA.courseId) || 0;
        const idB = parseInt(courseB.courseId) || 0;
        if (sortConfig.course === '由大至小') {
          return idB - idA;
        } else if (sortConfig.course === '由小至大') {
          return idA - idB;
        }
      }

      return 0;
    });
  }, [sortConfig, studentMap, courseMap]);

  const selectedStudentId = React.useMemo(() => {
    if (!studentDisplay || studentDisplay === '全部') return '';
    const student = students.find(s => `${s.studentId} - ${s.nameZh}（${s.nameEn}）${s.nickname ? ` [${s.nickname}]` : ''}` === studentDisplay);
    return student?.studentId || '';
  }, [studentDisplay, students]);

  const selectedTeacherId = React.useMemo(() => {
    if (!teacherDisplay || teacherDisplay === '全部') return '';
    const teacher = teachers.find(t => `${t.teacherId} - ${t.name}` === teacherDisplay);
    return teacher?.teacherId || '';
  }, [teacherDisplay, teachers]);

  const selectedCourseId = React.useMemo(() => {
    if (!courseDisplay || courseDisplay === '全部') return '';
    const course = courses.find(c => `${c.courseId} ${c.grade}${c.subject}` === courseDisplay);
    return course?.courseId || '';
  }, [courseDisplay, courses]);

  const selectedMonth = allMonths.includes(monthDisplay) ? monthDisplay : '';

  const filteredClasses = React.useMemo(() => {
    const classesToFilter = classes.filter(cls => {
      const matchStudent = selectedStudentId ? cls.studentId === selectedStudentId : true;
      const matchMonth = selectedMonth
        ? (() => {
            if (!cls.date) return false;
            const date = new Date(cls.date);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            return `${year}/${month}` === selectedMonth;
          })()
        : true;
      const matchTeacher = selectedTeacherId
        ? (() => {
            const course = courseMap[String(cls.courseId)] || {};
            return String(course.teacherId) === String(selectedTeacherId);
          })()
        : true;
      const matchCourse = selectedCourseId ? cls.courseId === selectedCourseId : true;
      return matchStudent && matchMonth && matchTeacher && matchCourse;
    });

    return sortClasses(classesToFilter);
  }, [
    classes,
    selectedStudentId,
    selectedMonth,
    selectedTeacherId,
    selectedCourseId,
    courseMap,
    sortClasses
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / pageSize));
  const pageStartIndex = (currentPage - 1) * pageSize;
  const pageEndIndex = Math.min(pageStartIndex + pageSize, filteredClasses.length);
  const paginatedClasses = React.useMemo(
    () => filteredClasses.slice(pageStartIndex, pageEndIndex),
    [filteredClasses, pageStartIndex, pageEndIndex]
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedStudentId, selectedMonth, selectedTeacherId, selectedCourseId, sortConfig]);

  React.useEffect(() => {
    setCurrentPage(prev => Math.min(prev, totalPages));
  }, [totalPages]);

  // 新增：處理排序變更，自動重置其他列排序
  const handleSortChange = (column, value) => {
    setSortConfig(prev => {
      const newConfig = { ...prev };
      
      // 如果選擇了新的排序（不是默認），則重置其他列為默認
      if (value !== 'default') {
        Object.keys(newConfig).forEach(key => {
          if (key !== column) {
            newConfig[key] = 'default';
          }
        });
      }
      
      newConfig[column] = value;
      return newConfig;
    });
  };

  // 資料未載入時顯示 loading
  if (isLoading) {
    return <div>資料載入中...</div>;
  }

  return (
    <div className="content">
      {!embedded && <h1>課堂列表</h1>}
      
      <div className="filter-section">
        <div className="filter-container">
          <div className="filter-group">
            <label>學生</label>
            <input
              type="text"
              className="filter-input"
              value={studentDisplay}
              onChange={e => { setStudentDisplay(e.target.value); setStudentFilter(e.target.value); }}
              placeholder="請輸入學生ID、姓名或暱稱"
              autoComplete="off"
            />
            {studentFilter && (
              <ul className="dropdown">
                <li key="all" onClick={() => { setStudentDisplay('全部'); setStudentFilter(''); }}>
                  全部
                </li>
                {filteredStudents.map(s => (
                  <li key={s.studentId} onClick={() => { setStudentDisplay(`${s.studentId} - ${s.nameZh}（${s.nameEn}）${s.nickname ? ` [${s.nickname}]` : ''}`); setStudentFilter(''); }}>
                    {s.studentId} - {s.nameZh}（{s.nameEn}）{s.nickname ? ` [${s.nickname}]` : ''}
                  </li>
                ))}
                {filteredStudents.length === 0 && <li>無符合選項</li>}
              </ul>
            )}
          </div>
          
          <div className="filter-group">
            <label>月份</label>
            <input
              type="text"
              className="filter-input"
              value={monthDisplay}
              onChange={e => { setMonthDisplay(e.target.value); setMonthFilter(e.target.value); }}
              placeholder="請輸入月份 例:2025/7"
              autoComplete="off"
            />
            {monthFilter && (
              <ul className="dropdown">
                <li key="all" onClick={() => { setMonthDisplay('全部'); setMonthFilter(''); }}>
                  全部
                </li>
                {filteredMonths.map(m => (
                  <li key={m} onClick={() => { setMonthDisplay(m); setMonthFilter(''); }}>{m}</li>
                ))}
                {filteredMonths.length === 0 && <li>無符合選項</li>}
              </ul>
            )}
          </div>
          
          <div className="filter-group">
            <label>教師</label>
            <input
              type="text"
              className="filter-input"
              value={teacherDisplay}
              onChange={e => { setTeacherDisplay(e.target.value); setTeacherFilter(e.target.value); }}
              placeholder="請輸入教師ID或姓名"
              autoComplete="off"
            />
            {teacherFilter && (
              <ul className="dropdown">
                <li key="all" onClick={() => { setTeacherDisplay('全部'); setTeacherFilter(''); }}>
                  全部
                </li>
                {filteredTeachers.map(t => (
                  <li key={t.teacherId} onClick={() => { setTeacherDisplay(`${t.teacherId} - ${t.name}`); setTeacherFilter(''); }}>
                    {t.teacherId} - {t.name}
                  </li>
                ))}
                {filteredTeachers.length === 0 && <li>無符合選項</li>}
              </ul>
            )}
          </div>
          
          <div className="filter-group">
            <label>課程</label>
            <input
              type="text"
              className="filter-input"
              value={courseDisplay}
              onChange={e => { setCourseDisplay(e.target.value); setCourseFilter(e.target.value); }}
              placeholder="請輸入課程ID、科目或年級"
              autoComplete="off"
            />
            {courseFilter && (
              <ul className="dropdown">
                <li key="all" onClick={() => { setCourseDisplay('全部'); setCourseFilter(''); }}>
                  全部
                </li>
                {filteredCourses.map(c => (
                  <li key={c.courseId} onClick={() => { setCourseDisplay(`${c.courseId} ${c.grade}${c.subject}`); setCourseFilter(''); }}>
                    {c.courseId} {c.grade}{c.subject}
                  </li>
                ))}
                {filteredCourses.length === 0 && <li>無符合選項</li>}
              </ul>
            )}
          </div>
          
          <div className="filter-buttons">
            <button 
              className="filter-button clear"
              onClick={() => {
                setStudentDisplay('');
                setMonthDisplay('');
                setTeacherDisplay('');
                setCourseDisplay('');
                setStudentFilter('');
                setMonthFilter('');
                setTeacherFilter('');
                setCourseFilter('');
              }}
            >
              清除篩選
            </button>
            <button 
              className="filter-button delete-selected"
              onClick={handleDeleteSelected}
              disabled={selectedClasses.size === 0}
              style={{ 
                backgroundColor: selectedClasses.size > 0 ? '#fd7e14' : '#6c757d', 
                color: 'white',
                cursor: selectedClasses.size > 0 ? 'pointer' : 'not-allowed'
              }}
            >
              刪除勾選 ({selectedClasses.size})
            </button>
          </div>
        </div>
      </div>
      
      {/* 顯示當前篩選條件 */}
      {(studentDisplay || monthDisplay || teacherDisplay || courseDisplay) && (
        <div style={{ marginBottom: '20px', padding: '10px', background: '#e9ecef', borderRadius: '4px' }}>
          <strong>當前篩選：</strong>
          {studentDisplay && <span style={{ marginRight: '20px' }}>學生：{studentDisplay}</span>}
          {monthDisplay && <span style={{ marginRight: '20px' }}>月份：{monthDisplay}</span>}
          {teacherDisplay && <span style={{ marginRight: '20px' }}>教師：{teacherDisplay}</span>}
          {courseDisplay && <span>課程：{courseDisplay}</span>}
        </div>
      )}
      
      <div className="pagination-bar">
        <div className="pagination-info">
          共 {filteredClasses.length} 筆資料，
          目前顯示 {filteredClasses.length === 0 ? 0 : pageStartIndex + 1}-{pageEndIndex} 筆
        </div>
        <div className="pagination-controls">
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            第一頁
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            上一頁
          </button>
          <span>
            第 {currentPage} / {totalPages} 頁
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            下一頁
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            最後一頁
          </button>
        </div>
      </div>

      <div className="course-list-scroll">
        <table className="course-table">
          <thead>
            <tr>
              <th>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={paginatedClasses.length > 0 && paginatedClasses.every(cls => selectedClasses.has(cls._id))}
                    onChange={handleSelectAllClasses}
                    style={{ marginRight: '8px' }}
                  />
                  <span>課堂日期</span>
                  <div className="sort-dropdown-container">
                    <select 
                      value={sortConfig.date} 
                      onChange={(e) => handleSortChange('date', e.target.value)}
                      className="sort-dropdown"
                    >
                      <option value="default">默認</option>
                      <option value="由遠至近">由遠至近</option>
                      <option value="由近至遠">由近至遠</option>
                    </select>
                  </div>
                </div>
              </th>
              <th>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>學生資料</span>
                  <div className="sort-dropdown-container">
                    <select 
                      value={sortConfig.student} 
                      onChange={(e) => handleSortChange('student', e.target.value)}
                      className="sort-dropdown"
                    >
                      <option value="default">默認</option>
                      <option value="由大至小">由大至小</option>
                      <option value="由小至大">由小至大</option>
                    </select>
                  </div>
                </div>
              </th>
              <th>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>課程資料</span>
                  <div className="sort-dropdown-container">
                    <select 
                      value={sortConfig.course} 
                      onChange={(e) => handleSortChange('course', e.target.value)}
                      className="sort-dropdown"
                    >
                      <option value="default">默認</option>
                      <option value="由大至小">由大至小</option>
                      <option value="由小至大">由小至大</option>
                    </select>
                  </div>
                </div>
              </th>
              <th>老師</th>
              <th>價格</th>
              <th>電話號碼</th>
              <th>操作</th>
            </tr>
          </thead>
                      <tbody>
            {paginatedClasses.map(cls => {
              const stu = studentMap[String(cls.studentId)] || {};
              const course = courseMap[String(cls.courseId)] || {};
              const teacher = teacherMap[String(course.teacherId)] || {};
              return (
                <tr key={cls._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedClasses.has(cls._id)}
                      onChange={() => handleSelectClass(cls._id)}
                      style={{ marginRight: '8px' }}
                    />
                    {formatDate(cls.date)}
                  </td>
                  <td>
                    {cls.studentId}
                    {stu.nameZh ? ` - ${stu.nameZh}（${stu.nameEn}）${stu.nickname ? ` [${stu.nickname}]` : ''}` : ' - 查無學生'}
                  </td>
                  <td>
                    {course.courseId ? `${course.courseId} ${course.grade}${course.subject}` : '查無課程'}
                  </td>
                  <td>
                    {teacher.teacherId ? `${teacher.teacherId}-${teacher.name}` : '查無老師'}
                  </td>
                  <td>${cls.price}</td>
                  <td>{stu.phone || '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-button edit" onClick={() => handleEdit(cls)}>編輯</button>
                      <button className="action-button delete" onClick={() => handleDelete(cls._id)}>刪除</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EditModal
        isOpen={showEditModal}
        onClose={handleCancel}
        onSave={handleSave}
        title="編輯課堂資料"
        fields={classFields}
        data={editingClass}
        setData={setEditingClass}
      />
      
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="確認刪除"
        message="確定要刪除這個課堂嗎？"
      />

      {/* 刪除勾選確認彈窗 */}
      {showDeleteSelectedModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>確認刪除勾選資料</h3>
            <p>確定要刪除已勾選的 {selectedClasses.size} 個課堂資料嗎？</p>
            <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
              此操作無法撤銷！
            </p>
            <div className="modal-buttons" style={{ marginTop: '20px' }}>
              <button 
                onClick={handleCancelDeleteSelected}
                style={{ 
                  backgroundColor: '#6c757d', 
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  marginRight: '10px'
                }}
              >
                取消
              </button>
              <button 
                onClick={handleConfirmDeleteSelected}
                style={{ 
                  backgroundColor: '#dc3545', 
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentList({ embedded = false }) {
  const [students, setStudents] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [editingStudent, setEditingStudent] = React.useState(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  
  // 搜索功能狀態
  const [searchFilter, setSearchFilter] = React.useState('');
  const [searchDisplay, setSearchDisplay] = React.useState('');

  React.useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/students`);
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error('獲取學生數據失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (studentId) => {
    setDeleteTarget(studentId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`${config.API_URL}/students/${deleteTarget}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setShowDeleteModal(false);
        setDeleteTarget(null);
        window.location.reload();
      } else {
        alert('刪除失敗');
      }
    } catch (error) {
      alert('刪除失敗');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const handleEdit = (student) => {
    setEditingStudent({
      ...student,
      contactMethod: student.contactMethod || ''
    });
    setShowEditModal(true);
  };

  const handleSave = async (data) => {
    try {
      const response = await fetch(`${config.API_URL}/students/${editingStudent._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setShowEditModal(false);
        setEditingStudent(null);
        window.location.reload();
      } else {
        alert('更新失敗');
      }
    } catch (error) {
      alert('更新失敗');
    }
  };

  const handleCancel = () => {
    setShowEditModal(false);
    setEditingStudent(null);
  };

  // 搜索邏輯
  const filteredStudents = students.filter(student => {
    if (searchDisplay === '' || searchDisplay === '全部') {
      return true;
    }
    
    // 檢查是否是從下拉選項選擇的完整顯示文本
    const studentDisplayText = `${student.studentId} - ${student.nameZh}（${student.nameEn}）${student.nickname ? ` [${student.nickname}]` : ''}`;
    if (searchDisplay === studentDisplayText) {
      return true;
    }
    
    // 如果不是完整匹配，則進行部分匹配
    return (student.studentId && student.studentId.includes(searchDisplay)) ||
           (student.nameZh && student.nameZh.includes(searchDisplay)) ||
           (student.nameEn && student.nameEn.toLowerCase().includes(searchDisplay.toLowerCase())) ||
           (student.nickname && student.nickname.includes(searchDisplay)) ||
           (student.contactMethod && student.contactMethod.includes(searchDisplay)) ||
           (student.notes && student.notes.includes(searchDisplay));
  });

  // 搜索選項過濾
  const searchOptions = students.filter(student =>
    (student.studentId && student.studentId.includes(searchFilter)) ||
    (student.nameZh && student.nameZh.includes(searchFilter)) ||
    (student.nameEn && student.nameEn.toLowerCase().includes(searchFilter.toLowerCase())) ||
    (student.nickname && student.nickname.includes(searchFilter)) ||
    (student.contactMethod && student.contactMethod.includes(searchFilter)) ||
    (student.notes && student.notes.includes(searchFilter))
  );

  const studentFields = [
    { name: 'nameZh', label: '中文姓名', type: 'text', required: true },
    { name: 'nameEn', label: '英文姓名', type: 'text', required: false },
    { name: 'nickname', label: '暱稱', type: 'text' },
    { 
      name: 'grade', 
      label: '年級', 
      type: 'select', 
      required: true,
      options: [
        { value: '中一', label: '中一' },
        { value: '中二', label: '中二' },
        { value: '中三', label: '中三' },
        { value: '中四', label: '中四' },
        { value: '中五', label: '中五' },
        { value: '中六', label: '中六' }
      ]
    },
    { name: 'phone', label: '電話號碼', type: 'text' },
    { name: 'wechat', label: '微信號碼', type: 'text' },
    {
      name: 'contactMethod',
      label: '聯絡方式',
      type: 'select',
      options: [
        { value: 'WhatsApp', label: 'WhatsApp' },
        { value: '微信', label: '微信' }
      ]
    },
    { name: 'school', label: '學校', type: 'text' },
    { name: 'notes', label: '備註', type: 'textarea' }
  ];

  if (isLoading) {
    return (
      <div className="content">
        {!embedded && <h1>學生列表</h1>}
        <p>資料載入中...</p>
      </div>
    );
  }

  return (
    <div className="content">
      {!embedded && <h1>學生列表</h1>}
      
      <div className="filter-section">
        <div className="filter-container">
          <div className="filter-group">
            <label>搜索學生</label>
            <input
              type="text"
              className="filter-input"
              value={searchDisplay}
              onChange={e => { setSearchDisplay(e.target.value); setSearchFilter(e.target.value); }}
              placeholder="請輸入學生資料"
              autoComplete="off"
            />
            {searchFilter && (
              <ul className="dropdown">
                <li key="all" onClick={() => { setSearchDisplay('全部'); setSearchFilter(''); }}>
                  全部
                </li>
                {searchOptions.map(student => (
                  <li key={student.studentId} onClick={() => { 
                    setSearchDisplay(`${student.studentId} - ${student.nameZh}（${student.nameEn}）${student.nickname ? ` [${student.nickname}]` : ''}`); 
                    setSearchFilter(''); 
                  }}>
                    {student.studentId} - {student.nameZh}（{student.nameEn}）{student.nickname ? ` [${student.nickname}]` : ''}
                  </li>
                ))}
                {searchOptions.length === 0 && <li>無符合選項</li>}
              </ul>
            )}
          </div>
          
          <div className="filter-buttons">
            <button 
              className="filter-button clear"
              onClick={() => {
                setSearchDisplay('');
                setSearchFilter('');
              }}
            >
              清除搜索
            </button>
          </div>
        </div>
      </div>
      
      {/* 顯示當前搜索條件 */}
      {searchDisplay && (
        <div style={{ marginBottom: '20px', padding: '10px', background: '#e9ecef', borderRadius: '4px' }}>
          <strong>當前搜索：</strong>
          {searchDisplay}
        </div>
      )}
      
      <div className="course-list-scroll">
        <table className="course-table">
          <thead>
            <tr>
              <th>學生ID</th>
              <th>中文姓名</th>
              <th>英文姓名</th>
              <th>暱稱</th>
              <th>年級</th>
              <th>電話號碼</th>
              <th>微信號碼</th>
              <th>聯絡方式</th>
              <th>學校</th>
              <th>備註</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student._id}>
                <td>{student.studentId}</td>
                <td>{student.nameZh}</td>
                <td>{student.nameEn}</td>
                <td>{student.nickname || '-'}</td>
                <td>{student.grade}</td>
                <td>{student.phone || '-'}</td>
                <td>{student.wechat || '-'}</td>
                <td>{student.contactMethod || '-'}</td>
                <td>{student.school || '-'}</td>
                <td>{student.notes || '-'}</td>
                <td>
                  <div className="action-buttons">
                    <button className="action-button edit" onClick={() => handleEdit(student)}>編輯</button>
                    <button className="action-button delete" onClick={() => handleDelete(student._id)}>刪除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditModal
        isOpen={showEditModal}
        onClose={handleCancel}
        onSave={handleSave}
        title="編輯學生資料"
        fields={studentFields}
        data={editingStudent}
        setData={setEditingStudent}
      />
      
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="確認刪除"
        message="確定要刪除這個學生嗎？"
      />
    </div>
  );
}

function CourseList({ embedded = false }) {
  const [courses, setCourses] = React.useState([]);
  const [teachers, setTeachers] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  
  // 篩選功能狀態
  const [subjectFilter, setSubjectFilter] = React.useState('');
  const [subjectDisplay, setSubjectDisplay] = React.useState('');
  const [gradeFilter, setGradeFilter] = React.useState('');
  const [gradeDisplay, setGradeDisplay] = React.useState('');
  const [teacherFilter, setTeacherFilter] = React.useState('');
  const [teacherDisplay, setTeacherDisplay] = React.useState('');
  
  // 一鍵刪除功能狀態
  const [showDeleteAllModal, setShowDeleteAllModal] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');

  React.useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, teachersRes] = await Promise.all([
        fetch(`${config.API_URL}/courses`),
        fetch(`${config.API_URL}/teachers`)
      ]);

      const coursesData = await coursesRes.json();
      const teachersData = await teachersRes.json();

      setCourses(coursesData);
      setTeachers(teachersData);
    } catch (error) {
      console.error('獲取數據失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (courseId) => {
    setDeleteTarget(courseId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`${config.API_URL}/courses/${deleteTarget}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setShowDeleteModal(false);
        setDeleteTarget(null);
        window.location.reload();
      } else {
        alert('刪除失敗');
      }
    } catch (error) {
      alert('刪除失敗');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setShowEditModal(true);
  };

  const handleSave = async (data) => {
    try {
      const response = await fetch(`${config.API_URL}/courses/${editingCourse._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setShowEditModal(false);
        setEditingCourse(null);
        window.location.reload();
      } else {
        alert('更新失敗');
      }
    } catch (error) {
      alert('更新失敗');
    }
  };

  const handleCancel = () => {
    setShowEditModal(false);
    setEditingCourse(null);
  };

  // 篩選邏輯
  const filteredCourses = courses.filter(course => {
    const teacher = teachers.find(t => t.teacherId === course.teacherId);
    // const teacherName = teacher ? teacher.name : '';
    
    return (
      (subjectDisplay === '' || subjectDisplay === '全部' || course.subject === subjectDisplay) &&
      (gradeDisplay === '' || gradeDisplay === '全部' || course.grade === gradeDisplay) &&
      (teacherDisplay === '' || teacherDisplay === '全部' || 
       `${teacher?.teacherId} - ${teacher?.name}` === teacherDisplay)
    );
  });

  // 科目選項過濾
  const filteredSubjects = Array.from(new Set(courses.map(c => c.subject))).filter(s =>
    s.includes(subjectFilter)
  );
  
  // 年級選項過濾
  const filteredGrades = ['中一', '中二', '中三', '中四', '中五', '中六'].filter(g =>
    g.includes(gradeFilter)
  );
  
  // 教師選項過濾
  const filteredTeachers = teachers.filter(t =>
    t.teacherId.includes(teacherFilter) ||
    (t.name && t.name.includes(teacherFilter))
  );

  // 一鍵刪除功能
  const handleDeleteAll = () => {
    setShowDeleteAllModal(true);
  };

  const handleConfirmDeleteAll = async () => {
    if (deleteConfirmText !== '刪除') {
      alert('請輸入"刪除"以確認操作');
      return;
    }

    try {
      // 獲取當前篩選後顯示的課程ID列表
      const courseIdsToDelete = filteredCourses.map(course => course._id);
      
      if (courseIdsToDelete.length === 0) {
        alert('沒有可刪除的課程資料');
        setShowDeleteAllModal(false);
        setDeleteConfirmText('');
        return;
      }

      // 並行刪除所有課程
      const deletePromises = courseIdsToDelete.map(courseId =>
        fetch(`${config.API_URL}/courses/${courseId}`, {
          method: 'DELETE'
        })
      );

      await Promise.all(deletePromises);
      
      setShowDeleteAllModal(false);
      setDeleteConfirmText('');
      fetchAllData(); // 重新載入數據
    } catch (error) {
      console.error('刪除失敗:', error);
      alert('刪除失敗，請重試');
    }
  };

  const handleCancelDeleteAll = () => {
    setShowDeleteAllModal(false);
    setDeleteConfirmText('');
  };

  const courseFields = [
    { name: 'subject', label: '科目', type: 'text', required: true },
    { 
      name: 'grade', 
      label: '年級', 
      type: 'select', 
      required: true,
      options: [
        { value: '初中', label: '初中' },
        { value: '高中', label: '高中' },
        { value: '中一', label: '中一' },
        { value: '中二', label: '中二' },
        { value: '中三', label: '中三' },
        { value: '中四', label: '中四' },
        { value: '中五', label: '中五' },
        { value: '中六', label: '中六' }
      ]
    },
    { 
      name: 'teacherId', 
      label: '教師', 
      type: 'select', 
      required: true,
      options: teachers.map(t => ({
        value: t.teacherId,
        label: `${t.teacherId} - ${t.name}`
      }))
    }
  ];

  if (isLoading) {
    return (
      <div className="content">
        {!embedded && <h1>課程列表</h1>}
        <p>資料載入中...</p>
      </div>
    );
  }

  return (
    <div className="content">
      {!embedded && <h1>課程列表</h1>}
      
      <div className="filter-section">
        <div className="filter-container">
          <div className="filter-group">
            <label>科目</label>
            <input
              type="text"
              className="filter-input"
              value={subjectDisplay}
              onChange={e => { setSubjectDisplay(e.target.value); setSubjectFilter(e.target.value); }}
              placeholder="請輸入科目名稱"
              autoComplete="off"
            />
            {subjectFilter && (
              <ul className="dropdown">
                <li key="all" onClick={() => { setSubjectDisplay('全部'); setSubjectFilter(''); }}>
                  全部
                </li>
                {filteredSubjects.map(s => (
                  <li key={s} onClick={() => { setSubjectDisplay(s); setSubjectFilter(''); }}>
                    {s}
                  </li>
                ))}
                {filteredSubjects.length === 0 && <li>無符合選項</li>}
              </ul>
            )}
          </div>
          
          <div className="filter-group">
            <label>年級</label>
            <input
              type="text"
              className="filter-input"
              value={gradeDisplay}
              onChange={e => { setGradeDisplay(e.target.value); setGradeFilter(e.target.value); }}
              placeholder="請輸入年級"
              autoComplete="off"
            />
            {gradeFilter && (
              <ul className="dropdown">
                <li key="all" onClick={() => { setGradeDisplay('全部'); setGradeFilter(''); }}>
                  全部
                </li>
                {filteredGrades.map(g => (
                  <li key={g} onClick={() => { setGradeDisplay(g); setGradeFilter(''); }}>
                    {g}
                  </li>
                ))}
                {filteredGrades.length === 0 && <li>無符合選項</li>}
              </ul>
            )}
          </div>
          
          <div className="filter-group">
            <label>教師</label>
            <input
              type="text"
              className="filter-input"
              value={teacherDisplay}
              onChange={e => { setTeacherDisplay(e.target.value); setTeacherFilter(e.target.value); }}
              placeholder="請輸入教師ID或姓名"
              autoComplete="off"
            />
            {teacherFilter && (
              <ul className="dropdown">
                <li key="all" onClick={() => { setTeacherDisplay('全部'); setTeacherFilter(''); }}>
                  全部
                </li>
                {filteredTeachers.map(t => (
                  <li key={t.teacherId} onClick={() => { setTeacherDisplay(`${t.teacherId} - ${t.name}`); setTeacherFilter(''); }}>
                    {t.teacherId} - {t.name}
                  </li>
                ))}
                {filteredTeachers.length === 0 && <li>無符合選項</li>}
              </ul>
            )}
          </div>
          
          <div className="filter-buttons">
            <button 
              className="filter-button clear"
              onClick={() => {
                setSubjectDisplay('');
                setGradeDisplay('');
                setTeacherDisplay('');
                setSubjectFilter('');
                setGradeFilter('');
                setTeacherFilter('');
              }}
            >
              清除篩選
            </button>
            <button 
              className="filter-button delete-all"
              onClick={handleDeleteAll}
              style={{ backgroundColor: '#dc3545', color: 'white' }}
            >
              一鍵刪除
            </button>
          </div>
        </div>
      </div>
      
      {/* 顯示當前篩選條件 */}
      {(subjectDisplay || gradeDisplay || teacherDisplay) && (
        <div style={{ marginBottom: '20px', padding: '10px', background: '#e9ecef', borderRadius: '4px' }}>
          <strong>當前篩選：</strong>
          {subjectDisplay && <span style={{ marginRight: '20px' }}>科目：{subjectDisplay}</span>}
          {gradeDisplay && <span style={{ marginRight: '20px' }}>年級：{gradeDisplay}</span>}
          {teacherDisplay && <span>教師：{teacherDisplay}</span>}
        </div>
      )}
      
      <div className="course-list-scroll">
        <table className="course-table">
          <thead>
            <tr>
              <th>課程ID</th>
              <th>科目</th>
              <th>年級</th>
              <th>教師</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map(course => {
              const teacher = teachers.find(t => t.teacherId === course.teacherId);
              return (
                <tr key={course._id}>
                  <td>{course.courseId}</td>
                  <td>{course.subject}</td>
                  <td>{course.grade}</td>
                  <td>
                    {teacher ? `${teacher.teacherId} - ${teacher.name}` : '查無教師'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-button edit" onClick={() => handleEdit(course)}>編輯</button>
                      <button className="action-button delete" onClick={() => handleDelete(course._id)}>刪除</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EditModal
        isOpen={showEditModal}
        onClose={handleCancel}
        onSave={handleSave}
        title="編輯課程資料"
        fields={courseFields}
        data={editingCourse}
        setData={setEditingCourse}
      />
      
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="確認刪除"
        message="確定要刪除這個課程嗎？"
      />
      
      {/* 一鍵刪除確認彈窗 */}
      {showDeleteAllModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>確認一鍵刪除</h3>
            <p>確定要刪除當前顯示的所有課程資料嗎？</p>
            <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
              此操作將刪除 {filteredCourses.length} 個課程資料，無法撤銷！
            </p>
            <div style={{ marginTop: '20px' }}>
              <label>請輸入"刪除"以確認操作：</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="請輸入：刪除"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div className="modal-buttons" style={{ marginTop: '20px' }}>
              <button 
                onClick={handleCancelDeleteAll}
                style={{ 
                  backgroundColor: '#6c757d', 
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  marginRight: '10px'
                }}
              >
                取消
              </button>
              <button 
                onClick={handleConfirmDeleteAll}
                disabled={deleteConfirmText !== '刪除'}
                style={{ 
                  backgroundColor: deleteConfirmText === '刪除' ? '#dc3545' : '#6c757d', 
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: deleteConfirmText === '刪除' ? 'pointer' : 'not-allowed'
                }}
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherList({ embedded = false }) {
  const [teachers, setTeachers] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [editingTeacher, setEditingTeacher] = React.useState(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  
  // 搜索功能狀態
  const [searchFilter, setSearchFilter] = React.useState('');
  const [searchDisplay, setSearchDisplay] = React.useState('');

  React.useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/teachers`);
      const data = await response.json();
      setTeachers(data);
    } catch (error) {
      console.error('獲取教師數據失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (teacherId) => {
    setDeleteTarget(teacherId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`${config.API_URL}/teachers/${deleteTarget}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setShowDeleteModal(false);
        setDeleteTarget(null);
        window.location.reload();
      } else {
        alert('刪除失敗');
      }
    } catch (error) {
      alert('刪除失敗');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setShowEditModal(true);
  };

  const handleSave = async (data) => {
    try {
      const response = await fetch(`${config.API_URL}/teachers/${editingTeacher._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        setShowEditModal(false);
        setEditingTeacher(null);
        window.location.reload();
      } else {
        alert('更新失敗');
      }
    } catch (error) {
      alert('更新失敗');
    }
  };

  const handleCancel = () => {
    setShowEditModal(false);
    setEditingTeacher(null);
  };

  // 搜索邏輯
  const filteredTeachers = teachers.filter(teacher => {
    if (searchDisplay === '' || searchDisplay === '全部') {
      return true;
    }
    
    // 檢查是否是從下拉選項選擇的完整顯示文本
    const teacherDisplayText = `${teacher.teacherId} - ${teacher.name}`;
    if (searchDisplay === teacherDisplayText) {
      return true;
    }
    
    // 如果不是完整匹配，則進行部分匹配
    return (teacher.teacherId && teacher.teacherId.includes(searchDisplay)) ||
           (teacher.name && teacher.name.includes(searchDisplay));
  });

  // 搜索選項過濾
  const searchOptions = teachers.filter(teacher =>
    (teacher.teacherId && teacher.teacherId.includes(searchFilter)) ||
    (teacher.name && teacher.name.includes(searchFilter))
  );

  const teacherFields = [
    { name: 'name', label: '姓名', type: 'text', required: true },
    { name: 'phone', label: '電話號碼', type: 'text' }
  ];

  if (isLoading) {
    return (
      <div className="content">
        {!embedded && <h1>教師列表</h1>}
        <p>資料載入中...</p>
      </div>
    );
  }

  return (
    <div className="content">
      {!embedded && <h1>教師列表</h1>}
      
      <div className="filter-section">
        <div className="filter-container">
          <div className="filter-group">
            <label>搜索教師</label>
            <input
              type="text"
              className="filter-input"
              value={searchDisplay}
              onChange={e => { setSearchDisplay(e.target.value); setSearchFilter(e.target.value); }}
              placeholder="請輸入教師資料"
              autoComplete="off"
            />
            {searchFilter && (
              <ul className="dropdown">
                <li key="all" onClick={() => { setSearchDisplay('全部'); setSearchFilter(''); }}>
                  全部
                </li>
                {searchOptions.map(teacher => (
                  <li key={teacher.teacherId} onClick={() => { 
                    setSearchDisplay(`${teacher.teacherId} - ${teacher.name}`); 
                    setSearchFilter(''); 
                  }}>
                    {teacher.teacherId} - {teacher.name}
                  </li>
                ))}
                {searchOptions.length === 0 && <li>無符合選項</li>}
              </ul>
            )}
          </div>
          
          <div className="filter-buttons">
            <button 
              className="filter-button clear"
              onClick={() => {
                setSearchDisplay('');
                setSearchFilter('');
              }}
            >
              清除搜索
            </button>
          </div>
        </div>
      </div>
      
      {/* 顯示當前搜索條件 */}
      {searchDisplay && (
        <div style={{ marginBottom: '20px', padding: '10px', background: '#e9ecef', borderRadius: '4px' }}>
          <strong>當前搜索：</strong>
          {searchDisplay}
        </div>
      )}
      
      <div className="course-list-scroll">
        <table className="course-table">
          <thead>
            <tr>
              <th>教師ID</th>
              <th>姓名</th>
              <th>電話號碼</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.map(teacher => (
              <tr key={teacher._id}>
                <td>{teacher.teacherId}</td>
                <td>{teacher.name}</td>
                <td>{teacher.phone || '-'}</td>
                <td>
                  <div className="action-buttons">
                    <button className="action-button edit" onClick={() => handleEdit(teacher)}>編輯</button>
                    <button className="action-button delete" onClick={() => handleDelete(teacher._id)}>刪除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditModal
        isOpen={showEditModal}
        onClose={handleCancel}
        onSave={handleSave}
        title="編輯教師資料"
        fields={teacherFields}
        data={editingTeacher}
        setData={setEditingTeacher}
      />
      
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="確認刪除"
        message="確定要刪除這個教師嗎？"
      />
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(() => {
    // 從localStorage檢查登入狀態
    const savedLoginState = localStorage.getItem('loginState');
    if (savedLoginState) {
      const { userType, username } = JSON.parse(savedLoginState);
      return { isLoggedIn: true, userType, username };
    }
    return { isLoggedIn: false, userType: null, username: '' };
  });
  // const [loading, setLoading] = React.useState(false);
  // const [courseFilter, setCourseFilter] = React.useState('');
  // const [courseDisplay, setCourseDisplay] = React.useState('');
  // const [csvLoading, setCsvLoading] = React.useState(false);
  // const [csvMessage, setCsvMessage] = React.useState('');
  // const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  // const [confirmData, setConfirmData] = React.useState(null);

  // 處理登入
  const handleLogin = (type, user) => {
    const loginState = { isLoggedIn: true, userType: type, username: user };
    setIsLoggedIn(loginState);
    // 保存到localStorage
    localStorage.setItem('loginState', JSON.stringify({ userType: type, username: user }));
  };

  // 處理登出
  const handleLogout = () => {
    const logoutState = { isLoggedIn: false, userType: null, username: '' };
    setIsLoggedIn(logoutState);
    // 清除localStorage
    localStorage.removeItem('loginState');
  };

  // 如果未登入，顯示登入頁面
  if (!isLoggedIn.isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="logo-container">
          <img src="/logo.png" alt="Excelsia Education Logo" className="logo" />
        </div>
        <h2>管理系統</h2>
        <Sidebar userType={isLoggedIn.userType} />
        <div className="user-info">
          <p>歡迎，{isLoggedIn.username}</p>
          <p className="user-type">{isLoggedIn.userType === 'admin' ? '管理員' : '教師'}</p>
          <button className="logout-button" onClick={handleLogout}>
            登出
          </button>
        </div>
      </div>
      <div className="main-content">
        <Routes>
          {/* 教師和管理員都可以訪問的新增功能 */}
          <Route path="/classes" element={<ClassPage />} />
          <Route path="/add-class" element={<ClassPage initialTab="add" />} />
          <Route path="/add-group" element={<AddGroup />} />
          <Route path="/courses" element={<CoursePage />} />
          <Route path="/add-course" element={<CoursePage initialTab="add" />} />
          <Route path="/students" element={<StudentPage />} />
          <Route path="/add-student" element={<StudentPage initialTab="add" />} />
          <Route path="/teachers" element={<TeacherPage />} />
          <Route path="/add-teacher" element={<TeacherPage initialTab="add" />} />

          {/* 管理員專用路由 */}
          {isLoggedIn.userType === 'admin' && (
            <>
              <Route path="/manage-classes" element={<ClassPage initialTab="manage" />} />
              <Route path="/manage-groups" element={<AddGroup initialTab="manage" />} />
              <Route path="/manage-students" element={<StudentPage initialTab="manage" />} />
              <Route path="/manage-courses" element={<CoursePage initialTab="manage" />} />
              <Route path="/manage-teachers" element={<TeacherPage initialTab="manage" />} />
              <Route path="/user-management" element={<UserManagement />} />
              <Route path="/revenue-overview" element={<RevenueStatistics />} />
              <Route path="/revenue-teacher" element={<RevenueStatistics />} />
              <Route path="/revenue-student" element={<RevenueStatistics />} />
              <Route path="/revenue-daily" element={<RevenueStatistics />} />
              <Route path="/billing-system" element={<BillingPage />} />
              <Route path="/billing-student" element={<BillingPage initialTab="student" />} />
              <Route path="/billing-teacher" element={<BillingPage initialTab="teacher" />} />
              <Route path="/cost-management" element={<CostManagement />} />
            </>
          )}

          {/* 默認重定向 */}
          <Route path="/" element={
            <div className="content">
              <div className="welcome-container">
                <div className="welcome-header">
                  <h1>歡迎使用 Excelsia Education 管理系統</h1>
                  <p className="welcome-subtitle">專業的教育管理解決方案</p>
                </div>
                
                <div className="welcome-footer">
                  <p>請從左側選單選擇您需要的功能</p>
                </div>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;
