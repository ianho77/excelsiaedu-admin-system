const mongoose = require('mongoose');

// 連接MongoDB
mongoose.connect('mongodb://localhost:27017/excelsiaedu', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const TeacherSchema = new mongoose.Schema({
  teacherId: String,
  name: String,
});

const Teacher = mongoose.model('Teacher', TeacherSchema);

async function fixTeacherIds() {
  try {
    console.log('開始更新教師ID格式...');
    
    // 獲取所有教師
    const teachers = await Teacher.find().sort({ teacherId: 1 });
    
    // 更新每個教師的ID
    for (let i = 0; i < teachers.length; i++) {
      const teacher = teachers[i];
      const newTeacherId = (i + 1).toString();
      
      console.log(`更新教師: ${teacher.name} (${teacher.teacherId} -> ${newTeacherId})`);
      
      // 更新教師ID
      await Teacher.updateOne(
        { _id: teacher._id },
        { teacherId: newTeacherId }
      );
    }
    
    console.log(`完成！已更新 ${teachers.length} 個教師的ID`);
    
    // 顯示更新後的結果
    const updatedTeachers = await Teacher.find().sort({ teacherId: 1 });
    console.log('\n更新後的教師列表:');
    updatedTeachers.forEach(teacher => {
      console.log(`ID: ${teacher.teacherId}, 姓名: ${teacher.name}`);
    });
    
  } catch (error) {
    console.error('更新失敗:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixTeacherIds(); 