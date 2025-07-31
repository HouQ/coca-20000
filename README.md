# COCA 20000 单词学习网站

基于 COCA 20000 词汇表的移动端记单词网站，使用 Flask + Vue.js 构建。

## 功能特性

### 主页
- 按coca词频顺序显示未掌握的单词
- 显示已掌握/未掌握/总计统计信息
- "已掌握"按钮：点击标记当前单词为已掌握
- "需学习"按钮：点击进入单词学习页面

### 单词学习页面
- 显示单词详细信息（释义、音标、英文释义等）
- 自动播放发音（有道接口）
- 手动播放发音按钮
- "已掌握"按钮：标记掌握并返回主页
- "继续学习"按钮：获取下一个未掌握单词

### 已掌握单词列表
- 分页显示所有已掌握单词
- 返回主页按钮

### 最近学习页面
- 支持查看最近1天、7天、1个月的学习记录
- 显示单词

## 技术架构

### 后端
- **Flask**: Web 框架
- **SQLite**: 数据库（coca_vocabulary.db）
- **大模型集成（TODO）**: 获取单词详细信息（需配置 API）

### 前端
- **Vue.js 3**: JavaScript 框架
- **Axios**: HTTP 客户端
- **响应式设计**: 移动端优化
- **渐变色主题**: 现代化 UI 设计

### 数据库结构
```sql
vocabulary 表:
- id: 主键
- word: 单词
- mastered: 是否掌握 (0/1)
- study_count: 学习次数
- last_study_time: 最近学习时间
```

## 安装运行

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 运行应用
```bash
python app.py
```

### 3. 访问应用
打开浏览器访问：http://localhost:5000

## 配置说明

### 发音接口
使用有道词典的公开发音接口，无需额外配置。

## 项目结构
```
coca2000/
├── app.py                 # Flask 后端主文件
├── coca20000.db          # SQLite 数据库
├── COCA_20000.txt        # 词汇表文件
├── requirements.txt      # Python 依赖
├── README.md            # 项目说明
├── static/              # 静态资源
│   ├── css/
│   │   └── style.css    # 样式文件
│   └── js/
│       ├── main.js      # 主页逻辑
│       ├── study.js     # 学习页逻辑
│       ├── mastered.js  # 已掌握页逻辑
│       └── recent.js    # 最近学习页逻辑
└── templates/           # HTML 模板
    ├── index.html       # 主页
    ├── study.html       # 学习页
    ├── mastered.html    # 已掌握页
    └── recent.html      # 最近学习页
```

## 使用说明

1. **首次使用**：所有单词默认为未掌握状态
2. **学习流程**：主页 → 点击"需学习" → 学习页面 → 标记掌握或继续学习
