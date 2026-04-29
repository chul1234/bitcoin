document.addEventListener('DOMContentLoaded', () => {
    // 공통: 현재 로그인된 아이디 확인
    const loggedInUserId = sessionStorage.getItem('loggedInUserId');
    if (!loggedInUserId) {
        alert("로그인이 필요합니다.");
        window.location.href = "index.html";
        return;
    }

    // 관리자 여부 확인
    const rolesStr = sessionStorage.getItem('loggedInUserRoles');
    let isAdmin = false;
    if (rolesStr) {
        try { isAdmin = JSON.parse(rolesStr).includes('ADMIN'); } catch(e) {}
    }

    let posts = [];
    let currentPage = 0;
    const pageSize = 15;
    let currentKeyword = '';

    // DOM 요소
    const boardListBody = document.getElementById('board-list-body');
    const modalOverlay = document.getElementById('board-modal-overlay');
    const closeBtn = document.getElementById('modal-close-btn');
    const openWriteBtn = document.getElementById('open-write-modal-btn');
    
    // 모달 뷰 영역
    const formView = document.getElementById('modal-form-view');
    const formFooter = document.getElementById('modal-form-footer');
    const detailView = document.getElementById('modal-detail-view');
    const detailFooter = document.getElementById('modal-detail-footer');
    
    // 폼 입력 요소
    const titleInput = document.getElementById('post-title-input');
    const contentInput = document.getElementById('post-content-input');
    const anonToggle = document.getElementById('anon-toggle');
    const noticeToggleWrapper = document.getElementById('notice-toggle-wrapper');
    const noticeToggle = document.getElementById('notice-toggle');
    const saveBtn = document.getElementById('save-post-btn');
    const modalTitle = document.getElementById('modal-title');

    if (isAdmin) {
        noticeToggleWrapper.style.display = 'flex';
    }

    // 상세 보기 요소
    const detailTitle = document.getElementById('detail-title');
    const detailAuthor = document.getElementById('detail-author');
    const detailDate = document.getElementById('detail-date');
    const detailContent = document.getElementById('detail-content');
    const detailViews = document.getElementById('detail-views');
    const editBtn = document.getElementById('edit-post-btn');
    const deleteBtn = document.getElementById('delete-post-btn');

    let currentEditingPostId = null;

    // 날짜 포맷팅 유틸
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    }

    // 작성자 뱃지 렌더링 유틸
    function renderAuthorBadge(author, isAnon) {
        const initial = isAnon ? '?' : (author ? author.charAt(0).toUpperCase() : '?');
        const badgeClass = isAnon ? 'author-badge anon' : 'author-badge';
        return `
            <div class="post-author">
                <div class="${badgeClass}">${initial}</div>
                <span>${author}</span>
            </div>
        `;
    }

    // 검색 이벤트 바인딩
    document.getElementById('search-btn').addEventListener('click', () => {
        currentKeyword = document.getElementById('search-input').value;
        loadPosts(0);
    });
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentKeyword = document.getElementById('search-input').value;
            loadPosts(0);
        }
    });

    // 서버에서 게시글 불러오기 (페이징, 검색 반영)
    async function loadPosts(page = 0) {
        try {
            const res = await fetch(`/api/posts?page=${page}&size=${pageSize}&keyword=${encodeURIComponent(currentKeyword)}`);
            const result = await res.json();
            if (result.success) {
                posts = result.data.content;
                currentPage = result.data.currentPage;
                renderList(result.data.totalPages);
            }
        } catch (e) {
            console.error('게시글 로드 실패', e);
        }
    }

    // 게시글 목록 렌더링
    function renderList(totalPages) {
        boardListBody.innerHTML = '';
        
        if (posts.length === 0) {
            boardListBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; color:var(--text-muted); padding:3rem;">등록된 게시글이 없습니다.</td>
                </tr>
            `;
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        posts.forEach(post => {
            const tr = document.createElement('tr');
            if (post.isNotice) {
                tr.style.backgroundColor = 'rgba(255, 215, 0, 0.05)';
            }
            const noticeIcon = post.isNotice ? '<span style="color:var(--accent-color); margin-right:0.5rem; font-size:1.1rem;">📢</span>' : '';
            
            tr.innerHTML = `
                <td class="post-title">${noticeIcon}${post.title}</td>
                <td>${renderAuthorBadge(post.author, post.isAnon)}</td>
                <td class="view-count-cell" style="text-align: center; color:var(--text-muted); font-size:0.85rem;">${post.viewCount || 0}</td>
                <td style="text-align: right; color:var(--text-muted); font-size:0.85rem;">${formatDate(post.date)}</td>
            `;
            
            // 행 클릭 시 상세보기 모달 열기 (단건 조회 API 호출하여 조회수 1 증가)
            tr.addEventListener('click', () => {
                fetch(`/api/posts/${post.id}`)
                    .then(r => r.json())
                    .then(res => {
                        if (res.success) {
                            openDetailModal(res.data);
                            // 리스트 화면의 조회수도 실시간(즉시) 업데이트
                            tr.querySelector('.view-count-cell').innerText = res.data.viewCount;
                        }
                    });
            });
            
            boardListBody.appendChild(tr);
        });

        renderPagination(totalPages);
    }

    // 페이지네이션 렌더링
    function renderPagination(totalPages) {
        const pagContainer = document.getElementById('pagination');
        pagContainer.innerHTML = '';
        
        for (let i = 0; i < totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = 'submit-btn';
            btn.style.padding = '0.4rem 0.8rem';
            if (i === currentPage) {
                btn.style.backgroundColor = 'var(--accent-color)';
                btn.style.color = 'white';
            } else {
                btn.style.backgroundColor = 'transparent';
                btn.style.border = '1px solid var(--border-color)';
                btn.style.color = 'var(--text-main)';
            }
            btn.innerText = i + 1;
            btn.onclick = () => loadPosts(i);
            pagContainer.appendChild(btn);
        }
    }

    // 모달 닫기
    function closeModal() {
        modalOverlay.classList.remove('active');
        setTimeout(() => {
            titleInput.value = '';
            contentInput.value = '';
            anonToggle.checked = false;
            if (noticeToggle) noticeToggle.checked = false;
            currentEditingPostId = null;
            
            formView.style.display = 'flex';
            formFooter.style.display = 'flex';
            detailView.style.display = 'none';
            detailFooter.style.display = 'none';
            modalTitle.innerText = '새 게시글 작성';
        }, 300);
    }

    // 상세보기 모달 열기
    function openDetailModal(post) {
        modalTitle.innerText = '게시글 읽기';
        
        detailTitle.innerText = post.title;
        detailAuthor.innerHTML = renderAuthorBadge(post.author, post.isAnon);
        detailDate.innerText = formatDate(post.date);
        detailContent.innerText = post.content;
        if (detailViews) detailViews.innerText = post.viewCount || 0;
        
        formView.style.display = 'none';
        formFooter.style.display = 'none';
        detailView.style.display = 'flex';
        
        // 본인이 작성한 글인지 확인하여 수정/삭제 버튼 노출
        // 관리자인 경우 삭제 버튼 항상 노출
        if (post.userId === loggedInUserId || isAdmin) {
            detailFooter.style.display = 'flex';
            
            // 수정은 본인에게만 허용 (선택적)
            if (post.userId === loggedInUserId) {
                editBtn.style.display = 'block';
                editBtn.onclick = () => openEditModal(post);
            } else {
                editBtn.style.display = 'none';
            }
            
            deleteBtn.onclick = () => deletePost(post.id);
        } else {
            detailFooter.style.display = 'none';
        }
        
        // 댓글 렌더링
        loadComments(post.id);
        
        // 새 댓글 등록 이벤트 바인딩
        const saveCommentBtn = document.getElementById('save-comment-btn');
        const commentInput = document.getElementById('comment-input');
        
        // 기존 리스너 제거 (중복 방지)
        const newSaveCommentBtn = saveCommentBtn.cloneNode(true);
        saveCommentBtn.parentNode.replaceChild(newSaveCommentBtn, saveCommentBtn);
        
        newSaveCommentBtn.addEventListener('click', async () => {
            const content = commentInput.value.trim();
            if (!content) return alert('댓글 내용을 입력해주세요.');
            
            try {
                const res = await fetch('/api/comments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        postId: post.id,
                        content: content,
                        isAnon: false,
                        userId: loggedInUserId
                    })
                });
                if (res.ok) {
                    commentInput.value = '';
                    loadComments(post.id);
                } else {
                    alert('댓글 등록에 실패했습니다.');
                }
            } catch (e) {
                alert('서버 오류 발생');
            }
        });

        modalOverlay.classList.add('active');
    }

    // 서버에서 댓글 불러오기
    async function loadComments(postId) {
        try {
            const res = await fetch(`/api/comments?postId=${postId}`);
            const result = await res.json();
            if (result.success) {
                renderComments(postId, result.data);
            }
        } catch (e) {
            console.error(e);
        }
    }

    // 전역 댓글 삭제 함수 (HTML onclick에서 호출됨)
    window.deleteComment = async function(commentId, postId) {
        if (!confirm('이 댓글을 정말 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/comments/${commentId}`, {
                method: 'DELETE',
                headers: { 'X-User-Id': loggedInUserId }
            });
            if (res.ok) {
                loadComments(postId);
            } else {
                const data = await res.json();
                alert(data.message || '삭제에 실패했습니다.');
            }
        } catch (e) {
            alert('서버 오류가 발생했습니다.');
        }
    }

    // 전역 댓글 수정 폼 토글 함수
    window.toggleEditComment = function(commentId) {
        const viewDiv = document.getElementById(`comment-view-${commentId}`);
        const editForm = document.getElementById(`comment-edit-form-${commentId}`);
        
        if (editForm.style.display === 'none') {
            viewDiv.style.display = 'none';
            editForm.style.display = 'flex';
        } else {
            viewDiv.style.display = 'block';
            editForm.style.display = 'none';
        }
    }

    // 전역 댓글 수정 저장 함수
    window.saveEditComment = async function(commentId, postId) {
        const input = document.getElementById(`comment-edit-input-${commentId}`);
        const content = input.value.trim();
        
        if (!content) return alert('수정할 내용을 입력해주세요.');
        
        try {
            const res = await fetch(`/api/comments/${commentId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Id': loggedInUserId 
                },
                body: JSON.stringify({ content: content })
            });
            if (res.ok) {
                loadComments(postId);
            } else {
                const data = await res.json();
                alert(data.message || '수정에 실패했습니다.');
            }
        } catch (e) {
            alert('서버 오류가 발생했습니다.');
        }
    }

    // 댓글 렌더링 함수 (무한 대댓글 지원)
    function renderComments(postId, postComments) {
        const commentsList = document.getElementById('comments-list');
        const commentCount = document.getElementById('comment-count');
        commentsList.innerHTML = '';
        
        commentCount.innerText = postComments.length;
        
        if (postComments.length === 0) {
            commentsList.innerHTML = '<div style="color:var(--text-muted); font-size:0.9rem; padding:1rem 0;">등록된 댓글이 없습니다.</div>';
            return;
        }

        const topComments = postComments.filter(c => !c.parentId);

        function buildCommentHTML(comment, level) {
            const canEdit = comment.userId === loggedInUserId;
            const canDelete = comment.userId === loggedInUserId || isAdmin;
            
            const editBtnHTML = canEdit ? `<button onclick="toggleEditComment(${comment.id})" style="background:none; border:none; color:var(--accent-color); cursor:pointer; padding:0; font-size:0.8rem; margin-left:10px;">수정</button>` : '';
            const delBtnHTML = canDelete ? `<button onclick="deleteComment(${comment.id}, ${postId})" style="background:none; border:none; color:var(--error-color); cursor:pointer; padding:0; font-size:0.8rem; margin-left:10px;">삭제</button>` : '';

            // 깊이가 깊어질수록 왼쪽 여백 추가 (최대 5단계까지만 시각적 들여쓰기 제한)
            const visualLevel = level > 5 ? 5 : level;
            const marginStr = visualLevel > 0 ? `margin-left: ${visualLevel * 2.5}rem; padding-left: 1rem; border-left: 2px solid rgba(255,255,255,0.1); position: relative; margin-top: 1rem;` : '';
            const indentIcon = visualLevel > 0 ? `<div style="position: absolute; left: -1.8rem; top: 0.2rem; color: var(--text-muted);">└</div>` : '';

            const div = document.createElement('div');
            div.className = level > 0 ? 'comment-item reply' : 'comment-item';
            if (marginStr) div.style.cssText = marginStr;

            // HTML 이스케이프 처리 (입력 폼 value 용)
            const safeContent = comment.content.replace(/"/g, '&quot;');

            div.innerHTML = `
                ${indentIcon}
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center;">
                        ${renderAuthorBadge(comment.author, comment.isAnon)}
                        ${editBtnHTML}
                        ${delBtnHTML}
                    </div>
                    <div class="post-meta">${formatDate(comment.date)}</div>
                </div>
                
                <!-- 내용 보기 모드 -->
                <div id="comment-view-${comment.id}" style="color: var(--text-main); font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.5rem;">
                    ${comment.content}
                </div>
                
                <!-- 내용 수정 폼 (초기 숨김) -->
                <div id="comment-edit-form-${comment.id}" style="display:none; flex-direction:column; gap:0.5rem; margin-bottom: 0.5rem;">
                    <input type="text" id="comment-edit-input-${comment.id}" class="form-input" style="padding: 0.6rem; font-size: 0.9rem;" value="${safeContent}">
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button onclick="toggleEditComment(${comment.id})" style="background:transparent; border:1px solid var(--border-color); color:var(--text-main); padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">취소</button>
                        <button onclick="saveEditComment(${comment.id}, ${postId})" style="background:var(--accent-color); border:none; color:white; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">저장</button>
                    </div>
                </div>

                <div style="font-size: 0.85rem; margin-bottom: 0.5rem;">
                    <button class="reply-btn" data-id="${comment.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0; font-weight:500;">답글 달기</button>
                </div>
                <div class="reply-form-container" id="reply-form-${comment.id}" style="display:none; margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                    <input type="text" class="form-input reply-input" style="flex: 1; padding: 0.6rem; font-size: 0.85rem;" placeholder="답글을 남겨보세요." autocomplete="off">
                    <button class="submit-btn save-reply-btn" data-parent-id="${comment.id}" style="padding: 0.6rem 1rem; font-size: 0.85rem;">등록</button>
                </div>
            `;
            // 초기엔 폼 숨김 (HTML 문자열로 넣었기 때문에 별도 처리 불필요)
            commentsList.appendChild(div);

            // 해당 댓글의 자식(대댓글) 찾아서 재귀 호출
            const children = postComments.filter(c => c.parentId === comment.id);
            children.forEach(child => {
                buildCommentHTML(child, level + 1);
            });
        }

        topComments.forEach(comment => {
            buildCommentHTML(comment, 0);
        });

        // 답글 달기 버튼 이벤트
        document.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.getAttribute('data-id');
                const form = document.getElementById(`reply-form-${commentId}`);
                form.style.display = form.style.display === 'none' ? 'flex' : 'none';
                if (form.style.display === 'flex') {
                    form.querySelector('.reply-input').focus();
                }
            });
        });

        // 대댓글 등록 이벤트
        document.querySelectorAll('.save-reply-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const parentId = parseInt(e.target.getAttribute('data-parent-id'));
                const container = document.getElementById(`reply-form-${parentId}`);
                const input = container.querySelector('.reply-input');
                const content = input.value.trim();
                
                if (!content) return alert('답글 내용을 입력해주세요.');
                
                try {
                    const res = await fetch('/api/comments', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            postId: postId,
                            parentId: parentId,
                            content: content,
                            isAnon: false,
                            userId: loggedInUserId
                        })
                    });
                    if (res.ok) {
                        loadComments(postId);
                    } else {
                        alert('대댓글 등록에 실패했습니다.');
                    }
                } catch (err) {
                    alert('서버 오류 발생');
                }
            });
        });
    }

    // 글쓰기 모달 열기
    openWriteBtn.addEventListener('click', () => {
        formView.style.display = 'flex';
        formFooter.style.display = 'flex';
        detailView.style.display = 'none';
        detailFooter.style.display = 'none';
        modalTitle.innerText = '새 게시글 작성';
        
        modalOverlay.classList.add('active');
        titleInput.focus();
    });

    // 수정 모달 열기
    function openEditModal(post) {
        currentEditingPostId = post.id;
        modalTitle.innerText = '게시글 수정';
        
        titleInput.value = post.title;
        contentInput.value = post.content;
        anonToggle.checked = post.isAnon;
        if (isAdmin) {
            noticeToggle.checked = post.isNotice || false;
        }
        
        detailView.style.display = 'none';
        detailFooter.style.display = 'none';
        formView.style.display = 'flex';
        formFooter.style.display = 'flex';
    }

    // 글 삭제
    async function deletePost(id) {
        if(confirm('정말 이 게시글을 삭제하시겠습니까? 관련 댓글도 모두 삭제됩니다.')) {
            try {
                const res = await fetch(`/api/posts/${id}`, {
                    method: 'DELETE',
                    headers: { 'X-User-Id': loggedInUserId }
                });
                if (res.ok) {
                    alert('게시글이 삭제되었습니다.');
                    closeModal();
                    loadPosts();
                } else {
                    const data = await res.json();
                    alert(data.message || '삭제에 실패했습니다.');
                }
            } catch (e) {
                alert('서버 오류가 발생했습니다.');
            }
        }
    }

    // 글 저장 (신규 작성 및 수정)
    saveBtn.addEventListener('click', async () => {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const isAnon = anonToggle.checked;
        
        if (!title) return alert('제목을 입력해주세요.');
        if (!content) return alert('내용을 입력해주세요.');

        const payload = {
            title: title,
            content: content,
            isAnon: isAnon,
            userId: loggedInUserId
        };
        
        if (isAdmin) {
            payload.isNotice = noticeToggle.checked;
        }

        try {
            if (currentEditingPostId) {
                // 수정 모드
                const res = await fetch(`/api/posts/${currentEditingPostId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-User-Id': loggedInUserId },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('수정 실패');
            } else {
                // 신규 작성
                const res = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-User-Id': loggedInUserId },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('생성 실패');
            }

            closeModal();
            loadPosts(); // 목록 리로드
        } catch (error) {
            alert('저장 중 오류가 발생했습니다.');
        }
    });

    // 이벤트 리스너 바인딩
    closeBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if(e.target === modalOverlay) closeModal();
    });

    // 초기 렌더링
    loadPosts();
});
