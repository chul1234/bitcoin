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
       [2] 정보 수정 로직 (edit_profile.html)
       ========================================================================== */
    const editProfileForm = document.getElementById('edit-profile-form');
    const btnSaveProfile = document.getElementById('btn-save-profile');
    const editAlertBox = document.getElementById('edit-alert-box');

    if (editProfileForm) {
        // 기존 정보를 힌트로 보여주기 위해 정보 로드
        fillExistingHints();

        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newUserId = document.getElementById('editUserId').value.trim();
            const password = document.getElementById('editPassword').value.trim();
            const email = document.getElementById('editEmail').value.trim();

            // 백엔드로 보낼 객체 구성 (값이 있는 것만 보냄)
            const updatePayload = {};
            if (newUserId) updatePayload.newUserId = newUserId;
            if (password) updatePayload.password = password;
            if (email) updatePayload.email = email;

            if (Object.keys(updatePayload).length === 0) {
                showError(editAlertBox, "수정할 항목을 하나 이상 입력해주세요.");
                return;
            }

            btnSaveProfile.disabled = true;
            btnSaveProfile.innerText = "저장 중...";
            editAlertBox.classList.add('hidden');

            try {
                const response = await fetch(`/api/user/${loggedInUserId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload)
                });
                
                const data = await response.json();

                if (response.ok && data.success) {
                    alert("정보 수정이 완료되었습니다.");
                    
                    // 만약 아이디가 변경되었다면, 세션 스토리지 식별자도 업데이트해야 함
                    if (data.newUserId && data.newUserId !== loggedInUserId) {
                        sessionStorage.setItem('loggedInUserId', data.newUserId);
                    }
                    
                    // 완료 후 마이페이지로 이동
                    window.location.href = "mypage.html";
                } else {
                    showError(editAlertBox, data.message || "정보 수정에 실패했습니다.");
                }
            } catch (error) {
                showError(editAlertBox, "서버와의 통신에 실패했습니다.");
            } finally {
                btnSaveProfile.disabled = false;
                btnSaveProfile.innerText = "변경사항 저장";
            }
        });
    }

    async function fillExistingHints() {
        try {
            const response = await fetch(`/api/user/${loggedInUserId}`);
            const data = await response.json();
            if (response.ok && data.success) {
                document.getElementById('editUserId').placeholder = `현재 아이디: ${data.userId}`;
                document.getElementById('editEmail').placeholder = `현재 이메일: ${data.email}`;
            }
        } catch (ignored) {}
    }


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
