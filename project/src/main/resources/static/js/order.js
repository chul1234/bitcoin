/**
 * 주문 (Order) 패널 전용 스크립트
 * 매수 / 매도 / 거래내역 탭 간의 화면 전환(Toggle) 및 UI 동작을 제어합니다.
 */
document.addEventListener('DOMContentLoaded', () => {
    
    const tabs = document.querySelectorAll('#order-tabs .order-tab');
    const panels = document.querySelectorAll('.order-form-container');

    if (!tabs || tabs.length === 0) return; // 주문창이 없는 페이지에선 동작 안 함

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 1. 모든 탭에서 'active' 클래스 제거
            tabs.forEach(t => t.classList.remove('active'));
            // 2. 클릭한 탭에만 'active' 클래스 추가
            tab.classList.add('active');

            // 3. 렌더링할 타겟 패널 ID 획득
            const targetId = tab.getAttribute('data-target');

            // 4. 모든 패널을 숨기고, 타겟 패널만 노출
            panels.forEach(panel => {
                if (panel.id === targetId) {
                    panel.style.display = 'block';
                } else {
                    panel.style.display = 'none';
                }
            });
        });
    });

    // 주문구분(라디오 버튼) 변경 시 '감시가' 입력 필드 표시/숨김 제어
    const buyRadios = document.querySelectorAll('input[name="buyOrderType"]');
    const buyTriggerRow = document.querySelector('#buy-panel .trigger-price-row');
    
    buyRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'stop_limit') {
                buyTriggerRow.style.display = 'flex';
            } else {
                buyTriggerRow.style.display = 'none';
            }
        });
    });

    const sellRadios = document.querySelectorAll('input[name="sellOrderType"]');
    const sellTriggerRow = document.querySelector('#sell-panel .trigger-price-row');
    
    sellRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'stop_limit') {
                sellTriggerRow.style.display = 'flex';
            } else {
                sellTriggerRow.style.display = 'none';
            }
        });
    });

});
