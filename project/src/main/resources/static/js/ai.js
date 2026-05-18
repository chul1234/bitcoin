// ai.js - AI 큐레이션 팝업 및 로직 연동

document.addEventListener('DOMContentLoaded', () => {
    const aiBtn = document.getElementById('ai-recommend-btn');
    const aiModal = document.getElementById('ai-modal');
    const closeBtn = document.getElementById('close-ai-modal');
    const tabs = document.querySelectorAll('.ai-tab');
    const recommendList = document.getElementById('ai-recommend-list');

    if (!aiBtn || !aiModal) return;

    // 모달 열기
    aiBtn.addEventListener('click', () => {
        aiModal.style.display = 'flex';
        // 기본 탭 로드
        loadRecommendations('SAFE');
    });

    // 모달 닫기
    closeBtn.addEventListener('click', () => {
        aiModal.style.display = 'none';
    });

    // 배경 클릭 시 모달 닫기
    aiModal.addEventListener('click', (e) => {
        if (e.target === aiModal) {
            aiModal.style.display = 'none';
        }
    });

    // 탭 클릭 이벤트
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // 활성화 스타일 변경
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottom = 'none';
                t.style.color = 'var(--text-muted)';
            });
            const clickedTab = e.target;
            clickedTab.classList.add('active');
            clickedTab.style.borderBottom = '2px solid #8B5CF6';
            clickedTab.style.color = 'var(--text-main)';

            // 데이터 로드
            const theme = clickedTab.dataset.theme;
            loadRecommendations(theme);
        });
    });

    // API 호출하여 추천 코인 렌더링
    async function loadRecommendations(theme) {
        recommendList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">AI가 '+ theme +' 테마를 분석 중입니다... <br><small>잠시만 기다려주세요 ⚡</small></div>';
        
        try {
            const response = await fetch(`/api/ai/recommendations?theme=${theme}`);
            if (!response.ok) throw new Error('API 연동 실패');
            const data = await response.json();

            if (!data || data.length === 0) {
                recommendList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">아직 수집된 AI 분석 데이터가 없습니다.<br>스케줄러가 백그라운드에서 데이터를 수집 중입니다. (최대 11분 소요)</div>';
                return;
            }

            renderCards(data);
        } catch (error) {
            console.error('AI 데이터 로드 에러:', error);
            recommendList.innerHTML = '<div style="text-align: center; color: #EF4444; padding: 2rem;">데이터를 불러오는 중 오류가 발생했습니다.</div>';
        }
    }

    // 카드 UI 렌더링
    function renderCards(coins) {
        recommendList.innerHTML = ''; // 초기화

        coins.forEach(coin => {
            const scoreColor = coin.score >= 70 ? '#10B981' : (coin.score <= 30 ? '#EF4444' : '#F59E0B');
            
            const cardHTML = `
                <div class="ai-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 1.2rem; display: flex; flex-direction: column; gap: 0.8rem; transition: transform 0.2s, background 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="margin: 0; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
                            <span style="background: #2D3748; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem;">${coin.market}</span>
                        </h4>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 0.8rem; color: var(--text-muted);">AI 호재 점수</span>
                            <span style="font-weight: 700; font-size: 1.1rem; color: ${scoreColor}; background: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 12px;">${coin.score}점</span>
                        </div>
                    </div>
                    
                    <div style="font-size: 0.9rem; color: #CBD5E1; line-height: 1.5; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; border-left: 3px solid #8B5CF6;">
                        ${coin.summary.replace(/\n/g, '<br>')}
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 0.5rem; font-size: 0.8rem;">
                        <span style="color: var(--text-muted); margin-right: auto;">업데이트: ${new Date(coin.updatedAt).toLocaleTimeString()}</span>
                        <button class="ai-buy-btn" data-market="${coin.market}" style="background: #3B82F6; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;">
                            이 코인 띄우기
                        </button>
                    </div>
                </div>
            `;
            recommendList.insertAdjacentHTML('beforeend', cardHTML);
        });

        // '이 코인 띄우기' 이벤트 연결
        document.querySelectorAll('.ai-buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const market = e.target.dataset.market;
                aiModal.style.display = 'none'; // 모달 닫기
                
                // 전역 스코프에 있는 selectCoin 호출 (coinlist.js 또는 order.js에 존재한다고 가정)
                if (typeof window.selectCoin === 'function') {
                    window.selectCoin(market);
                } else if (typeof window.switchMarket === 'function') {
                    window.switchMarket(market);
                } else {
                    console.warn('전역 코인 선택 함수를 찾을 수 없습니다.');
                    // 임시 방편으로 강제 이벤트 트리거
                    const event = new CustomEvent('marketChanged', { detail: { market: market } });
                    document.dispatchEvent(event);
                }
            });
        });
    }
});
