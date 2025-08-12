// 测试数据结构和关联的脚本
const testDataStructure = () => {
  console.log('=== 数据测试开始 ===');
  
  // 模拟数据
  const mockClasses = [
    {
      classId: 'C001',
      date: '2024-01-15T10:00:00',
      teacherId: 'T001',
      courseId: 'COURSE001',
      studentId: 'S001',
      price: 500
    },
    {
      classId: 'C002',
      date: '2024-01-16T14:00:00',
      teacherId: 'T002',
      courseId: 'COURSE002',
      studentId: 'S002',
      price: 600
    }
  ];
  
  const mockTeachers = [
    {
      teacherId: 'T001',
      nameZh: '張老師',
      nameEn: 'Teacher Zhang'
    },
    {
      teacherId: 'T002',
      nameZh: '李老師',
      nameEn: 'Teacher Li'
    }
  ];
  
  const mockCourses = [
    {
      courseId: 'COURSE001',
      grade: '中一',
      subject: '數學'
    },
    {
      courseId: 'COURSE002',
      grade: '中二',
      subject: '英文'
    }
  ];
  
  // 测试数据关联
  const testDataAssociation = () => {
    console.log('测试数据关联...');
    
    mockClasses.forEach(cls => {
      const teacher = mockTeachers.find(t => t.teacherId === cls.teacherId);
      const course = mockCourses.find(c => c.courseId === cls.courseId);
      
      console.log(`课堂 ${cls.classId}:`);
      console.log(`  教师: ${teacher ? teacher.nameZh : '未知教师'}`);
      console.log(`  课程: ${course ? `${course.grade}${course.subject}` : '未知课程'}`);
      console.log(`  价格: ${cls.price}`);
    });
  };
  
  // 测试价格计算
  const testPriceCalculation = () => {
    console.log('测试价格计算...');
    
    const totalPrice = mockClasses.reduce((sum, cls) => sum + parseFloat(cls.price || 0), 0);
    console.log(`总价格: ${totalPrice}`);
    
    const teacherRevenue = {};
    mockClasses.forEach(cls => {
      const teacher = mockTeachers.find(t => t.teacherId === cls.teacherId);
      if (teacher) {
        if (!teacherRevenue[teacher.teacherId]) {
          teacherRevenue[teacher.teacherId] = {
            name: teacher.nameZh || teacher.nameEn,
            amount: 0
          };
        }
        teacherRevenue[teacher.teacherId].amount += parseFloat(cls.price) || 0;
      }
    });
    
    console.log('教师营收:', teacherRevenue);
  };
  
  testDataAssociation();
  testPriceCalculation();
  
  console.log('=== 数据测试完成 ===');
};

// 如果在浏览器环境中运行
if (typeof window !== 'undefined') {
  window.testDataStructure = testDataStructure;
} else {
  // 如果在Node.js环境中运行
  testDataStructure();
}

export default testDataStructure;
