const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS配置 - 明確允許前端域名
const corsOptions = {
  origin: [
    'https://excelsiaedu-admin-system.vercel.app',
    'https://excelsiaedu-admin-system-git-main-ianho77.vercel.app',
    'https://excelsiaedu-admin-system-git-main-ianho77.vercel.app',
    'http://localhost:3000', // 開發環境
    'http://localhost:3001'  // 開發環境
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// 添加預檢請求處理
app.options('*', cors(corsOptions));

// 連接MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ian20051102:LxMgTBnGVt3ygblv@excelsiaedu.xxjs6v7.mongodb.net/?retryWrites=true&w=majority&appName=excelsiaedu';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ 成功連接到MongoDB Atlas');
}).catch((error) => {
  console.error('❌ 連接MongoDB Atlas失敗:', error);
});

// ==================== 數據模型定義 ====================

// 用戶認證模型
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, required: true, enum: ['teacher', 'admin'] },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

// 學生模型
const StudentSchema = new mongoose.Schema({
  studentId: String,
  nameZh: String,
  nameEn: String,
  grade: String,
  nickname: String, // 新增暱稱
  phone: String,    // 新增電話號碼
  wechat: String,   // 新增微信號碼
  school: String,   // 新增學校
  notes: String,    // 新增備註
});

// 課程模型
const CourseSchema = new mongoose.Schema({
  courseId: String,
  teacherId: String,
  grade: String,
  subject: String,
});

// 課堂模型
const ClassSchema = new mongoose.Schema({
  classId: String,
  courseId: String,
  date: String,
  price: Number,
  studentId: String, // 改為單一學生ID
});

// 教師模型
const TeacherSchema = new mongoose.Schema({
  teacherId: String,
  name: String,
  phone: String,
});

// 學生賬單狀態Schema
const StudentBillingStatusSchema = new mongoose.Schema({
  studentId: String,
  month: String, // 格式: "2024-01"
  paymentStatus: { type: String, default: '未繳交' }, // 未繳交, 已繳交
  paymentMethod: { type: String, default: 'N/A' }, // N/A, 現金, 銀行轉帳, 支票
  statementStatus: { type: String, default: '未生成' }, // 未生成, 已生成
  notes: String, // 備註
  updatedAt: { type: Date, default: Date.now }
});

// 教師賬單狀態Schema
const TeacherBillingStatusSchema = new mongoose.Schema({
  teacherId: String,
  month: String, // 格式: "2024-01"
  isVerified: { type: Boolean, default: false }, // 是否已驗證
  isPaid: { type: Boolean, default: false }, // 是否已付款
  notes: String, // 備註
  updatedAt: { type: Date, default: Date.now }
});

// 創建模型
const User = mongoose.model('User', UserSchema);
const Student = mongoose.model('Student', StudentSchema);
const Course = mongoose.model('Course', CourseSchema);
const Class = mongoose.model('Class', ClassSchema);
const Teacher = mongoose.model('Teacher', TeacherSchema);
const StudentBillingStatus = mongoose.model('StudentBillingStatus', StudentBillingStatusSchema);
const TeacherBillingStatus = mongoose.model('TeacherBillingStatus', TeacherBillingStatusSchema);

// ==================== 用戶認證API ====================

// 用戶登入API
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password, userType } = req.body;
    
    // 查找用戶
    const user = await User.findOne({ username, userType });
    
    if (!user) {
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }
    
    // 驗證密碼（簡單比較，實際應用中應該使用bcrypt等加密）
    if (user.password !== password) {
      return res.status(401).json({ error: '用戶名或密碼錯誤' });
    }
    
    // 更新最後登入時間
    user.lastLogin = new Date();
    await user.save();
    
    // 返回用戶信息（不包含密碼）
    res.json({
      success: true,
      user: {
        username: user.username,
        userType: user.userType,
        name: user.name
      }
    });
  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({ error: '登入失敗' });
  }
});

// 獲取所有用戶API（管理員用）
app.get('/auth/users', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // 不返回密碼
    res.json(users);
  } catch (error) {
    console.error('獲取用戶列表錯誤:', error);
    res.status(500).json({ error: '獲取用戶列表失敗' });
  }
});

// 創建新用戶API（管理員用）
app.post('/auth/users', async (req, res) => {
  try {
    const { username, password, userType, name } = req.body;
    
    // 檢查用戶名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: '用戶名已存在' });
    }
    
    const newUser = new User({
      username,
      password,
      userType,
      name
    });
    
    await newUser.save();
    
    res.json({
      success: true,
      user: {
        username: newUser.username,
        userType: newUser.userType,
        name: newUser.name
      }
    });
  } catch (error) {
    console.error('創建用戶錯誤:', error);
    res.status(500).json({ error: '創建用戶失敗' });
  }
});

// 更新用戶密碼API
app.put('/auth/users/:username/password', async (req, res) => {
  try {
    const { username } = req.params;
    const { newPassword } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ success: true, message: '密碼更新成功' });
  } catch (error) {
    console.error('更新密碼錯誤:', error);
    res.status(500).json({ error: '更新密碼失敗' });
  }
});

// 刪除用戶API（管理員用）
app.delete('/auth/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const result = await User.deleteOne({ username });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: '用戶不存在' });
    }
    
    res.json({ success: true, message: '用戶刪除成功' });
  } catch (error) {
    console.error('刪除用戶錯誤:', error);
    res.status(500).json({ error: '刪除用戶失敗' });
  }
});

// ==================== 學生API ====================

app.get('/students', async (req, res) => {
  const students = await Student.find();
  res.json(students);
});

app.post('/students', async (req, res) => {
  const count = await Student.countDocuments();
  const studentId = (count + 1).toString();
  const student = new Student({ studentId, ...req.body });
  await student.save();
  res.json(student);
});

app.put('/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!student) {
      return res.status(404).json({ message: '學生不存在' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: '更新失敗', error: error.message });
  }
});

app.delete('/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: '學生不存在' });
    }
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ message: '刪除失敗', error: error.message });
  }
});

// ==================== 課程API ====================

app.get('/courses', async (req, res) => {
  const courses = await Course.find();
  res.json(courses);
});

app.post('/courses', async (req, res) => {
  const count = await Course.countDocuments();
  const courseId = (count + 1).toString();
  const course = new Course({ courseId, ...req.body });
  await course.save();
  res.json(course);
});

app.put('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!course) {
      return res.status(404).json({ message: '課程不存在' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: '更新失敗', error: error.message });
  }
});

app.delete('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ message: '課程不存在' });
    }
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ message: '刪除失敗', error: error.message });
  }
});

// ==================== 課堂API ====================

app.get('/classes', async (req, res) => {
  const classes = await Class.find();
  res.json(classes);
});

app.post('/classes', async (req, res) => {
  const count = await Class.countDocuments();
  const classId = (count + 1).toString();
  const newClass = new Class({ classId, ...req.body });
  await newClass.save();
  res.json(newClass);
});

app.put('/classes/:id', async (req, res) => {
  try {
    const classData = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!classData) {
      return res.status(404).json({ message: '課堂不存在' });
    }
    res.json(classData);
  } catch (error) {
    res.status(500).json({ message: '更新失敗', error: error.message });
  }
});

app.delete('/classes/:id', async (req, res) => {
  try {
    const classData = await Class.findByIdAndDelete(req.params.id);
    if (!classData) {
      return res.status(404).json({ message: '課堂不存在' });
    }
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ message: '刪除失敗', error: error.message });
  }
});

// ==================== 教師API ====================

app.get('/teachers', async (req, res) => {
  const teachers = await Teacher.find();
  res.json(teachers);
});

app.post('/teachers', async (req, res) => {
  const count = await Teacher.countDocuments();
  const teacherId = (count + 1).toString();
  const teacher = new Teacher({ teacherId, ...req.body });
  await teacher.save();
  res.json(teacher);
});

app.put('/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!teacher) {
      return res.status(404).json({ message: '教師不存在' });
    }
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: '更新失敗', error: error.message });
  }
});

app.delete('/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: '教師不存在' });
    }
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ message: '刪除失敗', error: error.message });
  }
});

// ==================== 學生賬單狀態API ====================

app.get('/student-billing-status', async (req, res) => {
  try {
    const { studentId, month } = req.query;
    let query = {};
    if (studentId) query.studentId = studentId;
    if (month) query.month = month;
    
    const statuses = await StudentBillingStatus.find(query);
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ message: '獲取失敗', error: error.message });
  }
});

app.post('/student-billing-status', async (req, res) => {
  try {
    const { studentId, month, paymentStatus, paymentMethod, statementStatus, notes } = req.body;
    
    // 檢查是否已存在該學生該月份的記錄
    const existingStatus = await StudentBillingStatus.findOne({ studentId, month });
    
    if (existingStatus) {
      // 更新現有記錄
      const updatedStatus = await StudentBillingStatus.findByIdAndUpdate(
        existingStatus._id,
        { paymentStatus, paymentMethod, statementStatus, notes, updatedAt: Date.now() },
        { new: true }
      );
      res.json(updatedStatus);
    } else {
      // 創建新記錄
      const newStatus = new StudentBillingStatus({
        studentId,
        month,
        paymentStatus,
        paymentMethod,
        statementStatus,
        notes
      });
      await newStatus.save();
      res.json(newStatus);
    }
  } catch (error) {
    res.status(500).json({ message: '保存失敗', error: error.message });
  }
});

app.put('/student-billing-status/:id', async (req, res) => {
  try {
    const status = await StudentBillingStatus.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!status) {
      return res.status(404).json({ message: '記錄不存在' });
    }
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: '更新失敗', error: error.message });
  }
});

// ==================== 教師賬單狀態API ====================

app.get('/teacher-billing-status', async (req, res) => {
  try {
    const { teacherId, month } = req.query;
    let query = {};
    if (teacherId) query.teacherId = teacherId;
    if (month) query.month = month;
    
    const statuses = await TeacherBillingStatus.find(query);
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ message: '獲取失敗', error: error.message });
  }
});

app.post('/teacher-billing-status', async (req, res) => {
  try {
    const { teacherId, month, isVerified, isPaid, notes } = req.body;
    
    // 檢查是否已存在該教師該月份的記錄
    const existingStatus = await TeacherBillingStatus.findOne({ teacherId, month });
    
    if (existingStatus) {
      // 更新現有記錄
      const updatedStatus = await TeacherBillingStatus.findByIdAndUpdate(
        existingStatus._id,
        { isVerified, isPaid, notes, updatedAt: Date.now() },
        { new: true }
      );
      res.json(updatedStatus);
    } else {
      // 創建新記錄
      const newStatus = new TeacherBillingStatus({
        teacherId,
        month,
        isVerified,
        isPaid,
        notes
      });
      await newStatus.save();
      res.json(newStatus);
    }
  } catch (error) {
    res.status(500).json({ message: '保存失敗', error: error.message });
  }
});

app.put('/teacher-billing-status/:id', async (req, res) => {
  try {
    const status = await TeacherBillingStatus.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: '更新失敗', error: error.message });
  }
});

// ==================== 健康檢查API ====================

app.get('/', (req, res) => {
  res.json({ 
    message: 'ExcelsiaEdu API Server is running',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ==================== 服務器啟動 ====================

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 統一API服務器運行在端口 ${PORT}`);
  console.log(`📡 API地址: http://localhost:${PORT}`);
  console.log(`✅ 已整合所有功能：用戶認證、學生管理、課程管理、課堂管理、教師管理、賬單狀態管理`);
});