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

    // 일괄 등록 저장 이벤트 (임시 더미 로직)
    btnSubmitRegister.addEventListener('click', () => {
        const blocks = document.querySelectorAll('.user-form-block');
        if(blocks.length === 0) {
            alert('등록할 사용자가 없습니다.');
            return;
        }
        
        let valid = true;
        blocks.forEach(block => {
            const id = block.querySelector('.new-user-id').value.trim();
            const pwd = block.querySelector('.new-user-pwd').value.trim();
            if(!id || !pwd) valid = false;
        });

        if(!valid) {
            alert('모든 폼의 ID와 비밀번호를 입력해주세요.');
            return;
        }

        alert(blocks.length + '명의 사용자 등록 요청 완료 (백엔드 API 미연동)');
        
        // 목록으로 돌리기
        viewUserRegister.style.display = 'none';
        viewUserList.style.display = 'block';
    });
});
