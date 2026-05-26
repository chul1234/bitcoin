document.addEventListener('DOMContentLoaded', () => {
    // 관리자 권한 체크 (프론트엔드 단)
    const rolesStr = sessionStorage.getItem('loggedInUserRoles');
    let isAdmin = false;
    if (rolesStr) {
        try {
            const roles = JSON.parse(rolesStr);
            isAdmin = roles.includes('ADMIN');
        } catch(e) {}
    }
    
    if (!isAdmin) {
        alert('관리자 권한이 필요합니다.');
        window.location.href = 'dashboard.html';
        return; // 이하 스크립트 실행 중지
    }

    // 탭 및 뷰 요소
    const tabUserList = document.getElementById('tab-user-list');
    const tabRoleManage = document.getElementById('tab-role-manage');
    const tabInvestmentManage = document.getElementById('tab-investment-manage'); // NEW
    
    const viewUserList = document.getElementById('view-user-list');
    const viewUserRegister = document.getElementById('view-user-register');
    const viewRoleManage = document.getElementById('view-role-manage');
    const viewInvestmentManage = document.getElementById('view-investment-manage'); // NEW
    
    // 등록 폼 관련 요소
    const btnShowRegister = document.getElementById('btn-show-register');
    const btnCancelRegister = document.getElementById('btn-cancel-register');
    const btnAddForm = document.getElementById('btn-add-form');
    const multiFormContainer = document.getElementById('multi-form-container');
    const btnSubmitRegister = document.getElementById('btn-submit-register');
    
    let formCounter = 0;

    // 탭 전환 로직
    tabUserList.addEventListener('click', () => {
        tabUserList.classList.add('active');
        tabRoleManage.classList.remove('active');
        tabInvestmentManage.classList.remove('active');
        viewUserList.style.display = 'block';
        viewUserRegister.style.display = 'none';
        viewRoleManage.style.display = 'none';
        viewInvestmentManage.style.display = 'none';
    });

    tabRoleManage.addEventListener('click', () => {
        tabRoleManage.classList.add('active');
        tabUserList.classList.remove('active');
        tabInvestmentManage.classList.remove('active');
        viewUserList.style.display = 'none';
        viewUserRegister.style.display = 'none';
        viewRoleManage.style.display = 'block';
        viewInvestmentManage.style.display = 'none';
    });

    tabInvestmentManage.addEventListener('click', () => {
        tabInvestmentManage.classList.add('active');
        tabUserList.classList.remove('active');
        tabRoleManage.classList.remove('active');
        viewUserList.style.display = 'none';
        viewUserRegister.style.display = 'none';
        viewRoleManage.style.display = 'none';
        viewInvestmentManage.style.display = 'block';
        fetchInvestments(); // 탭 열릴 때 데이터 로드
    });

    // '새 사용자 등록' 버튼 클릭 시 뷰 전환 및 초기 폼 추가
    btnShowRegister.addEventListener('click', () => {
        viewUserList.style.display = 'none';
        viewUserRegister.style.display = 'block';
        multiFormContainer.innerHTML = '';
        formCounter = 0;
        addEmptyUserForm(); // 기본 1개 추가
    });

    // '취소' 버튼 클릭 시
    btnCancelRegister.addEventListener('click', () => {
        viewUserRegister.style.display = 'none';
        viewUserList.style.display = 'block';
    });

    // '+' 버튼 눌러서 폼 블록 추가
    btnAddForm.addEventListener('click', () => {
        addEmptyUserForm();
    });

    // 동적 폼 블록 생성 함수
    function addEmptyUserForm() {
        formCounter++;
        const formId = `user-form-${formCounter}`;
        const div = document.createElement('div');
        div.className = 'user-form-block';
        div.id = formId;
        div.innerHTML = `
            <h4>
                사용자 ${formCounter}
                <button type="button" class="remove-form-btn" data-target="${formId}">&times;</button>
            </h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1rem;">
                <div>
                    <label class="admin-form-label">로그인 ID</label>
                    <input type="text" class="admin-form-input new-user-id" placeholder="로그인 ID 입력">
                </div>
                <div>
                    <label class="admin-form-label">비밀번호</label>
                    <input type="password" class="admin-form-input new-user-pwd" placeholder="비밀번호 입력">
                </div>
                <div>
                    <label class="admin-form-label">이름</label>
                    <input type="text" class="admin-form-input new-user-name" placeholder="이름 입력">
                </div>
                <div>
                    <label class="admin-form-label">이메일</label>
                    <input type="email" class="admin-form-input new-user-email" placeholder="이메일 입력">
                </div>
            </div>
        `;
        
        multiFormContainer.appendChild(div);

        // 삭제 버튼 이벤트 바인딩
        div.querySelector('.remove-form-btn').addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            document.getElementById(targetId).remove();
        });
    }

    // 데이터 로드
    async function loadUsers() {
        try {
            const response = await fetch('/api/admin/users');
            const result = await response.json();
            if (result.success) {
                renderUserList(result.data);
                renderRoleManageList(result.data);
            }
        } catch (error) {
            console.error('사용자 목록 로드 실패:', error);
        }
    }

    // 사용자 목록 렌더링
    function renderUserList(users) {
        const tbody = document.getElementById('user-table-body');
        tbody.innerHTML = '';
        users.forEach(user => {
            const roleStr = user.roles.join(', ');
            tbody.innerHTML += `
                <tr>
                    <td>${user.userId}</td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${roleStr}</td>
                    <td style="text-align: right;">
                        <button class="action-btn btn-edit" data-uid="${user.userId}" data-email="${user.email}">수정</button>
                        <button class="action-btn btn-delete" data-uid="${user.userId}">삭제</button>
                    </td>
                </tr>
            `;
        });

        // 삭제 이벤트 바인딩
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = e.target.getAttribute('data-uid');
                if (confirm(`'${uid}' 사용자를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
                    try {
                        const response = await fetch(`/api/user/${uid}`, {
                            method: 'DELETE'
                        });
                        const result = await response.json();
                        if (result.success) {
                            alert('사용자가 삭제되었습니다.');
                            loadUsers(); // 목록 새로고침
                        } else {
                            alert(result.message || '삭제에 실패했습니다.');
                        }
                    } catch (err) {
                        alert('서버 오류가 발생했습니다.');
                    }
                }
            });
        });

        // 수정 모달 이벤트 바인딩
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 권한 관리 탭의 수정버튼과 충돌 방지 (권한 관리는 btn-save-roles 클래스 존재)
                if (e.target.classList.contains('btn-save-roles')) return;

                const uid = e.target.getAttribute('data-uid');
                const email = e.target.getAttribute('data-email');
                openEditModal(uid, email);
            });
        });
    }

    /* ================== 수정 모달 로직 ================== */
    const editModalOverlay = document.getElementById('admin-edit-modal-overlay');
    const editModalUserid = document.getElementById('edit-modal-userid');
    const editModalEmail = document.getElementById('edit-modal-email');
    const editModalPwd = document.getElementById('edit-modal-pwd');
    const editModalAlert = document.getElementById('edit-modal-alert');
    const btnEditModalCancel = document.getElementById('btn-edit-modal-cancel');
    const btnEditModalSave = document.getElementById('btn-edit-modal-save');
    let currentEditingUserId = null;

    function openEditModal(uid, email) {
        currentEditingUserId = uid;
        editModalUserid.innerText = uid;
        editModalEmail.value = email || '';
        editModalPwd.value = '';
        editModalAlert.style.display = 'none';
        
        // CSS hidden 클래스 제거 및 display 변경
        editModalOverlay.classList.remove('hidden');
        editModalOverlay.style.display = 'flex';
    }

    function closeEditModal() {
        editModalOverlay.classList.add('hidden');
        editModalOverlay.style.display = 'none';
        currentEditingUserId = null;
    }

    if (btnEditModalCancel) {
        btnEditModalCancel.addEventListener('click', closeEditModal);
    }

    if (btnEditModalSave) {
        btnEditModalSave.addEventListener('click', async () => {
            const newEmail = editModalEmail.value.trim();
            const newPwd = editModalPwd.value.trim();
            const payload = {};

            if (newEmail) payload.email = newEmail;
            if (newPwd) {
                if (newPwd.length < 8) {
                    editModalAlert.innerText = '비밀번호는 8자 이상이어야 합니다.';
                    editModalAlert.style.display = 'block';
                    return;
                }
                payload.password = newPwd;
            }

            if (Object.keys(payload).length === 0) {
                editModalAlert.innerText = '변경할 정보(이메일 또는 비밀번호)를 입력해주세요.';
                editModalAlert.style.display = 'block';
                return;
            }

            editModalAlert.style.display = 'none';

            try {
                const response = await fetch(`/api/user/${currentEditingUserId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                
                if (result.success) {
                    alert('사용자 정보가 성공적으로 수정되었습니다.');
                    closeEditModal();
                    loadUsers();
                } else {
                    editModalAlert.innerText = result.message || '수정에 실패했습니다.';
                    editModalAlert.style.display = 'block';
                }
            } catch (err) {
                editModalAlert.innerText = '서버 통신 중 오류가 발생했습니다.';
                editModalAlert.style.display = 'block';
            }
        });
    }

    // 권한 관리 목록 렌더링
    function renderRoleManageList(users) {
        const tbody = document.getElementById('role-table-body');
        tbody.innerHTML = '';
        users.forEach(user => {
            const isAdmin = user.roles.includes('ADMIN');
            const isUser = user.roles.includes('USER');
            
            tbody.innerHTML += `
                <tr>
                    <td>${user.userId}</td>
                    <td>${user.name}</td>
                    <td>
                        <label class="role-checkbox-label">
                            <input type="checkbox" class="role-check-admin" data-uid="${user.userId}" value="ADMIN" ${isAdmin ? 'checked' : ''}> 관리자
                        </label>
                        <label class="role-checkbox-label">
                            <input type="checkbox" class="role-check-user" data-uid="${user.userId}" value="USER" ${isUser ? 'checked' : ''}> 사용자
                        </label>
                    </td>
                    <td style="text-align: center;">
                        <button class="action-btn btn-edit btn-save-roles" data-uid="${user.userId}" style="background: var(--accent-color); color: white; display: inline-block; width: 100%;">변경사항 저장</button>
                    </td>
                </tr>
            `;
        });

        // 권한 저장 이벤트 바인딩
        document.querySelectorAll('.btn-save-roles').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = e.target.getAttribute('data-uid');
                const adminCheck = document.querySelector(`.role-check-admin[data-uid="${uid}"]`).checked;
                const userCheck = document.querySelector(`.role-check-user[data-uid="${uid}"]`).checked;
                
                const newRoles = [];
                if (adminCheck) newRoles.push('ADMIN');
                if (userCheck) newRoles.push('USER');

                try {
                    const response = await fetch(`/api/admin/users/${uid}/roles`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ roles: newRoles })
                    });
                    const result = await response.json();
                    if (result.success) {
                        alert('권한이 변경되었습니다.');
                        loadUsers(); // 화면 새로고침
                    } else {
                        alert(result.message);
                    }
                } catch (err) {
                    alert('권한 변경 중 오류가 발생했습니다.');
                }
            });
        });
    }

    // 일괄 등록 저장 이벤트
    btnSubmitRegister.addEventListener('click', async () => {
        const blocks = document.querySelectorAll('.user-form-block');
        if(blocks.length === 0) {
            alert('등록할 사용자가 없습니다.');
            return;
        }
        
        let valid = true;
        const usersData = [];
        blocks.forEach(block => {
            const id = block.querySelector('.new-user-id').value.trim();
            const pwd = block.querySelector('.new-user-pwd').value.trim();
            const name = block.querySelector('.new-user-name').value.trim();
            const email = block.querySelector('.new-user-email').value.trim();
            
            if(!id || !pwd || !name || !email) {
                valid = false;
            } else {
                usersData.push({ userId: id, password: pwd, name: name, email: email });
            }
        });

        if(!valid) {
            alert('모든 폼의 모든 정보를 입력해주세요.');
            return;
        }

        try {
            const response = await fetch('/api/admin/users/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usersData)
            });
            const result = await response.json();
            
            if (result.success) {
                alert(result.message);
                viewUserRegister.style.display = 'none';
                viewUserList.style.display = 'block';
                loadUsers(); // 목록 새로고침
            } else {
                alert(result.message || '정보 수정에 실패했습니다.');
            }
        } catch(e) {
            console.error(e);
            alert('정보 수정 중 오류가 발생했습니다.');
        }
    });

    // -----------------------------------------------------
    // [투자 관리 탭 로직]
    // -----------------------------------------------------
    let profitSortDesc = true; // 수익률 정렬 상태 (기본: 내림차순)

    const btnRefreshInvestment = document.getElementById('btn-refresh-investment');
    if (btnRefreshInvestment) {
        btnRefreshInvestment.addEventListener('click', fetchInvestments);
    }

    const thProfitRate = document.getElementById('th-profit-rate');
    if (thProfitRate) {
        thProfitRate.addEventListener('click', () => {
            profitSortDesc = !profitSortDesc;
            thProfitRate.innerHTML = `수익률 ${profitSortDesc ? '▼' : '▲'}`;
            fetchInvestments(); // 정렬 후 재로드
        });
    }

    async function fetchInvestments() {
        const tbody = document.getElementById('investment-table-body');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">데이터를 불러오는 중입니다...</td></tr>`;

        try {
            const res = await fetch('/api/admin/investments');
            const result = await res.json();
            
            if (result.success) {
                renderInvestmentList(result.data);
            } else {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--error-color);">데이터 로딩 실패</td></tr>`;
            }
        } catch (e) {
            console.error('투자 데이터 로드 에러:', e);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--error-color);">데이터 로딩 중 에러가 발생했습니다.</td></tr>`;
        }
    }

    async function renderInvestmentList(users) {
        const tbody = document.getElementById('investment-table-body');
        
        // 1. 모든 유저가 가진 코인 심볼 목록 추출
        const coinSymbols = new Set();
        users.forEach(u => {
            if (u.assets) {
                u.assets.forEach(a => {
                    if (a.currency !== 'KRW') coinSymbols.add(`KRW-${a.currency}`);
                });
            }
        });

        // 2. 업비트에서 현재가 한 번에 가져오기
        const currentPrices = {};
        if (coinSymbols.size > 0) {
            const markets = Array.from(coinSymbols).join(',');
            try {
                const upbitRes = await fetch(`https://api.upbit.com/v1/ticker?markets=${markets}`);
                const upbitData = await upbitRes.json();
                upbitData.forEach(item => {
                    const currency = item.market.split('-')[1];
                    currentPrices[currency] = item.trade_price;
                });
            } catch (e) {
                console.error("업비트 시세 로딩 실패", e);
            }
        }

        // 3. 데이터 계산 및 정렬
        users.forEach(user => {
            let krwBalance = 0;
            let coinValuation = 0;

            if (user.assets) {
                user.assets.forEach(asset => {
                    if (asset.currency === 'KRW') {
                        krwBalance += asset.balance;
                    } else {
                        const price = currentPrices[asset.currency] || asset.avgBuyPrice;
                        coinValuation += (asset.balance * price);
                    }
                });
            }

            user.calculatedKrw = krwBalance;
            user.calculatedCoin = coinValuation;
            user.calculatedTotal = krwBalance + coinValuation;
            user.calculatedProfitRate = ((user.calculatedTotal - 10000000) / 10000000) * 100;
        });

        // 수익률 기준 정렬
        users.sort((a, b) => {
            if (profitSortDesc) {
                return b.calculatedProfitRate - a.calculatedProfitRate;
            } else {
                return a.calculatedProfitRate - b.calculatedProfitRate;
            }
        });

        // 4. 렌더링
        let html = '';
        users.forEach(user => {
            const krwBalance = user.calculatedKrw;
            const coinValuation = user.calculatedCoin;
            const totalAsset = user.calculatedTotal;
            const profitRate = user.calculatedProfitRate;

            const isProfit = profitRate > 0;
            const isLoss = profitRate < 0;
            const colorClass = isProfit ? 'profit' : (isLoss ? 'loss' : '');
            const sign = isProfit ? '+' : '';

            html += `
                <tr>
                    <td>${user.userId}</td>
                    <td>${user.name}</td>
                    <td style="text-align: right;">${new Intl.NumberFormat('ko-KR').format(Math.floor(krwBalance))}</td>
                    <td style="text-align: right;">${new Intl.NumberFormat('ko-KR').format(Math.floor(coinValuation))}</td>
                    <td style="text-align: right; font-weight:700;">${new Intl.NumberFormat('ko-KR').format(Math.floor(totalAsset))}</td>
                    <td style="text-align: right; font-weight:700;" class="${colorClass}">${sign}${profitRate.toFixed(2)}%</td>
                    <td style="text-align: center;">
                        <button class="action-btn btn-reset-invest" data-uid="${user.userId}" style="background: rgba(239, 68, 68, 0.1); color: var(--error-color); border-color: rgba(239, 68, 68, 0.2);">1000만원 리셋</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // 4. 리셋 버튼 이벤트 바인딩
        document.querySelectorAll('.btn-reset-invest').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const uid = e.target.getAttribute('data-uid');
                if (confirm(`정말 [${uid}] 유저의 모든 코인과 주문을 삭제하고 1,000만원으로 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
                    try {
                        const res = await fetch(`/api/admin/users/${uid}/reset-investment`, {
                            method: 'POST'
                        });
                        const result = await res.json();
                        if (result.success) {
                            alert(result.message);
                            fetchInvestments(); // 리로드
                        } else {
                            alert('초기화 실패: ' + result.message);
                        }
                    } catch (err) {
                        console.error(err);
                        alert('초기화 요청 중 오류가 발생했습니다.');
                    }
                }
            });
        });
    }

    // 초기 데이터 로드
    loadUsers();
});
