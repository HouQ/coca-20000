const { createApp } = Vue;

createApp({
    data() {
        return {
            recentWords: [],
            period: '7days',
            periodText: '最近7天',
            currentPage: 1,
            totalPages: 1,
            perPage: 20,
            total: 0,
            loading: false,
            showDetailsModal: false,
            wordDetails: null
        }
    },
    created() {
        console.log('Vue app created, initial totalPages:', this.totalPages, 'initial total:', this.total);
    },
    mounted() {
        // 从URL获取时间范围
        const urlParams = new URLSearchParams(window.location.search);
        this.period = urlParams.get('period') || '7days';
        
        // 设置显示文本
        switch(this.period) {
            case '1day':
                this.periodText = '最近1天';
                break;
            case '7days':
                this.periodText = '最近7天';
                break;
            case '1month':
                this.periodText = '最近1个月';
                break;
            default:
                this.periodText = '最近7天';
        }
        
        this.loadRecentWords();
    },
    methods: {
        async loadRecentWords(page = 1) {
            console.log('loadRecentWords called');
            this.loading = true;
            try {
                const response = await axios.get(`/api/recent-words/${this.period}?page=${page}&per_page=${this.perPage}`);
                console.log('Recent API Response:', response.data);
                this.recentWords = response.data.words;
                this.currentPage = response.data.page;
                this.totalPages = response.data.total_pages;
                this.total = response.data.total;
                console.log('totalPages set to:', this.totalPages, 'total set to:', this.total);
            } catch (error) {
                console.error(`加载最近${this.period}天添加的单词失败:`, error);
            } finally {
                this.loading = false;
            }
        },
        
        async changePeriod(period, text) {
            this.period = period;
            this.periodText = text;
            this.currentPage = 1;
            await this.loadRecentWords(1);
        },
        
        async changePage(page) {
            if (page >= 1 && page <= this.totalPages && !this.loading) {
                await this.loadRecentWords(page);
            }
        },
        
        async previousPage() {
            if (this.currentPage > 1) {
                await this.changePage(this.currentPage - 1);
            }
        },
        
        async nextPage() {
            if (this.currentPage < this.totalPages) {
                await this.changePage(this.currentPage + 1);
            }
        },
        
        formatTime(timeString) {
            if (!timeString) return '';
            
            try {
                const date = new Date(timeString);
                const now = new Date();
                const diffMs = now - date;
                const diffMins = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                
                if (diffMins < 1) {
                    return '刚刚';
                } else if (diffMins < 60) {
                    return `${diffMins}分钟前`;
                } else if (diffHours < 24) {
                    return `${diffHours}小时前`;
                } else if (diffDays < 7) {
                    return `${diffDays}天前`;
                } else {
                    return date.toLocaleDateString('zh-CN');
                }
            } catch (error) {
                return timeString;
            }
        },
        
        goBack() {
            window.location.href = '/';
        },
        async showWordDetails(word) {
            this.wordDetails = null; // Reset details
            this.showDetailsModal = true;
            try {
                const response = await axios.get(`/api/word-details/${word.word}`);
                console.log('Received word details:', response.data);
                this.wordDetails = response.data;
            } catch (error) {
                console.error('获取单词详情失败:', error);
                this.wordDetails = { word: word.word, phonetic: 'N/A', definition: '加载失败' };
            }
        },
        closeDetailsModal() {
            this.showDetailsModal = false;
        }
    },
    computed: {
        formattedDefinition() {
            if (this.wordDetails && this.wordDetails.definition) {
                return this.wordDetails.definition.replace(/\n/g, '<br>');
            }
            return '';
        }
    }
}).mount('#recent-app');