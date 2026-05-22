// ai.js - AI 포트폴리오 큐레이션 및 원클릭 분산 매수 연동

document.addEventListener('DOMContentLoaded', () => {
    const aiBtn = document.getElementById('ai-recommend-btn');
    const aiModal = document.getElementById('ai-modal');
    const closeBtn = document.getElementById('close-ai-modal');
    const gridContainer = document.getElementById('ai-portfolio-grid');

    if (!aiBtn || !aiModal || !gridContainer) return;

    // 테마 메타데이터
    const themeMeta = {
        'VALUE': { title: '💎 저가 매수 (고잠재력)', desc: '저평가 코인 분할 매수 (비중: 20% / 쿨타임: 40분 / 익절: +15% / 손절: -8%)', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
        'HIGH_RISK': { title: '🔥 고위험 / 고수익', desc: '극강의 변동성 단기 펌핑 (비중: 25% / 쿨타임: 10분 / 익절: +20% / 손절: -10%)', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
        'SAFE': { title: '🛡️ 우량 안전 자산', desc: '안전제일 짧은 수익 (비중: 10% / 쿨타임: 30분 / 익절: +5% / 손절: -3%)', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
        'TRENDING': { title: '🚀 트렌딩 내러티브', desc: '시장 주도주 추세 추종 (비중: 15% / 쿨타임: 20분 / 익절: +10% / 손절: -5%)', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' }
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
            const userId = sessionStorage.getItem('loggedInUserId');
            let botConfig = { isActive: false, tradeTheme: null };
            
            if (userId) {
                try {
                    const confRes = await fetch(`/api/ai/bot/config`, { headers: { 'X-User-Id': userId } });
                    if (confRes.ok) botConfig = await confRes.json();
                } catch(e) { console.error('Bot config fetch error', e); }
            }

            const response = await fetch(`/api/ai/portfolios`);
            if (!response.ok) throw new Error('API 연동 실패');
            const data = await response.json(); // Map<String, List<AiCoinAnalysis>>

            renderGrid(data, botConfig);
        } catch (error) {
            console.error('AI 데이터 로드 에러:', error);
            gridContainer.innerHTML = '<div style="text-align: center; color: #EF4444; padding: 2rem; grid-column: span 2;">데이터를 불러오는 중 오류가 발생했습니다.</div>';
        }
    }

    function renderGrid(portfolios, botConfig) {
        gridContainer.innerHTML = ''; 

        // 펄스 애니메이션 추가용 스타일
        if (!document.getElementById('pulse-style')) {
            const style = document.createElement('style');
            style.id = 'pulse-style';
            style.innerHTML = `
                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `;
            document.head.appendChild(style);
        }

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
            
            const isBotActiveForThisTheme = botConfig && botConfig.isActive && botConfig.tradeTheme === themeKey;
            const buttonHtml = isBotActiveForThisTheme ? 
                `<button class="btn-portfolio-buy" data-theme="${themeKey}" data-active="true"
                        style="width:100%; background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.75rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; animation: pulse-red 2s infinite;">
                    🔥 AI 자동매매 가동 중 (클릭 시 중지)
                </button>` 
                :
                `<button class="btn-portfolio-buy" data-theme="${themeKey}" data-active="false"
                        style="width:100%; background: linear-gradient(135deg, #8B5CF6, #3B82F6); color: white; border: none; padding: 0.75rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);">
                    🤖 이 테마로 24시간 자동매매 가동
                </button>`;

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
                    ${buttonHtml}
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

        // 봇 토글 버튼 이벤트
        document.querySelectorAll('.btn-portfolio-buy').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = sessionStorage.getItem('loggedInUserId');
                if (!userId) {
                    if (window.showToast) window.showToast("로그인이 필요합니다.", "error");
                    return;
                }
                
                const themeKey = e.currentTarget.dataset.theme;
                const isActive = e.currentTarget.dataset.active === 'true';
                const wantToActivate = !isActive;
                
                if (wantToActivate) {
                    const titleRaw = themeMeta[themeKey].title;
                    const cleanTitle = titleRaw.replace(/[^가-힣a-zA-Z\s]/g, '').trim();
                    if (!confirm(`[${cleanTitle}] 테마로 24시간 AI 자동매매 봇을 가동하시겠습니까?\n\n- (분산 투자) 해당 테마의 상위 3개 코인을 동시에 분산 매수합니다.\n- (수익 극대화) 최대 +10%까지 수익을 길게 가져가며, 상승세 꺾임 감지 시 미리 익절합니다.\n- (철통 방어) -7% 도달 또는 AI 악재 감지 시 칼손절하여 자산을 보호합니다.\n- 다른 테마가 이미 켜져있다면 이 테마로 교체됩니다.`)) {
                        return;
                    }
                } else {
                    if (!confirm('🛑 AI 자동매매 봇 가동을 중지하시겠습니까?\n(더 이상 알아서 매매하지 않습니다)')) {
                        return;
                    }
                }
                
                try {
                    const res = await fetch(`/api/ai/bot/toggle`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-User-Id': userId
                        },
                        body: JSON.stringify({ theme: themeKey, activate: wantToActivate })
                    });
                    
                    if (res.ok) {
                        const result = await res.json();
                        if (result.isActive) {
                            if (window.showToast) window.showToast("🚀 AI 자동매매 봇이 가동되었습니다!", "success");
                        } else {
                            if (window.showToast) window.showToast("🛑 AI 봇 가동이 중지되었습니다.", "success");
                        }
                        // UI 새로고침하여 버튼 상태 업데이트
                        loadPortfolios();
                    }
                } catch(err) {
                    console.error(err);
                    if (window.showToast) window.showToast("오류가 발생했습니다.", "error");
                }
            });
        });
    }
});
