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
        fetchMyAssets();
    }

    async function fetchMyAssets() {
        try {
            const res = await fetch('/api/assets', {
                headers: { 'X-User-Id': loggedInUserId }
            });
            const result = await res.json();
            
            if (result.success && result.data) {
                let krwBalance = 0;
                let coinSymbols = new Set();
                let assets = result.data;
                
                assets.forEach(a => {
                    if (a.currency === 'KRW') {
                        krwBalance += a.balance;
                    } else {
                        coinSymbols.add(`KRW-\${a.currency}`);
                    }
                });
                
                let currentPrices = {};
                if (coinSymbols.size > 0) {
                    const markets = Array.from(coinSymbols).join(',');
                    try {
                        const upbitRes = await fetch(`https://api.upbit.com/v1/ticker?markets=\${markets}`);
                        const upbitData = await upbitRes.json();
                        upbitData.forEach(item => {
                            const currency = item.market.split('-')[1];
                            currentPrices[currency] = item.trade_price;
                        });
                    } catch (e) {
                        console.error("업비트 시세 로딩 실패", e);
                    }
                }
                
                let coinValuation = 0;
                assets.forEach(a => {
                    if (a.currency !== 'KRW') {
                        const price = currentPrices[a.currency] || a.avgBuyPrice;
                        coinValuation += (a.balance * price);
                    }
                });
                
                const totalAsset = krwBalance + coinValuation;
                
                const elTotal = document.getElementById('mypage-total-asset');
                const elKrw = document.getElementById('mypage-available-krw');
                const elCoin = document.getElementById('mypage-coin-asset');
                
                if(elTotal) elTotal.innerText = new Intl.NumberFormat('ko-KR').format(Math.floor(totalAsset));
                if(elKrw) elKrw.innerText = new Intl.NumberFormat('ko-KR').format(Math.floor(krwBalance)) + ' KRW';
                if(elCoin) elCoin.innerText = new Intl.NumberFormat('ko-KR').format(Math.floor(coinValuation)) + ' KRW';
                
            }
        } catch (error) {
            console.error('자산 정보 로드 실패:', error);
        }
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
            
            // 비밀번호 유효성 검사 (8자 이상, 특수문자 1개 이상)
            const pwRegex = /^(?=.*[^a-zA-Z0-9]).{8,}$/;
            if (!pwRegex.test(val)) {
                showError(alertBox, "비밀번호는 8자 이상이며 최소 1개의 특수문자를 포함해야 합니다.");
                return;
            }
            
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


    /* ==========================================================================
       [3] 나의 커뮤니티 활동 (내가 쓴 글/댓글)
       ========================================================================== */
    const tabMyPosts = document.getElementById('tab-my-posts');
    const tabMyComments = document.getElementById('tab-my-comments');
    const myActivityList = document.getElementById('my-activity-list');
    const activityPagination = document.getElementById('activity-pagination');

    let currentActivityType = 'posts'; // 'posts' or 'comments'
    let currentActivityPage = 0;

    if (tabMyPosts && tabMyComments) {
        tabMyPosts.addEventListener('click', () => {
            currentActivityType = 'posts';
            currentActivityPage = 0;
            updateTabStyles();
            loadMyActivities();
        });

        tabMyComments.addEventListener('click', () => {
            currentActivityType = 'comments';
            currentActivityPage = 0;
            updateTabStyles();
            loadMyActivities();
        });

        // 초기 로드
        loadMyActivities();
    }

    function updateTabStyles() {
        if (currentActivityType === 'posts') {
            tabMyPosts.style.color = 'var(--accent-color)';
            tabMyPosts.style.borderBottom = '2px solid var(--accent-color)';
            tabMyComments.style.color = 'var(--text-muted)';
            tabMyComments.style.borderBottom = '2px solid transparent';
        } else {
            tabMyComments.style.color = 'var(--accent-color)';
            tabMyComments.style.borderBottom = '2px solid var(--accent-color)';
            tabMyPosts.style.color = 'var(--text-muted)';
            tabMyPosts.style.borderBottom = '2px solid transparent';
        }
    }

    async function loadMyActivities() {
        myActivityList.innerHTML = `<div style="text-align:center; padding: 2rem; color:var(--text-muted); font-size:0.9rem;">데이터를 불러오는 중입니다...</div>`;
        activityPagination.innerHTML = '';

        const endpoint = currentActivityType === 'posts' ? `/api/user/${loggedInUserId}/posts` : `/api/user/${loggedInUserId}/comments`;
        
        try {
            const res = await fetch(`${endpoint}?page=${currentActivityPage}&size=5`);
            const result = await res.json();
            
            if (result.success) {
                renderActivityList(result.data.content);
                renderActivityPagination(result.data.totalPages);
            } else {
                myActivityList.innerHTML = `<div style="text-align:center; padding: 2rem; color:var(--error-color); font-size:0.9rem;">${result.message || '데이터 로드 실패'}</div>`;
            }
        } catch (e) {
            myActivityList.innerHTML = `<div style="text-align:center; padding: 2rem; color:var(--error-color); font-size:0.9rem;">서버 통신 에러 발생</div>`;
        }
    }

    function renderActivityList(items) {
        myActivityList.innerHTML = '';
        if (!items || items.length === 0) {
            myActivityList.innerHTML = `<div style="text-align:center; padding: 2rem; color:var(--text-muted); font-size:0.9rem;">작성한 ${currentActivityType === 'posts' ? '게시글이' : '댓글이'} 없습니다.</div>`;
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.style.padding = '0.8rem';
            div.style.borderBottom = '1px solid var(--border-color)';
            div.style.cursor = 'pointer';
            
            // 호버 효과
            div.addEventListener('mouseenter', () => div.style.backgroundColor = 'rgba(0,0,0,0.02)');
            div.addEventListener('mouseleave', () => div.style.backgroundColor = 'transparent');
            
            // 클릭 시 게시판으로 이동
            div.addEventListener('click', () => {
                window.location.href = `board.html`;
                // 실제로는 id를 넘겨서 해당 글을 띄워주는 로직이 필요할 수 있습니다.
            });

            const titleText = currentActivityType === 'posts' ? item.title : item.content;
            const dateStr = item.date ? item.date.substring(0,16).replace('T', ' ') : '';
            
            div.innerHTML = `
                <div style="color:var(--text-main); font-weight:500; font-size:0.95rem; margin-bottom:0.3rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${titleText}
                </div>
                <div style="color:var(--text-muted); font-size:0.8rem; display:flex; justify-content:space-between;">
                    <span>${dateStr}</span>
                    ${currentActivityType === 'posts' ? `<span>👁️ ${item.viewCount || 0}</span>` : ''}
                </div>
            `;
            myActivityList.appendChild(div);
        });
    }

    function renderActivityPagination(totalPages) {
        activityPagination.innerHTML = '';
        if (totalPages <= 1) return;

        for (let i = 0; i < totalPages; i++) {
            const btn = document.createElement('button');
            btn.innerText = i + 1;
            btn.style.padding = '0.2rem 0.5rem';
            btn.style.fontSize = '0.85rem';
            btn.style.border = '1px solid var(--border-color)';
            btn.style.borderRadius = '4px';
            btn.style.cursor = 'pointer';
            
            if (i === currentActivityPage) {
                btn.style.backgroundColor = 'var(--accent-color)';
                btn.style.color = '#fff';
                btn.style.borderColor = 'var(--accent-color)';
            } else {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = 'var(--text-main)';
            }

            btn.addEventListener('click', () => {
                currentActivityPage = i;
                loadMyActivities();
            });
            activityPagination.appendChild(btn);
        }
    }

});
