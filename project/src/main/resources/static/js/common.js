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
});
