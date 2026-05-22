// ============================================================================
// 좌측 패널: 가상자산(코인) 전체 목록 로딩 및 실시간 시세 업데이트 로직
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 컨테이너 및 탭 UI 요소
    const listContainer = document.getElementById('krw-market-list');
    const favContainer = document.getElementById('fav-market-list');
    const ownedContainer = document.getElementById('owned-market-list');
    const marketTabs = document.querySelectorAll('#market-tabs .market-tab');
    
    let coinMarkets = [];
    let listUpdateInterval = null;

    // 탭 전환 로직
    if (marketTabs.length > 0) {
        marketTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                marketTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                if (window.filterCoinList) {
                    window.filterCoinList();
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
            
            // + 즐겨찾기 목록 및 보유 코인 목록 가져오기
            const userId = sessionStorage.getItem('loggedInUserId');
            if (userId) {
                try {
                    const favRes = await fetch(`/api/favorites?userId=${userId}`);
                    const favResult = await favRes.json();
                    if (favResult.success) {
                        window.favoriteMarkets = favResult.data;
                    }
                } catch(e) {}
                
                try {
                    const assetRes = await fetch(`/api/assets`, { headers: { 'X-User-Id': userId } });
                    const assetResult = await assetRes.json();
                    if (assetResult.success) {
                        window.ownedMarkets = assetResult.data
                            .filter(a => a.currency !== 'KRW' && a.balance > 0)
                            .map(a => 'KRW-' + a.currency);
                    }
                } catch(e) {}
            }
            if (!window.favoriteMarkets) window.favoriteMarkets = [];
            if (!window.ownedMarkets) window.ownedMarkets = [];
            
            // 3. 초기 목록 UI 렌더링
            renderCoinList();

            // 3.5. 검색 기능 이벤트 등록
            const searchInput = document.getElementById('coin-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    if (window.filterCoinList) {
                        window.filterCoinList();
                    }
                });
            }

            // 통합 리스트 필터링 함수
            window.filterCoinList = function() {
                const query = searchInput ? searchInput.value.toLowerCase() : '';
                const activeTab = document.querySelector('#market-tabs .active').getAttribute('data-target');
                const items = document.querySelectorAll('.coin-item');
                
                items.forEach(item => {
                    const name = item.dataset.name.toLowerCase();
                    const market = item.dataset.market.toLowerCase();
                    const isFav = window.favoriteMarkets.includes(item.dataset.market);
                    const isOwned = window.ownedMarkets.includes(item.dataset.market);
                    
                    let show = true;
                    // 검색어 필터
                    if (query && !name.includes(query) && !market.includes(query)) {
                        show = false;
                    }
                    // 탭 필터
                    if (activeTab === 'fav-market-list' && !isFav) {
                        show = false;
                    }
                    if (activeTab === 'owned-market-list' && !isOwned) {
                        show = false;
                    }
                    
                    item.style.display = show ? 'flex' : 'none';
                });
                
                // 각 컨테이너 표시 전환
                if (listContainer) listContainer.style.display = activeTab === 'krw-market-list' ? 'block' : 'none';
                if (favContainer) favContainer.style.display = activeTab === 'fav-market-list' ? 'block' : 'none';
                if (ownedContainer) ownedContainer.style.display = activeTab === 'owned-market-list' ? 'block' : 'none';
                
                // 만약 활성화된 탭에 보이는 아이템이 하나도 없다면, 빈 안내 메시지를 보여주는 로직 (기본적으로 컨테이너 자체를 보여주되, 내용은 CSS로 처리하거나 여기에 추가 로직 작성 가능)
                if (activeTab === 'krw-market-list' && listContainer) { listContainer.style.display = 'block'; if (favContainer) favContainer.style.display = 'none'; if (ownedContainer) ownedContainer.style.display = 'none'; }
                if (activeTab === 'fav-market-list' && favContainer) { favContainer.style.display = 'block'; if (listContainer) listContainer.style.display = 'none'; if (ownedContainer) ownedContainer.style.display = 'none'; }
                if (activeTab === 'owned-market-list' && ownedContainer) { ownedContainer.style.display = 'block'; if (listContainer) listContainer.style.display = 'none'; if (favContainer) favContainer.style.display = 'none'; }
                
                // 아이템 목록을 현재 컨테이너로 이동
                const activeContainer = document.getElementById(activeTab);
                if (activeContainer) {
                    items.forEach(item => {
                        if (item.style.display !== 'none') {
                            activeContainer.appendChild(item);
                        }
                    });
                }
            };

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
            
            // URL 파라미터에서 선택된 코인 확인 (없으면 비트코인 기본값)
            const urlParams = new URLSearchParams(window.location.search);
            const targetMarket = urlParams.get('market') || 'KRW-BTC';
            
            // 해당 코인을 활성화 상태로 표시하고 스크롤 이동 및 클릭(차트 연동)
            if (coin.market === targetMarket) {
                // DOM 렌더링이 완료된 후 클릭 이벤트를 강제로 발생시킵니다.
                setTimeout(() => {
                    el.click();
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }

            const isFav = window.favoriteMarkets.includes(coin.market);
            const favText = isFav ? '★' : '☆';
            const favColor = isFav ? '#FBBF24' : 'rgba(255, 255, 255, 0.2)';

            el.innerHTML = `
                <div class="coin-item-left">
                    <div style="display:flex; align-items:center;">
                        <span class="coin-item-name">${coin.korean_name}</span>
                        <span class="btn-favorite" data-market="${coin.market}" style="margin-left: 0.3rem; margin-bottom: 0.1rem; cursor: pointer; color: ${favColor}; font-size:1rem; transition:color 0.2s;">${favText}</span>
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
                if(e.target.classList.contains('btn-favorite')) {
                    const userId = sessionStorage.getItem('loggedInUserId');
                    if (!userId) {
                        if(window.showToast) window.showToast('로그인이 필요합니다.', 'error');
                        return;
                    }
                    
                    fetch('/api/favorites/toggle', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: userId, market: coin.market })
                    })
                    .then(res => res.json())
                    .then(res => {
                        if (res.success) {
                            if (res.isAdded) {
                                e.target.innerText = '★';
                                e.target.style.color = '#FBBF24';
                                window.favoriteMarkets.push(coin.market);
                            } else {
                                e.target.innerText = '☆';
                                e.target.style.color = 'rgba(255, 255, 255, 0.2)';
                                window.favoriteMarkets = window.favoriteMarkets.filter(m => m !== coin.market);
                            }
                            if(window.showToast) window.showToast(res.message, 'success');
                            
                            // 탭 필터 다시 적용
                            if (window.filterCoinList) window.filterCoinList();
                        }
                    });
                    
                    return; // 별 클릭 시에는 차트 변동 없음
                }

                // UI 활성화 상태 변경
                document.querySelectorAll('.coin-item').forEach(item => item.classList.remove('active'));
                el.classList.add('active');
                
                // chart.js에 정의된 차트 시장변경 훅 호출
                if (window.changeMarket) {
                    window.changeMarket(coin.market, coin.korean_name);
                }
                
                // order.js에 정의된 주문창 시장변경 훅 호출
                if (window.changeOrderMarket) {
                    window.changeOrderMarket(coin.market);
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
