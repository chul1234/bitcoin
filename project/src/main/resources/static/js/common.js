document.addEventListener('DOMContentLoaded', () => {
    // 1. 관리자가 아니면 사이드바 [관리] 탭 숨기기
    const adminNavItems = document.querySelectorAll('.nav-item[title="관리"]');
    if (adminNavItems.length > 0) {
        const rolesStr = sessionStorage.getItem('loggedInUserRoles');
        let isAdmin = false;
        if (rolesStr) {
            try {
                isAdmin = JSON.parse(rolesStr).includes('ADMIN');
            } catch(e) {}
        }
        if (!isAdmin) {
            adminNavItems.forEach(item => item.style.display = 'none');
        }
    }

    // 2. 글로벌 로그아웃 버튼 이벤트 바인딩
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'index.html';
        });
    }

    // 3. 글로벌 테마 로드 (다크/라이트)
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);

    // 테마 토글 버튼이 있다면 이벤트 바인딩
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    
    if (themeToggleBtn) {
        // 초기 아이콘 세팅
        if (themeIcon) {
            themeIcon.innerText = currentTheme === 'light' ? '🌙' : '🌞';
        }

        themeToggleBtn.addEventListener('click', () => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            if (themeIcon) {
                themeIcon.innerText = newTheme === 'light' ? '🌙' : '🌞';
            }
        });
    }

    // 4. 자산 조회 로직 (백엔드에서 자동 천만 원 주입)
    async function checkAndInitializeAssets() {
        const loggedInUserId = sessionStorage.getItem('loggedInUserId');
        if (!loggedInUserId) return; // 비로그인 시 무시

        try {
            const res = await fetch('/api/assets/KRW', {
                headers: {
                    'X-User-Id': loggedInUserId
                }
            });
            const result = await res.json();
            
            if (result.success && result.data) {
                // 백엔드에서 잔고를 주거나 1000만원을 자동 세팅해서 내려줌
                const krwBalance = result.data.balance;
                const formattedBalance = new Intl.NumberFormat('ko-KR').format(krwBalance);
                
                const orderKrwSpan = document.getElementById('order-possible-krw');
                if (orderKrwSpan) orderKrwSpan.innerText = formattedBalance;
                
                if (result.message && result.message.includes('시드머니')) {
                    // 최초 1회 자동 지급된 경우 (alert 안 띄워도 되지만 원하시면 주석 해제)
                    // alert(result.message);
                }
            }
        } catch (e) {
            console.error('자산 조회 에러:', e);
        }
    }

    // 페이지 로드 시 자산 확인 실행
    checkAndInitializeAssets();
});
