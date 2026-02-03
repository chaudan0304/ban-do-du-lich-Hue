
// ===========================================
// REVIEWS LOGIC
// ===========================================

let activeReviewLocation = ""; // Global state for location being reviewed
let editingReviewId = null;    // Global state for editing specific review

function toggleReviewForm() {
    if (typeof currentUser === 'undefined' || !currentUser) {
        showNotification({type: 'warning', message: "Vui lòng đăng nhập để viết đánh giá!"});
        return;
    }

    const form = document.getElementById("reviewFormContainer");
    if(!form) return;
    
    // If opening form freshly (not edit mode), clear editingReviewId
    if(form.style.display === "none" || form.style.display === "") {
        editingReviewId = null; 
        document.querySelector(".form-header").textContent = "Chia sẻ trải nghiệm của bạn";
        document.getElementById("reviewComment").value = "";
        const radios = document.getElementsByName('rating');
        for(let r of radios) r.checked = false;
        
        form.style.display = "block";
    } else {
        form.style.display = "none";
    }
}

// Global Enter Key Listener for Review
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const textarea = document.getElementById('reviewComment');
        const form = document.getElementById('reviewFormContainer');
        
        // Only trigger if writing in textarea and form is visible
        if (textarea && form && form.style.display !== 'none' && document.activeElement === textarea) {
             if (!e.shiftKey) { // Shift+Enter for new line
                e.preventDefault();
                if(activeReviewLocation) {
                    submitReview(activeReviewLocation);
                }
             }
        }
    }
});

async function submitReview(locationName) {
    const ratingInput = document.querySelector('input[name="rating"]:checked');
    const commentInput = document.getElementById("reviewComment");
    
    // Allow no rating (rating = 0)
    const rating = ratingInput ? parseInt(ratingInput.value) : 0;
    const comment = commentInput.value.trim();

    try {
        const bodyData = { 
            location_name: locationName, 
            rating: rating, 
            comment: comment 
        };
        
        if (editingReviewId) {
            bodyData.review_id = editingReviewId;
        }

        const res = await apiFetch("/api/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyData)
        });

        if (res.success) {
            showNotification({type: "success", title: "Cảm ơn", message: editingReviewId ? "Cập nhật thành công!" : "Đánh giá thành công!"});
            document.getElementById("reviewFormContainer").style.display = "none";
            commentInput.value = "";
            // Reset stars
            const radios = document.getElementsByName('rating');
            for(let r of radios) r.checked = false;
            
            // Reset Edit State
            editingReviewId = null;
            document.querySelector(".form-header").textContent = "Chia sẻ trải nghiệm của bạn";
            
            loadReviews(locationName);
            if(typeof analyzeUser === 'function') analyzeUser(true);
        } else {
            showNotification({type: "error", message: res.error});
        }
    } catch(e) { showNotification({type: "error", message: "Lỗi gửi đánh giá"}); }
}

async function deleteReview(locationName, reviewId) {
    if(!confirm("Bạn có chắc chắn muốn xóa đánh giá này không?")) return;
    
    try {
        const res = await apiFetch("/api/review", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location_name: locationName, review_id: reviewId })
        });
        
        if (res.success) {
            showNotification({type: "success", message: "Đã xóa đánh giá"});
            loadReviews(locationName);
            if(typeof analyzeUser === 'function') analyzeUser(true);
        } else {
             showNotification({type: "error", message: res.error || "Không thể xóa"});
        }
    } catch(e) {
        console.error(e);
        showNotification({type: "error", message: "Lỗi kết nối"});
    }
}

function editReview(locationName, rating, encodedComment, reviewId) {
    // Open form
    const form = document.getElementById("reviewFormContainer");
    if(!form) return;
    form.style.display = "block";
    
    // Set global edit ID
    editingReviewId = reviewId;
    document.querySelector(".form-header").textContent = "Chỉnh sửa đánh giá của bạn";
    
    // Set stars
    const radios = document.getElementsByName('rating');
    for(let r of radios) {
        if(parseInt(r.value) === rating) r.checked = true;
    }
    
    // Set comment
    const comment = decodeURIComponent(encodedComment);
    document.getElementById("reviewComment").value = comment;
    
    // Scroll
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Optional: Focus
    document.getElementById("reviewComment").focus();
}

let cachedReviews = [];

async function loadReviews(locationName) {
    activeReviewLocation = locationName; 
    const container = document.getElementById("reviewList");
    if(!container) return;
    
    try {
        const res = await apiFetch(`/api/reviews/${encodeURIComponent(locationName)}`);
        cachedReviews = res || [];
        
        container.innerHTML = "";
        
        if (!res || res.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#9ca3af; font-size:14px;">Chưa có đánh giá nào. Hãy là người đầu tiên!</div>`;
            return;
        }

        // 1. Render Banner (Static based on Total)
        renderReviewBanner(container, cachedReviews);

        // 2. Render Filter Bar
        renderFilterBar(container);

        // 3. Create List Container
        const listContainer = document.createElement("div");
        listContainer.id = "reviewItemsContainer";
        container.appendChild(listContainer);

        // 4. Render Items (Show All initially)
        renderReviewItems(cachedReviews, listContainer);

    } catch(e) { 
        console.error(e);
        container.innerHTML = `<div style="text-align:center;color:#ef4444;">Lỗi kết nối khi tải đánh giá</div>`; 
    }
}

function renderReviewBanner(container, reviews) {
        const total = reviews.length;
        const positiveCount = reviews.filter(r => r.rating >= 4).length;
        const scoreRatio = positiveCount / total;
        const sumRating = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        const avgRating = total > 0 ? (sumRating / total).toFixed(1) : "0.0";
        
        let bannerIcon = "fa-meh";
        let bannerText = "Tạm ổn";
        let bannerClass = "neutral";
        
        if (scoreRatio >= 0.8) {
            bannerIcon = "fa-smile";
            bannerText = "Tuyệt vời!";
            bannerClass = "excellent";
        } else if (scoreRatio >= 0.6) {
            bannerIcon = "fa-smile";
            bannerText = "Rất tốt!";
            bannerClass = "good";
        } else if (scoreRatio < 0.4) {
            bannerIcon = "fa-frown";
            bannerText = "Cần cải thiện";
            bannerClass = "bad";
        }

        const statsHeader = document.createElement("div");
        statsHeader.className = `review-summary-banner banner-${bannerClass}`;
        statsHeader.innerHTML = `
            <div class="summary-icon">
                <i class="fas ${bannerIcon}"></i>
            </div>
            <div class="summary-text">
                <span class="summary-title">${bannerText} (${avgRating} <i class="fas fa-star" style="color:#f59e0b; font-size:14px;"></i>)</span>
                <span class="summary-desc">${positiveCount}/${total} khách hài lòng (4-5 sao)</span>
            </div>
        `;
        container.appendChild(statsHeader);
}

function renderFilterBar(container) {
    const bar = document.createElement("div");
    bar.className = "review-filter-bar";
    bar.style.display = "flex";
    bar.style.gap = "8px";
    bar.style.marginBottom = "15px";
    bar.style.overflowX = "auto";
    
    const filters = [
        {label: "Tất cả", val: 'all'},
        {label: "5 sao", val: 5},
        {label: "4 sao", val: 4},
        {label: "3 sao", val: 3},
        {label: "2 sao", val: 2},
        {label: "1 sao", val: 1}
    ];

    filters.forEach(f => {
        const btn = document.createElement("button");
        btn.className = `filter-btn ${f.val === 'all' ? 'active' : ''}`;
        btn.onclick = (e) => handleFilterClick(e, f.val);
        
        btn.style.padding = "6px 12px";
        btn.style.borderRadius = "20px";
        btn.style.border = "1px solid #e5e7eb";
        btn.style.background = f.val === 'all' ? "#3b82f6" : "white";
        btn.style.color = f.val === 'all' ? "white" : "#4b5563";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "13px";
        btn.style.fontWeight = "600";
        btn.style.transition = "all 0.2s";

        // Count
        let count = 0;
        if(f.val === 'all') count = cachedReviews.length;
        else count = cachedReviews.filter(r => r.rating === f.val).length;
        
        btn.innerHTML = `${f.label} <span style="opacity:0.7; font-size:11px;">(${count})</span>`;
        
        bar.appendChild(btn);
    });
    container.appendChild(bar);
}

function handleFilterClick(e, val) {
    const parent = e.target.closest('.review-filter-bar');
    if(parent) {
        parent.querySelectorAll('button').forEach(b => {
             b.style.background = "white";
             b.style.color = "#4b5563";
        });
    }
    const btn = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
    if(btn) {
        btn.style.background = "#3b82f6";
        btn.style.color = "white";
    }

    const container = document.getElementById("reviewItemsContainer");
    if(val === 'all') renderReviewItems(cachedReviews, container);
    else {
        const filtered = cachedReviews.filter(r => r.rating === val);
        renderReviewItems(filtered, container);
    }
}

function renderReviewItems(reviews, container) {
    container.innerHTML = "";
    if(!reviews || reviews.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#9ca3af;">Không có đánh giá nào phù hợp.</div>`;
        return;
    }

    reviews.forEach((rev, index) => {
        const stars = "★".repeat(rev.rating); 
        const isOwner = currentUser && (currentUser.username === rev.username);
        const reviewId = rev.id || "";
        
        let dateStr = "";
        if (rev.created_at) {
            try {
                const date = new Date(rev.created_at);
                dateStr = date.toLocaleDateString("vi-VN", {
                    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                });
            } catch (e) { dateStr = rev.created_at; }
        } else { dateStr = "Vừa xong"; }

        let displayName = rev.user_fullname || rev.username || "Người dùng ẩn danh";
        if(displayName === "undefined") displayName = "Người dùng ẩn danh";

        let sentiment = "neutral";
        let sentimentLabel = "Đánh giá chung";
        let sentimentIcon = "fa-meh";
        
        if (rev.rating > 0) {
            if(rev.rating === 5) { sentiment = "positive"; sentimentLabel = "Tuyệt vời"; sentimentIcon = "fa-grin-stars"; }
            else if(rev.rating === 4) { sentiment = "positive"; sentimentLabel = "Hài lòng"; sentimentIcon = "fa-smile"; }
            else if(rev.rating === 3) { sentiment = "neutral"; sentimentLabel = "Bình thường"; sentimentIcon = "fa-meh"; }
            else if(rev.rating === 2) { sentiment = "negative"; sentimentLabel = "Chưa tốt"; sentimentIcon = "fa-frown-open"; }
            else { sentiment = "negative"; sentimentLabel = "Thất vọng"; sentimentIcon = "fa-frown"; }
        } else {
             const s = (rev.sentiment || "").toLowerCase();
             if (s === "positive") { sentiment = "positive"; sentimentLabel = "Tích cực (AI)"; sentimentIcon = "fa-smile"; }
             else if (s === "negative") { sentiment = "negative"; sentimentLabel = "Tiêu cực (AI)"; sentimentIcon = "fa-frown"; }
             else { sentimentLabel = "Trung tính"; }
        }

        const safeComment = encodeURIComponent(rev.comment || "");
        const safeLocName = activeReviewLocation.replace(/'/g, "\\'"); 

        let topicsHtml = "";
        if (rev.topics && Array.isArray(rev.topics) && rev.topics.length > 0) {
             topicsHtml = `<div class="review-topics" style="display:flex; gap:5px; margin-bottom:6px; flex-wrap:wrap;">` + 
                rev.topics.map(t => `<span style="background:#f1f5f9; color:#475569; font-size:10px; padding:2px 8px; border-radius:10px; font-weight:600;">#${t}</span>`).join("") +
             `</div>`;
        }

        const div = document.createElement("div");
        div.className = "review-item-modern";
        
        if (index >= 3) {
             div.style.display = "none";
             div.classList.add("review-hidden-item");
        }

        div.innerHTML = `
            <div class="review-avatar-modern">
                <i class="fas fa-user-circle" style="font-size: 24px;"></i>
            </div>
            <div class="review-body">
                <div class="review-row-top">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap: wrap;">
                        <span class="review-user-name">${displayName}</span>
                        <span class="sentiment-badge badge-${sentiment}" style="font-size: 11px; padding: 2px 6px;">
                            <i class="fas ${sentimentIcon}"></i> ${sentimentLabel}
                        </span>
                    </div>
                    <span class="review-date">${dateStr}</span>
                </div>
                ${rev.comment ? `<div class="review-text-content">${rev.comment}</div>` : ""}
                ${topicsHtml}
                <div class="review-row-bottom">
                    <div class="review-meta-left">
                         <span class="review-stars">${stars}</span>
                    </div>
                    <div class="review-actions-right">
                        ${isOwner ? `
                            <span class="action-link link-edit" onclick="editReview('${safeLocName}', ${rev.rating}, '${safeComment}', '${reviewId}')">Sửa</span>
                            <span class="action-link link-delete" onclick="deleteReview('${safeLocName}', '${reviewId}')">Xóa</span>
                        ` : ""}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });

    if (reviews.length > 3) {
         const moreBtn = document.createElement("div");
         moreBtn.style.textAlign = "center";
         moreBtn.style.marginTop = "10px";
         moreBtn.style.marginBottom = "10px";
         moreBtn.innerHTML = `<span style="color:#2563eb; cursor:pointer; font-weight:600; font-size:13px;" onclick="document.querySelectorAll('.review-hidden-item').forEach(e=>e.style.display='flex'); this.parentNode.style.display='none';">Xem thêm ${reviews.length - 3} đánh giá <i class="fas fa-chevron-down"></i></span>`;
         container.appendChild(moreBtn);
    }
}
