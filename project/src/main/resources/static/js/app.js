document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const alertBox = document.getElementById('alert-box');
    const userIdInput = document.getElementById('userId');
    const userPwInput = document.getElementById('userPw');
    const welcomeText = document.getElementById('welcome-text');

    const loginScreen = document.getElementById('login-screen');
    const introScreen = document.getElementById('intro-screen');

    // 로그인 폼 제출 이벤트
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // 페이지 새로고침 방지 (SPA 방식)

        const id = userIdInput.value.trim();
        const pw = userPwInput.value.trim();

        if(!id || !pw) return;

        // 3. 중복 방지 (Throttling / Disable) - 버튼을 클릭하면 즉시 비활성화하여 다중 클릭 방어
        loginBtn.disabled = true;
        loginBtn.innerText = '인증 중...';
        alertBox.classList.add('hidden'); // 기존 에러 숨기기

        try {
            // 스프링 부트 AuthController.java 와 직접 연동!
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: id, password: pw })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // 로그인 성공 시 스크린 전환 마이크로 애니메이션
                loginScreen.classList.remove('view-active');
                loginScreen.classList.add('hidden');
                
                // 4. 로그인 후 나오는 간단 인트로 화면 표시
                setTimeout(() => {
                    welcomeText.innerText = `${id} 님 환영합니다!`;
                    introScreen.classList.remove('hidden');
                    introScreen.classList.add('view-active');
                    
                    // 향후 (내일 이후) 이 곳에서 3초 뒤 진짜 대시보드 화면으로 넘어가게 구현
                }, 600); // 이전 화면이 페이드아웃 된 후 0.6초 뒤 시작
                
            } else {
                // 2. 로그인 틀렸을 경우 알림 (백엔드 에러 메시지 렌더링)
                showError(data.message || '아이디 또는 비밀번호가 잘못되었습니다.');
            }
        } catch (error) {
            showError('서버와의 통신에 실패했습니다. (Spring Boot 서버를 켜주세요)');
        } finally {
            // 결과와 상관없이 버튼은 다시 활성화 (성공시엔 뷰가 사라져서 안보임)
            loginBtn.disabled = false;
            loginBtn.innerText = '로그인';
        }
    });

    function showError(message) {
        alertBox.innerText = message;
        alertBox.classList.remove('hidden');
        // 부드럽게 강조하기 위해 간단한 흔들림/에러 하이라이트 애니메이션 추가 가능
    }
});
