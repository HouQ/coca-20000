from flask import Flask, jsonify, request, render_template
import sqlite3
import random
import requests
from datetime import datetime, timedelta
import json

app = Flask(__name__)

# 数据库连接
def get_db_connection():
    conn = sqlite3.connect('coca_vocabulary.db')
    conn.row_factory = sqlite3.Row
    return conn

# 初始化数据库（如果表不存在）
def init_db():
    conn = get_db_connection()
    # 创建单词表
    conn.execute('''
        CREATE TABLE IF NOT EXISTS vocabulary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            phonetic TEXT,
            definition TEXT,
            mastered BOOLEAN DEFAULT 0,
            review_count INTEGER DEFAULT 0,
            recent_time TIMESTAMP DEFAULT NULL
        )
    ''')
    # 创建辅助表
    conn.execute('''
        CREATE TABLE IF NOT EXISTS helper (
            id INTEGER PRIMARY KEY, 
            progress INTEGER DEFAULT 1
        )
    ''')
    # 检查helper表是否有记录
    count = conn.execute('SELECT COUNT(*) FROM helper').fetchone()[0]
    if count == 0:
        conn.execute('INSERT INTO helper (id, progress) VALUES (1, 1)')

    # 如果单词表为空，从COCA_20000.txt导入数据
    count = conn.execute('SELECT COUNT(*) FROM vocabulary').fetchone()[0]
    if count == 0:
        with open('COCA_20000.txt', 'r', encoding='utf-8') as f:
            for line_num, word in enumerate(f, 1):
                word = word.strip()
                if word:
                    conn.execute(
                        'INSERT INTO vocabulary (id, word) VALUES (?, ?)',
                        (line_num, word)
                    )
        conn.commit()
    conn.close()

# 获取统计信息
@app.route('/api/stats')
def get_stats():
    conn = get_db_connection()
    mastered_count = conn.execute('SELECT COUNT(*) FROM vocabulary WHERE mastered = 1').fetchone()[0]
    total_count = conn.execute('SELECT COUNT(*) FROM vocabulary').fetchone()[0]
    unmastered_count = total_count - mastered_count
    conn.close()
    
    return jsonify({
        'mastered': mastered_count,
        'unmastered': unmastered_count,
        'total': total_count
    })

# 获取当前进度的单词，或上/下一个未掌握的单词
@app.route('/api/word-by-progress')
def get_word_by_progress():
    direction = request.args.get('direction', 'current') # current, next, prev
    conn = get_db_connection()

    try:
        # 获取当前进度
        progress_id = conn.execute('SELECT progress FROM helper WHERE id = 1').fetchone()['progress']

        word = None
        if direction == 'current':
            word = conn.execute('SELECT id, word, review_count, definition FROM vocabulary WHERE id = ?', (progress_id,)).fetchone()
        elif direction == 'next':
            word = conn.execute('SELECT id, word, review_count, definition FROM vocabulary WHERE mastered = 0 AND id > ? ORDER BY id ASC LIMIT 1', (progress_id,)).fetchone()
            if not word: # 如果后面没有了，从头开始找
                word = conn.execute('SELECT id, word, review_count, definition FROM vocabulary WHERE mastered = 0 ORDER BY id ASC LIMIT 1').fetchone()
        elif direction == 'prev':
            word = conn.execute('SELECT id, word, review_count, definition FROM vocabulary WHERE mastered = 0 AND id < ? ORDER BY id DESC LIMIT 1', (progress_id,)).fetchone()
            if not word: # 如果前面没有了，从末尾开始找
                word = conn.execute('SELECT id, word, review_count, definition FROM vocabulary WHERE mastered = 0 ORDER BY id DESC LIMIT 1').fetchone()

        if word:
            # 更新进度
            conn.execute('UPDATE helper SET progress = ? WHERE id = 1', (word['id'],))
            conn.commit()
            return jsonify(dict(word))
        else:
            return jsonify({'word': '所有单词都已掌握！', 'id': None})

    finally:
        conn.close()

# 标记单词为已掌握
@app.route('/api/master-word', methods=['POST'])
def master_word():
    data = request.get_json()
    word_id = data.get('id')
    
    conn = get_db_connection()
    conn.execute(
        'UPDATE vocabulary SET mastered = 1 WHERE id = ?',
        (word_id,)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# 标记单词为未掌握
@app.route('/api/unmaster-word', methods=['POST'])
def unmaster_word():
    data = request.get_json()
    word_id = data.get('word_id')  # 修改为 word_id
    
    conn = get_db_connection()
    conn.execute(
        'UPDATE vocabulary SET mastered = 0 WHERE id = ?',
        (word_id,)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# 更新学习时间
@app.route('/api/study-word', methods=['POST'])
def study_word():
    data = request.get_json()
    word_id = data.get('id')
    
    conn = get_db_connection()
    conn.execute(
        'UPDATE vocabulary SET recent_time = ?, review_count = review_count + 1 WHERE id = ?',
        (datetime.now().isoformat(), word_id)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# 获取已掌握单词列表（分页）
@app.route('/api/mastered-words')
def get_mastered_words():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    conn = get_db_connection()
    
    # 获取总数
    total_count = conn.execute(
        'SELECT COUNT(*) FROM vocabulary WHERE mastered = 1'
    ).fetchone()[0]
    
    # 分页查询
    offset = (page - 1) * per_page
    words = conn.execute(
        'SELECT id, word, review_count FROM vocabulary WHERE mastered = 1 ORDER BY id LIMIT ? OFFSET ?',
        (per_page, offset)
    ).fetchall()
    conn.close()
    
    # 计算总页数，至少为1页
    total_pages = max(1, (total_count + per_page - 1) // per_page) if total_count > 0 else 1
    
    return jsonify({
        'words': [dict(row) for row in words],
        'total': total_count,
        'page': page,
        'per_page': per_page,
        'total_pages': total_pages
    })

# 获取最近学习单词（分页）
@app.route('/api/recent-words/<period>')
def get_recent_words(period):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    conn = get_db_connection()
    
    # 计算时间范围
    now = datetime.now()
    if period == '1day':
        since = now - timedelta(days=1)
    elif period == '7days':
        since = now - timedelta(days=7)
    elif period == '1month':
        since = now - timedelta(days=30)
    else:
        since = now - timedelta(days=7)  # 默认7天
    
    # 获取总数
    total_count = conn.execute(
        'SELECT COUNT(*) FROM vocabulary WHERE recent_time >= ? AND recent_time IS NOT NULL',
        (since.isoformat(),)
    ).fetchone()[0]
    
    # 分页查询
    offset = (page - 1) * per_page
    words = conn.execute(
        'SELECT id, word, review_count FROM vocabulary WHERE recent_time >= ? AND recent_time IS NOT NULL ORDER BY recent_time DESC LIMIT ? OFFSET ?',
        (since.isoformat(), per_page, offset)
    ).fetchall()
    conn.close()
    
    # 计算总页数，至少为1页
    total_pages = max(1, (total_count + per_page - 1) // per_page) if total_count > 0 else 1
    
    return jsonify({
        'words': [dict(row) for row in words],
        'total': total_count,
        'page': page,
        'per_page': per_page,
        'total_pages': total_pages
    })

# 获取单词详细信息
@app.route('/api/word-details/<word>')
def get_word_details(word):
    conn = get_db_connection()
    try:
        # 只从数据库获取信息
        word_data = conn.execute(
            'SELECT id, word, phonetic, definition FROM vocabulary WHERE word = ?',
            (word,)
        ).fetchone()

        if word_data:
            return jsonify({
                'id': word_data['id'],
                'word': word_data['word'],
                'phonetic': word_data['phonetic'],
                'definition': word_data['definition']
            })
        else:
            return jsonify({'error': 'Word not found'}), 404

    except Exception as e:
        print(f"Error fetching word details for '{word}': {e}")
        return jsonify({'error': 'An error occurred'}), 500
    finally:
        conn.close()

# 主页路由
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/study')
def study():
    return render_template('study.html')

@app.route('/mastered')
def mastered():
    return render_template('mastered.html')

@app.route('/recent')
def recent():
    return render_template('recent.html')

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)