// ==UserScript==
// @name         亚马逊评论计算优化版(Enhanced Amazon Review Calculator)
// @namespace    https://github.com/yourname
// @version      3.2
// @description  精确计算各星级评价数量及提升评分所需五星好评数，支持全球亚马逊站点
// @author       Monty & Assistant
// @match        *://*.amazon.com/*dp/*
// @match        *://*.amazon.co.uk/*dp/*
// @match        *://*.amazon.de/*dp/*
// @match        *://*.amazon.fr/*dp/*
// @match        *://*.amazon.it/*dp/*
// @match        *://*.amazon.es/*dp/*
// @match        *://*.amazon.co.jp/*dp/*
// @match        *://*.amazon.ca/*dp/*
// @match        *://*.amazon.com.au/*dp/*
// @match        *://*.amazon.in/*dp/*
// @match        *://*.amazon.com.mx/*dp/*
// @match        *://*.amazon.com.br/*dp/*
// @match        *://*.amazon.nl/*dp/*
// @match        *://*.amazon.cn/*dp/*
// @match        *://*.amazon.sg/*dp/*
// @match        *://*.amazon.ae/*dp/*
// @match        *://*.amazon.sa/*dp/*
// @match        *://*.amzn.*/*dp/*
// @icon         https://www.amazon.com/favicon.ico
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @license      MIT
// ==/UserScript==

GM_addStyle(`
.monty-review-box {
    border: 1px solid #ddd;
    padding: 12px;
    margin: 10px 0;
    background: #f8f8f8;
    border-radius: 4px;
}
.monty-review-title {
    font-weight: bold;
    color: #111;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.monty-review-item {
    margin: 4px 0;
    font-size: 13px;
}
.monty-highlight {
    color: #B12704;
    font-weight: bold;
}
.monty-lang-selector {
    font-size: 12px;
    padding: 2px 5px;
    border: 1px solid #ddd;
    border-radius: 3px;
    background: white;
    cursor: pointer;
}
.monty-lang-selector:hover {
    border-color: #aaa;
}
`);

(function() {
    'use strict';

    const TARGET_SCORE = 4.3;
    const DEBUG_MODE = true; // 生产环境中关闭调试模式
    
    // 日志输出函数
    function log(...args) {
        if (DEBUG_MODE) {
            console.log('[Review Calculator]', ...args);
        }
    }

    // 获取用户语言偏好
    function getUserLanguage() {
        // 获取用户保存的语言偏好，默认为中文
        const savedLanguage = GM_getValue('user_language', 'zh');
        log('用户语言偏好:', savedLanguage);
        return savedLanguage;
    }
    
    // 设置用户语言偏好
    function setUserLanguage(language) {
        log('设置用户语言偏好:', language);
        GM_setValue('user_language', language);
    }
    
    // 获取本地化文本
    function getLocalizedText() {
        // 优先使用用户选择的语言
        const userLanguage = getUserLanguage();
        
        // 如果没有用户选择的语言，则根据域名自动检测
        if (!userLanguage || userLanguage === 'auto') {
            const domain = window.location.hostname;
            log('当前域名:', domain);
            
            // 根据域名确定语言
            let detectedLanguage = 'en'; // 默认英语
            
            if (domain.includes('.fr')) detectedLanguage = 'fr';
            else if (domain.includes('.de')) detectedLanguage = 'de';
            else if (domain.includes('.it')) detectedLanguage = 'it';
            else if (domain.includes('.es')) detectedLanguage = 'es';
            else if (domain.includes('.co.jp') || domain.includes('.jp')) detectedLanguage = 'jp';
            else if (domain.includes('.cn')) detectedLanguage = 'zh';
            else if (domain.includes('.nl')) detectedLanguage = 'nl';
            else if (domain.includes('.com.br')) detectedLanguage = 'pt-br';
            else if (domain.includes('.com.mx')) detectedLanguage = 'es-mx';
            else if (domain.includes('.in')) detectedLanguage = 'en-in';
            else if (domain.includes('.ca')) detectedLanguage = domain.includes('/fr/') ? 'fr-ca' : 'en-ca';
            
            log('检测到语言:', detectedLanguage);
            return getLocalizedTextByLanguage(detectedLanguage);
        }
        
        return getLocalizedTextByLanguage(userLanguage);
    }
    
    // 根据指定语言获取本地化文本
    function getLocalizedTextByLanguage(language) {
        log('使用语言:', language);
        
        // 各种语言的本地化文本
        const localizedTexts = {
            // 评论数文本
            ratingsText: {
                'en': 'ratings',
                'fr': 'évaluations',
                'de': 'Bewertungen',
                'it': 'recensioni',
                'es': 'valoraciones',
                'es-mx': 'calificaciones',
                'jp': '件の評価',
                'zh': '条评论',
                'nl': 'beoordelingen',
                'pt-br': 'avaliações',
                'en-in': 'ratings',
                'en-ca': 'ratings',
                'fr-ca': 'évaluations'
            },
            
            // 星级文本 (用于匹配评分文本)
            starText: {
                'en': 'out of 5 stars',
                'fr': 'sur 5 étoiles',
                'de': 'von 5 Sternen',
                'it': 'su 5 stelle',
                'es': 'de 5 estrellas',
                'es-mx': 'de 5 estrellas',
                'jp': '5つ星のうち',
                'zh': '5 星，最多 5 星',
                'nl': 'van de 5 sterren',
                'pt-br': 'de 5 estrelas',
                'en-in': 'out of 5 stars',
                'en-ca': 'out of 5 stars',
                'fr-ca': 'sur 5 étoiles'
            },
            
            // 结果面板文本
            resultText: {
                'en': {
                    title: '📊 Review Analysis',
                    currentScore: 'Current Rating:',
                    required: 'Need',
                    fiveStarReviews: '5-star reviews',
                    toReach: 'to reach',
                    noNeed: 'Current rating already exceeds',
                    noNeedSuffix: ', no additional reviews needed',
                    simplified: '(Simplified)',
                    note: 'Note: This is a simplified result due to inability to get detailed rating data',
                    error: '⚠️ Review Calculator encountered an issue',
                    errorHelp: 'If the problem persists, try refreshing the page or check for script updates.'
                },
                'fr': {
                    title: '📊 Analyse des Avis',
                    currentScore: 'Note actuelle:',
                    required: 'Besoin de',
                    fiveStarReviews: 'avis 5 étoiles',
                    toReach: 'pour atteindre',
                    noNeed: 'La note actuelle dépasse déjà',
                    noNeedSuffix: ', aucun avis supplémentaire nécessaire',
                    simplified: '(Simplifié)',
                    note: 'Remarque: Il s\'agit d\'un résultat simplifié en raison de l\'impossibilité d\'obtenir des données d\'évaluation détaillées',
                    error: '⚠️ Le calculateur d\'avis a rencontré un problème',
                    errorHelp: 'Si le problème persiste, essayez d\'actualiser la page ou vérifiez les mises à jour du script.'
                },
                'de': {
                    title: '📊 Bewertungsanalyse',
                    currentScore: 'Aktuelle Bewertung:',
                    required: 'Benötigt',
                    fiveStarReviews: '5-Sterne-Bewertungen',
                    toReach: 'um zu erreichen',
                    noNeed: 'Aktuelle Bewertung überschreitet bereits',
                    noNeedSuffix: ', keine zusätzlichen Bewertungen erforderlich',
                    simplified: '(Vereinfacht)',
                    note: 'Hinweis: Dies ist ein vereinfachtes Ergebnis, da detaillierte Bewertungsdaten nicht verfügbar sind',
                    error: '⚠️ Der Bewertungsrechner ist auf ein Problem gestoßen',
                    errorHelp: 'Wenn das Problem weiterhin besteht, aktualisieren Sie die Seite oder prüfen Sie auf Skript-Updates.'
                },
                'zh': {
                    title: '📊 评论分析结果',
                    currentScore: '当前评分：',
                    required: '需要',
                    fiveStarReviews: '个五星好评',
                    toReach: '才能达到',
                    noNeed: '当前评分已超过',
                    noNeedSuffix: '，无需补充好评',
                    simplified: '(简化版)',
                    note: '注意：由于无法获取详细评分数据，此结果为简化版',
                    error: '⚠️ 评论计算器遇到问题',
                    errorHelp: '如果问题持续存在，请尝试刷新页面或检查脚本更新。'
                },
                'jp': {
                    title: '📊 レビュー分析',
                    currentScore: '現在の評価：',
                    required: '',
                    fiveStarReviews: '件の5つ星レビューが必要',
                    toReach: 'で到達するために',
                    noNeed: '現在の評価はすでに',
                    noNeedSuffix: 'を超えています、追加のレビューは必要ありません',
                    simplified: '(簡易版)',
                    note: '注意：詳細な評価データを取得できないため、これは簡易結果です',
                    error: '⚠️ レビュー計算ツールで問題が発生しました',
                    errorHelp: '問題が解決しない場合は、ページを更新するかスクリプトの更新を確認してください。'
                }
                // 可以根据需要添加更多语言
            }
        };
        
        // 如果没有特定语言的翻译，使用英语作为后备
        const getTextWithFallback = (category, lang) => {
            return localizedTexts[category][lang] || localizedTexts[category]['en'];
        };
        
        return {
            ratingsText: getTextWithFallback('ratingsText', language),
            starText: getTextWithFallback('starText', language),
            resultText: localizedTexts.resultText[language] || localizedTexts.resultText['en']
        };
    }

    // 清洗数字格式（处理千位分隔符）
    function sanitizeNumber(numStr) {
        return numStr.replace(/[.,\s]/g, '')
                    .replace(/[^\d]/g, '');
    }

    // 计算加权平均分
    function calculateWeightedAverage(ratings) {
        const total = ratings.reduce((sum, r) => sum + r.count, 0);
        if (total === 0) return 0;

        return ratings.reduce((sum, r) => {
            return sum + (r.stars * r.count);
        }, 0) / total;
    }

    // 计算所需五星好评
    function calculateRequiredReviews(currentScore, totalReviews) {
        if (currentScore >= TARGET_SCORE) return 0;

        const numerator = totalReviews * (TARGET_SCORE - currentScore);
        const denominator = 5 - TARGET_SCORE;
        return Math.ceil(numerator / denominator);
    }

    // 主处理函数
    async function processReviews() {
        try {
            log('开始处理评论数据...');
            log('当前URL:', window.location.href);
            
            // 等待评分直方图加载 - 使用最新的选择器
            log('等待评分直方图加载...');
            const histogram = await waitForElement('#histogramTable');
            if (!histogram) {
                log('错误: 找不到评分直方图');
                throw new Error('找不到评分直方图');
            }
            log('成功找到评分直方图:', histogram);

            // 获取本地化文本
            const localizedText = getLocalizedText();
            log('本地化文本:', localizedText);
            
            // 直接使用data-hook属性查找总评论数
            const totalElement = document.querySelector('[data-hook="total-review-count"]');
            log('总评论数元素:', totalElement);
            
            if (!totalElement) {
                log('错误: 找不到总评论数元素');
                throw new Error('找不到总评论数元素');
            }

            log('总评论数文本:', totalElement.textContent);
            const totalReviews = parseInt(sanitizeNumber(totalElement.textContent));
            log('解析后的总评论数:', totalReviews);
            
            if (isNaN(totalReviews)) {
                log('错误: 总评论数格式错误');
                throw new Error('总评论数格式错误');
            }

            // 获取各星级评价 - 使用最新的选择器
            log('查找评分条...');
            const ratingBars = [...document.querySelectorAll('#histogramTable li a')];
            log('找到评分条数量:', ratingBars.length);
            
            if (ratingBars.length !== 5) {
                log('错误: 找不到完整的五星评价数据, 只找到', ratingBars.length, '条');
                throw new Error('找不到完整的五星评价数据');
            }

            log('开始提取各星级评价数据...');
            const ratings = ratingBars.map((bar, index) => {
                // 获取星级 (5星到1星)
                const stars = 5 - index;
                log(`处理 ${stars} 星评价...`);
                
                // 获取百分比 - 从aria-valuenow属性获取
                let percent = 0;
                const meter = bar.querySelector('.a-meter');
                log(`${stars}星评价条元素:`, meter);
                
                if (meter && meter.getAttribute('aria-valuenow')) {
                    percent = parseInt(meter.getAttribute('aria-valuenow')) / 100;
                    log(`${stars}星评价 - 从aria-valuenow获取百分比:`, percent);
                }
                
                // 如果无法从aria-valuenow获取，尝试从style.width获取
                if (percent === 0 && meter && meter.querySelector('.a-meter-bar')) {
                    const meterBar = meter.querySelector('.a-meter-bar');
                    const widthStyle = meterBar.style.width;
                    log(`${stars}星评价 - meter-bar宽度样式:`, widthStyle);
                    
                    if (widthStyle) {
                        percent = parseInt(widthStyle) / 100;
                        log(`${stars}星评价 - 从style.width获取百分比:`, percent);
                    }
                }
                
                // 如果仍然无法获取百分比，尝试从文本中提取
                if (percent === 0) {
                    log(`${stars}星评价 - 尝试从文本提取百分比...`);
                    const percentTexts = bar.querySelectorAll('.a-text-right, .aok-nowrap');
                    log(`${stars}星评价 - 找到可能包含百分比的文本元素:`, percentTexts.length);
                    
                    for (const el of percentTexts) {
                        log(`${stars}星评价 - 文本内容:`, el.textContent);
                        const percentMatch = el.textContent.match(/(\d+)%/);
                        if (percentMatch) {
                            percent = parseInt(percentMatch[1]) / 100;
                            log(`${stars}星评价 - 从文本提取的百分比:`, percent);
                            break;
                        }
                    }
                }
                
                const count = Math.round(totalReviews * percent);
                log(`${stars}星评价 - 最终数据:`, { stars, percent, count });
                
                return {
                    stars: stars,
                    percent: percent,
                    count: count
                };
            });

            // 计算当前评分
            log('计算加权平均分...');
            const currentScore = calculateWeightedAverage(ratings);
            log('计算得到的当前评分:', currentScore);

            // 计算结果
            log('计算所需五星好评数...');
            const required = calculateRequiredReviews(currentScore, totalReviews);
            log('需要的五星好评数:', required);

            // 生成结果面板
            const resultBox = document.createElement('div');
            resultBox.className = 'monty-review-box';
            resultBox.id = 'monty-review-box';
            
            // 使用本地化文本
            const rt = localizedText.resultText;
            
            // 创建语言选择器
            const currentLang = getUserLanguage();
            const langOptions = {
                'zh': '中文',
                'en': 'English',
                'fr': 'Français',
                'de': 'Deutsch',
                'jp': '日本語'
            };
            
            const langSelector = `
                <select class="monty-lang-selector" id="monty-lang-selector">
                    ${Object.entries(langOptions).map(([code, name]) => 
                        `<option value="${code}" ${code === currentLang ? 'selected' : ''}>${name}</option>`
                    ).join('')}
                </select>
            `;
            
            resultBox.innerHTML = `
                <div class="monty-review-title">
                    <span>${rt.title}</span>
                    ${langSelector}
                </div>
                ${ratings.map(r => `
                    <div class="monty-review-item">
                        ${'★'.repeat(r.stars)} ${r.count} (${(r.percent*100).toFixed(1)}%)
                    </div>
                `).join('')}
                <hr style="margin:8px 0">
                <div class="monty-review-item">
                    ${rt.currentScore} <span class="monty-highlight">${currentScore.toFixed(2)}</span>
                </div>
                ${required > 0 ? `
                    <div class="monty-review-item">
                        ${rt.required} <span class="monty-highlight">${required} ${rt.fiveStarReviews}</span>
                        ${rt.toReach} ${TARGET_SCORE}
                    </div>
                ` : `
                    <div class="monty-review-item monty-highlight">
                        ${rt.noNeed} ${TARGET_SCORE}${rt.noNeedSuffix}
                    </div>
                `}
                <div class="monty-review-item" style="font-size: 12px; margin-top: 10px; text-align: right; color: #555; border-top: 1px solid #eee; padding-top: 8px;">
                    © 2025 Monty Ng. All rights reserved.
                </div>
            `;
            
            // 保存评分数据，以便在切换语言时重新生成结果面板
            resultBox.dataset.currentScore = currentScore;
            resultBox.dataset.totalReviews = totalReviews;
            resultBox.dataset.required = required;
            resultBox.dataset.ratingsData = JSON.stringify(ratings);

            // 插入结果到页面 - 使用更准确的插入点
            log('准备插入结果面板到页面...');
            const possibleInsertPoints = [
                '#averageCustomerReviews',
                '#histogramTable',
                '[data-hook="cr-filter-info-review-rating-count"]',
                '.cr-widget-histogram'
            ];
            
            log('尝试以下插入点:', possibleInsertPoints);
            let inserted = false;
            for (const selector of possibleInsertPoints) {
                const insertPoint = document.querySelector(selector);
                log(`检查插入点 ${selector}:`, insertPoint ? '找到' : '未找到');
                
                if (insertPoint) {
                    // 尝试插入到元素之后
                    if (insertPoint.parentNode) {
                        log(`将结果面板插入到 ${selector} 之后`);
                        insertPoint.parentNode.insertBefore(resultBox, insertPoint.nextSibling);
                        inserted = true;
                        break;
                    }
                }
            }
            
            // 如果无法找到合适的插入点，则插入到直方图之前
            if (!inserted) {
                log('未找到理想插入点，尝试使用直方图作为插入点');
                if (histogram && histogram.parentNode) {
                    log('将结果面板插入到直方图之前');
                    histogram.parentNode.insertBefore(resultBox, histogram);
                    inserted = true;
                } else {
                    log('警告: 无法找到任何插入点');
                }
            }
            
            log('结果面板插入' + (inserted ? '成功' : '失败'));
            
            // 添加语言选择器的事件监听器
            if (inserted) {
                const langSelector = document.getElementById('monty-lang-selector');
                if (langSelector) {
                    langSelector.addEventListener('change', function() {
                        const newLang = this.value;
                        log('切换语言到:', newLang);
                        setUserLanguage(newLang);
                        
                        // 重新生成结果面板
                        regenerateResultPanel(resultBox);
                    });
                }
            }
            
            // 重新生成结果面板的函数
            function regenerateResultPanel(panel) {
                if (!panel) return;
                
                // 获取保存的数据
                const currentScore = parseFloat(panel.dataset.currentScore);
                const totalReviews = parseInt(panel.dataset.totalReviews);
                const required = parseInt(panel.dataset.required);
                const ratings = JSON.parse(panel.dataset.ratingsData);
                
                // 获取新的本地化文本
                const localizedText = getLocalizedText();
                const rt = localizedText.resultText;
                
                // 创建语言选择器
                const currentLang = getUserLanguage();
                const langOptions = {
                    'zh': '中文',
                    'en': 'English',
                    'fr': 'Français',
                    'de': 'Deutsch',
                    'jp': '日本語'
                };
                
                const langSelector = `
                    <select class="monty-lang-selector" id="monty-lang-selector">
                        ${Object.entries(langOptions).map(([code, name]) => 
                            `<option value="${code}" ${code === currentLang ? 'selected' : ''}>${name}</option>`
                        ).join('')}
                    </select>
                `;
                
                // 更新面板内容
                panel.innerHTML = `
                    <div class="monty-review-title">
                        <span>${rt.title}</span>
                        ${langSelector}
                    </div>
                    ${ratings.map(r => `
                        <div class="monty-review-item">
                            ${'★'.repeat(r.stars)} ${r.count} (${(r.percent*100).toFixed(1)}%)
                        </div>
                    `).join('')}
                    <hr style="margin:8px 0">
                    <div class="monty-review-item">
                        ${rt.currentScore} <span class="monty-highlight">${currentScore.toFixed(2)}</span>
                    </div>
                    ${required > 0 ? `
                        <div class="monty-review-item">
                            ${rt.required} <span class="monty-highlight">${required} ${rt.fiveStarReviews}</span>
                            ${rt.toReach} ${TARGET_SCORE}
                        </div>
                    ` : `
                        <div class="monty-review-item monty-highlight">
                            ${rt.noNeed} ${TARGET_SCORE}${rt.noNeedSuffix}
                        </div>
                    `}
                    <div class="monty-review-item" style="font-size: 12px; margin-top: 10px; text-align: right; color: #555; border-top: 1px solid #eee; padding-top: 8px;">
                        © 2025 Monty Ng. All rights reserved.
                    </div>
                `;
                
                // 重新添加事件监听器
                const newLangSelector = document.getElementById('monty-lang-selector');
                if (newLangSelector) {
                    newLangSelector.addEventListener('change', function() {
                        const newLang = this.value;
                        log('切换语言到:', newLang);
                        setUserLanguage(newLang);
                        
                        // 重新生成结果面板
                        regenerateResultPanel(panel);
                    });
                }
            }

        } catch (error) {
            if (DEBUG_MODE) console.error('[Review Calculator]', error);
            
            // 在页面上显示错误信息，帮助用户理解问题
            showError(`计算评论数据时出错: ${error.message}`);
            
            // 尝试使用备用方法获取评分
            log('主方法失败，尝试使用备用方法...');
            try {
                // 尝试从页面上直接获取平均评分
                log('尝试从页面直接获取平均评分...');
                const ratingElement = document.querySelector('[data-hook="average-star-rating"] .a-icon-alt');
                log('评分元素:', ratingElement);
                
                if (ratingElement) {
                    log('评分文本:', ratingElement.textContent);
                    const ratingMatch = ratingElement.textContent.match(/(\d+(\.\d+)?)/);
                    log('评分匹配结果:', ratingMatch);
                    
                    if (ratingMatch) {
                        const currentScore = parseFloat(ratingMatch[1]);
                        log('解析后的评分:', currentScore);
                        
                        // 尝试获取总评论数
                        log('尝试获取总评论数...');
                        const totalElement = document.querySelector('[data-hook="total-review-count"]');
                        log('总评论数元素:', totalElement);
                        
                        if (totalElement) {
                            log('总评论数文本:', totalElement.textContent);
                            const totalReviews = parseInt(sanitizeNumber(totalElement.textContent));
                            log('解析后的总评论数:', totalReviews);
                            
                            if (!isNaN(totalReviews) && !isNaN(currentScore)) {
                                log('成功获取评分和总评论数，计算所需五星好评...');
                                // 计算所需五星好评
                                const required = calculateRequiredReviews(currentScore, totalReviews);
                                log('需要的五星好评数:', required);
                                
                                // 获取本地化文本
                                const localizedText = getLocalizedText();
                                const rt = localizedText.resultText;
                                
                                // 创建简化版结果面板
                                log('创建简化版结果面板...');
                                const simpleBox = document.createElement('div');
                                simpleBox.className = 'monty-review-box';
                                simpleBox.id = 'monty-simple-review-box';
                                
                                // 创建语言选择器
                                const currentLang = getUserLanguage();
                                const langOptions = {
                                    'zh': '中文',
                                    'en': 'English',
                                    'fr': 'Français',
                                    'de': 'Deutsch',
                                    'jp': '日本語'
                                };
                                
                                const langSelector = `
                                    <select class="monty-lang-selector" id="monty-simple-lang-selector">
                                        ${Object.entries(langOptions).map(([code, name]) => 
                                            `<option value="${code}" ${code === currentLang ? 'selected' : ''}>${name}</option>`
                                        ).join('')}
                                    </select>
                                `;
                                
                                simpleBox.innerHTML = `
                                    <div class="monty-review-title">
                                        <span>${rt.title} ${rt.simplified}</span>
                                        ${langSelector}
                                    </div>
                                    <div class="monty-review-item">
                                        ${rt.currentScore} <span class="monty-highlight">${currentScore.toFixed(2)}</span>
                                    </div>
                                    ${required > 0 ? `
                                        <div class="monty-review-item">
                                            ${rt.required} <span class="monty-highlight">${required} ${rt.fiveStarReviews}</span>
                                            ${rt.toReach} ${TARGET_SCORE}
                                        </div>
                                    ` : `
                                        <div class="monty-review-item monty-highlight">
                                            ${rt.noNeed} ${TARGET_SCORE}${rt.noNeedSuffix}
                                        </div>
                                    `}
                                    <div class="monty-review-item">
                                        <small>${rt.note}</small>
                                    </div>
                                    <div class="monty-review-item" style="font-size: 12px; margin-top: 10px; text-align: right; color: #555; border-top: 1px solid #eee; padding-top: 8px;">
                                        © 2025 Monty Ng. All rights reserved.
                                    </div>
                                `;
                                
                                // 保存评分数据，以便在切换语言时重新生成结果面板
                                simpleBox.dataset.currentScore = currentScore;
                                simpleBox.dataset.totalReviews = totalReviews;
                                simpleBox.dataset.required = required;
                                
                                // 尝试插入到页面
                                log('尝试插入简化版结果面板...');
                                const insertPoint = document.querySelector('#averageCustomerReviews');
                                log('插入点:', insertPoint);
                                
                                if (insertPoint && insertPoint.parentNode) {
                                    log('将简化版结果面板插入到页面');
                                    insertPoint.parentNode.insertBefore(simpleBox, insertPoint.nextSibling);
                                    log('简化版结果面板插入成功');
                                    
                                    // 添加语言选择器的事件监听器
                                    const simpleLangSelector = document.getElementById('monty-simple-lang-selector');
                                    if (simpleLangSelector) {
                                        simpleLangSelector.addEventListener('change', function() {
                                            const newLang = this.value;
                                            log('切换语言到:', newLang);
                                            setUserLanguage(newLang);
                                            
                                            // 重新生成简化版结果面板
                                            regenerateSimpleResultPanel(simpleBox);
                                        });
                                    }
                                } else {
                                    log('警告: 无法找到插入点');
                                }
                                
                                // 重新生成简化版结果面板的函数
                                function regenerateSimpleResultPanel(panel) {
                                    if (!panel) return;
                                    
                                    // 获取保存的数据
                                    const currentScore = parseFloat(panel.dataset.currentScore);
                                    const totalReviews = parseInt(panel.dataset.totalReviews);
                                    const required = parseInt(panel.dataset.required);
                                    
                                    // 获取新的本地化文本
                                    const localizedText = getLocalizedText();
                                    const rt = localizedText.resultText;
                                    
                                    // 创建语言选择器
                                    const currentLang = getUserLanguage();
                                    const langOptions = {
                                        'zh': '中文',
                                        'en': 'English',
                                        'fr': 'Français',
                                        'de': 'Deutsch',
                                        'jp': '日本語'
                                    };
                                    
                                    const langSelector = `
                                        <select class="monty-lang-selector" id="monty-simple-lang-selector">
                                            ${Object.entries(langOptions).map(([code, name]) => 
                                                `<option value="${code}" ${code === currentLang ? 'selected' : ''}>${name}</option>`
                                            ).join('')}
                                        </select>
                                    `;
                                    
                                    // 更新面板内容
                                    panel.innerHTML = `
                                        <div class="monty-review-title">
                                            <span>${rt.title} ${rt.simplified}</span>
                                            ${langSelector}
                                        </div>
                                        <div class="monty-review-item">
                                            ${rt.currentScore} <span class="monty-highlight">${currentScore.toFixed(2)}</span>
                                        </div>
                                        ${required > 0 ? `
                                            <div class="monty-review-item">
                                                ${rt.required} <span class="monty-highlight">${required} ${rt.fiveStarReviews}</span>
                                                ${rt.toReach} ${TARGET_SCORE}
                                            </div>
                                        ` : `
                                            <div class="monty-review-item monty-highlight">
                                                ${rt.noNeed} ${TARGET_SCORE}${rt.noNeedSuffix}
                                            </div>
                                        `}
                                        <div class="monty-review-item">
                                            <small>${rt.note}</small>
                                        </div>
                                        <div class="monty-review-item" style="font-size: 12px; margin-top: 10px; text-align: right; color: #555; border-top: 1px solid #eee; padding-top: 8px;">
                                            © 2025 Monty Ng. All rights reserved.
                                        </div>
                                    `;
                                    
                                    // 重新添加事件监听器
                                    const newLangSelector = document.getElementById('monty-simple-lang-selector');
                                    if (newLangSelector) {
                                        newLangSelector.addEventListener('change', function() {
                                            const newLang = this.value;
                                            log('切换语言到:', newLang);
                                            setUserLanguage(newLang);
                                            
                                            // 重新生成简化版结果面板
                                            regenerateSimpleResultPanel(panel);
                                        });
                                    }
                                }
                            } else {
                                log('错误: 无效的评分或总评论数');
                            }
                        } else {
                            log('错误: 找不到总评论数元素');
                        }
                    } else {
                        log('错误: 无法从文本中提取评分');
                    }
                } else {
                    log('错误: 找不到评分元素');
                }
            } catch (backupError) {
                log('备用方法也失败:', backupError);
                if (DEBUG_MODE) console.error('[Review Calculator] 备用方法也失败:', backupError);
            }
        }
    }

    // 辅助函数：等待元素加载
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            // 如果元素已存在，立即返回
            const existingEl = document.querySelector(selector);
            if (existingEl) return resolve(existingEl);
            
            // 否则，设置观察器等待元素出现
            const start = Date.now();
            
            // 创建一个MutationObserver来监视DOM变化
            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect(); // 停止观察
                    return resolve(el);
                }
                
                // 超时检查
                if (Date.now() - start > timeout) {
                    observer.disconnect();
                    return resolve(null);
                }
            });
            
            // 开始观察DOM变化
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // 额外的超时保障
            setTimeout(() => {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }, timeout);
        });
    }

    // 显示错误信息
    function showError(message) {
        if (DEBUG_MODE) console.error('[Review Calculator]', message);
        
        // 获取本地化文本
        const localizedText = getLocalizedText();
        const rt = localizedText.resultText;
        
        // 在页面上显示错误信息
        const errorBox = document.createElement('div');
        errorBox.className = 'monty-review-box';
        errorBox.innerHTML = `
            <div class="monty-review-title">${rt.error}</div>
            <div class="monty-review-item">${message}</div>
            <div class="monty-review-item">
                <small>${rt.errorHelp}</small>
            </div>
            <div class="monty-review-item" style="font-size: 12px; margin-top: 10px; text-align: right; color: #555; border-top: 1px solid #eee; padding-top: 8px;">
                © 2025 Monty Ng. All rights reserved.
            </div>
        `;
        
        // 尝试插入到评论区域
        const insertPoints = [
            '#cm_cr-review_list',
            '.cr-widget-histogram',
            '#histogramTable',
            '#averageCustomerReviews',
            '#reviewsMedley'
        ];
        
        for (const selector of insertPoints) {
            const element = document.querySelector(selector);
            if (element) {
                element.parentNode.insertBefore(errorBox, element);
                return;
            }
        }
        
        // 如果找不到合适的插入点，插入到页面底部
        document.body.appendChild(errorBox);
    }
    
    // 初始化
    function init() {
        log('初始化脚本...');
        log('目标评分:', TARGET_SCORE);
        GM_setValue('target_score', TARGET_SCORE);
        
        // 确保我们在产品页面上
        log('当前页面路径:', window.location.pathname);
        if (!window.location.pathname.includes('/dp/')) {
            log('不是产品页面，脚本不执行');
            return;
        }
        
        // 等待DOM完全加载
        log('当前文档状态:', document.readyState);
        if (document.readyState === 'loading') {
            log('文档仍在加载中，等待DOMContentLoaded事件...');
            document.addEventListener('DOMContentLoaded', () => {
                log('DOM已加载，延迟1500ms执行主函数');
                setTimeout(processReviews, 1500);
            });
        } else {
            // 如果DOM已加载，给页面一些时间来完成动态内容加载
            log('DOM已加载，延迟1500ms执行主函数');
            setTimeout(processReviews, 1500);
        }
    }
    
    // 启动脚本
    try {
        log('脚本开始执行...');
        log('浏览器信息:', navigator.userAgent);
        init();
    } catch (error) {
        log('初始化失败:', error);
        showError(`初始化失败: ${error.message}`);
    }
})();
