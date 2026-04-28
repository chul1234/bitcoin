document.addEventListener('DOMContentLoaded', () => {
    // 탭 및 뷰 요소
    const tabUserList = document.getElementById('tab-user-list');
    const tabRoleManage = document.getElementById('tab-role-manage');
    
    const viewUserList = document.getElementById('view-user-list');
    const viewUserRegister = document.getElementById('view-user-register');
    const viewRoleManage = document.getElementById('view-role-manage');
    
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
        viewUserList.style.display = 'block';
        viewUserRegister.style.display = 'none';
        viewRoleManage.style.display = 'none';
    });

    tabRoleManage.addEventListener('click', () => {
        tabRoleManage.classList.add('active');
        tabUserList.classList.remove('active');
        viewUserList.style.display = 'none';
        viewUserRegister.style.display = 'none';
        viewRoleManage.style.display = 'block';
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
                        <!-- 삭제/수정 버튼은 추후 API 구현 후 연동 -->
                        <button class="action-btn btn-edit">수정</button>
                        <button class="action-btn btn-delete">삭제</button>
                    </td>
                </tr>
            `;
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
                    <td style="text-align: right;">
                        <button class="action-btn btn-edit btn-save-roles" data-uid="${user.userId}" style="background: var(--accent-color); color: white;">변경사항 저장</button>
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
                alert(result.message);
            }
        } catch (error) {
            alert('일괄 등록 중 오류가 발생했습니다.');
        }
    });

    // 초기 데이터 로드
    loadUsers();
});
