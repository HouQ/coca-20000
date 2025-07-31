const { createApp } = Vue;

createApp({
    data() {
        return {
            wordDetails: null,
            currentWordId: null,
            currentWord: null
        }
    },
    mounted() {
        // 从URL获取单词信息
        const urlParams = new URLSearchParams(window.location.search);
        this.currentWord = urlParams.get('word');
        this.currentWordId = urlParams.get('id');
        
        if (this.currentWord) {
            this.loadWordDetails(this.currentWord);
            // 自动播放发音3次
            setTimeout(() => {
                this.playAudio(7);
            }, 30);
        }
    },
    methods: {
        async loadWordDetails(word) {
            try {
                // 1. 从本地服务器获取基本信息
                const localResponse = await axios.get(`/api/word-details/${encodeURIComponent(word)}`);
                this.wordDetails = {
                    ...localResponse.data,
                    api_definition: '加载中...'
                };

                // 2. 异步从外部API获取英文释义
                try {
                    const apiResponse = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
                    if (apiResponse.data && apiResponse.data.length > 0) {
                        const api_data = apiResponse.data[0];
                        // 更新音标（如果本地没有）
                        if (!this.wordDetails.phonetic && api_data.phonetic) {
                            this.wordDetails.phonetic = api_data.phonetic;
                        }
                        // 构造更详细的释义
                        let definitions = [];
                        for (const meaning of api_data.meanings) {
                            const partOfSpeech = meaning.partOfSpeech || '';
                            for (const defi of meaning.definitions) {
                                definitions.push(`(${partOfSpeech}) ${defi.definition || ''}`);
                            }
                        }
                        this.wordDetails.api_definition = definitions.join('\n');
                    } else {
                        this.wordDetails.api_definition = '无法从在线词典获取释义。';
                    }
                } catch (apiError) {
                    console.error('加载在线释义失败:', apiError);
                    this.wordDetails.api_definition = '在线释义加载失败。';
                }

            } catch (error) {
                console.error('加载单词详情失败:', error);
                this.wordDetails = {
                    word: word,
                    phonetic: 'N/A',
                    definition: '加载失败',
                    api_definition: '加载失败'
                };
            }
        },
        
        playAudio(repeatCount = 1) {
            if (this.currentWord) {
                let currentRepeat = 0;
                const playNext = () => {
                    if (currentRepeat < repeatCount) {
                        const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(this.currentWord)}&type=1`);
                        audio.addEventListener('ended', () => {
                            currentRepeat++;
                            if (currentRepeat < repeatCount) {
                                setTimeout(playNext, 30); // 间隔500ms播放下一次
                            }
                        });
                        audio.play().catch(error => {
                            console.error('播放发音失败:', error);
                        });
                    }
                };
                playNext();
            }
        },
        async masterAndReturn() {
            if (!this.currentWordId) return;
            try {
                // 1. 标记为已掌握
                await axios.post('/api/master-word', { id: this.currentWordId });

                // 2. 触发庆祝效果
                confetti({
                    particleCount: 150,
                    spread: 90,
                    origin: { y: 0.6 }
                });

                // 3. 获取下一个单词并学习
                setTimeout(() => {
                    this.fetchNextWordAndStudy();
                }, 800); // 延迟 ताकि 用户可以看到庆祝效果
            } catch (error) {
                console.error('标记掌握并继续学习失败:', error);
            }
        },

        async getNextWord() {
            if (!this.currentWordId) return;
            try {
                // 更新当前单词的学习时间
                await axios.post('/api/study-word', { id: this.currentWordId });
                // 获取下一个单词并学习
                await this.fetchNextWordAndStudy();
            } catch (error) {
                console.error('继续学习失败:', error);
            }
        },

        async fetchNextWordAndStudy() {
            try {
                const response = await axios.get('/api/word-by-progress', {
                    params: { direction: 'next' } // 总是获取下一个
                });
                const nextWord = response.data;

                if (nextWord && nextWord.id) {
                    // 直接跳转到新的学习页面
                    window.location.href = `/study?word=${encodeURIComponent(nextWord.word)}&id=${nextWord.id}`;
                } else {
                    alert('恭喜！所有单词都已掌握！');
                    window.location.href = '/';
                }
            } catch (error) {
                console.error('获取下一个单词失败:', error);
            }
        },
        
        goBack() {
            window.location.href = '/';
        }
    }
}).mount('#study-app');