document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const alertBox = document.getElementById('alert-box');
    const signupAlertBox = document.getElementById('signup-alert-box');
    
    // Screens
    const loginScreen = document.getElementById('login-screen');
    const signupScreen = document.getElementById('signup-screen');
    const introScreen = document.getElementById('intro-screen');

    // Navigation toggles
    document.getElementById('to-signup').addEventListener('click', (e) => {
        e.preventDefault();
        loginScreen.classList.remove('view-active');
        loginScreen.classList.add('hidden');
        signupScreen.classList.remove('hidden');
        signupScreen.classList.add('view-active');
    });

    document.getElementById('to-login').addEventListener('click', (e) => {
        e.preventDefault();
        signupScreen.classList.remove('view-active');
        signupScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        loginScreen.classList.add('view-active');
    });

    document.getElementById('back-to-login').addEventListener('click', () => {
        document.getElementById('to-login').click();
    });

    // 회원가입 제출 이벤트
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('regUserId').value.trim();
        const password = document.getElementById('regUserPw').value.trim();
        const name = document.getElementById('regUserName').value.trim();

        signupBtn.disabled = true;
        signupBtn.innerText = '처리 중...';
        signupAlertBox.classList.add('hidden');

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password, name })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // 회원가입 성공 시 즉시 로그인 화면으로 전환
                signupScreen.classList.remove('view-active');
                signupScreen.classList.add('hidden');
                loginScreen.classList.remove('hidden');
                loginScreen.classList.add('view-active');
                
                // 로그인 화면의 알림창에 성공 메시지 표시
                alertBox.innerText = '회원가입이 완료되었습니다. 로그인해 주세요.';
                alertBox.classList.remove('hidden');
                alertBox.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
                alertBox.style.color = 'var(--accent-color)';
                alertBox.style.borderColor = 'rgba(79, 70, 229, 0.2)';
            } else {
                showError(signupAlertBox, data.message || '회원가입에 실패했습니다.');
            }
        } catch (error) {
            showError(signupAlertBox, '서버와의 통신에 실패했습니다.');
        } finally {
            signupBtn.disabled = false;
            signupBtn.innerText = '가입하기';
        }
    });

    // 로그인 폼 제출 이벤트
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('userId').value.trim();
        const pw = document.getElementById('userPw').value.trim();

        loginBtn.disabled = true;
        loginBtn.innerText = '인증 중...';
        alertBox.classList.add('hidden');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, password: pw })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                loginScreen.classList.remove('view-active');
                loginScreen.classList.add('hidden');
                
                setTimeout(() => {
                    document.getElementById('welcome-text').innerText = `${data.userName || id} 님 환영합니다!`;
                    introScreen.classList.remove('hidden');
                    introScreen.classList.add('view-active');
                }, 600);
            } else {
                showError(alertBox, data.message || '아이디 또는 비밀번호가 잘못되었습니다.');
            }
        } catch (error) {
            showError(alertBox, '서버와의 통신에 실패했습니다.');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerText = '로그인';
        }
    });

    function showError(element, message) {
        element.innerText = message;
        element.classList.remove('hidden');
    }
});
