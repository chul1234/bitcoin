// ============================================================================
// 좌측 패널: 가상자산(코인) 전체 목록 로딩 및 실시간 시세 업데이트 로직
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 컨테이너 및 탭 UI 요소
    const listContainer = document.getElementById('krw-market-list');
    const favContainer = document.getElementById('fav-market-list');
    const marketTabs = document.querySelectorAll('#market-tabs .market-tab');
    
    let coinMarkets = [];
    let listUpdateInterval = null;

    // 탭 전환 로직
    if (marketTabs.length > 0) {
        marketTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                marketTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const target = tab.getAttribute('data-target');
                if (target === 'krw-market-list') {
                    listContainer.style.display = 'block';
                    favContainer.style.display = 'none';
                } else {
                    listContainer.style.display = 'none';
                    favContainer.style.display = 'block';
                }
            });
        });
    }

    initCoinList();

    async function initCoinList() {
        try {
            // 1. 업비트 전체 마켓(코인 종목) 조회
            const response = await fetch('https://api.upbit.com/v1/market/all?isDetails=false');
            const data = await response.json();
            
            // 2. KRW(원화) 마켓만 필터링
            coinMarkets = data.filter(item => item.market.startsWith('KRW-'));
            
            // 3. 초기 목록 UI 렌더링
            renderCoinList();

            // 3.5. 검색 기능 이벤트 등록
            const searchInput = document.getElementById('coin-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const query = e.target.value.toLowerCase();
                    const items = document.querySelectorAll('.coin-item');
                    
                    items.forEach(item => {
                        const name = item.dataset.name.toLowerCase();
                        const market = item.dataset.market.toLowerCase();
                        // 한글명이나 약어(기호)에 검색어가 포함되면 보이고 아니면 숨김
                        if (name.includes(query) || market.includes(query)) {
                            item.style.display = 'flex';
                        } else {
                            item.style.display = 'none';
                        }
                    });
                });
            }

            // 4. 최초 시세 불러오기 및 주기적 업데이트 시작
            await updateCoinPrices();
            if(listUpdateInterval) clearInterval(listUpdateInterval);
            listUpdateInterval = setInterval(updateCoinPrices, 2000); // 전체 목록은 2초마다 갱신 (부하 방지)

        } catch (error) {
            console.error('코인 목록 로드 실패:', error);
            if(listContainer) {
                listContainer.innerHTML = '<div style="text-align:center;color:#EF4444;padding:1rem;">데이터를 불러올 수 없습니다.</div>';
            }
        }
    }

    function renderCoinList() {
        if(!listContainer) return;
        listContainer.innerHTML = '';
        
        coinMarkets.forEach(coin => {
            const el = document.createElement('div');
            el.className = 'coin-item';
            el.dataset.market = coin.market;
            el.dataset.name = coin.korean_name;
            
            // 비트코인(KRW-BTC)을 기본 활성화 상태로 표시
            if (coin.market === 'KRW-BTC') {
                el.classList.add('active');
            }

            el.innerHTML = `
                <div class="coin-item-left">
                    <div style="display:flex; align-items:center;">
                        <span class="coin-item-name">${coin.korean_name}</span>
                        <span class="btn-favorite" data-market="${coin.market}" style="margin-left: 0.3rem; margin-bottom: 0.1rem; cursor: pointer; color: rgba(255, 255, 255, 0.2); font-size:1rem; transition:color 0.2s;">☆</span>
                    </div>
                    <span class="coin-item-symbol">${coin.market.replace('KRW-', '')}</span>
                </div>
                <div class="coin-item-right">
                    <span class="coin-item-price" id="list-price-${coin.market}">-</span>
                    <span class="coin-item-change" id="list-change-${coin.market}">-</span>
                </div>
            `;

            // 종목 전체 클릭 이벤트: 차트 변경
            el.addEventListener('click', (e) => {
                // 즐겨찾기 별표 클릭인 경우, 차트 전이는 무시합니다. (예정된 DB 연동 동작)
                if(e.target.classList.contains('btn-favorite')) {
                    // 추후 DB가 연동되면 이곳에서 찜하기 토글 로직 동작 (UI만 시뮬레이션)
                    const isFav = e.target.innerText === '★';
                    e.target.innerText = isFav ? '☆' : '★';
                    e.target.style.color = isFav ? 'var(--text-muted)' : '#FBBF24'; // 노란색으로 강조
                    return; // 별 클릭 시에는 차트 변동 없음
                }

                // UI 활성화 상태 변경
                document.querySelectorAll('.coin-item').forEach(item => item.classList.remove('active'));
                el.classList.add('active');
                
                // chart.js에 정의된 차트 시장변경 훅 호출
                if (window.changeMarket) {
                    window.changeMarket(coin.market, coin.korean_name);
                }
            });

            listContainer.appendChild(el);
        });
    }

    async function updateCoinPrices() {
        if (!coinMarkets || coinMarkets.length === 0) return;
        
        try {
            // 모든 코인의 시세를 한 번의 API 호출로 가져옴 (콤마로 연결)
            const marketCodes = coinMarkets.map(c => c.market).join(',');
            const response = await fetch(`https://api.upbit.com/v1/ticker?markets=${marketCodes}`);
            const tickers = await response.json();

            // 가져온 시세를 화면에 반영
            tickers.forEach(ticker => {
                const priceEl = document.getElementById(`list-price-${ticker.market}`);
                const changeEl = document.getElementById(`list-change-${ticker.market}`);
                
                if (priceEl && changeEl) {
                    // 가격 렌더링 (소수점 고려)
                    let formattedPrice = ticker.trade_price < 100 ? 
                        ticker.trade_price.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : 
                        Math.floor(ticker.trade_price).toLocaleString('ko-KR');
                    
                    priceEl.innerText = formattedPrice;

                    // 증감률 렌더링
                    const changeRate = (ticker.signed_change_rate * 100).toFixed(2);
                    if (changeRate > 0) {
                        changeEl.innerText = '+' + changeRate + '%';
                        changeEl.className = 'coin-item-change positive';
                        priceEl.style.color = '#EF4444'; // 한국식 상승
                    } else if (changeRate < 0) {
                        changeEl.innerText = changeRate + '%';
                        changeEl.className = 'coin-item-change negative';
                        priceEl.style.color = '#4F46E5'; // 한국식 하락
                    } else {
                        changeEl.innerText = '0.00%';
                        changeEl.className = 'coin-item-change zero';
                        priceEl.style.color = 'var(--text-main)';
                    }
                }
            });
        } catch (error) {
            console.error('리스트 시세 업데이트 에러:', error);
        }
    }
});
