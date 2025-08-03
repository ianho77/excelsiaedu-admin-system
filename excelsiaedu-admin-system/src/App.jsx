import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Papa from 'papaparse';
import ConfirmModal from './components/ConfirmModal';
import EditModal from './components/EditModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import BillingSystem from './components/BillingSystem';
import TeacherBillingSystem from './components/TeacherBillingSystem';
import RevenueStatistics from './components/RevenueStatistics';
import LoginPage from './components/LoginPage';
import MonthlyStatement from './components/MonthlyStatement';
import UserManagement from './components/UserManagement';
import LoginManagement from './components/LoginManagement';
import './App.css';

function Sidebar({ userType }) {
  const location = useLocation();
  const [isAddDropdownOpen, setIsAddDropdownOpen] = React.useState(false);
  const [isManageDropdownOpen, setIsManageDropdownOpen] = React.useState(false);
  const [isRevenueDropdownOpen, setIsRevenueDropdownOpen] = React.useState(false);
  const [isBillingDropdownOpen, setIsBillingDropdownOpen] = React.useState(false);

  const toggleAddDropdown = () => {
    setIsAddDropdownOpen(!isAddDropdownOpen);
  };

  const toggleManageDropdown = () => {
    setIsManageDropdownOpen(!isManageDropdownOpen);
  };

  const toggleRevenueDropdown = () => {
    setIsRevenueDropdownOpen(!isRevenueDropdownOpen);
  };

  const toggleBillingDropdown = () => {
    setIsBillingDropdownOpen(!isBillingDropdownOpen);
  };

  return (
    <nav>
      <ul>
        {/* 教師和管理員都可以看到新增功能 */}
        <li>
          <div className="dropdown-container">
            <button className="dropdown-button" onClick={toggleAddDropdown}>
              新增資料
              <span className={`dropdown-arrow ${isAddDropdownOpen ? 'rotated' : ''}`}>▶</span>
            </button>
            {isAddDropdownOpen && (
              <ul className="dropdown-menu">
                <li><Link to="/add-class">新增課堂</Link></li>
                <li><Link to="/add-course">新增課程</Link></li>
                <li><Link to="/add-student">新增學生</Link></li>
                <li><Link to="/add-teacher">新增教師</Link></li>
              </ul>
            )}
          </div>
        </li>

        {/* 只有管理員可以看到管理功能 */}
        {userType === 'admin' && (
          <li>
            <div className="dropdown-container">
              <button className="dropdown-button" onClick={toggleManageDropdown}>
                資料管理
                <span className={`dropdown-arrow ${isManageDropdownOpen ? 'rotated' : ''}`}>▶</span>
              </button>
              {isManageDropdownOpen && (
                <ul className="dropdown-menu">
                  <li><Link to="/manage-classes">課堂管理</Link></li>
                  <li><Link to="/manage-students">學生管理</Link></li>
                  <li><Link to="/manage-courses">課程管理</Link></li>
                  <li><Link to="/manage-teachers">教師管理</Link></li>
                </ul>
              )}
            </div>
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

        {/* 只有管理員可以看到賬單系統 */}
        {userType === 'admin' && (
          <li>
            <div className="dropdown-container">
              <button className="dropdown-button" onClick={toggleBillingDropdown}>
                賬單系統
                <span className={`dropdown-arrow ${isBillingDropdownOpen ? 'rotated' : ''}`}>▶</span>
              </button>
              {isBillingDropdownOpen && (
                <ul className="dropdown-menu">
                  <li><Link to="/billing-student">學生賬單</Link></li>
                  <li><Link to="/billing-teacher">教師賬單</Link></li>
                </ul>
              )}
            </div>
          </li>
        )}

        {/* 只有管理員可以看到登入管理 */}
        {userType === 'admin' && (
          <li>
            <Link to="/login-management" className="nav-link">
              登入管理
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}

function AddClass() {
  const [form, setForm] = React.useState({
    courseId: '',
    date: '',
    price: '',
    studentCount: '',
    studentNames: []
  });
  const [students, setStudents] = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [teachers, setTeachers] = React.useState([]);
  const [classes, setClasses] = React.useState([]);
  const [studentFilters, setStudentFilters] = React.useState([]);
  const [studentCountError, setStudentCountError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [courseFilter, setCourseFilter] = React.useState('');
  const [courseDisplay, setCourseDisplay] = React.useState('');
  const [csvLoading, setCsvLoading] = React.useState(false);
  const [csvMessage, setCsvMessage] = React.useState('');
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [confirmData, setConfirmData] = React.useState(null);

  React.useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [studentsRes, coursesRes, teachersRes, classesRes] = await Promise.all([
        fetch('http://localhost:4000/api/students'),
        fetch('http://localhost:4000/api/courses'),
        fetch('http://localhost:4000/api/teachers'),
        fetch('http://localhost:4000/api/classes')
      ]);

      const studentsData = await studentsRes.json();
      const coursesData = await coursesRes.json();
      const teachersData = await teachersRes.json();
      const classesData = await classesRes.json();

      setStudents(studentsData);
      setCourses(coursesData);
      setTeachers(teachersData);
      setClasses(classesData);
    } catch (error) {
      console.error('獲取數據失敗:', error);
    }
  };

  // 產生課程下拉選單
  const courseOptions = courses.map(c => ({ value: c.id, label: `${c.id} - ${c.subject}` }));

  // 產生學生下拉選單（每個輸入框都可篩選）
  const getFilteredStudents = (filter) => {
    if (!filter) return students;
    return students.filter(s =>
      s.id.toString().includes(filter) ||
      s.nameZh.includes(filter) ||
      s.nameEn.toLowerCase().includes(filter.toLowerCase())
    );
  };

  // 處理表單欄位變更
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
        studentNames: count === '' ? [] : Array(Number(count)).fill('').map((v, i) => prev.studentNames[i] || '')
      }));
      setStudentFilters(count === '' ? [] : Array(Number(count)).fill('').map((v, i) => studentFilters[i] || ''));
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
  };

  const handleSelectCourse = (courseId) => {
    const c = courses.find(c => c.courseId === courseId);
    const teacher = teachers.find(t => t.teacherId === c.teacherId);
    setForm(prev => ({ ...prev, courseId }));
    setCourseDisplay(`${c.courseId} - ${c.grade}${c.subject} ${teacher ? teacher.name : ''}`);
    setCourseFilter('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 驗證必填欄位
    if (!form.courseId || !form.date || !form.price || form.studentNames.length === 0) {
      alert('請填寫所有必填欄位');
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
    
    // 設置確認數據並顯示彈窗
    setConfirmData({
      courseInfo,
      date: formatDate(form.date),
      price: form.price,
      studentCount: form.studentNames.length,
      studentInfo
    });
    setShowConfirmModal(true);
  };

  // 處理確認彈窗的確認操作
  const handleConfirmSubmit = async () => {
    setLoading(true);
    setShowConfirmModal(false);
    
    try {
      for (const name of form.studentNames) {
        const idMatch = name.match(/^([\w\d]+)/);
        const studentId = idMatch ? idMatch[1] : '';
        await fetch('http://localhost:4000/api/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: form.courseId,
            date: confirmData.date,
            price: Number(form.price),
            studentId
          })
        });
      }
      
      // 重置表單
      setForm({ courseId: '', date: '', price: '', studentCount: '', studentNames: [] });
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
              const res = await fetch('http://localhost:4000/api/classes', {
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
        <h1>新增課堂資料</h1>
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
              placeholder="請輸入課程ID、年級、科目或教師姓名"
              autoComplete="off"
              required
            />
            {courseFilter && (
              <ul className="dropdown">
                {filteredCourses.map(c => {
                  const teacher = teachers.find(t => t.teacherId === c.teacherId);
                  return (
                    <li key={c.courseId} onClick={() => handleSelectCourse(c.courseId)}>
                      {c.courseId} - {c.grade}{c.subject} {teacher ? teacher.name : ''}
                    </li>
                  );
                })}
                {filteredCourses.length === 0 && <li>無符合選項</li>}
              </ul>
            )}
          </div>
          <div className="form-group">
            <label>日期</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>價格</label>
            <input type="number" name="price" value={form.price} onChange={handleChange} min="0" step="1" placeholder="請輸入價格" required />
          </div>
          <div className="form-group">
            <label>學生人數</label>
            <input type="text" name="studentCount" value={form.studentCount} onChange={handleChange} pattern="^[1-9][0-9]*$" placeholder="請輸入學生人數" required />
            {studentCountError && <div style={{color: 'red', fontSize: '0.95em', marginTop: 4}}>{studentCountError}</div>}
          </div>
          <button type="submit" disabled={loading}>{loading ? '新增中...' : '新增課堂'}</button>
        </form>
        <div className="class-form-right">
          <div className="class-form-right-title">學生名稱</div>
          <div className="student-names-scroll">
            <div className="student-names-wrap">
              {form.studentCount !== '' && Array.from({ length: Number(form.studentCount) }).map((_, idx) => (
                <div className="form-group" key={idx} style={{position:'relative'}}>
                  <input
                    type="text"
                    value={form.studentNames[idx] || ''}
                    onChange={e => handleStudentNameChange(idx, e.target.value)}
                    placeholder={`學生名稱 #${idx + 1}`}
                    autoComplete="off"
                    required
                    style={{minWidth: 120}}
                  />
                  {studentFilters[idx] && (
                    <ul className="dropdown">
                      {students.filter(s =>
                        (s.studentId && s.studentId.includes(studentFilters[idx])) ||
                        (s.nameZh && s.nameZh.includes(studentFilters[idx])) ||
                        (s.nameEn && s.nameEn.toLowerCase().includes(studentFilters[idx].toLowerCase())) ||
                        (s.nickname && s.nickname.includes(studentFilters[idx]))
                      ).map(s => (
                        <li key={s._id || s.studentId} onClick={() => handleSelectStudent(idx, s)}>
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
          <div class="info-item">
            <span class="info-icon">📚</span>
            <span class="info-label">課程：</span>
            <span class="info-value">${confirmData.courseInfo}</span>
          </div>
          <div class="info-item">
            <span class="info-icon">📅</span>
            <span class="info-label">日期：</span>
            <span class="info-value">${confirmData.date}</span>
          </div>
          <div class="info-item">
            <span class="info-icon">💰</span>
            <span class="info-label">價格：</span>
            <span class="info-value">$${confirmData.price}</span>
          </div>
          <div class="info-item">
            <span class="info-icon">👥</span>
            <span class="info-label">學生人數：</span>
            <span class="info-value">${confirmData.studentCount}人</span>
          </div>
          <div class="info-item">
            <span class="info-icon">📝</span>
            <span class="info-label">學生名單：</span>
          </div>
          <div class="student-list">
            ${confirmData.studentInfo.map(student => `<div>${student}</div>`).join('')}
          </div>
          <div style="margin-top: 20px; text-align: center; font-weight: 600; color: #495057;">
            確定要新增這${confirmData.studentCount}筆課堂記錄嗎？
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
function AddCourse() {
  const [form, setForm] = React.useState({
    teacherId: '',
    grade: '',
    subject: ''
  });
  const [teachers, setTeachers] = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [courseFilter, setCourseFilter] = React.useState('');
  const [courseDisplay, setCourseDisplay] = React.useState('');
  const [csvLoading, setCsvLoading] = React.useState(false);
  const [csvMessage, setCsvMessage] = React.useState('');
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [confirmData, setConfirmData] = React.useState(null);
  const [teacherFilter, setTeacherFilter] = React.useState('');
  const [teacherDisplay, setTeacherDisplay] = React.useState('');

  React.useEffect(() => {
    fetchTeachers();
    fetchCourses();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/teachers');
      const data = await response.json();
      setTeachers(data);
    } catch (error) {
      console.error('獲取教師數據失敗:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/courses');
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

  const handleSelectTeacher = (teacherId) => {
    setForm(prev => ({ ...prev, teacherId }));
  };

  const handleTeacherInput = (e) => {
    setTeacherDisplay(e.target.value);
    setTeacherFilter(e.target.value);
    setForm(prev => ({ ...prev, teacherId: '' }));
  };

  const handleSelectTeacherFromDropdown = (teacherId) => {
    const teacher = teachers.find(t => t.teacherId === teacherId);
    setForm(prev => ({ ...prev, teacherId }));
    setTeacherDisplay(`${teacher.teacherId}-${teacher.name}`);
    setTeacherFilter('');
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
      const res = await fetch('http://localhost:4000/api/courses', {
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
              const res = await fetch('http://localhost:4000/api/courses', {
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
      <h1>新增課程資料</h1>
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
            placeholder="請輸入老師ID或姓名"
            autoComplete="off"
          />
          {teacherFilter && (
            <ul className="dropdown">
                {teachers.filter(t => 
                  t.teacherId.includes(teacherFilter) || 
                  t.name.includes(teacherFilter)
                ).map(t => (
                  <li key={t.teacherId} onClick={() => handleSelectTeacherFromDropdown(t.teacherId)}>
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
        <table className="course-table">
          <thead>
            <tr>
              <th>課程ID</th>
              <th>老師ID</th>
              <th>年級</th>
              <th>科目</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => (
                <tr key={course._id || course.courseId}>
                  <td>{course.courseId}</td>
                <td>{course.teacherId}</td>
                <td>{course.grade}</td>
                <td>{course.subject}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
function AddStudent() {
  const [form, setForm] = React.useState({
    nameZh: '',
    nameEn: '',
    grade: '',
    nickname: '',
    phone: '',
    wechat: '',
    school: ''
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
      const response = await fetch('http://localhost:4000/api/students');
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
      school: form.school || '無'
    });
    setShowConfirmModal(true);
  };

  // 處理確認彈窗的確認操作
  const handleConfirmSubmit = async () => {
    setLoading(true);
    setShowConfirmModal(false);
    
    try {
      const res = await fetch('http://localhost:4000/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setStudents(prev => [...prev, data]);
      setForm({ nameZh: '', nameEn: '', grade: '', nickname: '', phone: '', wechat: '', school: '' });
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

          for (const student of students) {
            // 驗證必要欄位
            if (!student.nameZh || !student.nameEn || !student.grade) {
              errorCount++;
              continue;
            }

            try {
              const res = await fetch('http://localhost:4000/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  nameZh: student.nameZh,
                  nameEn: student.nameEn,
                  grade: student.grade,
                  nickname: student.nickname || '',
                  phone: student.phone || '',
                  wechat: student.wechat || '',
                  school: student.school || ''
                })
              });

              if (res.ok) {
                const newStudent = await res.json();
                setStudents(prev => [...prev, newStudent]);
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
        <h1>新增學生資料</h1>
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
      <div className="class-main-flex">
        <form onSubmit={handleSubmit} className="course-form class-form-left">
          <div className="form-group">
            <label>學生ID</label>
            <input type="text" value={students.length + 1} disabled />
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
          <button type="submit" disabled={loading}>{loading ? '新增中...' : '新增學生'}</button>
        </form>
        <div className="class-form-right">
          <div className="class-form-right-title">學生列表</div>
          <table className="course-table">
            <thead>
              <tr>
                <th>學生ID</th>
                <th>姓名（中文）</th>
                <th>姓名（英文）</th>
                <th>暱稱</th>
                <th>電話號碼</th>
                <th>微信號碼</th>
                <th>年級</th>
                <th>學校</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student._id || student.studentId}>
                  <td>{student.studentId}</td>
                  <td>{student.nameZh}</td>
                  <td>{student.nameEn}</td>
                  <td>{student.nickname}</td>
                  <td>{student.phone}</td>
                  <td>{student.wechat}</td>
                  <td>{student.grade}</td>
                  <td>{student.school}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
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
            <p><strong>學校：</strong>${confirmData.school}</p>
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

function AddTeacher() {
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
      const response = await fetch('http://localhost:4000/api/teachers');
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
      const res = await fetch('http://localhost:4000/api/teachers', {
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
              const res = await fetch('http://localhost:4000/api/teachers', {
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
        <h1>新增教師資料</h1>
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

function ClassList() {
  const [classes, setClasses] = React.useState([]);
  const [students, setStudents] = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [teachers, setTeachers] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [editingClass, setEditingClass] = React.useState(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');

  React.useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [classesRes, studentsRes, coursesRes, teachersRes] = await Promise.all([
        fetch('http://localhost:4000/api/classes'),
        fetch('http://localhost:4000/api/students'),
        fetch('http://localhost:4000/api/courses'),
        fetch('http://localhost:4000/api/teachers')
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
      const response = await fetch(`http://localhost:4000/api/classes/${deleteTarget}`, {
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

  const handleEdit = (cls) => {
    // 將日期格式從 YYYY/MM/DD 轉換為 YYYY-MM-DD 以適應 date input
    const formattedClass = {
      ...cls,
      date: cls.date ? cls.date.replace(/\//g, '-') : cls.date
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
      
      const response = await fetch(`http://localhost:4000/api/classes/${editingClass._id}`, {
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
      // 獲取當前篩選後顯示的課堂ID列表
      const classIdsToDelete = filteredClasses.map(cls => cls._id);
      
      if (classIdsToDelete.length === 0) {
        alert('沒有可刪除的課堂資料');
        setShowDeleteAllModal(false);
        setDeleteConfirmText('');
        return;
      }

      // 並行刪除所有課堂
      const deletePromises = classIdsToDelete.map(classId =>
        fetch(`http://localhost:4000/api/classes/${classId}`, {
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


  const studentMap = Object.fromEntries(students.map(s => [s.studentId, s]));
  const courseMap = Object.fromEntries(courses.map(c => [c.courseId, c]));
  const teacherMap = Object.fromEntries(teachers.map(t => [t.teacherId, t]));

  const [studentFilter, setStudentFilter] = React.useState('');
  const [studentDisplay, setStudentDisplay] = React.useState('');
  const [monthFilter, setMonthFilter] = React.useState('');
  const [monthDisplay, setMonthDisplay] = React.useState('');
  const [teacherFilter, setTeacherFilter] = React.useState('');
  const [teacherDisplay, setTeacherDisplay] = React.useState('');
  const [courseFilter, setCourseFilter] = React.useState('');
  const [courseDisplay, setCourseDisplay] = React.useState('');
  const allMonths = Array.from(new Set(classes.map(cls => {
    if (!cls.date) return null;
    const date = new Date(cls.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() 返回 0-11，所以 +1
    return `${year}/${month}`;
  }))).filter(Boolean);

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

  // 課堂列表篩選條件
  const filteredClasses = classes.filter(cls => {
    const matchStudent = studentDisplay && studentDisplay !== '全部'
      ? students.some(s => `${s.studentId} - ${s.nameZh}（${s.nameEn}）${s.nickname ? ` [${s.nickname}]` : ''}` === studentDisplay && s.studentId === cls.studentId)
      : true;
    const matchMonth = monthDisplay && monthDisplay !== '全部'
      ? (() => {
          if (!cls.date) return false;
          const date = new Date(cls.date);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const classMonthStr = `${year}/${month}`;
          return classMonthStr === monthDisplay;
        })()
      : true;
    const matchTeacher = teacherDisplay && teacherDisplay !== '全部'
      ? (() => {
          const course = courseMap[String(cls.courseId)] || {};
          const teacher = teacherMap[String(course.teacherId)] || {};
          return `${teacher.teacherId} - ${teacher.name}` === teacherDisplay;
        })()
      : true;
    const matchCourse = courseDisplay && courseDisplay !== '全部'
      ? (() => {
          const course = courseMap[String(cls.courseId)] || {};
          return `${course.courseId} ${course.grade}${course.subject}` === courseDisplay;
        })()
      : true;
    return matchStudent && matchMonth && matchTeacher && matchCourse;
  });

  // 資料未載入時顯示 loading
  if (isLoading) {
    return <div>資料載入中...</div>;
  }

  return (
    <div className="content">
      <h1>課堂列表</h1>
      
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
      {(studentDisplay || monthDisplay || teacherDisplay || courseDisplay) && (
        <div style={{ marginBottom: '20px', padding: '10px', background: '#e9ecef', borderRadius: '4px' }}>
          <strong>當前篩選：</strong>
          {studentDisplay && <span style={{ marginRight: '20px' }}>學生：{studentDisplay}</span>}
          {monthDisplay && <span style={{ marginRight: '20px' }}>月份：{monthDisplay}</span>}
          {teacherDisplay && <span style={{ marginRight: '20px' }}>教師：{teacherDisplay}</span>}
          {courseDisplay && <span>課程：{courseDisplay}</span>}
        </div>
      )}
      
      <table className="course-table">
        <thead>
          <tr>
            <th>課堂日期</th>
            <th>學生資料</th>
            <th>課程資料</th>
            <th>老師</th>
            <th>價格</th>
            <th>電話號碼</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filteredClasses.map(cls => {
            const stu = studentMap[String(cls.studentId)] || {};
            const course = courseMap[String(cls.courseId)] || {};
            const teacher = teacherMap[String(course.teacherId)] || {};
            return (
              <tr key={cls._id}>
                <td>{formatDate(cls.date)}</td>
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

      {/* 一鍵刪除確認彈窗 */}
      {showDeleteAllModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>確認一鍵刪除</h3>
            <p>確定要刪除當前顯示的所有課堂資料嗎？</p>
            <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
              此操作將刪除 {filteredClasses.length} 個課堂資料，無法撤銷！
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

function StudentList() {
  const [students, setStudents] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [editingStudent, setEditingStudent] = React.useState(null);
  const [showEditModal, setShowEditModal] = React.useState(false);

  React.useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/students');
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
      const response = await fetch(`http://localhost:4000/api/students/${deleteTarget}`, {
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
    setEditingStudent(student);
    setShowEditModal(true);
  };

  const handleSave = async (data) => {
    try {
      const response = await fetch(`http://localhost:4000/api/students/${editingStudent._id}`, {
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

  const studentFields = [
    { name: 'nameZh', label: '中文姓名', type: 'text', required: true },
    { name: 'nameEn', label: '英文姓名', type: 'text', required: true },
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
    { name: 'school', label: '學校', type: 'text' }
  ];

  if (isLoading) {
    return (
      <div className="content">
        <h1>學生列表</h1>
        <p>資料載入中...</p>
      </div>
    );
  }

  return (
    <div className="content">
      <h1>學生列表</h1>
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
            <th>學校</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student._id}>
              <td>{student.studentId}</td>
              <td>{student.nameZh}</td>
              <td>{student.nameEn}</td>
              <td>{student.nickname || '-'}</td>
              <td>{student.grade}</td>
              <td>{student.phone || '-'}</td>
              <td>{student.wechat || '-'}</td>
              <td>{student.school || '-'}</td>
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

function CourseList() {
  const [courses, setCourses] = React.useState([]);
  const [teachers, setTeachers] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState(null);
  const [showEditModal, setShowEditModal] = React.useState(false);

  React.useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, teachersRes] = await Promise.all([
        fetch('http://localhost:4000/api/courses'),
        fetch('http://localhost:4000/api/teachers')
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
      const response = await fetch(`http://localhost:4000/api/courses/${deleteTarget}`, {
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
      const response = await fetch(`http://localhost:4000/api/courses/${editingCourse._id}`, {
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

  const courseFields = [
    { name: 'subject', label: '科目', type: 'text', required: true },
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
        <h1>課程列表</h1>
        <p>資料載入中...</p>
      </div>
    );
  }

  return (
    <div className="content">
      <h1>課程列表</h1>
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
          {courses.map(course => {
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
    </div>
  );
}

function TeacherList() {
  const [teachers, setTeachers] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [editingTeacher, setEditingTeacher] = React.useState(null);
  const [showEditModal, setShowEditModal] = React.useState(false);

  React.useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/teachers');
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
      const response = await fetch(`http://localhost:4000/api/teachers/${deleteTarget}`, {
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
      const response = await fetch(`http://localhost:4000/api/teachers/${editingTeacher._id}`, {
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

  const teacherFields = [
    { name: 'name', label: '姓名', type: 'text', required: true },
    { name: 'phone', label: '電話號碼', type: 'text' }
  ];

  if (isLoading) {
    return (
      <div className="content">
        <h1>教師列表</h1>
        <p>資料載入中...</p>
      </div>
    );
  }

  return (
    <div className="content">
      <h1>教師列表</h1>
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
          {teachers.map(teacher => (
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
  const [loading, setLoading] = React.useState(false);
  const [courseFilter, setCourseFilter] = React.useState('');
  const [courseDisplay, setCourseDisplay] = React.useState('');
  const [csvLoading, setCsvLoading] = React.useState(false);
  const [csvMessage, setCsvMessage] = React.useState('');
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [confirmData, setConfirmData] = React.useState(null);

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
          <Route path="/add-class" element={<AddClass />} />
          <Route path="/add-course" element={<AddCourse />} />
          <Route path="/add-student" element={<AddStudent />} />
          <Route path="/add-teacher" element={<AddTeacher />} />

          {/* 管理員專用路由 */}
          {isLoggedIn.userType === 'admin' && (
            <>
              <Route path="/manage-classes" element={<ClassList />} />
              <Route path="/manage-students" element={<StudentList />} />
              <Route path="/manage-courses" element={<CourseList />} />
              <Route path="/manage-teachers" element={<TeacherList />} />
              <Route path="/login-management" element={<LoginManagement />} />
              <Route path="/revenue-overview" element={<RevenueStatistics />} />
              <Route path="/revenue-teacher" element={<RevenueStatistics />} />
              <Route path="/revenue-student" element={<RevenueStatistics />} />
              <Route path="/revenue-daily" element={<RevenueStatistics />} />
              <Route path="/billing-student" element={<BillingSystem />} />
              <Route path="/billing-teacher" element={<TeacherBillingSystem />} />
            </>
          )}

          {/* 默認重定向 */}
          <Route path="/" element={
            <div className="content">
              <h1>歡迎使用 Excelsia Education 管理系統</h1>
              <p>請從左側選單選擇功能</p>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;
