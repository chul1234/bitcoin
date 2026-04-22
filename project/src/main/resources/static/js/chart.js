document.addEventListener('DOMContentLoaded', () => {
    /* ==========================================================================
       대시보드 및 업비트 차트 로직 (1단계)
       ========================================================================== */
    let chart = null;
    let candlestickSeries = null;
    let volumeSeries = null;
    let ma15Series = null;
    let ma50Series = null;
    let priceInterval = null;
    let currentMarket = 'KRW-BTC';
    let currentTimeframe = 'minutes/1'; // 캔들 기준 시간 (기본 1분)
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
                autoScale: true,
                scaleMargins: {
                    top: 0.1,     // 상단 10% 여백
                    bottom: 0.25, // 하단 25% 여백 (거래량 그래프와 겹치지 않도록 강제 분리)
                }
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
                        const mm = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
                        const dd = String(kstDate.getUTCDate()).padStart(2, '0');
                        const hh = String(kstDate.getUTCHours()).padStart(2, '0');
                        const min = String(kstDate.getUTCMinutes()).padStart(2, '0');
                        
                        // 타임프레임이 일봉/주봉 이상이면 날짜 위주, 분봉이면 시간 위주 표시
                        if(currentTimeframe === 'days' || currentTimeframe === 'weeks') {
                            return `${mm}/${dd}`;
                        } else {
                            return `${hh}:${min}`;
                        }
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

        // 1. 하단 거래량(Volume) 시리즈 추가
        volumeSeries = chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: '', // 별도 스케일 없이 오버레이로 처리
        });
        
        // 거래량 스케일 마진 분리 (캔들과 겹치지 않게 하단 20%만 차지)
        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.8, // 상단 80% 여백
                bottom: 0,
            },
        });

        // 2. 이동평균선(MA) 시리즈 추가 (15일선: 빨강, 50일선: 초록)
        ma15Series = chart.addLineSeries({
            color: '#EF4444',
            lineWidth: 1.5,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        ma50Series = chart.addLineSeries({
            color: '#10B981',
            lineWidth: 1.5,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        // 반응형 리사이즈
        window.addEventListener('resize', () => {
            if (chartContainer) {
                chart.resize(chartContainer.clientWidth, chartContainer.clientHeight);
            }
        });

        // ----------------------------------------------------
        // 차트 레전드 업데이트 (크로스헤어 호버)
        // ----------------------------------------------------
        chart.subscribeCrosshairMove((param) => {
            const legendO = document.getElementById('leg-o');
            const legendH = document.getElementById('leg-h');
            const legendL = document.getElementById('leg-l');
            const legendC = document.getElementById('leg-c');
            const legendMa15 = document.getElementById('leg-ma15');
            const legendMa50 = document.getElementById('leg-ma50');
            const legendVol = document.getElementById('leg-vol');

            if (param.time) {
                const data = param.seriesData.get(candlestickSeries);
                const ma15Data = param.seriesData.get(ma15Series);
                const ma50Data = param.seriesData.get(ma50Series);
                const volData = param.seriesData.get(volumeSeries);

                if (data) {
                    legendO.innerText = data.open.toLocaleString();
                    legendH.innerText = data.high.toLocaleString();
                    legendL.innerText = data.low.toLocaleString();
                    legendC.innerText = data.close.toLocaleString();
                }
                if (ma15Data && ma15Data.value) legendMa15.innerText = ma15Data.value.toLocaleString(undefined, {maximumFractionDigits: 0});
                if (ma50Data && ma50Data.value) legendMa50.innerText = ma50Data.value.toLocaleString(undefined, {maximumFractionDigits: 0});
                if (volData && volData.value !== undefined) legendVol.innerText = volData.value.toLocaleString(undefined, {maximumFractionDigits: 2});
            } else if (lastCandle) {
                // 마우스가 벗어났을 경우, 가장 마지막 캔들 기준으로 데이터 복구
                legendO.innerText = lastCandle.open.toLocaleString();
                legendH.innerText = lastCandle.high.toLocaleString();
                legendL.innerText = lastCandle.low.toLocaleString();
                legendC.innerText = lastCandle.close.toLocaleString();
                legendVol.innerText = lastCandle.volume.toLocaleString(undefined, {maximumFractionDigits: 2});
            }
        });

        // 타임프레임(시간/일/주) 버튼 전환 이벤트 바인딩
        const timeframeBtns = document.querySelectorAll('.timeframe-btn');
        const basicTimeLabel = document.getElementById('basic-time-label');

        timeframeBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tf = e.currentTarget.getAttribute('data-timeframe');
                const tfText = e.currentTarget.innerText;
                const legendTf = document.getElementById('legend-tf');
                
                if(tf === '1s') {
                    alert('업비트 API에서 1초봉은 정식 지원하지 않습니다.');
                    return;
                }
                if(tf === '1Y') {
                    alert('업비트 API에서 년봉은 지원하지 않아 월봉으로 대체하여 표시합니다.');
                }
                
                // UI 하이라이트 변경
                timeframeBtns.forEach(b => {
                    b.style.color = '';
                    b.style.borderBottom = '';
                    b.classList.remove('active');
                });
                e.currentTarget.style.color = 'var(--accent-color)';
                
                // 트레이딩뷰 툴바 내부에 있는 요소이거나, 부모 중에 tv-timeframe-group이 있는 경우에만 밑줄 표시 (드롭다운 아이템 제외)
                if(e.currentTarget.parentElement.id === 'tv-timeframe-group') {
                    e.currentTarget.style.borderBottom = '2px solid var(--accent-color)';
                    e.currentTarget.style.paddingBottom = '0.2rem';
                }
                e.currentTarget.classList.add('active');

                // 기본 차트 및 레전드의 라벨 텍스트 변경
                if(basicTimeLabel) {
                    basicTimeLabel.innerHTML = `${tfText} <span style="font-size:0.6rem;">▼</span>`;
                }
                if(legendTf) {
                    legendTf.innerText = tfText;
                }

                // API 엔드포인트 변경
                if(tf === '1m') currentTimeframe = 'minutes/1';
                else if(tf === '3m') currentTimeframe = 'minutes/3';
                else if(tf === '5m') currentTimeframe = 'minutes/5';
                else if(tf === '10m') currentTimeframe = 'minutes/10';
                else if(tf === '15m') currentTimeframe = 'minutes/15';
                else if(tf === '30m') currentTimeframe = 'minutes/30';
                else if(tf === '60m') currentTimeframe = 'minutes/60';
                else if(tf === '240m') currentTimeframe = 'minutes/240';
                else if(tf === '1d') currentTimeframe = 'days';
                else if(tf === '1w') currentTimeframe = 'weeks';
                else if(tf === '1M' || tf === '1Y') currentTimeframe = 'months';
                
                // 차트 갱신
                await fetchHistoricalData();
            });
        });

        // 차트 툴바(기본차트/트레이딩뷰) 전환 로직
        const chartModeRadios = document.querySelectorAll('input[name="chartMode"]');
        const toolbarBasic = document.getElementById('toolbar-basic');
        const toolbarTv = document.getElementById('toolbar-tv');
        const legendMa = document.getElementById('legend-ma');

        if (chartModeRadios.length > 0) {
            chartModeRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if (e.target.value === 'tradingview') {
                        // 1. 상단 툴바 UI 교체
                        if (toolbarBasic) toolbarBasic.style.display = 'none';
                        if (toolbarTv) toolbarTv.style.display = 'flex';
                        
                        // 2. 차트 내부 내용 변경: 트레이딩뷰 모드에서는 이동평균선을 깨끗하게 숨김
                        if (ma15Series) ma15Series.applyOptions({ visible: false });
                        if (ma50Series) ma50Series.applyOptions({ visible: false });
                        if (legendMa) legendMa.style.display = 'none';
                        
                        // 트레이딩뷰 모드: 캔들을 하단까지 허용하고, 거래량을 캔들 영역 밑바닥에 오버레이
                        chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.05 } });
                        if (volumeSeries) volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.9, bottom: 0 } });
                        
                    } else {
                        // 1. 상단 툴바 UI 교체
                        if (toolbarBasic) toolbarBasic.style.display = 'flex';
                        if (toolbarTv) toolbarTv.style.display = 'none';
                        
                        // 2. 차트 내부 내용 변경: 기본 차트 모드에서는 이동평균선을 다시 노출
                        if (ma15Series) ma15Series.applyOptions({ visible: true });
                        if (ma50Series) ma50Series.applyOptions({ visible: true });
                        if (legendMa) legendMa.style.display = 'flex';
                        
                        // 기본차트 모드: 캔들이 하단 25%를 절대 침범하지 못하게 막고, 거래량은 하단 20%만 차지하게 하여 완벽히 분리
                        chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.25 } });
                        if (volumeSeries) volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
                    }
                });
            });
        }

        // 기초 캔들 데이터 로딩 후 주기적 시세 업데이트 시작
        document.getElementById('live-price').innerText = '연결 시도중...';
        await fetchHistoricalData();
        if (priceInterval) clearInterval(priceInterval);
        priceInterval = setInterval(fetchLivePrice, 1000); // 1초마다 시세 갱신
    }

    async function fetchHistoricalData() {
        try {
            document.getElementById('live-price').innerText = '데이터 다운중...';
            // 선택된 타임프레임(currentTimeframe)으로 200개 반환
            const response = await fetch(`https://api.upbit.com/v1/candles/${currentTimeframe}?market=${currentMarket}&count=200`);
            const data = await response.json();
            
            // TradingView Lightweight Charts 규칙: 완벽하게 중복 없는 00초 시간대 사용
            const formattedData = data.reverse().map(item => {
                const dt = new Date(item.candle_date_time_utc + 'Z');
                return {
                    time: Math.floor(dt.getTime() / 1000), 
                    open: item.opening_price,
                    high: item.high_price,
                    low: item.low_price,
                    close: item.trade_price,
                    volume: item.candle_acc_trade_volume
                };
            });

            // 1. 캔들 데이터 세팅
            candlestickSeries.setData(formattedData);

            // 2. 거래량 데이터 세팅 (양봉=빨강, 음봉=파랑)
            const volumeData = formattedData.map(item => ({
                time: item.time,
                value: item.volume,
                color: item.close >= item.open ? 'rgba(239, 68, 68, 0.5)' : 'rgba(79, 70, 229, 0.5)'
            }));
            volumeSeries.setData(volumeData);

            // 3. 이동평균선(SMA) 계산 및 세팅
            function calculateSMA(dataList, period) {
                const result = [];
                for (let i = period - 1; i < dataList.length; i++) {
                    let sum = 0;
                    for (let j = 0; j < period; j++) {
                        sum += dataList[i - j].close;
                    }
                    result.push({ time: dataList[i].time, value: sum / period });
                }
                return result;
            }

            ma15Series.setData(calculateSMA(formattedData, 15));
            ma50Series.setData(calculateSMA(formattedData, 50));
            
            // 마지막 캔들을 저장하여 이후 실시간 갱신(fetchLivePrice)의 기준값으로 사용
            if (formattedData.length > 0) {
                // 객체 복사로 참조 분리
                lastCandle = { ...formattedData[formattedData.length - 1] };
                updateLegendWithLastCandle();
            }
        } catch (error) {
            console.error('차트 데이터 로드 실패:', error);
            document.getElementById('live-price').innerText = '데이터 오류';
        }
    }

    // 마우스가 차트 밖일 때나 새 데이터 갱신 시 레전드 업데이트
    function updateLegendWithLastCandle() {
        if(!lastCandle) return;
        const legendO = document.getElementById('leg-o');
        const legendH = document.getElementById('leg-h');
        const legendL = document.getElementById('leg-l');
        const legendC = document.getElementById('leg-c');
        const legendVol = document.getElementById('leg-vol');
        
        if(legendO) legendO.innerText = lastCandle.open.toLocaleString();
        if(legendH) legendH.innerText = lastCandle.high.toLocaleString();
        if(legendL) legendL.innerText = lastCandle.low.toLocaleString();
        if(legendC) legendC.innerText = lastCandle.close.toLocaleString();
        if(legendVol) legendVol.innerText = lastCandle.volume.toLocaleString(undefined, {maximumFractionDigits: 2});
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
                // 아직 1분이 지나지 않았다면, 고가/저가/종가/거래량 실시간 누적 갱신
                lastCandle.high = Math.max(lastCandle.high, ticker.trade_price);
                lastCandle.low = Math.min(lastCandle.low, ticker.trade_price);
                lastCandle.close = ticker.trade_price;
                // 버그 수정: 24시간 누적량이 아닌, 1초마다 들어오는 개별 거래량(trade_volume)을 1분간 누적
                lastCandle.volume += (ticker.trade_volume || 0); 
            } else {
                // 새로운 1분이 시작되었다면, 새로운 캔들(OHLCV) 시작
                lastCandle = {
                    time: currentMinuteTime,
                    open: ticker.trade_price,
                    high: ticker.trade_price,
                    low: ticker.trade_price,
                    close: ticker.trade_price,
                    volume: ticker.trade_volume || 0
                };
            }

            // TradingView 차트 캔들 및 거래량 업데이트
            candlestickSeries.update(lastCandle);
            if(volumeSeries) {
                volumeSeries.update({
                    time: lastCandle.time,
                    value: lastCandle.volume,
                    color: lastCandle.close >= lastCandle.open ? 'rgba(239, 68, 68, 0.5)' : 'rgba(79, 70, 229, 0.5)'
                });
            }
            
            // 새 데이터 갱신 시 레전드 업데이트
            updateLegendWithLastCandle();
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
