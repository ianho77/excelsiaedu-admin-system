const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 連接到本地MongoDB
mongoose.connect('mongodb://localhost:27017/excelsiaedu', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ 成功連接到本地MongoDB');
  exportData();
}).catch((error) => {
  console.error('❌ 連接本地MongoDB失敗:', error.message);
  process.exit(1);
});

// 定義所有模型
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, required: true, enum: ['teacher', 'admin'] },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

const StudentSchema = new mongoose.Schema({
  studentId: String,
  nameZh: String,
  nameEn: String,
  grade: String,
  nickname: String,
  phone: String,
  school: String,
});

const CourseSchema = new mongoose.Schema({
  courseId: String,
  teacherId: String,
  grade: String,
  subject: String,
});

const ClassSchema = new mongoose.Schema({
  classId: String,
  courseId: String,
  date: String,
  price: Number,
  studentId: String,
});

const TeacherSchema = new mongoose.Schema({
  teacherId: String,
  name: String,
  phone: String,
});

const StudentBillingStatusSchema = new mongoose.Schema({
  studentId: String,
  month: String,
  paymentStatus: { type: String, default: '未繳交' },
  paymentMethod: { type: String, default: 'N/A' },
  statementStatus: { type: String, default: '未生成' },
  notes: String,
  updatedAt: { type: Date, default: Date.now }
});

const TeacherBillingStatusSchema = new mongoose.Schema({
  teacherId: String,
  month: String,
  isVerified: { type: Boolean, default: false },
  isPaid: { type: Boolean, default: false },
  notes: String,
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Student = mongoose.model('Student', StudentSchema);
const Course = mongoose.model('Course', CourseSchema);
const Class = mongoose.model('Class', ClassSchema);
const Teacher = mongoose.model('Teacher', TeacherSchema);
const StudentBillingStatus = mongoose.model('StudentBillingStatus', StudentBillingStatusSchema);
const TeacherBillingStatus = mongoose.model('TeacherBillingStatus', TeacherBillingStatusSchema);

// 導出數據
const exportData = async () => {
  try {
    console.log('🔄 開始導出數據...');
    
    const collections = [
      { name: 'users', model: User },
      { name: 'students', model: Student },
      { name: 'courses', model: Course },
      { name: 'classes', model: Class },
      { name: 'teachers', model: Teacher },
      { name: 'studentbillingstatuses', model: StudentBillingStatus },
      { name: 'teacherbillingstatuses', model: TeacherBillingStatus }
    ];
    
    const exportData = {};
    
    for (const collection of collections) {
      console.log(`📤 導出 ${collection.name} 集合...`);
      const data = await collection.model.find({});
      exportData[collection.name] = data;
      console.log(`✅ ${collection.name}: ${data.length} 條記錄`);
    }
    
    // 保存到文件
    const exportPath = path.join(__dirname, 'exported_data.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`💾 數據已保存到: ${exportPath}`);
    console.log('✅ 數據導出完成！');
    
  } catch (error) {
    console.error('❌ 數據導出失敗:', error);
  } finally {
    await mongoose.connection.close();
    console.log('�� 已關閉數據庫連接');
  }
}; 