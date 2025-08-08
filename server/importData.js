const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 連接到MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ian20051102:LxMgTBnGVt3ygblv@excelsiaedu.xxjs6v7.mongodb.net/?retryWrites=true&w=majority&appName=excelsiaedu';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ 成功連接到MongoDB Atlas');
  importData();
}).catch((error) => {
  console.error('❌ 連接MongoDB Atlas失敗:', error.message);
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

// 導入數據
const importData = async () => {
  try {
    console.log('🔄 開始導入數據...');
    
    // 讀取導出的數據文件
    const exportPath = path.join(__dirname, 'exported_data.json');
    
    if (!fs.existsSync(exportPath)) {
      console.error('❌ 找不到導出的數據文件:', exportPath);
      console.log('💡 請先運行 exportData.js 導出數據');
      process.exit(1);
    }
    
    const exportedData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    
    const collections = [
      { name: 'users', model: User },
      { name: 'students', model: Student },
      { name: 'courses', model: Course },
      { name: 'classes', model: Class },
      { name: 'teachers', model: Teacher },
      { name: 'studentbillingstatuses', model: StudentBillingStatus },
      { name: 'teacherbillingstatuses', model: TeacherBillingStatus }
    ];
    
    for (const collection of collections) {
      console.log(`📥 導入 ${collection.name} 集合...`);
      
      const data = exportedData[collection.name] || [];
      
      if (data.length > 0) {
        // 清空現有數據
        await collection.model.deleteMany({});
        console.log(`🗑️  已清空 ${collection.name} 集合`);
        
        // 導入新數據
        await collection.model.insertMany(data);
        console.log(`✅ ${collection.name}: 成功導入 ${data.length} 條記錄`);
      } else {
        console.log(`ℹ️  ${collection.name}: 沒有數據需要導入`);
      }
    }
    
    console.log('✅ 數據導入完成！');
    console.log('🎉 您的數據已成功遷移到MongoDB Atlas！');
    
  } catch (error) {
    console.error('❌ 數據導入失敗:', error);
  } finally {
    await mongoose.connection.close();
    console.log('�� 已關閉數據庫連接');
  }
}; 