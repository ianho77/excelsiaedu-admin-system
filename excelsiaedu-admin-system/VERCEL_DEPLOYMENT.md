# Vercel 部署配置說明

## 環境變量設置

為了確保前端能正確連接到 Render 後端，請在 Vercel 上設置以下環境變量：

### 1. 在 Vercel Dashboard 中設置環境變量

1. 登錄 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇您的專案
3. 點擊 "Settings" 標籤
4. 在左側菜單中選擇 "Environment Variables"
5. 添加以下環境變量：

```
變量名稱: REACT_APP_API_URL
變量值: https://excelsiaedu-admin-system.onrender.com
環境: Production, Preview, Development
```

### 2. 重新部署

設置環境變量後，需要重新部署專案：

1. 在 Vercel Dashboard 中點擊 "Deployments" 標籤
2. 找到最新的部署記錄
3. 點擊 "Redeploy" 按鈕

### 3. 驗證配置

部署完成後，檢查瀏覽器控制台是否顯示正確的 API URL：

```javascript
console.log('API URL:', config.API_URL);
// 應該顯示: https://excelsiaedu-admin-system.onrender.com
```

## 常見問題

### 問題 1: 教師數據顯示"未知教師"
- **原因**: 前端無法連接到後端 API
- **解決方案**: 檢查環境變量是否正確設置

### 問題 2: 總金額顯示 $0
- **原因**: 數據計算邏輯問題或 API 連接失敗
- **解決方案**: 檢查瀏覽器控制台的錯誤信息

### 問題 3: 月份篩選間隔過大
- **原因**: CSS 樣式問題
- **解決方案**: 已在前端代碼中修復

## 測試步驟

1. 部署完成後，打開應用程序
2. 按 F12 打開開發者工具
3. 查看 Console 標籤中的日誌信息
4. 檢查 Network 標籤中的 API 請求
5. 確認所有 API 端點都返回 200 狀態碼

## 聯繫支持

如果問題仍然存在，請提供：
1. 瀏覽器控制台的錯誤信息
2. Network 標籤中的 API 請求詳情
3. Vercel 部署日誌
