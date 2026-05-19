// ai.js - AI 포트폴리오 큐레이션 및 원클릭 분산 매수 연동

document.addEventListener('DOMContentLoaded', () => {
    const aiBtn = document.getElementById('ai-recommend-btn');
    const aiModal = document.getElementById('ai-modal');
    const closeBtn = document.getElementById('close-ai-modal');
    const gridContainer = document.getElementById('ai-portfolio-grid');

    if (!aiBtn || !aiModal || !gridContainer) return;

    // 테마 메타데이터
    const themeMeta = {
        'VALUE': { title: '💎 저가 매수 (고잠재력)', desc: 'AI 호재 점수는 높으나 차트상 아직 오르지 않은 코인', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
        'HIGH_RISK': { title: '🔥 고위험 / 고수익', desc: 'AI가 단기 펌핑으로 판단한 극강의 변동성 코인', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
        'SAFE': { title: '🛡️ 우량 안전 자산', desc: '시총이 크고 AI 악재 점수가 없는 안전 코인', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
        'TRENDING': { title: '🚀 트렌딩 내러티브', desc: '특정 키워드(AI, 밈 등)가 뉴스에서 많이 발견된 코인', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' }
    };

    // 모달 열기
    aiBtn.addEventListener('click', () => {
        aiModal.style.display = 'flex';
        loadPortfolios();
    });

    // 모달 닫기
    closeBtn.addEventListener('click', () => {
        aiModal.style.display = 'none';
    });
    aiModal.addEventListener('click', (e) => {
        if (e.target === aiModal) aiModal.style.display = 'none';
    });

    async function loadPortfolios() {
        gridContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem; grid-column: span 2;">AI 엔진이 전 종목을 스캔하고 있습니다... <br><small>잠시만 기다려주세요 ⚡</small></div>';
        
        try {
            const response = await fetch(`/api/ai/portfolios`);
            if (!response.ok) throw new Error('API 연동 실패');
            const data = await response.json(); // Map<String, List<AiCoinAnalysis>>

            renderGrid(data);
        } catch (error) {
            console.error('AI 데이터 로드 에러:', error);
            gridContainer.innerHTML = '<div style="text-align: center; color: #EF4444; padding: 2rem; grid-column: span 2;">데이터를 불러오는 중 오류가 발생했습니다.</div>';
        }
    }

    function renderGrid(portfolios) {
        gridContainer.innerHTML = ''; 

        Object.keys(themeMeta).forEach(themeKey => {
            const meta = themeMeta[themeKey];
            const coins = portfolios[themeKey] || [];
            
            let coinsHtml = '';
            let marketList = [];
            
            if (coins.length === 0) {
                coinsHtml = `<div style="text-align:center; padding:1rem; color:var(--text-muted); font-size:0.85rem;">조건에 맞는 코인이 없습니다.</div>`;
            } else {
                // 스크롤 추가 (max-height)
                coinsHtml = `<div style="display:flex; flex-direction:column; gap:0.5rem; max-height: 280px; overflow-y: auto; padding-right: 0.5rem;">`;
                coins.forEach(coin => {
                    marketList.push(coin.market);
                    const scoreColor = coin.score >= 70 ? '#10B981' : (coin.score <= 30 ? '#EF4444' : '#F59E0B');
                    coinsHtml += `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:0.6rem; border-radius:6px; border: 1px solid rgba(255,255,255,0.02);">
                            <div style="display:flex; flex-direction:column; gap:4px; max-width:70%;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span style="font-weight:600; font-size:0.85rem; color:var(--text-main);">${coin.market}</span>
                                    <span style="font-size:0.8rem; font-weight:700; color:${scoreColor};">${coin.score}점</span>
                                </div>
                                <span style="font-size:0.75rem; color:var(--text-muted); line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${coin.summary.split('\n')[0]}</span>
                            </div>
                            <!-- 바로가기 버튼 생성 -->
                            <button class="ai-buy-btn" data-market="${coin.market}" style="background: rgba(139, 92, 246, 0.15); color: #A78BFA; border: 1px solid rgba(139, 92, 246, 0.3); padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.2s;" onmouseover="this.style.background='rgba(139, 92, 246, 0.3)'" onmouseout="this.style.background='rgba(139, 92, 246, 0.15)'">
                                바로가기
                            </button>
                        </div>
                    `;
                });
                coinsHtml += `</div>`;
            }
            
            // dataset에 시장 배열 저장 (문자열로)
            const marketsAttr = marketList.join(',');

            const card = document.createElement('div');
            card.style.cssText = `background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden;`;
            card.innerHTML = `
                <div style="padding: 1rem; background: ${meta.bg}; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <h4 style="margin: 0 0 0.2rem 0; color: ${meta.color}; display: flex; align-items: center; gap: 6px; font-size:1.1rem;">
                        ${meta.title}
                    </h4>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${meta.desc}</div>
                </div>
                <div style="padding: 1rem; flex: 1; display:flex; flex-direction:column; gap:1rem;">
                    ${coinsHtml}
                </div>
                <div style="padding: 1rem; border-top: 1px solid rgba(255,255,255,0.05); text-align:center;">
                    <button class="btn-portfolio-buy" data-theme="${themeKey}" data-markets="${marketsAttr}" 
                            ${coins.length === 0 ? 'disabled' : ''}
                            style="width:100%; background: linear-gradient(135deg, #8B5CF6, #3B82F6); color: white; border: none; padding: 0.75rem; border-radius: 8px; font-weight: 600; cursor: ${coins.length === 0 ? 'not-allowed' : 'pointer'}; opacity: ${coins.length === 0 ? '0.5' : '1'}; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);">
                        예산 100% 자동 분산 매수
                    </button>
                </div>
            `;
            gridContainer.appendChild(card);
        });

        // '바로가기' 버튼 이벤트 연결
        document.querySelectorAll('.ai-buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const market = e.target.dataset.market;
                aiModal.style.display = 'none';
                
                const coinItem = document.querySelector(`.coin-item[data-market="${market}"]`);
                if (coinItem) {
                    coinItem.click();
                    coinItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    const searchInput = document.getElementById('coin-search-input');
                    if (searchInput) {
                        searchInput.value = market.replace('KRW-', '');
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                } else {
                    if (typeof window.changeMarket === 'function') window.changeMarket(market, market);
                    if (typeof window.changeOrderMarket === 'function') window.changeOrderMarket(market);
                }
                
                if (typeof window.enableAiMode === 'function') {
                    setTimeout(() => window.enableAiMode(), 300);
                }
            });
        });

        // 분산 매수 버튼 이벤트
        document.querySelectorAll('.btn-portfolio-buy').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const marketsStr = e.currentTarget.dataset.markets;
                if (!marketsStr) return;
                
                const markets = marketsStr.split(',');
                if (markets.length === 0) return;
                
                const userId = sessionStorage.getItem('loggedInUserId');
                if (!userId) {
                    if (window.showToast) window.showToast("로그인이 필요합니다.", "error");
                    return;
                }
                
                // 예산 분할을 위해 잔고 조회 (API 요청 또는 HTML 요소에서 읽기)
                let budget = 0;
                try {
                    const res = await fetch(`/api/assets/krw`, { headers: { 'X-User-Id': userId } });
                    if (res.ok) {
                        const json = await res.json();
                        budget = parseFloat(json.data.balance || 0);
                    }
                } catch(err) { console.error(err); }

                if (budget < 5000 * markets.length) {
                    if (window.showToast) window.showToast("보유 KRW 잔고가 부족합니다.", "error");
                    return;
                }

                if (!confirm(`이 테마의 코인 ${markets.length}종목에 대해 보유 예산 100%를 N등분하여 분산 투자하시겠습니까?\n(현재 시세로 즉시 매수됩니다)`)) {
                    return;
                }
                
                aiModal.style.display = 'none';
                if (window.showToast) window.showToast("🤖 AI가 포트폴리오 분산 매수를 시작합니다...", "success");

                // 수수료 0.05% 감안하여 주문 가능 총액 계산 후 1/N
                const feeRate = 0.0005;
                const netBudget = Math.floor(budget / (1 + feeRate));
                const budgetPerCoin = Math.floor(netBudget / markets.length);

                let successCount = 0;
                let failCount = 0;

                // 병렬 매수 API 요청
                const promises = markets.map(async (market) => {
                    try {
                        const tickerRes = await fetch(`https://api.upbit.com/v1/ticker?markets=${market}`);
                        const tickerData = await tickerRes.json();
                        const currentPrice = tickerData[0].trade_price;
                        
                        const volume = (budgetPerCoin / currentPrice).toFixed(8);

                        const buyRes = await fetch('/api/orders/buy', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-User-Id': userId
                            },
                            body: JSON.stringify({
                                market: market,
                                price: currentPrice,
                                volume: volume,
                                orderType: 'MARKET'
                            })
                        });
                        
                        if (buyRes.ok) {
                            successCount++;
                        } else {
                            failCount++;
                        }
                    } catch (e) {
                        failCount++;
                        console.error(market, e);
                    }
                });

                await Promise.all(promises);

                if (window.showToast) {
                    window.showToast(`포트폴리오 매수 완료!\n(체결: ${successCount}건, 실패: ${failCount}건)`, successCount > 0 ? "success" : "error");
                }
                
                // 잔고 및 내역 갱신 트리거
                if (window.fetchUserAsset) window.fetchUserAsset();
                
                // 투자내역 탭으로 자동 이동 유도
                setTimeout(() => {
                    if (confirm('매수가 완료되었습니다. 투자내역을 확인하시겠습니까?')) {
                        window.location.href = 'investment.html';
                    }
                }, 1000);
            });
        });
    }
});
