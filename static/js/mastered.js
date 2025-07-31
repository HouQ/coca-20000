const { createApp } = Vue;

createApp({
    data() {
        return {
            masteredWords: [],
            currentPage: 1,
            totalPages: 1,
            perPage: 20,
            total: 0,
            loading: false,
            showDetailsModal: false,
            wordDetails: null
        };
    },
    created() {
        console.log('Vue app created, initial totalPages:', this.totalPages, 'initial total:', this.total);
    },
    async mounted() {
        await this.loadMasteredWords();
    },
    methods: {
        async loadMasteredWords(page = 1) {
            console.log('loadMasteredWords called');
            this.loading = true;
            try {
                const response = await axios.get(`/api/mastered-words?page=${page}&per_page=${this.perPage}`);
                console.log('Mastered API Response:', response.data);
                this.masteredWords = response.data.words;
                this.currentPage = response.data.page;
                this.totalPages = response.data.total_pages;
                this.total = response.data.total;
                console.log('totalPages set to:', this.totalPages, 'total set to:', this.total);
            } catch (error) {
                console.error('加载已掌握单词失败:', error);
            } finally {
                this.loading = false;
            }
        },
        async unmasterWord(word) {
            try {
                const response = await axios.post('/api/unmaster-word', { word_id: word.id });
                if (response.data.success) {
                    await this.loadMasteredWords(this.currentPage);
                    console.log('单词已标记为未掌握');
                } else {
                    console.error('标记单词为未掌握失败');
                }
            } catch (error) {
                console.error('标记单词为未掌握失败:', error);
            }
        },
        
        async changePage(page) {
            if (page >= 1 && page <= this.totalPages && !this.loading) {
                await this.loadMasteredWords(page);
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
}).mount('#mastered-app');