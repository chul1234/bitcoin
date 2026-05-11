/**
 * 투자 내역 (포트폴리오) 연동 스크립트
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // 콤마 포맷팅 헬퍼
    function formatNumber(num, fixed = 0) {
        if (num === null || num === undefined) return '0';
        return Number(num).toLocaleString('ko-KR', {
            minimumFractionDigits: fixed,
            maximumFractionDigits: fixed
        });
    }

    let userAssets = [];
    let btcAsset = null;
    let krwAsset = null;
    let currentBtcPrice = 0;
    
    let chartInstance = null; // Chart.js 인스턴스

    // 1. 사용자 자산 조회
    async function fetchUserAssets() {
        const userId = sessionStorage.getItem('loggedInUserId');
        if (!userId) {
            alert("로그인이 필요합니다.");
            window.location.href = "index.html";
            return;
        }

        try {
            const res = await fetch('/api/assets', {
                headers: { 'X-User-Id': userId }
            });
            const result = await res.json();
            if (result.success) {
                userAssets = result.data;
                krwAsset = userAssets.find(a => a.currency === 'KRW');
                btcAsset = userAssets.find(a => a.currency === 'BTC');
                
                // 자산 조회 후 웹소켓 연결 (현재가를 알아야 계산 가능)
                connectUpbitWS();
            } else {
                console.error("자산 조회 실패:", result.message);
            }
        } catch (e) {
            console.error("자산 API 통신 오류", e);
        }
    }

    // 2. 업비트 웹소켓 연결 (BTC 현재가 수신)
    function connectUpbitWS() {
        const ws = new WebSocket('wss://api.upbit.com/websocket/v1');
        ws.binaryType = 'arraybuffer';
        
        ws.onopen = () => {
            const msg = [
                { ticket: "portfolio_ticker" },
                { type: "ticker", codes: ["KRW-BTC"] }
            ];
            ws.send(JSON.stringify(msg));
        };
        
        ws.onmessage = (event) => {
            const enc = new TextDecoder("utf-8");
            const arr = new Uint8Array(event.data);
            const data = JSON.parse(enc.decode(arr));
            
            if (data.type === 'ticker') {
                currentBtcPrice = data.trade_price;
                // 현재가를 수신할 때마다 UI 업데이트
                updatePortfolioUI();
            }
        };
    }

    // 3. 포트폴리오 UI 및 차트 업데이트
    function updatePortfolioUI() {
        const krwBalance = krwAsset ? parseFloat(krwAsset.balance) : 0;
        
        let btcBalance = 0;
        let btcAvgPrice = 0;
        
        if (btcAsset) {
            btcBalance = parseFloat(btcAsset.balance);
            btcAvgPrice = parseFloat(btcAsset.avgBuyPrice);
        }

        const btcTotalBuy = btcBalance * btcAvgPrice; // BTC 총 매수금액
        const btcCurrentValue = btcBalance * currentBtcPrice; // BTC 현재 평가금액
        const btcPnl = btcCurrentValue - btcTotalBuy; // BTC 평가 손익
        const btcPnlRate = btcTotalBuy > 0 ? (btcPnl / btcTotalBuy) * 100 : 0; // 수익률

        const totalAssets = krwBalance + btcCurrentValue; // 총 보유 자산 (현금 + 코인평가액)
        const totalBuy = btcTotalBuy; // 현금은 매수금액에 포함 안됨
        const totalPnl = btcPnl; 
        const totalPnlRate = totalBuy > 0 ? (totalPnl / totalBuy) * 100 : 0;

        // --- 상단 4개 카드 업데이트 ---
        document.getElementById('total-assets-val').innerText = formatNumber(totalAssets);
        document.getElementById('krw-balance-val').innerText = formatNumber(krwBalance);
        document.getElementById('total-buy-val').innerText = formatNumber(totalBuy);
        
        const pnlValEl = document.getElementById('total-pnl-val');
        const pnlRateEl = document.getElementById('total-pnl-rate');
        const pnlCard = document.getElementById('pnl-card');

        let sign = '';
        let color = '#94A3B8'; // 보합 (회색)
        if (totalPnl > 0) {
            sign = '+';
            color = '#EF4444'; // 빨강
        } else if (totalPnl < 0) {
            color = '#3B82F6'; // 파랑
        }

        pnlValEl.innerText = sign + formatNumber(totalPnl);
        pnlRateEl.innerText = `(${sign}${totalPnlRate.toFixed(2)}%)`;
        
        pnlValEl.style.color = color;
        pnlRateEl.style.color = color;
        pnlCard.style.borderRight = `4px solid ${color}`;

        // --- 보유 자산 목록 테이블 업데이트 ---
        const tbody = document.getElementById('holdings-tbody');
        let html = '';

        // 1. 원화(KRW) 행
        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                <td style="padding: 1.2rem 0.5rem; text-align: left; display:flex; align-items:center; gap:0.8rem;">
                    <div style="width: 32px; height: 32px; background: #4F46E5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; color: #fff;">₩</div>
                    <div>
                        <div style="font-weight:700; color:var(--text-main);">대한민국 원</div>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">KRW</div>
                    </div>
                </td>
                <td style="padding: 1.2rem 0.5rem; color:var(--text-main); font-weight:500;">${formatNumber(krwBalance)}</td>
                <td style="padding: 1.2rem 0.5rem; color:var(--text-muted);">-</td>
                <td style="padding: 1.2rem 0.5rem; color:var(--text-main); font-weight:600;">${formatNumber(krwBalance)}</td>
                <td style="padding: 1.2rem 0.5rem; color:var(--text-muted);">-</td>
            </tr>
        `;

        // 2. 비트코인(BTC) 행 (보유량이 있을 때만)
        if (btcBalance > 0) {
            html += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 1.2rem 0.5rem; text-align: left; display:flex; align-items:center; gap:0.8rem;">
                        <div style="width: 32px; height: 32px; background: #F59E0B; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; color: #fff;">B</div>
                        <div>
                            <div style="font-weight:700; color:var(--text-main);">비트코인</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">BTC/KRW</div>
                        </div>
                    </td>
                    <td style="padding: 1.2rem 0.5rem; color:var(--text-main); font-weight:500;">${btcBalance.toFixed(8)}</td>
                    <td style="padding: 1.2rem 0.5rem; color:var(--text-muted);">${formatNumber(btcAvgPrice)}</td>
                    <td style="padding: 1.2rem 0.5rem; color:var(--text-main); font-weight:600;">${formatNumber(btcCurrentValue)}</td>
                    <td style="padding: 1.2rem 0.5rem; color:${color}; font-weight:700;">${sign}${formatNumber(btcPnl)}<br><span style="font-size:0.8rem; opacity:0.9;">${sign}${btcPnlRate.toFixed(2)}%</span></td>
                </tr>
            `;
        }
        tbody.innerHTML = html;

        // --- Chart.js 도넛 그래프 업데이트 ---
        updateChart(krwBalance, btcCurrentValue);
    }

    function updateChart(krwValue, btcValue) {
        const ctx = document.getElementById('portfolioChart').getContext('2d');
        
        // 데이터가 없으면 렌더링 방지
        if (krwValue === 0 && btcValue === 0) return;

        const labels = [];
        const datasetData = [];
        const bgColors = [];

        // 보유 자산이 0보다 큰 경우에만 차트에 포함
        if (krwValue > 0) {
            labels.push('현금 (KRW)');
            datasetData.push(krwValue);
            bgColors.push('#4F46E5'); // 인디고
        }
        
        if (btcValue > 0) {
            labels.push('비트코인 (BTC)');
            datasetData.push(btcValue);
            bgColors.push('#F59E0B'); // 주황
        }

        const data = {
            labels: labels,
            datasets: [{
                label: '자산 비중',
                data: datasetData,
                backgroundColor: bgColors,
                borderColor: '#0F172A',
                borderWidth: 4,
                hoverOffset: 10
            }]
        };

        if (chartInstance) {
            chartInstance.data = data;
            chartInstance.update('none'); // 애니메이션 없이 즉시 업데이트 (계속 꿀렁거림 방지)
        } else {
            chartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#94A3B8',
                                padding: 20,
                                font: {
                                    family: "'Inter', sans-serif",
                                    size: 14,
                                    weight: '500'
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            titleFont: { size: 14 },
                            bodyFont: { size: 14, weight: 'bold' },
                            padding: 12,
                            cornerRadius: 8,
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1) + '%';
                                    return ` ${context.label}: ${formatNumber(value)} KRW (${percentage})`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    // 초기 실행
    fetchUserAssets();
});
