document.addEventListener('DOMContentLoaded', () => {
    // 공통: 현재 로그인된 아이디 확인
    const loggedInUserId = sessionStorage.getItem('loggedInUserId');
    if (!loggedInUserId) {
        alert("로그인이 필요합니다.");
        window.location.href = "index.html";
        return;
    }

    /* ==========================================================================
       [1] 마이페이지 로직 (mypage.html)
       ========================================================================== */
    const profileName = document.getElementById('profile-name');
    const profileUserid = document.getElementById('profile-userid');
    const profileEmail = document.getElementById('profile-email');
    const profileCreated = document.getElementById('profile-created');
    const btnDeleteAccount = document.getElementById('btn-delete-account');
    const mypageAlertBox = document.getElementById('mypage-alert-box');

    // 마이페이지 요약 정보 로딩
    if (profileName && profileUserid) {
        fetchUserInfo();
    }

    async function fetchUserInfo() {
        try {
            const response = await fetch(`/api/user/${loggedInUserId}`);
            const data = await response.json();

            if (response.ok && data.success) {
                profileName.innerText = data.name;
                profileUserid.innerText = data.userId;
                profileEmail.innerText = data.email;
                
                // 가입 날짜 포맷팅 (YYYY-MM-DD HH:mm)
                if (data.createdAt) {
                    const date = new Date(data.createdAt);
                    profileCreated.innerText = date.toLocaleString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                    });
                } else {
                    profileCreated.innerText = "정보 없음";
                }
            } else {
                showError(mypageAlertBox, data.message || "사용자 정보를 불러올 수 없습니다.");
            }
        } catch (error) {
            showError(mypageAlertBox, "서버와의 통신에 실패했습니다.");
        }
    }

    // 회원 탈퇴 버튼 클릭
    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener('click', async () => {
            const confirmDelete = confirm("정말 탈퇴하시겠습니까? 보유 자산 및 모든 기록이 영구적으로 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.");
            if (!confirmDelete) return;

            try {
                const response = await fetch(`/api/user/${loggedInUserId}`, {
                    method: 'DELETE'
                });
                const data = await response.json();

                if (response.ok && data.success) {
                    alert("회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.");
                    sessionStorage.clear();
                    window.location.href = "index.html";
                } else {
                    showError(mypageAlertBox, data.message || "탈퇴 처리 중 오류가 발생했습니다.");
                }
            } catch (error) {
                showError(mypageAlertBox, "서버와의 통신에 실패했습니다.");
            }
        });
    }


    /* ==========================================================================
       [2] 정보 수정 로직 (다이나믹 모달)
       ========================================================================== */
    let currentEditField = null;

    window.openDynamicModal = function(field) {
        currentEditField = field;
        const overlay = document.getElementById('dynamic-modal-overlay');
        const title = document.getElementById('modal-title');
        const container = document.getElementById('modal-input-container');
        const alertBox = document.getElementById('modal-alert-box');
        
        if(alertBox) alertBox.classList.add('hidden');
        container.innerHTML = '';

        if (field === 'userid') {
            title.innerText = '아이디 수정';
            container.innerHTML = `
                <div style="margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">새로운 아이디를 입력해주세요.</div>
                <input type="text" id="modal-input-userid" class="modal-input" placeholder="새로운 아이디 입력" autocomplete="off">
            `;
        } else if (field === 'password') {
            title.innerText = '비밀번호 수정';
            container.innerHTML = `
                <div style="margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">새로운 비밀번호를 입력해주세요.</div>
                <input type="password" id="modal-input-password" class="modal-input" placeholder="8자 이상 입력" autocomplete="new-password">
                <input type="password" id="modal-input-password-confirm" class="modal-input" placeholder="비밀번호 재입력" autocomplete="new-password" style="margin-top: 0.5rem;">
            `;
        } else if (field === 'email') {
            title.innerText = '이메일 수정';
            container.innerHTML = `
                <div style="margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem;">새로운 이메일 주소를 입력해주세요.</div>
                <input type="email" id="modal-input-email" class="modal-input" placeholder="새로운 이메일 입력" autocomplete="email">
            `;
        }

        overlay.classList.remove('hidden');
    };

    window.closeDynamicModal = function() {
        document.getElementById('dynamic-modal-overlay').classList.add('hidden');
        currentEditField = null;
    };

    window.saveDynamicModal = async function() {
        if (!currentEditField) return;
        
        const updatePayload = {};
        const alertBox = document.getElementById('modal-alert-box');
        
        if (currentEditField === 'userid') {
            const val = document.getElementById('modal-input-userid').value.trim();
            if (!val) { showError(alertBox, "아이디를 입력해주세요."); return; }
            updatePayload.newUserId = val;
        } else if (currentEditField === 'password') {
            const val = document.getElementById('modal-input-password').value.trim();
            const confirmVal = document.getElementById('modal-input-password-confirm').value.trim();
            if (!val) { showError(alertBox, "비밀번호를 입력해주세요."); return; }
            if (val !== confirmVal) {
                showError(alertBox, "비밀번호와 비밀번호 확인이 일치하지 않습니다.");
                return;
            }
            updatePayload.password = val;
        } else if (currentEditField === 'email') {
            const val = document.getElementById('modal-input-email').value.trim();
            if (!val) { showError(alertBox, "이메일을 입력해주세요."); return; }
            updatePayload.email = val;
        }

        alertBox.classList.add('hidden');

        try {
            const response = await fetch(`/api/user/${loggedInUserId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });
            
            const data = await response.json();

            if (response.ok && data.success) {
                alert("성공적으로 변경되었습니다.");
                
                // 아이디 변경 시 세션 식별자 업데이트
                if (data.newUserId && data.newUserId !== loggedInUserId) {
                    sessionStorage.setItem('loggedInUserId', data.newUserId);
                }
                
                closeDynamicModal();
                window.location.reload();
            } else {
                showError(alertBox, data.message || "수정에 실패했습니다.");
            }
        } catch (error) {
            showError(alertBox, "서버와의 통신에 실패했습니다.");
        }
    };

    /* ==========================================================================
       [공통] 유틸리티
       ========================================================================== */
    function showError(element, message) {
        if (!element) return;
        element.innerText = message;
        element.classList.remove('hidden');
        element.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        element.style.color = 'var(--error-color)';
    }

    // 로그아웃 공통 기능
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'index.html';
        });
    }
});
