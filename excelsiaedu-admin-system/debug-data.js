// 数据调试脚本 - 在浏览器控制台中运行
const debugDataAssociation = () => {
  console.log('=== 数据关联调试开始 ===');
  
  // 获取当前组件的数据
  const currentComponent = document.querySelector('.revenue-statistics');
  if (!currentComponent) {
    console.error('未找到营收统计组件');
    return;
  }
  
  // 尝试从全局变量获取数据（如果可用）
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('React DevTools 可用，尝试获取组件数据...');
  }
  
  // 检查控制台中的日志
  console.log('请检查上面的控制台日志，查看：');
  console.log('1. 课堂数据中的教师ID和课程ID');
  console.log('2. 教师数据中的ID');
  console.log('3. 课程数据中的ID');
  console.log('4. 数据匹配情况');
  
  // 提供手动测试方法
  console.log('\n手动测试方法：');
  console.log('1. 在控制台中运行: testAPI()');
  console.log('2. 检查 Network 标签中的 API 响应');
  console.log('3. 查看是否有 CORS 错误');
};

// 检查数据完整性
const checkDataIntegrity = async () => {
  console.log('=== 检查数据完整性 ===');
  
  try {
    const apiUrl = 'https://excelsiaedu-admin-system.onrender.com';
    const endpoints = ['/teachers', '/classes', '/courses'];
    
    for (const endpoint of endpoints) {
      const response = await fetch(`${apiUrl}${endpoint}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`${endpoint}:`, {
          count: data.length,
          sample: data[0] || '无数据',
          hasIds: data.length > 0 ? !!data[0].teacherId || !!data[0].courseId : false
        });
      }
    }
  } catch (error) {
    console.error('检查数据完整性失败:', error);
  }
};

// 测试数据匹配
const testDataMatching = async () => {
  console.log('=== 测试数据匹配 ===');
  
  try {
    const [teachersRes, classesRes] = await Promise.all([
      fetch('https://excelsiaedu-admin-system.onrender.com/teachers'),
      fetch('https://excelsiaedu-admin-system.onrender.com/classes')
    ]);
    
    if (teachersRes.ok && classesRes.ok) {
      const teachers = await teachersRes.json();
      const classes = await classesRes.json();
      
      console.log('教师数据:', teachers.slice(0, 3));
      console.log('课堂数据:', classes.slice(0, 3));
      
      // 检查ID类型
      const teacherIdTypes = teachers.map(t => typeof t.teacherId);
      const classTeacherIdTypes = classes.map(c => typeof c.teacherId);
      
      console.log('教师ID类型:', [...new Set(teacherIdTypes)]);
      console.log('课堂教师ID类型:', [...new Set(classTeacherIdTypes)]);
      
      // 检查是否有ID为空或undefined
      const emptyTeacherIds = teachers.filter(t => !t.teacherId).length;
      const emptyClassTeacherIds = classes.filter(c => !c.teacherId).length;
      
      console.log('空教师ID数量:', emptyTeacherIds);
      console.log('空课堂教师ID数量:', emptyClassTeacherIds);
    }
  } catch (error) {
    console.error('测试数据匹配失败:', error);
  }
};

// 在浏览器控制台中运行这些函数
if (typeof window !== 'undefined') {
  window.debugDataAssociation = debugDataAssociation;
  window.checkDataIntegrity = checkDataIntegrity;
  window.testDataMatching = testDataMatching;
  
  console.log('数据调试函数已加载:');
  console.log('- debugDataAssociation() - 开始数据关联调试');
  console.log('- checkDataIntegrity() - 检查数据完整性');
  console.log('- testDataMatching() - 测试数据匹配');
}

export { debugDataAssociation, checkDataIntegrity, testDataMatching };
