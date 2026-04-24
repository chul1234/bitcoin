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
    let isChartFrozen = false; // 차트 고정 상태 토글 플래그

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
        const tvDrawingTools = document.getElementById('tv-drawing-tools');

        if (chartModeRadios.length > 0) {
            chartModeRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if (e.target.value === 'tradingview') {
                        // 1. 상단 툴바 UI 교체
                        if (toolbarBasic) toolbarBasic.style.display = 'none';
                        if (toolbarTv) toolbarTv.style.display = 'flex';
                        if (tvDrawingTools) tvDrawingTools.style.display = 'flex';
                        
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
                        if (tvDrawingTools) tvDrawingTools.style.display = 'none';
                        
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

            // 초기 상태(트레이딩뷰)를 즉시 반영하기 위해 체크된 라디오 버튼의 이벤트 강제 발생
            const initialCheckedRadio = Array.from(chartModeRadios).find(r => r.checked);
            if (initialCheckedRadio) {
                initialCheckedRadio.dispatchEvent(new Event('change'));
            }
        }


        // ==========================================================================
        // 기본 차트 전용 툴바 버튼 연동
        // ==========================================================================
        const basicIndicatorBtn = document.getElementById('basic-indicator-btn');
        const basicDrawBtn = document.getElementById('basic-draw-btn');
        const basicResetBtn = document.getElementById('basic-reset-btn');
        
        let isBasicMaVisible = true;
        
        if (basicIndicatorBtn) {
            basicIndicatorBtn.addEventListener('click', () => {
                isBasicMaVisible = !isBasicMaVisible;
                if (ma15Series) ma15Series.applyOptions({ visible: isBasicMaVisible });
                if (ma50Series) ma50Series.applyOptions({ visible: isBasicMaVisible });
                const legendMa = document.getElementById('legend-ma');
                if (legendMa) legendMa.style.display = isBasicMaVisible ? 'flex' : 'none';
                
                // 버튼 스타일 변경
                basicIndicatorBtn.style.color = isBasicMaVisible ? 'var(--text-main)' : 'var(--text-muted)';
            });
        }
        
        if (basicDrawBtn) {
            basicDrawBtn.addEventListener('click', () => {
                currentMode = currentMode === 'line' ? 'none' : 'line';
                updateDrawingUI();
                basicDrawBtn.style.color = currentMode === 'line' ? 'var(--accent-color)' : 'var(--text-main)';
            });
        }
        
        if (basicResetBtn) {
            basicResetBtn.addEventListener('click', () => {
                // 차트 스케일 초기화 및 그려진 선 모두 지우기
                chart.timeScale().fitContent();
                drawings = [];
                renderDrawings();
            });
        }

        // ==========================================================================
        // 차트 고정(Freeze) 기능
        // ==========================================================================
        const basicFreezeBtn = document.getElementById('basic-freeze-btn');
        const tvFreezeBtn = document.getElementById('tv-freeze-btn');

        function toggleFreeze() {
            isChartFrozen = !isChartFrozen;
            const iconText = isChartFrozen ? '▶️ 재생' : '⏸️ 고정';
            if (basicFreezeBtn) {
                basicFreezeBtn.innerText = iconText;
                basicFreezeBtn.style.color = isChartFrozen ? 'var(--accent-color)' : 'var(--text-main)';
            }
            if (tvFreezeBtn) {
                tvFreezeBtn.innerText = iconText;
                tvFreezeBtn.style.color = isChartFrozen ? 'var(--accent-color)' : 'var(--text-main)';
            }
        }

        if (basicFreezeBtn) basicFreezeBtn.addEventListener('click', toggleFreeze);
        if (tvFreezeBtn) tvFreezeBtn.addEventListener('click', toggleFreeze);

        // ==========================================================================
        // 드로잉 기능 엔진 (캔버스 오버레이)
        // ==========================================================================
        const canvas = document.getElementById('drawing-canvas');
        const ctx = canvas ? canvas.getContext('2d') : null;
        
        // 저장된 선 객체 배열: { type, p1, p2, color }
        let drawings = []; 
        let currentMode = 'none'; 
        let isDrawing = false;
        let startPoint = null;
        let currentPoint = null;
        let currentColor = '#3B82F6'; // 기본 파란색

        const drawLineBtn = document.getElementById('draw-line-btn');
        const drawHorzBtn = document.getElementById('draw-horz-btn');
        const drawRectBtn = document.getElementById('draw-rect-btn');
        const clearDrawingsBtn = document.getElementById('clear-drawings-btn');
        const colorBtns = document.querySelectorAll('.color-btn');

        if (colorBtns.length > 0) {
            colorBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // 모든 버튼 테두리 초기화
                    colorBtns.forEach(b => b.style.border = '2px solid transparent');
                    // 선택된 버튼 하이라이트
                    e.target.style.border = '2px solid white';
                    currentColor = e.target.getAttribute('data-color');
                });
            });
        }

        if (drawLineBtn) {
            drawLineBtn.addEventListener('click', () => {
                currentMode = currentMode === 'line' ? 'none' : 'line';
                updateDrawingUI();
            });
        }
        if (drawHorzBtn) {
            drawHorzBtn.addEventListener('click', () => {
                currentMode = currentMode === 'horz' ? 'none' : 'horz';
                updateDrawingUI();
            });
        }
        if (drawRectBtn) {
            drawRectBtn.addEventListener('click', () => {
                currentMode = currentMode === 'rect' ? 'none' : 'rect';
                updateDrawingUI();
            });
        }
        if (clearDrawingsBtn) {
            clearDrawingsBtn.addEventListener('click', () => {
                drawings = [];
                renderDrawings();
            });
        }

        function updateDrawingUI() {
            if(drawLineBtn) drawLineBtn.style.color = currentMode === 'line' ? 'var(--accent-color)' : 'var(--text-muted)';
            if(drawHorzBtn) drawHorzBtn.style.color = currentMode === 'horz' ? 'var(--accent-color)' : 'var(--text-muted)';
            if(drawRectBtn) drawRectBtn.style.color = currentMode === 'rect' ? 'var(--accent-color)' : 'var(--text-muted)';
            if(basicDrawBtn) basicDrawBtn.style.color = currentMode === 'line' ? 'var(--accent-color)' : 'var(--text-main)';
            
            // 그리기 모드일 때 차트 패닝 막기 및 캔버스로 이벤트 넘기기
            if (currentMode !== 'none') {
                chart.applyOptions({ handleScroll: false, handleScale: false });
                if(canvas) canvas.style.pointerEvents = 'auto';
            } else {
                chart.applyOptions({ handleScroll: true, handleScale: true });
                if(canvas) canvas.style.pointerEvents = 'none';
            }
        }

        function resizeCanvas() {
            if (!canvas || !ctx) return;
            const container = document.getElementById('chart-container');
            
            const rect = container.getBoundingClientRect();
            if(rect.width === 0 || rect.height === 0) return;
            
            // 고해상도(Retina) 디스플레이에서 선이 흐리거나 얇아지는 현상 방지
            const dpr = window.devicePixelRatio || 1;
            
            // 실제 캔버스의 해상도를 디스플레이 픽셀에 맞춤
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            
            // 화면에 표시되는 CSS 크기는 원래 컨테이너 크기로 고정
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            
            // 컨텍스트 스케일링
            ctx.scale(dpr, dpr);
            
            renderDrawings();
        }

        // 차트 스크롤/줌 시 다시 그리기 연동
        chart.timeScale().subscribeVisibleTimeRangeChange(() => renderDrawings());
        chart.timeScale().subscribeVisibleLogicalRangeChange(() => renderDrawings());
        
        const ro = new ResizeObserver(() => resizeCanvas());
        ro.observe(document.getElementById('chart-container'));

        function getChartPoint(event) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const logical = chart.timeScale().coordinateToLogical(x);
            const price = candlestickSeries.coordinateToPrice(y);
            return { logical, price, x, y };
        }

        if (canvas) {
            canvas.addEventListener('mousedown', (e) => {
                if (currentMode === 'none') return;
                
                const pt = getChartPoint(e);
                if (pt.logical === null || pt.price === null) return;

                isDrawing = true;
                startPoint = { logical: pt.logical, price: pt.price };
                currentPoint = { logical: pt.logical, price: pt.price };
            });

            canvas.addEventListener('mousemove', (e) => {
                if (!isDrawing || currentMode === 'none') return;
                
                const pt = getChartPoint(e);
                if (pt.logical === null || pt.price === null) return;
                
                currentPoint = { logical: pt.logical, price: pt.price };
                renderDrawings();
            });

            canvas.addEventListener('mouseup', () => {
                if (!isDrawing) return;
                isDrawing = false;
                
                if (startPoint && currentPoint) {
                    drawings.push({
                        type: currentMode,
                        p1: { ...startPoint },
                        p2: { ...currentPoint },
                        color: currentColor // 선택된 색상 저장
                    });
                }
                
                currentMode = 'none'; // 1회 그리고 모드 종료
                updateDrawingUI();
                renderDrawings();
            });
            
            canvas.addEventListener('mouseleave', () => {
                if(isDrawing) {
                    isDrawing = false;
                    renderDrawings();
                }
            });
        }

        function renderDrawings() {
            if (!ctx || !canvas) return;
            // scale된 상태이므로 width/height에 devicePixelRatio를 나누어 지워야 함
            const dpr = window.devicePixelRatio || 1;
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            
            drawings.forEach(d => drawLineObject(d));

            if (isDrawing && startPoint && currentPoint) {
                drawLineObject({
                    type: currentMode,
                    p1: startPoint,
                    p2: currentPoint,
                    color: currentColor
                });
            }
        }

        function hexToRgba(hex, alpha) {
            if (!hex) return `rgba(59, 130, 246, ${alpha})`;
            let r = parseInt(hex.slice(1, 3), 16),
                g = parseInt(hex.slice(3, 5), 16),
                b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        function drawLineObject(d) {
            const x1 = chart.timeScale().logicalToCoordinate(d.p1.logical);
            const y1 = candlestickSeries.priceToCoordinate(d.p1.price);
            
            const x2 = chart.timeScale().logicalToCoordinate(d.p2.logical);
            const y2 = candlestickSeries.priceToCoordinate(d.p2.price);

            if (y1 === null) return; // 가격 범위를 벗어난 경우 (에러 방지)
            
            const color = d.color || '#3B82F6';
            
            if (d.type === 'horz') {
                ctx.beginPath();
                ctx.strokeStyle = color; 
                ctx.lineWidth = 2;
                ctx.moveTo(0, y1);
                ctx.lineTo(canvas.width, y1);
                ctx.stroke();
            } else if (d.type === 'line') {
                if (x1 === null || x2 === null || y2 === null) return;
                
                // 선 그리기
                ctx.beginPath();
                ctx.strokeStyle = color; 
                ctx.lineWidth = 2;
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                
                // 시작점 동그라미(핸들)
                ctx.beginPath();
                ctx.fillStyle = color;
                ctx.arc(x1, y1, 4, 0, 2 * Math.PI);
                ctx.fill();
                
                // 끝점 동그라미(핸들)
                ctx.beginPath();
                ctx.arc(x2, y2, 4, 0, 2 * Math.PI);
                ctx.fill();
            } else if (d.type === 'rect') {
                if (x1 === null || x2 === null || y2 === null) return;
                
                const width = x2 - x1;
                const height = y2 - y1;
                
                // 매물대 사각형 면 채우기 (반투명)
                ctx.beginPath();
                ctx.fillStyle = hexToRgba(color, 0.15); 
                ctx.fillRect(x1, y1, width, height);
                
                // 사각형 테두리
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.strokeRect(x1, y1, width, height);
            }
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

    let frozenCandles = new Map();

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
                lastCandle.volume += (ticker.trade_volume || 0); 
            } else {
                // 새로운 분/시간이 시작되었다면, 새로운 캔들 시작
                lastCandle = {
                    time: currentMinuteTime,
                    open: ticker.trade_price,
                    high: ticker.trade_price,
                    low: ticker.trade_price,
                    close: ticker.trade_price,
                    volume: ticker.trade_volume || 0
                };
            }

            if (isChartFrozen) {
                // 차트 고정 상태: 백그라운드 맵에 시간대별 최신 캔들 상태를 버퍼링
                frozenCandles.set(lastCandle.time, { ...lastCandle });
                return; // UI 업데이트 건너뛰기
            }

            // 고정이 풀린 상태면 버퍼에 쌓인 누락된 캔들을 순서대로 일괄 업데이트
            if (frozenCandles.size > 0) {
                const buffered = Array.from(frozenCandles.values()).sort((a, b) => a.time - b.time);
                for (const c of buffered) {
                    candlestickSeries.update(c);
                    if(volumeSeries) {
                        volumeSeries.update({
                            time: c.time,
                            value: c.volume,
                            color: c.close >= c.open ? 'rgba(239, 68, 68, 0.5)' : 'rgba(79, 70, 229, 0.5)'
                        });
                    }
                }
                frozenCandles.clear();
            }

            // TradingView 차트 캔들 및 거래량 실시간 업데이트
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
