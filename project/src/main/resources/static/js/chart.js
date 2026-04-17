document.addEventListener('DOMContentLoaded', () => {
    /* ==========================================================================
       대시보드 및 업비트 차트 로직 (1단계)
       ========================================================================== */
    let chart = null;
    let candlestickSeries = null;
    let priceInterval = null;
    let currentMarket = 'KRW-BTC';
    let lastCandle = null; // 마지막 분봉 데이터를 추적하여 실시간 1분봉 OHLC를 직접 계산

    initDashboard();

    async function initDashboard() {
        
        const chartContainer = document.getElementById('chart-container');
        
        if (!chartContainer) return; // 차트 컨테이너가 없으면 실행 안 함
        if (chart) return; // 차트가 이미 있으면 초기화 방지

        // TradingView Lightweight Charts 생성
        chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: chartContainer.clientHeight,
            layout: {
                background: { type: 'solid', color: '#0F172A' },
                textColor: '#94A3B8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
            rightPriceScale: { 
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            localization: {
                // 우측 Y축 가격에 한국식 단위(콤마 찍기) 적용
                priceFormatter: price => Math.floor(price).toLocaleString('ko-KR'),
                // 상단 툴팁(호버 시) 한국 시간 및 요일 표시 포맷팅
                timeFormatter: timestamp => {
                    if (typeof timestamp === 'number') {
                        const date = new Date(timestamp * 1000);
                        const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
                        const days = ['일', '월', '화', '수', '목', '금', '토'];
                        const dayName = days[kstDate.getUTCDay()];
                        const yyyy = kstDate.getUTCFullYear();
                        const mm = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
                        const dd = String(kstDate.getUTCDate()).padStart(2, '0');
                        const hh = String(kstDate.getUTCHours()).padStart(2, '0');
                        const min = String(kstDate.getUTCMinutes()).padStart(2, '0');
                        
                        return `${dayName} ${yyyy}-${mm}-${dd} ${hh}:${min}`;
                    }
                    return timestamp;
                }
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
                secondsVisible: false,
                // 하단 X축 실시간 한국 시간 표시
                tickMarkFormatter: (time, tickMarkType, locale) => {
                    if (typeof time === 'number') {
                        const date = new Date(time * 1000);
                        const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
                        const hh = String(kstDate.getUTCHours()).padStart(2, '0');
                        const min = String(kstDate.getUTCMinutes()).padStart(2, '0');
                        return `${hh}:${min}`;
                    }
                    return time;
                }
            },
        });

        candlestickSeries = chart.addCandlestickSeries({
            upColor: '#EF4444',     // 한국식 상승(빨강)
            downColor: '#4F46E5',   // 한국식 하락(파랑-인디고)
            borderVisible: false,
            wickUpColor: '#EF4444',
            wickDownColor: '#4F46E5',
        });

        // 반응형 리사이즈
        window.addEventListener('resize', () => {
            if (chartContainer) {
                chart.resize(chartContainer.clientWidth, chartContainer.clientHeight);
            }
        });

        // 기초 캔들 데이터 로딩 후 주기적 시세 업데이트 시작
        document.getElementById('live-price').innerText = '연결 시도중...';
        await fetchHistoricalData();
        if (priceInterval) clearInterval(priceInterval);
        priceInterval = setInterval(fetchLivePrice, 1000); // 1초마다 시세 갱신
    }

    async function fetchHistoricalData() {
        try {
            document.getElementById('live-price').innerText = '데이터 다운중...';
            // 선택된 코인의 1분봉 200개 반환
            const response = await fetch(`https://api.upbit.com/v1/candles/minutes/1?market=${currentMarket}&count=200`);
            const data = await response.json();
            
            // TradingView Lightweight Charts 규칙: 완벽하게 중복 없는 00초 시간대 사용
            const formattedData = data.reverse().map(item => {
                const dt = new Date(item.candle_date_time_utc + 'Z');
                return {
                    time: Math.floor(dt.getTime() / 1000), 
                    open: item.opening_price,
                    high: item.high_price,
                    low: item.low_price,
                    close: item.trade_price
                };
            });

            // 데이터 세팅
            candlestickSeries.setData(formattedData);
            
            // 마지막 캔들을 저장하여 이후 실시간 갱신(fetchLivePrice)의 기준값으로 사용
            if (formattedData.length > 0) {
                // 객체 복사로 참조 분리
                lastCandle = { ...formattedData[formattedData.length - 1] };
            }
        } catch (error) {
            console.error('차트 데이터 로드 실패:', error);
            document.getElementById('live-price').innerText = '데이터 오류';
        }
    }

    async function fetchLivePrice() {
        try {
            // 선택된 코인의 현재가 정보
            const response = await fetch(`https://api.upbit.com/v1/ticker?markets=${currentMarket}`);
            const data = await response.json();
            const ticker = data[0];

            // 1. 헤더 UI 가격 업데이트
            const priceEl = document.getElementById('live-price');
            const changeEl = document.getElementById('price-change');
            
            priceEl.innerText = ticker.trade_price.toLocaleString() + ' KRW';
            const changeRate = (ticker.signed_change_rate * 100).toFixed(2);
            
            if (changeRate > 0) {
                changeEl.innerText = '▲ ' + changeRate + '%';
                changeEl.className = 'price-change positive';
            } else if (changeRate < 0) {
                changeEl.innerText = '▼ ' + Math.abs(changeRate) + '%';
                changeEl.className = 'price-change negative';
            } else {
                changeEl.innerText = '0.00%';
                changeEl.className = 'price-change';
            }

            // 2. 차트 마지막 캔들 갱신
            const tsSeconds = Math.floor(ticker.timestamp / 1000);
            const currentMinuteTime = tsSeconds - (tsSeconds % 60);

            if (lastCandle && lastCandle.time === currentMinuteTime) {
                // 아직 1분이 지나지 않았다면, 고가/저가/종가만 실시간 누적 갱신 (시가는 고정)
                lastCandle.high = Math.max(lastCandle.high, ticker.trade_price);
                lastCandle.low = Math.min(lastCandle.low, ticker.trade_price);
                lastCandle.close = ticker.trade_price;
            } else {
                // 새로운 1분이 시작되었다면, 지금까지의 가격을 버리고 새로운 캔들(OHLC) 시작
                lastCandle = {
                    time: currentMinuteTime,
                    open: ticker.trade_price, // 새로운 봉의 시작 가격
                    high: ticker.trade_price,
                    low: ticker.trade_price,
                    close: ticker.trade_price
                };
            }

            // TradingView 차트에 업데이트
            candlestickSeries.update(lastCandle);
        } catch (error) {
            console.error('현재가 갱신 실패:', error);
        }
    }

    // 외부(coinList.js)에서 코인을 클릭했을 때 호출할 수 있는 전역 함수
    window.changeMarket = async function(marketCode, koreanName) {
        if (currentMarket === marketCode) return;
        
        currentMarket = marketCode;
        
        // 1. 차트 헤더 정보 업데이트
        const nameEl = document.getElementById('display-coin-name');
        const symEl = document.getElementById('display-coin-symbol');
        if (nameEl) nameEl.innerText = koreanName;
        if (symEl) symEl.innerText = marketCode;
        
        // 2. 차트 기존 데이터 비우기 (로딩 체감)
        candlestickSeries.setData([]);
        document.getElementById('live-price').innerText = '데이터 불러오는 중...';

        // 3. 인터벌 초기화 및 기존 흐름 재가동
        if (priceInterval) clearInterval(priceInterval);
        await fetchHistoricalData();
        priceInterval = setInterval(fetchLivePrice, 1000);
    };

    // 로그아웃 버튼 이벤트 (로그인 페이지로 돌아가기)
    document.getElementById('logout-btn').addEventListener('click', () => {
        if(priceInterval) clearInterval(priceInterval);
        // 로그인 페이지로 이동
        window.location.href = '/index.html';
    });
});
