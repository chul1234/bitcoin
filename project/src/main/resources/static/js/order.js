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

    // -----------------------------------------------------
    // [업비트 웹소켓] 실시간 호가창(Orderbook) 연동
    // -----------------------------------------------------
    let currentMarket = 'KRW-BTC'; // 기본 코인
    let ws = null;
    let isPriceInitialized = false; // 최초 1회 현재가 자동 기입 플래그

    function connectOrderbookWS() {
        if (ws) {
            ws.close();
        }
        
        ws = new WebSocket('wss://api.upbit.com/websocket/v1');
        ws.binaryType = 'arraybuffer';
        
        ws.onopen = () => {
            const msg = [
                { ticket: "cd_orderbook" },
                { type: "orderbook", codes: [currentMarket] },
                { type: "ticker", codes: [currentMarket] } // 현재가 정보 추가 구독
            ];
            ws.send(JSON.stringify(msg));
        };
        
        ws.onmessage = (event) => {
            const enc = new TextDecoder("utf-8");
            const arr = new Uint8Array(event.data);
            const data = JSON.parse(enc.decode(arr));
            
            if (data.type === 'orderbook') {
                renderOrderbook(data.orderbook_units);
            } else if (data.type === 'ticker') {
                // 최초 1회만 현재가를 주문창 가격에 세팅
                if (!isPriceInitialized) {
                    const buyPriceInput = document.querySelector('#buy-panel .price-input');
                    const sellPriceInput = document.querySelector('#sell-panel .price-input');
                    
                    // 현재가에도 콤마 포맷팅 적용
                    const formattedPrice = formatNumberWithCommas(data.trade_price);
                    
                    if (buyPriceInput) buyPriceInput.value = formattedPrice;
                    if (sellPriceInput) sellPriceInput.value = formattedPrice;
                    
                    isPriceInitialized = true;
                    
                    // 초기 총액 계산
                    calcTotal('#buy-panel');
                    calcTotal('#sell-panel');
                }
            }
        };
    }

    // 콤마 포맷팅 헬퍼 함수
    function formatNumberWithCommas(val) {
        if (!val) return '';
        const num = parseFloat(val.toString().replace(/,/g, ''));
        if (isNaN(num)) return '';
        return new Intl.NumberFormat('ko-KR').format(num);
    }

    function renderOrderbook(units) {
        const askList = document.getElementById('ask-list');
        const bidList = document.getElementById('bid-list');
        if (!askList || !bidList) return;

        let askHtml = '';
        let bidHtml = '';

        // 매도(파란색) 호가는 위에서부터 역순으로 보여야 함 (내림차순 정렬)
        for (let i = 14; i >= 0; i--) {
            const unit = units[i];
            const price = unit.ask_price;
            const size = unit.ask_size.toFixed(3);
            
            askHtml += `
                <div class="orderbook-row" data-price="${price}" style="display:flex; justify-content:space-between; padding: 4px 8px; cursor:pointer;">
                    <span style="color: #3B82F6;">${new Intl.NumberFormat('ko-KR').format(price)}</span>
                    <span style="color: rgba(255,255,255,0.7);">${size}</span>
                </div>
            `;
        }

        // 매수(빨간색) 호가는 아래로 내려갈수록 낮아짐 (내림차순 정렬)
        for (let i = 0; i < 15; i++) {
            const unit = units[i];
            const price = unit.bid_price;
            const size = unit.bid_size.toFixed(3);
            
            bidHtml += `
                <div class="orderbook-row" data-price="${price}" style="display:flex; justify-content:space-between; padding: 4px 8px; cursor:pointer;">
                    <span style="color: #EF4444;">${new Intl.NumberFormat('ko-KR').format(price)}</span>
                    <span style="color: rgba(255,255,255,0.7);">${size}</span>
                </div>
            `;
        }

        askList.innerHTML = askHtml;
        bidList.innerHTML = bidHtml;

        // 호가 클릭 이벤트 바인딩 (클릭 시 주문 폼 가격에 자동 입력 및 콤마 포맷팅)
        document.querySelectorAll('.orderbook-row').forEach(row => {
            row.addEventListener('click', () => {
                const price = row.getAttribute('data-price');
                const buyPriceInput = document.querySelector('#buy-panel .price-input');
                const sellPriceInput = document.querySelector('#sell-panel .price-input');
                
                const formattedPrice = formatNumberWithCommas(price);
                if (buyPriceInput) buyPriceInput.value = formattedPrice;
                if (sellPriceInput) sellPriceInput.value = formattedPrice;
                
                // 총액 재계산
                calcTotal('#buy-panel');
                calcTotal('#sell-panel');
            });
        });
    }

    connectOrderbookWS();

    // -----------------------------------------------------
    // [매수/매도 로직] 잔고 기반 수량 계산 및 API 호출
    // -----------------------------------------------------
    function calcTotal(panelSelector) {
        const panel = document.querySelector(panelSelector);
        if (!panel) return;
        
        const priceInput = panel.querySelector('.price-input');
        const amountInput = panel.querySelector('.amount-input');
        const totalSpan = panel.querySelectorAll('.form-row span')[3]; // 주문총액 텍스트 영역
        
        // 콤마 제거 후 숫자 파싱
        const price = parseFloat(priceInput.value.replace(/,/g, '')) || 0;
        const amount = parseFloat(amountInput.value) || 0;
        const total = price * amount;
        
        if (totalSpan) {
            totalSpan.innerHTML = `${new Intl.NumberFormat('ko-KR').format(Math.floor(total))} <span style="font-size:0.8rem; color:var(--text-muted);">KRW</span>`;
        }
    }

    // 인풋 값 변경 시 콤마 자동 생성 및 총액 재계산
    document.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('input', (e) => {
            // 숫자 이외의 문자 제거
            let rawValue = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = formatNumberWithCommas(rawValue);
            calcTotal('#buy-panel');
            calcTotal('#sell-panel');
        });
    });

    document.querySelectorAll('.amount-input').forEach(input => {
        input.addEventListener('input', () => {
            calcTotal('#buy-panel');
            calcTotal('#sell-panel');
        });
    });

    // 매수 비율 버튼 (10%, 25%, 50%, 100%)
    const buyPercentBtns = document.querySelectorAll('#buy-panel .btn-percent');
    buyPercentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const percent = parseInt(btn.innerText);
            const priceVal = document.querySelector('#buy-panel .price-input').value;
            const price = parseFloat(priceVal.replace(/,/g, ''));
            
            // 보유 원화 잔고 파싱 (화면에 표시된 콤마 제거)
            const krwText = document.getElementById('order-possible-krw').innerText.replace(/,/g, '');
            const krwBalance = parseFloat(krwText) || 0;

            if (!price || price <= 0) {
                return alert('먼저 호가창에서 매수할 가격을 클릭하거나 입력해주세요.');
            }

            const targetKrw = krwBalance * (percent / 100);
            const amount = targetKrw / price;
            
            document.querySelector('#buy-panel .amount-input').value = amount.toFixed(8);
            calcTotal('#buy-panel');
        });
    });

    // 백엔드 API 통신 함수 (매수/매도 공통)
    async function submitOrder(type) {
        const userId = sessionStorage.getItem('loggedInUserId');
        if (!userId) return alert('로그인이 필요합니다.');

        const panelId = type === 'buy' ? '#buy-panel' : '#sell-panel';
        const panel = document.querySelector(panelId);
        
        const priceVal = panel.querySelector('.price-input').value;
        const price = parseFloat(priceVal.replace(/,/g, ''));
        const volume = parseFloat(panel.querySelector('.amount-input').value);
        
        if (!price || !volume || price <= 0 || volume <= 0) {
            return alert('가격과 수량을 올바르게 입력해주세요.');
        }

        try {
            const res = await fetch(`/api/orders/${type}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Id': userId
                },
                body: JSON.stringify({
                    market: currentMarket,
                    price: price,
                    volume: volume,
                    orderType: 'LIMIT'
                })
            });
            const result = await res.json();
            
            if (result.success) {
                alert(`${type === 'buy' ? '매수' : '매도'}가 체결되었습니다!`);
                // 내 잔고 갱신을 위해 페이지 리로드 (또는 checkAndInitializeAssets 재호출)
                window.location.reload(); 
            } else {
                alert('주문 실패: ' + result.message);
            }
        } catch (e) {
            alert('서버 오류가 발생했습니다.');
        }
    }

    const buyBtn = document.querySelector('.btn-buy');
    if (buyBtn) buyBtn.addEventListener('click', () => submitOrder('buy'));

    const sellBtn = document.querySelector('.btn-sell');
    if (sellBtn) sellBtn.addEventListener('click', () => submitOrder('sell'));

});
