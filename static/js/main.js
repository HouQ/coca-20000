const { createApp } = Vue;

createApp({
    data() {
        return {
            currentWord: null,
            stats: {
                mastered: 0,
                unmastered: 0,
                total: 0
            },
            isMenuOpen: false,
            isLoading: false,
            showDefinition: false
        }
    },
    mounted() {
        this.loadStats();
        this.getWord('current'); // 初始加载当前进度的单词
    },
    methods: {
        async loadStats() {
            try {
                const response = await axios.get('/api/stats');
                this.stats = response.data;
            } catch (error) {
                console.error('加载统计信息失败:', error);
            }
        },

        async getWord(direction) {
            if (this.isLoading) return;
            this.isLoading = true;
            try {
                const response = await axios.get('/api/word-by-progress', {
                    params: { direction: direction }
                });
                if (response.data && response.data.id) {
                    this.currentWord = response.data;
                    this.currentWord.progress = `${this.currentWord.id} / 20200`;
                } else {
                    this.currentWord = { word: response.data.word || '没有更多单词了', id: null };
                }
            } catch (error) {
                console.error('加载单词失败:', error);
                this.currentWord = { word: '加载失败', id: null };
            } finally {
                this.isLoading = false;
            }
        },
        
        async masterWord() {
            if (!this.currentWord || !this.currentWord.id) return;
            
            try {
                await axios.post('/api/master-word', {
                    id: this.currentWord.id
                });
                
                // 触发庆祝效果
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });

                // 更新统计信息
                this.stats.mastered++;
                this.stats.unmastered--;
                
                // 加载下一个单词
                await this.getWord('next');
            } catch (error) {
                console.error('标记单词失败:', error);
            }
        },
        
        async studyWord() {
            if (!this.currentWord || !this.currentWord.id) return;
            
            try {
                await axios.post('/api/study-word', {
                    id: this.currentWord.id
                });
                
                // 跳转到学习页面
                window.location.href = `/study?word=${encodeURIComponent(this.currentWord.word)}&id=${this.currentWord.id}`;
            } catch (error) {
                console.error('学习单词失败:', error);
            }
        },
        
        toggleMenu() {
            this.isMenuOpen = !this.isMenuOpen;
        },
        toggleDefinition() {
            this.showDefinition = !this.showDefinition;
        }
    }
}).mount('#app');