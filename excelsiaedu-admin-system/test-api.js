// API 連接測試腳本
// 在瀏覽器控制台中運行此腳本來測試 API 連接

const testAPI = async () => {
  console.log('=== API 連接測試開始 ===');
  
  const apiUrl = 'https://excelsiaedu-admin-system.onrender.com';
  const endpoints = ['/teachers', '/students', '/courses', '/classes'];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`測試端點: ${endpoint}`);
      const response = await fetch(`${apiUrl}${endpoint}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint} 成功:`, {
          status: response.status,
          dataLength: data.length,
          sampleData: data[0] || '無數據'
        });
      } else {
        console.error(`❌ ${endpoint} 失敗:`, {
          status: response.status,
          statusText: response.statusText
        });
      }
    } catch (error) {
      console.error(`❌ ${endpoint} 錯誤:`, error.message);
    }
  }
  
  console.log('=== API 連接測試完成 ===');
};

// 測試特定端點的數據結構
const testTeacherData = async () => {
  console.log('=== 教師數據結構測試 ===');
  
  try {
    const response = await fetch('https://excelsiaedu-admin-system.onrender.com/teachers');
    if (response.ok) {
      const teachers = await response.json();
      console.log('教師數據總數:', teachers.length);
      
      if (teachers.length > 0) {
        console.log('第一個教師數據:', teachers[0]);
        console.log('教師ID列表:', teachers.map(t => t.teacherId));
      }
    }
  } catch (error) {
    console.error('測試教師數據失敗:', error);
  }
};

// 測試課堂數據結構
const testClassData = async () => {
  console.log('=== 課堂數據結構測試 ===');
  
  try {
    const response = await fetch('https://excelsiaedu-admin-system.onrender.com/classes');
    if (response.ok) {
      const classes = await response.json();
      console.log('課堂數據總數:', classes.length);
      
      if (classes.length > 0) {
        console.log('第一個課堂數據:', classes[0]);
        console.log('課堂中的教師ID:', [...new Set(classes.map(c => c.teacherId))]);
      }
    }
  } catch (error) {
    console.error('測試課堂數據失敗:', error);
  }
};

// 測試數據關聯
const testDataAssociation = async () => {
  console.log('=== 數據關聯測試 ===');
  
  try {
    const [teachersRes, classesRes] = await Promise.all([
      fetch('https://excelsiaedu-admin-system.onrender.com/teachers'),
      fetch('https://excelsiaedu-admin-system.onrender.com/classes')
    ]);
    
    if (teachersRes.ok && classesRes.ok) {
      const teachers = await teachersRes.json();
      const classes = await classesRes.json();
      
      const teacherIds = new Set(teachers.map(t => t.teacherId));
      const classTeacherIds = new Set(classes.map(c => c.teacherId));
      
      const missingTeacherIds = Array.from(classTeacherIds).filter(id => !teacherIds.has(id));
      
      console.log('數據關聯分析:', {
        teacherCount: teachers.length,
        classCount: classes.length,
        teacherIds: Array.from(teacherIds),
        classTeacherIds: Array.from(classTeacherIds),
        missingTeacherIds,
        hasAssociationIssues: missingTeacherIds.length > 0
      });
    }
  } catch (error) {
    console.error('測試數據關聯失敗:', error);
  }
};

// 在瀏覽器控制台中運行這些函數
if (typeof window !== 'undefined') {
  window.testAPI = testAPI;
  window.testTeacherData = testTeacherData;
  window.testClassData = testClassData;
  window.testDataAssociation = testDataAssociation;
  
  console.log('API 測試函數已加載到全局作用域:');
  console.log('- testAPI() - 測試所有 API 端點');
  console.log('- testTeacherData() - 測試教師數據');
  console.log('- testClassData() - 測試課堂數據');
  console.log('- testDataAssociation() - 測試數據關聯');
}

export { testAPI, testTeacherData, testClassData, testDataAssociation };
