/**
 * 투자 내역 (포트폴리오) 연동 스크립트 (다중 코인 지원)
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

    // 코인 메타데이터 (이름, 색상)
    const coinMeta = {
        'BTC': { name: '비트코인', color: '#F59E0B', initial: 'B' },
        'ETH': { name: '이더리움', color: '#6366F1', initial: 'E' },
        'XRP': { name: '리플', color: '#10B981', initial: 'X' },
        'SOL': { name: '솔라나', color: '#14F195', initial: 'S' },
        'DOGE': { name: '도지코인', color: '#FBBF24', initial: 'D' }
    };

    let userAssets = [];
    let krwAsset = null;
    let coinAssets = [];
    let currentPrices = {}; // { 'BTC': 119000000, 'ETH': 4000000 }
    
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
                coinAssets = userAssets.filter(a => a.currency !== 'KRW' && parseFloat(a.balance) > 0);
                
                // 자산 조회 후 웹소켓 연결
                connectUpbitWS();
            } else {
                console.error("자산 조회 실패:", result.message);
            }
        } catch (e) {
            console.error("자산 API 통신 오류", e);
        }
    }

    // 2. 업비트 웹소켓 연결 (보유한 코인들의 현재가 수신)
    function connectUpbitWS() {
        if (coinAssets.length === 0) {
            updatePortfolioUI(); // 코인이 없으면 바로 UI 업데이트 (KRW만 표시)
            return;
        }

        const ws = new WebSocket('wss://api.upbit.com/websocket/v1');
        ws.binaryType = 'arraybuffer';
        
        ws.onopen = () => {
            const codes = coinAssets.map(c => `KRW-${c.currency}`);
            const msg = [
                { ticket: "portfolio_ticker" },
                { type: "ticker", codes: codes }
            ];
            ws.send(JSON.stringify(msg));
        };
        
        ws.onmessage = (event) => {
            const enc = new TextDecoder("utf-8");
            const arr = new Uint8Array(event.data);
            const data = JSON.parse(enc.decode(arr));
            
            if (data.type === 'ticker') {
                const currency = data.code.split('-')[1];
                currentPrices[currency] = data.trade_price;
                // 현재가를 수신할 때마다 UI 업데이트
                updatePortfolioUI();
            }
        };
    }

    // 3. 포트폴리오 UI 및 차트 업데이트
    function updatePortfolioUI() {
        const krwBalance = krwAsset ? parseFloat(krwAsset.balance) : 0;
        
        let totalCoinBuy = 0;
        let totalCoinCurrentValue = 0;
        
        const tbody = document.getElementById('holdings-tbody');
        let html = '';

        // --- 1. 원화(KRW) 테이블 행 ---
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

        // --- 2. 코인별 계산 및 테이블 행 ---
        const chartDataMap = {}; // 차트 렌더링용 { '비트코인': { value: 1000, color: '#...' } }

        coinAssets.forEach(asset => {
            const currency = asset.currency;
            const balance = parseFloat(asset.balance);
            const avgPrice = parseFloat(asset.avgBuyPrice);
            
            // 현재가가 아직 안들어왔으면 평단가로 임시 계산
            const currentPrice = currentPrices[currency] || avgPrice; 
            
            const totalBuy = balance * avgPrice;
            const currentValue = balance * currentPrice;
            const pnl = currentValue - totalBuy;
            const pnlRate = totalBuy > 0 ? (pnl / totalBuy) * 100 : 0;
            
            totalCoinBuy += totalBuy;
            totalCoinCurrentValue += currentValue;
            
            // 메타데이터
            const meta = coinMeta[currency] || { name: currency, color: '#94A3B8', initial: currency.charAt(0) };
            
            chartDataMap[meta.name] = {
                value: currentValue,
                color: meta.color
            };

            let sign = '';
            let color = '#94A3B8';
            if (pnl > 0) { sign = '+'; color = '#EF4444'; }
            else if (pnl < 0) { color = '#3B82F6'; }

            html += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer; transition: background 0.2s;" 
                    onclick="window.location.href='dashboard.html?market=KRW-${currency}'"
                    onmouseover="this.style.backgroundColor='rgba(255,255,255,0.05)'" 
                    onmouseout="this.style.backgroundColor='transparent'">
                    <td style="padding: 1.2rem 0.5rem; text-align: left; display:flex; align-items:center; gap:0.8rem;">
                        <div style="width: 32px; height: 32px; background: ${meta.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; color: #fff;">${meta.initial}</div>
                        <div>
                            <div style="font-weight:700; color:var(--text-main);">${meta.name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">${currency}/KRW</div>
                        </div>
                    </td>
                    <td style="padding: 1.2rem 0.5rem; color:var(--text-main); font-weight:500;">${balance.toFixed(8)}</td>
                    <td style="padding: 1.2rem 0.5rem; color:var(--text-muted);">${formatNumber(avgPrice, 2)}</td>
                    <td style="padding: 1.2rem 0.5rem; color:var(--text-main); font-weight:600;">${formatNumber(currentValue)}</td>
                    <td style="padding: 1.2rem 0.5rem; color:${color}; font-weight:700;">${sign}${formatNumber(pnl)}<br><span style="font-size:0.8rem; opacity:0.9;">${sign}${pnlRate.toFixed(2)}%</span></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;

        // --- 상단 4개 카드 업데이트 ---
        const totalAssets = krwBalance + totalCoinCurrentValue;
        const totalPnl = totalCoinCurrentValue - totalCoinBuy;
        const totalPnlRate = totalCoinBuy > 0 ? (totalPnl / totalCoinBuy) * 100 : 0;

        document.getElementById('total-assets-val').innerText = formatNumber(totalAssets);
        document.getElementById('krw-balance-val').innerText = formatNumber(krwBalance);
        document.getElementById('total-buy-val').innerText = formatNumber(totalCoinBuy);
        
        const pnlValEl = document.getElementById('total-pnl-val');
        const pnlRateEl = document.getElementById('total-pnl-rate');
        const pnlCard = document.getElementById('pnl-card');

        let totalSign = '';
        let totalColor = '#94A3B8';
        if (totalPnl > 0) { totalSign = '+'; totalColor = '#EF4444'; }
        else if (totalPnl < 0) { totalColor = '#3B82F6'; }

        pnlValEl.innerText = totalSign + formatNumber(totalPnl);
        pnlRateEl.innerText = `(${totalSign}${totalPnlRate.toFixed(2)}%)`;
        
        pnlValEl.style.color = totalColor;
        pnlRateEl.style.color = totalColor;
        pnlCard.style.borderRight = `4px solid ${totalColor}`;

        // --- Chart.js 도넛 그래프 업데이트 ---
        updateChart(krwBalance, chartDataMap);
    }

    function updateChart(krwValue, coinDataMap) {
        const ctx = document.getElementById('portfolioChart').getContext('2d');
        
        const labels = [];
        const datasetData = [];
        const bgColors = [];

        // 1. 현금
        if (krwValue > 0) {
            labels.push('현금 (KRW)');
            datasetData.push(krwValue);
            bgColors.push('#4F46E5'); // 인디고
        }
        
        // 2. 보유 코인들
        for (const [coinName, data] of Object.entries(coinDataMap)) {
            if (data.value > 0) {
                labels.push(`${coinName}`);
                datasetData.push(data.value);
                bgColors.push(data.color);
            }
        }

        // 아무 자산도 없으면 렌더링 방지
        if (datasetData.length === 0) return;

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
            chartInstance.update('none'); // 애니메이션 없이 즉시 업데이트
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

    // 초기 실행 및 3초 주기 실시간 자동 갱신 (AI 매매 결과 실시간 반영)
    fetchUserAssets();
    setInterval(fetchUserAssets, 3000);
});
