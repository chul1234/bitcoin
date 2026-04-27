document.addEventListener('DOMContentLoaded', () => {
    // 임시 게시글 데이터 초기화 (localStorage 활용)
    const STORAGE_KEY = 'bitcoin_board_posts';
    let posts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [
        {
            id: 1,
            title: '요즘 비트코인 변동성 장난 아니네요',
            content: '단타 치기 너무 무섭습니다. 다들 어떻게 대응하고 계신가요?',
            author: '불기둥사냥꾼',
            isAnon: false,
            date: new Date(Date.now() - 86400000).toISOString(),
            userId: 'user123'
        },
        {
            id: 2,
            title: '이더리움 차트 분석 공유합니다.',
            content: '15분봉 기준으로 RSI 바닥 찍었습니다. 곧 기술적 반등 올 것 같네요.',
            author: '익명',
            isAnon: true,
            date: new Date(Date.now() - 3600000).toISOString(),
            userId: 'user456'
        }
    ];

    // 현재 사용자 (테스트용 하드코딩)
    // 실제 환경에서는 app.js의 currentUser 세션을 사용해야 함
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || { id: 'testUser', name: '테스터' };

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
    const saveBtn = document.getElementById('save-post-btn');
    const modalTitle = document.getElementById('modal-title');

    // 상세 보기 요소
    const detailTitle = document.getElementById('detail-title');
    const detailAuthor = document.getElementById('detail-author');
    const detailDate = document.getElementById('detail-date');
    const detailContent = document.getElementById('detail-content');
    const editBtn = document.getElementById('edit-post-btn');
    const deleteBtn = document.getElementById('delete-post-btn');

    let currentEditingPostId = null;

    // 데이터 저장 유틸
    function savePosts() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    }

    // 날짜 포맷팅 유틸
    function formatDate(dateString) {
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
        const initial = isAnon ? '?' : author.charAt(0).toUpperCase();
        const badgeClass = isAnon ? 'author-badge anon' : 'author-badge';
        return `
            <div class="post-author">
                <div class="${badgeClass}">${initial}</div>
                <span>${author}</span>
            </div>
        `;
    }

    // 게시글 목록 렌더링
    function renderList() {
        boardListBody.innerHTML = '';
        
        if (posts.length === 0) {
            boardListBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align:center; color:var(--text-muted); padding:3rem;">등록된 게시글이 없습니다.</td>
                </tr>
            `;
            return;
        }

        // 최신순 정렬
        const sortedPosts = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedPosts.forEach(post => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="post-title">${post.title}</td>
                <td>${renderAuthorBadge(post.author, post.isAnon)}</td>
                <td style="text-align: right; color:var(--text-muted); font-size:0.85rem;">${formatDate(post.date)}</td>
            `;
            
            // 행 클릭 시 상세보기 모달 열기
            tr.addEventListener('click', () => openDetailModal(post));
            
            boardListBody.appendChild(tr);
        });
    }

    // 모달 닫기
    function closeModal() {
        modalOverlay.classList.remove('active');
        setTimeout(() => {
            // 초기화
            titleInput.value = '';
            contentInput.value = '';
            anonToggle.checked = false;
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
        
        formView.style.display = 'none';
        formFooter.style.display = 'none';
        detailView.style.display = 'flex';
        
        // 본인이 작성한 글인지 확인하여 수정/삭제 버튼 노출
        if (post.userId === currentUser.id) {
            detailFooter.style.display = 'flex';
            
            // 수정/삭제 버튼에 현재 글 ID 바인딩
            editBtn.onclick = () => openEditModal(post);
            deleteBtn.onclick = () => deletePost(post.id);
        } else {
            detailFooter.style.display = 'none';
        }
        
        // 댓글 렌더링
        renderComments(post.id);
        
        // 새 댓글 등록 이벤트 바인딩
        const saveCommentBtn = document.getElementById('save-comment-btn');
        const commentInput = document.getElementById('comment-input');
        
        // 기존 리스너 제거 (중복 방지)
        const newSaveCommentBtn = saveCommentBtn.cloneNode(true);
        saveCommentBtn.parentNode.replaceChild(newSaveCommentBtn, saveCommentBtn);
        
        newSaveCommentBtn.addEventListener('click', () => {
            const content = commentInput.value.trim();
            if (!content) return alert('댓글 내용을 입력해주세요.');
            
            const newComment = {
                id: Date.now(),
                postId: post.id,
                parentId: null, // 최상위 댓글
                content: content,
                author: currentUser.name,
                isAnon: false, // 기본은 실명 (필요 시 토글 추가 가능)
                date: new Date().toISOString(),
                userId: currentUser.id
            };
            
            let allComments = JSON.parse(localStorage.getItem('bitcoin_board_comments')) || [];
            allComments.push(newComment);
            localStorage.setItem('bitcoin_board_comments', JSON.stringify(allComments));
            
            commentInput.value = '';
            renderComments(post.id);
        });

        modalOverlay.classList.add('active');
    }

    // 댓글 렌더링 함수
    function renderComments(postId) {
        const commentsList = document.getElementById('comments-list');
        const commentCount = document.getElementById('comment-count');
        commentsList.innerHTML = '';
        
        let allComments = JSON.parse(localStorage.getItem('bitcoin_board_comments')) || [];
        const postComments = allComments.filter(c => c.postId === postId);
        
        commentCount.innerText = postComments.length;
        
        if (postComments.length === 0) {
            commentsList.innerHTML = '<div style="color:var(--text-muted); font-size:0.9rem; padding:1rem 0;">등록된 댓글이 없습니다.</div>';
            return;
        }

        // 최상위 댓글과 대댓글 분리
        const topComments = postComments.filter(c => !c.parentId);
        const replies = postComments.filter(c => c.parentId);

        topComments.forEach(comment => {
            // 부모 댓글 렌더링
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment-item';
            commentDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    ${renderAuthorBadge(comment.author, comment.isAnon)}
                    <div class="post-meta">${formatDate(comment.date)}</div>
                </div>
                <div style="color: var(--text-main); font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.5rem;">
                    ${comment.content}
                </div>
                <div style="font-size: 0.85rem; margin-bottom: 0.5rem;">
                    <button class="reply-btn" data-id="${comment.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0; font-weight:500;">답글 달기</button>
                </div>
                <div class="reply-form-container" id="reply-form-${comment.id}" style="display:none; margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                    <input type="text" class="form-input reply-input" style="flex: 1; padding: 0.6rem; font-size: 0.85rem;" placeholder="답글을 남겨보세요." autocomplete="off">
                    <button class="submit-btn save-reply-btn" data-parent-id="${comment.id}" style="padding: 0.6rem 1rem; font-size: 0.85rem;">등록</button>
                </div>
            `;
            // 초기엔 숨김
            commentDiv.querySelector('.reply-form-container').style.display = 'none';
            commentsList.appendChild(commentDiv);

            // 해당 부모의 대댓글 렌더링
            const childReplies = replies.filter(r => r.parentId === comment.id);
            childReplies.forEach(reply => {
                const replyDiv = document.createElement('div');
                replyDiv.className = 'comment-item reply';
                replyDiv.style.cssText = 'margin-left: 2.5rem; padding-left: 1rem; border-left: 2px solid rgba(255,255,255,0.1); position: relative; margin-top: 1rem;';
                replyDiv.innerHTML = `
                    <div style="position: absolute; left: -1.8rem; top: 0.2rem; color: var(--text-muted);">└</div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        ${renderAuthorBadge(reply.author, reply.isAnon)}
                        <div class="post-meta">${formatDate(reply.date)}</div>
                    </div>
                    <div style="color: var(--text-main); font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.5rem;">
                        ${reply.content}
                    </div>
                `;
                commentsList.appendChild(replyDiv);
            });
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
            btn.addEventListener('click', (e) => {
                const parentId = parseInt(e.target.getAttribute('data-parent-id'));
                const container = document.getElementById(`reply-form-${parentId}`);
                const input = container.querySelector('.reply-input');
                const content = input.value.trim();
                
                if (!content) return alert('답글 내용을 입력해주세요.');
                
                const newReply = {
                    id: Date.now(),
                    postId: postId,
                    parentId: parentId,
                    content: content,
                    author: currentUser.name,
                    isAnon: false,
                    date: new Date().toISOString(),
                    userId: currentUser.id
                };
                
                let allComments = JSON.parse(localStorage.getItem('bitcoin_board_comments')) || [];
                allComments.push(newReply);
                localStorage.setItem('bitcoin_board_comments', JSON.stringify(allComments));
                
                renderComments(postId);
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
        
        detailView.style.display = 'none';
        detailFooter.style.display = 'none';
        formView.style.display = 'flex';
        formFooter.style.display = 'flex';
    }

    // 글 삭제
    function deletePost(id) {
        if(confirm('정말 이 게시글을 삭제하시겠습니까?')) {
            posts = posts.filter(p => p.id !== id);
            savePosts();
            renderList();
            closeModal();
        }
    }

    // 글 저장 (신규 작성 및 수정)
    saveBtn.addEventListener('click', () => {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const isAnon = anonToggle.checked;
        
        if (!title) return alert('제목을 입력해주세요.');
        if (!content) return alert('내용을 입력해주세요.');

        const authorName = isAnon ? '익명' : currentUser.name;

        if (currentEditingPostId) {
            // 수정 모드
            const postIndex = posts.findIndex(p => p.id === currentEditingPostId);
            if(postIndex > -1) {
                posts[postIndex].title = title;
                posts[postIndex].content = content;
                posts[postIndex].isAnon = isAnon;
                posts[postIndex].author = authorName;
            }
        } else {
            // 신규 작성
            const newPost = {
                id: Date.now(),
                title,
                content,
                isAnon,
                author: authorName,
                date: new Date().toISOString(),
                userId: currentUser.id
            };
            posts.push(newPost);
        }

        savePosts();
        renderList();
        closeModal();
    });

    // 이벤트 리스너 바인딩
    closeBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if(e.target === modalOverlay) closeModal();
    });

    // 초기 렌더링
    renderList();
});
