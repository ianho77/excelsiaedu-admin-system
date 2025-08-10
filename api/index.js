const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 连接MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ian20051102:LxMgTBnGVt3ygblv@excelsiaedu.xxjs6v7.mongodb.net/?retryWrites=true&w=majority&appName=excelsiaedu';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ 成功连接到MongoDB Atlas');
}).catch((error) => {
  console.error('❌ 连接MongoDB Atlas失败:', error);
});

// 数据模型定义
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
  wechat: String,
  school: String,
  notes: String,
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

// 创建模型
const User = mongoose.model('User', UserSchema);
const Student = mongoose.model('Student', StudentSchema);
const Course = mongoose.model('Course', CourseSchema);
const Class = mongoose.model('Class', ClassSchema);
const Teacher = mongoose.model('Teacher', TeacherSchema);
const StudentBillingStatus = mongoose.model('StudentBillingStatus', StudentBillingStatusSchema);
const TeacherBillingStatus = mongoose.model('TeacherBillingStatus', TeacherBillingStatusSchema);

// 用户认证API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    
    if (user) {
      await User.updateOne({ username }, { lastLogin: new Date() });
      res.json({ success: true, user: { username: user.username, userType: user.userType, name: user.name } });
    } else {
      res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.get('/api/auth/users', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 学生API
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 教师API
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/teachers', async (req, res) => {
  try {
    const teacher = new Teacher(req.body);
    await teacher.save();
    res.json({ success: true, teacher });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 课程API
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const course = new Course(req.body);
    await course.save();
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 课堂API
app.get('/api/classes', async (req, res) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/classes', async (req, res) => {
  try {
    const classData = new Class(req.body);
    await classData.save();
    res.json({ success: true, class: classData });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 学生账单状态API
app.get('/api/student-billing-status', async (req, res) => {
  try {
    const { month } = req.query;
    const query = month ? { month } : {};
    const statuses = await StudentBillingStatus.find(query);
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/student-billing-status', async (req, res) => {
  try {
    const status = new StudentBillingStatus(req.body);
    await status.save();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 教师账单状态API
app.get('/api/teacher-billing-status', async (req, res) => {
  try {
    const { month } = req.query;
    const query = month ? { month } : {};
    const statuses = await TeacherBillingStatus.find(query);
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

app.post('/api/teacher-billing-status', async (req, res) => {
  try {
    const status = new TeacherBillingStatus(req.body);
    await status.save();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 导出为Vercel函数
module.exports = app;
