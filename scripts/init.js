// scripts/init.js

function initFilters() {
    document.querySelectorAll('.filter-group').forEach(group => {
        const filterType = group.dataset.filter;
        const buttons = group.querySelectorAll('button');
        buttons.forEach(button => {
            // 修复年份按钮激活状态判断
            if (button.textContent === filters[filterType] || 
                (filterType === 'year' && button.textContent === '全部')) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                filters[filterType] = button.textContent;
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                renderMovies();
            });
        });
    });
}

// === 初始化应用 ===
// 修改初始化逻辑，添加函数引用
async function initApp() {
    try {
        // 添加await确保异步加载完成
        await loadUserRatings();
        initFilters();
        await renderMovies();
        console.log('应用初始化完成');
    } catch (error) {
        console.error('应用初始化失败:', error);
    }
}

// === DOM 加载完成后初始化应用 ===
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
