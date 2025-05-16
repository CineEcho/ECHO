// API配置
const OMDB_API_KEY = '4a3b711b';
const BASE_URL = 'https://www.omdbapi.com/';

// 当前筛选条件（添加window对象全局访问）
window.filters = {
    category: '全部',
    genre: '全部',
    region: '全部',
    year: '全部',
    sort: 'latest'  // 默认按最新排序
};

// 存储用户评分（添加全局访问）
window.userRatings = new Map(); // 保留全局唯一声明

// 加载用户评分（添加函数导出）
// 加载用户评分（添加去重逻辑）
window.loadUserRatings = async function() {
    try {
        console.log('开始加载用户评分...');
        const response = await fetch('data/ratings.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        userRatings.clear();
        const seenIds = new Set(); // 新增：记录已处理的ID
        data.ratings.forEach(item => {
            if (item.id && !seenIds.has(item.id) && item.rating >= 1 && item.rating <= 10) {
                userRatings.set(item.id, { rating: item.rating, name: item.name });
                seenIds.add(item.id); // 标记ID已处理
                console.log(`添加评分: ID=${item.id}, 评分=${item.rating}, 名称=${item.name}`);
            } else if (seenIds.has(item.id)) {
                console.warn(`检测到重复ID: ${item.id}，已跳过`); // 新增：输出重复警告
            }
        });
        console.log('用户评分加载完成');
        return true;
    } catch (error) {
        console.error('加载用户评分失败:', error);
        return false;
    }
}

// 获取电影详情
async function getMovieDetails(id) {
    try {
        const url = `${BASE_URL}?i=${id}&apikey=${OMDB_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log(`成功获取电影详情: ${data.Title}`);
        return data;
    } catch (error) {
        console.error(`获取电影 ${id} 详情失败:`, error);
        return null;
    }
}
window.movies = [];
// 渲染电影列表（修改后）
async function renderMovies() {
    try {
        const container = document.getElementById('movies-container');
        if (!container) throw new Error('找不到电影容器元素');
        
        window.movies = []; // 初始化全局电影数组

        container.innerHTML = '<div class="loading">加载中...</div>'; 

        // 步骤1：直接向window.movies中添加符合条件的电影（添加重复ID校验）
        for (const [id, userData] of userRatings) {
            const movie = await getMovieDetails(id);
            if (movie && shouldRenderMovie(movie)) {
                // 新增：检查当前电影ID是否已存在于window.movies中
                const isDuplicate = window.movies.some(m => m.imdbID === movie.imdbID);
                if (!isDuplicate) {
                    window.movies.push({  
                        ...movie, 
                        userRating: userData.rating, 
                        name: userData.name
                    });
                    console.log('当前添加的电影:', { id: movie.imdbID, name: userData.name, rating: userData.rating });
                } else {
                    console.warn(`检测到重复电影ID: ${movie.imdbID}，已跳过`);
                }
            }
        }

        // 步骤2：按排序条件排序（修改为操作window.movies）
        // 步骤2：按排序条件排序（修改为操作window.movies）
        console.log('排序前的电影数据:', window.movies.map(m => ({name: m.name, rating: m.userRating})));  // 调试输出原始数据
        
        window.movies.sort((a, b) => {  // 关键修改：将movies替换为window.movies
            if (filters.sort === 'latest') {
                const yearA = parseInt(a.Year.split('–')[0], 10) || 0;
                const yearB = parseInt(b.Year.split('–')[0], 10) || 0;
                return yearB - yearA;
            } else {
                const ratingA = typeof a.userRating === 'number' ? a.userRating : parseFloat(a.userRating) || 0;
                const ratingB = typeof b.userRating === 'number' ? b.userRating : parseFloat(b.userRating) || 0;
                console.log(`比较评分：${a.name}(${ratingA}) vs ${b.name}(${ratingB})`);
                return ratingB - ratingA;
            }
        });
        
        console.log('排序后的电影数据:', window.movies.map(m => ({name: m.name, rating: m.userRating})));  // 调试输出排序结果
        // 步骤3：渲染排序后的电影（保持原有逻辑）
        container.innerHTML = ''; 
        window.movies.forEach(movie => {
            const movieElement = document.createElement('div');
            movieElement.className = 'movie-card';
            movieElement.innerHTML = `
                <div class="poster-container">
                    <img src="${movie.Poster}" alt="${movie.name}">
                    <div class="poster-year">${movie.Year}</div>
                    <div class="poster-rating">${movie.userRating}</div>
                </div>
                <h3>${movie.name}</h3>
            `;
            container.appendChild(movieElement);
        });

        if (window.movies.length === 0) {  // 同步检查window.movies长度
            container.innerHTML = '<p>没有符合筛选条件的影视作品。</p>';
            return;
        }

    } catch (error) {
        console.error('渲染电影列表时出错:', error);
        container.innerHTML = '<p class="error">数据加载失败，请稍后重试</p>';
        return;
    }
}

// 筛选逻辑，检查电影是否符合当前筛选条件
function shouldRenderMovie(movie) {
    const { category, genre, region, year } = filters;
    const movieGenres = movie.Genre ? movie.Genre.split(', ') : [];
    const movieRegions = movie.Country ? movie.Country.split(', ') : [];

    // 调试输出：检查每个电影的相关字段
    console.log(`检查电影: ${movie.Title}`);
    console.log(`类别: ${movie.Type}, 类型: ${movie.Genre}, 地区: ${movie.Country}, 年份: ${movie.Year}`);
    console.log(`当前筛选条件 - 类别: ${category}, 类型: ${genre}, 地区: ${region}, 年份: ${year}`);

    // 处理类别字段（OMDB返回Type为'movie'/'series'）
    if (category === '电影' && movie.Type !== 'movie') {
        console.log(`${movie.Title} 不符合 '电影' 类别`);
        return false;
    }
    if (category === '剧集') {
        if (movie.Type !== 'series' || movieGenres.includes('Animation')) {
            console.log(`${movie.Title} 不符合 '剧集' 类别（可能是动漫）`);
            return false;
        }
    }
    if (category === '动漫' && !movieGenres.includes('Animation')) {
        console.log(`${movie.Title} 不符合 '动漫' 类别`);
        return false;
    }

    // 关键修改：类型分类映射（用户筛选按钮文本 → IMDB类型英文，移除动画相关类型）
    // 类型映射调整（仅保留指定类型）
    const genreMap = {
    '喜剧': 'Comedy',
    '爱情': 'Romance',
    '恐怖': 'Horror',
    '动作': 'Action',
    '科幻': 'Sci-Fi',
    '剧情': 'Drama',
    '犯罪': 'Crime',
    '悬疑': 'Mystery',
    '惊悚': 'Thriller',
    '家庭': 'Family',
    '冒险': 'Adventure',
    '运动': 'Sport',
    '战争': 'War',
    '灾难': 'Disaster'  // 假设OMDB返回的类型包含'Disaster'，若实际不支持需调整为正确英文类型
    };
    const targetGenre = genreMap[genre] || genre; // 未匹配时保持原类型（如"全部"）

    // 处理类型字段（使用映射后的英文类型匹配）
    if (genre !== '全部' && !movieGenres.includes(targetGenre)) {
        console.log(`${movie.Title} 不符合 '类型' ${genre}（IMDB类型: ${movie.Genre}）`);
        return false;
    }

    // 处理地区字段（优化后映射）
    const regionMap = { 
        '国语': ['China', 'Hong Kong', 'Taiwan', 'Macau'],  //对应中国及地区 
        '英语': ['United States', 'UK', 'Canada', 'Australia', 'New Zealand'],  // 英语国家列表 
        '日语': ['Japan'],  // 日本 
        '韩语': ['South Korea']  // 韩国 
    };
    const mainRegions = Object.keys(regionMap);  // 主要地区分类

    if (region !== '全部') {
        if (mainRegions.includes(region)) {
            // 匹配指定主要地区
            const targetCountries = regionMap[region];
            const isRegionMatch = movieRegions.some(country => 
                targetCountries.includes(country.trim())
            );
            if (!isRegionMatch) return false;
        } else if (region === '其他') {
            // 匹配未被主要地区覆盖的国家
            const isOtherRegion = movieRegions.every(country => {
                const trimmed = country.trim();
                return !mainRegions.some(r => regionMap[r].includes(trimmed));
            });
            if (!isOtherRegion) return false;
        }
    }
    if (region !== '全部' && regionMap[region]) {
        const targetCountries = regionMap[region];
        const isRegionMatch = movieRegions.some(country => targetCountries.includes(country.trim()));
        if (!isRegionMatch) {
            console.log(`${movie.Title} 不符合 '地区' ${region}（IMDB国家: ${movie.Country}）`);
            return false;
        }
    }

    // 处理年份字段（使用OMDB返回的Year字段）
    // 修改年份处理逻辑（保留原始年份字符串）
    if (year !== '全部') {
        if (!isYearInRange(movie.Year, year)) { 
            console.log(`${movie.Title} 年份验证失败（电影年份: ${movie.Year}，筛选年份: ${year}）`);
            return false;
        }
    }
    
    // 增强年份范围判断函数
    // 更新年份筛选逻辑
    function isYearInRange(movieYearStr, filterYear) {
        // 处理空值情况
        if (!movieYearStr || movieYearStr.toLowerCase() === 'n/a') return false;
        
        // 解析电影年份范围
        const movieYears = movieYearStr.split(/[–~-]/).map(y => 
            Number(y.replace(/\D/g, '')) || 0
        );
        const [startMovie, endMovie = startMovie] = movieYears;
    
        // 处理特殊筛选条件
        if (filterYear === '全部') return true;
        if (filterYear === '2020以前') return endMovie <= 2020;
        
        // 处理数字年份
        const filterYearNum = Number(filterYear);
        return !isNaN(filterYearNum) && startMovie <= filterYearNum && filterYearNum <= endMovie;
    }
    
    return true;
}






// 修复评分排序逻辑（添加数值转换）
// 修复68行：确保评分值转换
// 步骤2：按排序条件排序
console.log('排序前的电影数据:', movies.map(m => ({name: m.name, rating: m.userRating})));  // 调试输出原始数据

movies.sort((a, b) => {
    if (filters.sort === 'latest') {
        const yearA = parseInt(a.Year.split('–')[0], 10) || 0;
        const yearB = parseInt(b.Year.split('–')[0], 10) || 0;
        return yearB - yearA;
    } else {
        // 确保评分是数值类型（添加类型检查）
        const ratingA = typeof a.userRating === 'number' ? a.userRating : parseFloat(a.userRating) || 0;
        const ratingB = typeof b.userRating === 'number' ? b.userRating : parseFloat(b.userRating) || 0;
        console.log(`比较评分：${a.name}(${ratingA}) vs ${b.name}(${ratingB})`);  // 调试输出比较过程
        return ratingB - ratingA;
    }
});

console.log('排序后的电影数据:', movies.map(m => ({name: m.name, rating: m.userRating})));  // 调试输出排序结果

// 修复updateFilters函数（第68行相关）
function updateFilters() {
    // 获取年份筛选值
    const activeYearButton = document.querySelector('.filter-group[data-filter="year"] .active');
    const activeYear = activeYearButton ? activeYearButton.dataset.year : '全部';
    
    // 获取排序按钮的data-sort属性值
    const activeSortButton = document.querySelector('.sort-container .active');
    const sortType = activeSortButton ? activeSortButton.dataset.sort : 'latest';

    // 更新所有筛选条件（包括排序）
    filters = {
        category: document.querySelector('.filter-group[data-filter="category"] .active')?.textContent || '全部',
        genre: document.querySelector('.filter-group[data-filter="genre"] .active')?.textContent || '全部',
        region: document.querySelector('.filter-group[data-filter="region"] .active')?.textContent || '全部',
        year: activeYear,
        sort: sortType  // 直接使用data-sort属性值
    };
    
    console.log('更新后的筛选条件:', filters);  // 调试输出确认
    renderMovies();
}

// 筛选按钮点击事件（已覆盖排序按钮，无需额外修改）
const filterButtons = document.querySelectorAll('.filter-group button');
filterButtons.forEach(button => {
    button.addEventListener('click', function() {
        const filterGroup = this.closest('.filter-group');
        const buttons = filterGroup.querySelectorAll('button');
        buttons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        updateFilters();  // 点击排序按钮时触发更新
    });
});

// 在文件顶部添加全局初始化函数
function initializeApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
}

// 文件末尾调用初始化
initializeApp();


// 添加触摸滑动支持
let touchStartX = 0;
document.querySelectorAll('.filter-buttons').forEach(container => {
    container.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
    });
    
    container.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].clientX;
        if (Math.abs(touchEndX - touchStartX) > 30) {
            container.scrollLeft += (touchEndX - touchStartX) * 2;
        }
    });
});