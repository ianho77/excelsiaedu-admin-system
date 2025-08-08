const mongoose = require('mongoose');

// 連接到MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ian20051102:LxMgTBnGVt3ygblv@excelsiaedu.xxjs6v7.mongodb.net/?retryWrites=true&w=majority&appName=excelsiaedu';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ 成功連接到MongoDB Atlas');
  initUsers();
}).catch((error) => {
  console.error('❌ 連接MongoDB Atlas失敗:', error.message);
  console.log('💡 請檢查網絡連接和數據庫配置');
  process.exit(1);
});

// 用戶模型
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { type: String, required: true, enum: ['teacher', 'admin'] },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

const User = mongoose.model('User', UserSchema);

// 初始化用戶數據
const initUsers = async () => {
  try {
    console.log('🔄 開始初始化用戶...');
    
    // 清空現有用戶
    await User.deleteMany({});
    console.log('🗑️  已清空現有用戶');
    
    // 添加默認用戶
    const defaultUsers = [
      {
        username: 'teacher',
        password: 'teacher123',
        userType: 'teacher',
        name: '教師用戶'
      },
      {
        username: 'admin',
        password: 'admin123',
        userType: 'admin',
        name: '管理員用戶'
      }
    ];
    
    await User.insertMany(defaultUsers);
    console.log('✅ 用戶初始化成功！');
    console.log('📋 默認用戶：');
    console.log('   教師帳號: teacher / teacher123');
    console.log('   管理員帳號: admin / admin123');
    
  } catch (error) {
    console.error('❌ 用戶初始化失敗:', error);
  } finally {
    await mongoose.connection.close();
    console.log('�� 已關閉數據庫連接');
  }
}; 