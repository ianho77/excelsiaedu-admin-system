# ExcelsiaEdu 管理系統

## 項目結構重構說明

### 🎯 重構目標
將原本分散的兩個server目錄合併為一個統一的API服務器，並清理重複的src目錄，簡化項目結構並提高維護性。

### 📁 新的項目結構

```
excelsiaedu-admin-system/
├── server/                    # 🚀 統一API服務器
│   ├── index.js              # 主服務器文件（整合所有功能）
│   ├── initUsers.js          # 用戶初始化腳本
│   ├── fixStudentId.js       # 學生ID修復腳本
│   ├── fixTeacherId.js       # 教師ID修復腳本
│   ├── package.json          # 服務器依賴配置
│   └── node_modules/         # 服務器依賴包
├── excelsiaedu-admin-system/ # 📱 React前端應用
│   ├── src/                  # React源代碼
│   │   ├── components/       # React組件
│   │   ├── App.jsx          # 主應用組件
│   │   ├── index.js         # 應用入口
│   │   └── ...
│   ├── public/               # 靜態資源
│   ├── package.json          # 前端依賴配置
│   └── ...
└── README.md                 # 項目說明文檔
```

### 🔧 統一API服務器功能

#### 用戶認證系統
- `POST /api/auth/login` - 用戶登入
- `GET /api/auth/users` - 獲取所有用戶（管理員用）
- `POST /api/auth/users` - 創建新用戶（管理員用）
- `PUT /api/auth/users/:username/password` - 更新用戶密碼
- `DELETE /api/auth/users/:username` - 刪除用戶（管理員用）

#### 學生管理
- `GET /api/students` - 獲取所有學生
- `POST /api/students` - 創建新學生
- `PUT /api/students/:id` - 更新學生信息
- `DELETE /api/students/:id` - 刪除學生

#### 課程管理
- `GET /api/courses` - 獲取所有課程
- `POST /api/courses` - 創建新課程
- `PUT /api/courses/:id` - 更新課程信息
- `DELETE /api/courses/:id` - 刪除課程

#### 課堂管理
- `GET /api/classes` - 獲取所有課堂
- `POST /api/classes` - 創建新課堂
- `PUT /api/classes/:id` - 更新課堂信息
- `DELETE /api/classes/:id` - 刪除課堂

#### 教師管理
- `GET /api/teachers` - 獲取所有教師
- `POST /api/teachers` - 創建新教師
- `PUT /api/teachers/:id` - 更新教師信息
- `DELETE /api/teachers/:id` - 刪除教師

#### 賬單狀態管理
- `GET /api/student-billing-status` - 獲取學生賬單狀態
- `POST /api/student-billing-status` - 創建/更新學生賬單狀態
- `PUT /api/student-billing-status/:id` - 更新學生賬單狀態
- `GET /api/teacher-billing-status` - 獲取教師賬單狀態
- `POST /api/teacher-billing-status` - 創建/更新教師賬單狀態
- `PUT /api/teacher-billing-status/:id` - 更新教師賬單狀態

### 🚀 快速開始

#### 1. 安裝依賴
```bash
# 安裝服務器依賴
cd server
npm install

# 安裝前端依賴
cd ../excelsiaedu-admin-system
npm install
```

#### 2. 啟動MongoDB
確保MongoDB服務正在運行在 `localhost:27017`

#### 3. 初始化用戶數據
```bash
cd server
npm run init-users
```

#### 4. 啟動服務器
```bash
# 啟動API服務器
cd server
npm start

# 啟動前端應用（新終端）
cd excelsiaedu-admin-system
npm start
```

### 📋 默認用戶賬號

初始化後會創建以下默認用戶：

- **教師賬號**: `teacher` / `teacher123`
- **管理員賬號**: `admin` / `admin123`

### 🔄 重構優勢

1. **統一管理**: 所有API端點集中在一個服務器中
2. **簡化部署**: 只需要維護一個服務器實例
3. **提高效率**: 減少重複代碼和配置
4. **易於維護**: 清晰的代碼結構和註釋
5. **統一數據庫**: 所有數據模型使用同一個MongoDB連接
6. **清理重複**: 移除重複的src目錄，避免混淆

### 📝 注意事項

- 確保MongoDB服務正在運行
- API服務器默認運行在端口4000
- 前端應用默認運行在端口3000
- 所有API端點都支持CORS跨域請求

### 🛠️ 開發腳本

```bash
# 開發模式（自動重啟）
npm run dev

# 初始化用戶
npm run init-users

# 啟動生產模式
npm start
```

### 🧹 清理記錄

- ✅ 合併兩個server目錄為統一API服務器
- ✅ 清理重複的src目錄
- ✅ 保留最新的組件版本
- ✅ 更新項目文檔 