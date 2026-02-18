// ============================================================================
// LOGIC ĐÁNH GIÁ & BÌNH LUẬN / REVIEWS & COMMENTS LOGIC
//
// Mô tả / Description:
//   Quản lý hệ thống đánh giá và bình luận: viết, sửa, xóa, hiển thị, và lọc theo sao.
//   Manages the review and comment system: write, edit, delete, display, and filter by stars.
//
// Nội dung / Contents:
//   - toggleReviewForm()   → Mở/đóng form viết đánh giá / Toggle review writing form
//   - submitReview()       → Gửi đánh giá mới hoặc cập nhật / Submit new review or update
//   - deleteReview()       → Xóa đánh giá (owner hoặc admin) / Delete review (owner or admin)
//   - editReview()         → Chỉnh sửa đánh giá / Edit existing review
//   - loadReviews()        → Tải danh sách đánh giá từ API / Load reviews list from API
//   - renderReviewBanner() → Hiển thị banner thống kê đánh giá / Render review statistics banner
//   - renderFilterBar()    → Thanh lọc theo số sao / Star rating filter bar
//   - handleFilterClick()  → Xử lý click lọc sao / Handle star filter click
//   - renderReviewItems()  → Render danh sách đánh giá chi tiết / Render detailed review items
//
// Phụ thuộc / Dependencies:
//   - utils.js      → currentUser, apiFetch(), showNotification(), escapeHTML()
//   - recommend.js  → analyzeUser() (cập nhật gợi ý sau khi đánh giá / refresh after review)
// ============================================================================

// ── BIẾN TRẠNG THÁI / STATE VARIABLES ──
// activeReviewLocation: Tên địa điểm đang được đánh giá
//                       Name of the location currently being reviewed
// editingReviewId:      ID của đánh giá đang chỉnh sửa (null nếu viết mới)
//                       ID of the review being edited (null if writing new)
let activeReviewLocation = "";
let editingReviewId = null;

// ── MỞ/ĐÓNG FORM ĐÁNH GIÁ / TOGGLE REVIEW FORM ──
// Mục đích: Mở form viết đánh giá nếu đang đóng, hoặc đóng lại nếu đang mở.
//           Yêu cầu đăng nhập trước khi viết. Khi mở mới sẽ reset form (xóa dữ liệu cũ).
// Purpose:  Opens review form if closed, or closes if open.
//           Requires login before writing. Opening fresh resets the form (clears old data).
function toggleReviewForm() {
    if (typeof currentUser === 'undefined' || !currentUser) {
        showNotification({type: 'warning', message: "Vui lòng đăng nhập để viết đánh giá!"});
        return;
    }

    const form = document.getElementById("reviewFormContainer");
    if(!form) return;
    
    // Nếu đang đóng → mở + reset / If closed → open + reset
    if(form.style.display === "none" || form.style.display === "") {
        editingReviewId = null; // Reset trạng thái sửa / Reset edit state
        document.querySelector(".form-header").textContent = "Chia sẻ trải nghiệm của bạn";
        document.getElementById("reviewComment").value = "";
        // Reset tất cả radio stars / Reset all star radio buttons
        const radios = document.getElementsByName('rating');
        for(let r of radios) r.checked = false;
        
        form.style.display = "block";
    } else {
        form.style.display = "none";
    }
}

// ── XỬ LÝ PHÍM ENTER TOÀN CỤC / GLOBAL ENTER KEY LISTENER ──
// Mục đích: Khi textarea đánh giá đang focus và người dùng nhấn Enter,
//           tự động gửi đánh giá. Shift+Enter = xuống dòng (không gửi).
// Purpose:  When the review textarea is focused and user presses Enter,
//           auto-submits the review. Shift+Enter = new line (no submit).
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const textarea = document.getElementById('reviewComment');
        const form = document.getElementById('reviewFormContainer');
        
        // Chỉ kích hoạt khi đang viết review và form đang hiện / Only trigger when writing review and form is visible
        if (textarea && form && form.style.display !== 'none' && document.activeElement === textarea) {
             if (!e.shiftKey) { // Shift+Enter → xuống dòng / Shift+Enter → new line
                e.preventDefault();
                if(activeReviewLocation) {
                    submitReview(activeReviewLocation);
                }
             }
        }
    }
});

// ── GỬI ĐÁNH GIÁ / SUBMIT REVIEW ──
// Mục đích: Gửi đánh giá mới hoặc cập nhật đánh giá đang sửa.
//           Hỗ trợ gửi chỉ comment (rating = 0) hoặc chỉ rating (comment rỗng).
// Purpose:  Submits a new review or updates an existing one.
//           Supports comment-only (rating = 0) or rating-only (empty comment).
// Luồng / Flow:
//   1. Thu thập dữ liệu form (rating + comment)
//      Collect form data (rating + comment)
//   2. Nếu đang sửa (editingReviewId) → gửi kèm review_id
//      If editing (editingReviewId) → include review_id
//   3. Gọi API POST /api/review
//      Call API POST /api/review
//   4. Sau khi thành công: đóng form, reset, reload reviews, kích hoạt AI
//      On success: close form, reset, reload reviews, trigger AI
async function submitReview(locationName) {
    const ratingInput = document.querySelector('input[name="rating"]:checked');
    const commentInput = document.getElementById("reviewComment");
    
    // Cho phép không chọn sao (rating = 0) / Allow no rating selected (rating = 0)
    const rating = ratingInput ? parseInt(ratingInput.value) : 0;
    const comment = commentInput.value.trim();

    try {
        const bodyData = { 
            location_name: locationName, 
            rating: rating, 
            comment: comment 
        };
        
        // Nếu đang sửa, gửi kèm review_id / If editing, include review_id
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
            // Reset stars / Reset star radio buttons
            const radios = document.getElementsByName('rating');
            for(let r of radios) r.checked = false;
            
            // Reset trạng thái sửa / Reset edit state
            editingReviewId = null;
            document.querySelector(".form-header").textContent = "Chia sẻ trải nghiệm của bạn";
            
            // Reload danh sách đánh giá / Reload review list
            loadReviews(locationName);
            // Cập nhật phân tích AI / Update AI analysis
            if(typeof analyzeUser === 'function') analyzeUser(true);
        } else {
            showNotification({type: "error", message: res.error});
        }
    } catch(e) { showNotification({type: "error", message: "Lỗi gửi đánh giá"}); }
}

// ── XÓA ĐÁNH GIÁ / DELETE REVIEW ──
// Mục đích: Hiển thị dialog xác nhận → gọi API DELETE /api/review.
//           Admin có thể xóa đánh giá của user khác (gửi kèm review_user).
// Purpose:  Shows confirmation dialog → calls DELETE /api/review.
//           Admin can delete other users' reviews (sends review_user).
// Tham số / Parameters:
//   - locationName: Tên địa điểm / Location name
//   - reviewId:     ID đánh giá / Review ID
//   - reviewUser:   Username của người viết (dùng khi admin xóa review khác user)
//                   Username of reviewer (used when admin deletes another user's review)
function deleteReview(locationName, reviewId, reviewUser) {
    showNotification({
        type: "question",
        title: "Xóa đánh giá",
        message: "Bạn có chắc chắn muốn xóa đánh giá này không?",
        btnText: "Xóa",
        showCancel: true,
        onConfirm: async () => {
            try {
                const bodyData = { location_name: locationName, review_id: reviewId };
                // Admin xóa review của user khác / Admin deletes another user's review
                if (currentUser && currentUser.role === "admin" && reviewUser && reviewUser !== currentUser.username) {
                    bodyData.review_user = reviewUser;
                }
                const res = await apiFetch("/api/review", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(bodyData)
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
    });
}

// ── CHỈNH SỬA ĐÁNH GIÁ / EDIT REVIEW ──
// Mục đích: Mở lại form đánh giá với dữ liệu cũ (rating + comment) đã điền sẵn.
//           Đặt editingReviewId để submit biết đây là update chứ không phải tạo mới.
// Purpose:  Reopens review form pre-filled with existing data (rating + comment).
//           Sets editingReviewId so submit knows this is an update, not a new review.
// Tham số / Parameters:
//   - locationName:   Tên địa điểm / Location name
//   - rating:         Số sao hiện tại / Current star rating
//   - encodedComment: Nội dung comment đã encode URI / URI-encoded comment content
//   - reviewId:       ID đánh giá / Review ID
function editReview(locationName, rating, encodedComment, reviewId) {
    const form = document.getElementById("reviewFormContainer");
    if(!form) return;
    form.style.display = "block";
    
    // Đặt ID sửa toàn cục / Set global edit ID
    editingReviewId = reviewId;
    document.querySelector(".form-header").textContent = "Chỉnh sửa đánh giá của bạn";
    
    // Điền lại số sao / Restore star rating
    const radios = document.getElementsByName('rating');
    for(let r of radios) {
        if(parseInt(r.value) === rating) r.checked = true;
    }
    
    // Điền lại comment (decode URI) / Restore comment (URI decode)
    const comment = decodeURIComponent(encodedComment);
    document.getElementById("reviewComment").value = comment;
    
    // Cuộn mượt đến form / Smooth scroll to form
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Focus vào ô comment / Focus on comment textarea
    document.getElementById("reviewComment").focus();
}

// ── CACHE ĐÁNH GIÁ / REVIEW CACHE ──
// cachedReviews: Lưu tạm danh sách reviews để dùng cho filter (tránh gọi API lại)
//               Temporary cache of reviews for filtering (avoids re-fetching API)
let cachedReviews = [];

// ── TẢI ĐÁNH GIÁ TỪ API / LOAD REVIEWS FROM API ──
// Mục đích: Gọi API /api/reviews/:locationName, lưu vào cache, rồi render:
//           1. Banner thống kê / Statistics banner
//           2. Thanh lọc sao / Star filter bar
//           3. Danh sách đánh giá chi tiết / Detailed review items
// Purpose:  Calls API /api/reviews/:locationName, caches results, then renders:
//           1. Statistics banner
//           2. Star filter bar
//           3. Detailed review items
async function loadReviews(locationName) {
    activeReviewLocation = locationName; 
    const container = document.getElementById("reviewList");
    if(!container) return;
    
    try {
        const res = await apiFetch(`/api/reviews/${encodeURIComponent(locationName)}`);
        cachedReviews = res || [];
        
        container.innerHTML = "";
        
        // Trường hợp chưa có đánh giá / No reviews yet
        if (!res || res.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#9ca3af; font-size:14px;">Chưa có đánh giá nào. Hãy là người đầu tiên!</div>`;
            return;
        }

        // 1. Banner thống kê (tĩnh, dựa trên tổng số) / Statistics banner (static, based on totals)
        renderReviewBanner(container, cachedReviews);

        // 2. Thanh lọc theo sao / Star filter bar
        renderFilterBar(container);

        // 3. Container chứa danh sách đánh giá / Container for review items
        const listContainer = document.createElement("div");
        listContainer.id = "reviewItemsContainer";
        container.appendChild(listContainer);

        // 4. Render tất cả items (ban đầu không lọc) / Render all items (initially unfiltered)
        renderReviewItems(cachedReviews, listContainer);

    } catch(e) { 
        console.error(e);
        container.innerHTML = `<div style="text-align:center;color:#ef4444;">Lỗi kết nối khi tải đánh giá</div>`; 
    }
}

// ── BANNER THỐNG KÊ ĐÁNH GIÁ / REVIEW STATISTICS BANNER ──
// Mục đích: Hiển thị banner tổng quan: icon cảm xúc + điểm trung bình + tỷ lệ hài lòng.
// Purpose:  Renders overview banner: emotion icon + average score + satisfaction ratio.
// Phân loại / Classification:
//   scoreRatio >= 80%  → "Tuyệt vời!" (excellent) / "Wonderful!"
//   scoreRatio >= 60%  → "Rất tốt!" (good) / "Very good!"
//   scoreRatio >= 40%  → "Tạm ổn" (neutral) / "Decent"
//   scoreRatio < 40%   → "Cần cải thiện" (bad) / "Needs improvement"
function renderReviewBanner(container, reviews) {
        const total = reviews.length;
        // Đếm số đánh giá tích cực (4-5 sao) / Count positive reviews (4-5 stars)
        const positiveCount = reviews.filter(r => r.rating >= 4).length;
        const scoreRatio = positiveCount / total;
        // Tính điểm trung bình / Calculate average rating
        const sumRating = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        const avgRating = total > 0 ? (sumRating / total).toFixed(1) : "0.0";
        
        // Xác định icon, text, class theo tỷ lệ / Determine icon, text, class by ratio
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

// ── THANH LỌC SAO / STAR FILTER BAR ──
// Mục đích: Tạo thanh nút lọc đánh giá theo số sao (Tất cả, 5 sao, 4 sao, ..., 1 sao).
//           Mỗi nút hiển thị số lượng đánh giá tương ứng.
// Purpose:  Creates filter button bar for reviews by star count (All, 5 star, 4 star, ..., 1 star).
//           Each button shows the count of matching reviews.
function renderFilterBar(container) {
    const bar = document.createElement("div");
    bar.className = "review-filter-bar";
    bar.style.display = "flex";
    bar.style.gap = "8px";
    bar.style.marginBottom = "15px";
    bar.style.overflowX = "auto";
    
    // Cấu hình các bộ lọc / Filter configuration
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
        
        // Style CSS inline (nên chuyển sang class CSS nếu cần) / Inline CSS (should move to CSS class if needed)
        btn.style.padding = "6px 12px";
        btn.style.borderRadius = "20px";
        btn.style.border = "1px solid #e5e7eb";
        btn.style.background = f.val === 'all' ? "#3b82f6" : "white";
        btn.style.color = f.val === 'all' ? "white" : "#4b5563";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "13px";
        btn.style.fontWeight = "600";
        btn.style.transition = "all 0.2s";

        // Đếm số đánh giá theo bộ lọc / Count reviews per filter
        let count = 0;
        if(f.val === 'all') count = cachedReviews.length;
        else count = cachedReviews.filter(r => r.rating === f.val).length;
        
        btn.innerHTML = `${f.label} <span style="opacity:0.7; font-size:11px;">(${count})</span>`;
        
        bar.appendChild(btn);
    });
    container.appendChild(bar);
}

// ── XỬ LÝ CLICK LỌC SAO / HANDLE STAR FILTER CLICK ──
// Mục đích: Cập nhật trạng thái active cho nút vừa click, lọc lại danh sách đánh giá.
// Purpose:  Updates active state for clicked button, re-filters review list.
function handleFilterClick(e, val) {
    // Reset màu tất cả nút / Reset all button colors
    const parent = e.target.closest('.review-filter-bar');
    if(parent) {
        parent.querySelectorAll('button').forEach(b => {
             b.style.background = "white";
             b.style.color = "#4b5563";
        });
    }
    // Highlight nút được chọn / Highlight selected button
    const btn = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
    if(btn) {
        btn.style.background = "#3b82f6";
        btn.style.color = "white";
    }

    // Lọc và render lại / Filter and re-render
    const container = document.getElementById("reviewItemsContainer");
    if(val === 'all') renderReviewItems(cachedReviews, container);
    else {
        const filtered = cachedReviews.filter(r => r.rating === val);
        renderReviewItems(filtered, container);
    }
}

// ── RENDER DANH SÁCH ĐÁNH GIÁ CHI TIẾT / RENDER DETAILED REVIEW ITEMS ──
// Mục đích: Render từng đánh giá với: avatar, tên, sentiment badge, sao, comment, topics,
//           nút sửa/xóa (nếu là owner hoặc admin). Mặc định chỉ hiện 3 đánh giá đầu,
//           phần còn lại ẩn và có nút "Xem thêm".
// Purpose:  Renders each review with: avatar, name, sentiment badge, stars, comment, topics,
//           edit/delete buttons (if owner or admin). Shows only first 3 reviews by default,
//           remaining are hidden with a "Show more" button.
// Phân tích sentiment / Sentiment analysis:
//   Rating 5 → "Tuyệt vời" (positive) / "Wonderful"
//   Rating 4 → "Hài lòng" (positive) / "Satisfied"
//   Rating 3 → "Bình thường" (neutral) / "Average"
//   Rating 2 → "Chưa tốt" (negative) / "Not good"
//   Rating 1 → "Thất vọng" (negative) / "Disappointed"
//   Rating 0 → Dùng sentiment từ AI server / Uses sentiment from AI server
function renderReviewItems(reviews, container) {
    container.innerHTML = "";
    if(!reviews || reviews.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#9ca3af;">Không có đánh giá nào phù hợp.</div>`;
        return;
    }

    reviews.forEach((rev, index) => {
        const stars = "★".repeat(rev.rating); 
        const reviewId = rev.id || "";
        
        // Định dạng ngày giờ / Format date-time
        let dateStr = "";
        if (rev.created_at) {
            try {
                const date = new Date(rev.created_at);
                dateStr = date.toLocaleDateString("vi-VN", {
                    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                });
            } catch (e) { dateStr = rev.created_at; }
        } else { dateStr = "Vừa xong"; }

        // Tên hiển thị (fallback nếu undefined) / Display name (fallback if undefined)
        let displayName = rev.user_fullname || rev.username || "Người dùng ẩn danh";
        if(displayName === "undefined") displayName = "Người dùng ẩn danh";
        displayName = escapeHTML(displayName);

        // Xác định sentiment theo rating / Determine sentiment by rating
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
             // Nếu không có rating → dùng AI sentiment / If no rating → use AI sentiment
             const s = (rev.sentiment || "").toLowerCase();
             if (s === "positive") { sentiment = "positive"; sentimentLabel = "Tích cực (AI)"; sentimentIcon = "fa-smile"; }
             else if (s === "negative") { sentiment = "negative"; sentimentLabel = "Tiêu cực (AI)"; sentimentIcon = "fa-frown"; }
             else { sentimentLabel = "Trung tính"; }
        }

        const encodedComment = encodeURIComponent(rev.comment || "");

        // Kiểm tra quyền sửa/xóa / Check edit/delete permissions
        // Owner: chỉ sửa/xóa đánh giá của mình / Edit/delete own reviews only
        // Admin: có thể xóa đánh giá của bất kỳ ai / Can delete any user's reviews
        const isOwner = currentUser && (currentUser.username === rev.username);
        const isAdmin = currentUser && currentUser.role === "admin";
        const canManage = isOwner || isAdmin;

        // Render topics hashtag (nếu có) / Render topic hashtags (if any)
        let topicsHtml = "";
        if (rev.topics && Array.isArray(rev.topics) && rev.topics.length > 0) {
             topicsHtml = `<div class="review-topics" style="display:flex; gap:5px; margin-bottom:6px; flex-wrap:wrap;">` + 
                rev.topics.map(t => `<span style="background:#f1f5f9; color:#475569; font-size:10px; padding:2px 8px; border-radius:10px; font-weight:600;">#${escapeHTML(t)}</span>`).join("") +
             `</div>`;
        }

        const div = document.createElement("div");
        div.className = "review-item-modern";
        
        // Ẩn đánh giá từ thứ 4 trở đi (hiện nút "Xem thêm" bên dưới)
        // Hide reviews from 4th onwards (show "See more" button below)
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
                ${rev.comment ? `<div class="review-text-content">${escapeHTML(rev.comment)}</div>` : ""}
                ${topicsHtml}
                <div class="review-row-bottom">
                    <div class="review-meta-left">
                         <span class="review-stars">${stars}</span>
                    </div>
                    <div class="review-actions-right">
                        ${isOwner ? `<span class="action-link link-edit">Sửa</span>` : ""}
                        ${canManage ? `<span class="action-link link-delete">Xóa</span>` : ""}
                    </div>
                </div>
            </div>
        `;

        // ── GẮN EVENT AN TOÀN (TRÁNH XSS TỪ TÊN ĐỊA ĐIỂM / USERNAME) ──
        // ── ATTACH SAFE EVENTS (PREVENT XSS FROM LOCATION NAME / USERNAME) ──
        const editBtn = div.querySelector('.link-edit');
        if (editBtn) {
            editBtn.addEventListener('click', () => editReview(activeReviewLocation, rev.rating, encodedComment, reviewId));
        }
        const deleteBtn = div.querySelector('.link-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteReview(activeReviewLocation, reviewId, rev.username || ""));
        }

        container.appendChild(div);
    });

    // ── NÚT "XEM THÊM" / "SHOW MORE" BUTTON ──
    // Chỉ hiện khi có nhiều hơn 3 đánh giá / Only shows when there are more than 3 reviews
    if (reviews.length > 3) {
         const moreBtn = document.createElement("div");
         moreBtn.style.textAlign = "center";
         moreBtn.style.marginTop = "10px";
         moreBtn.style.marginBottom = "10px";
         const moreSpan = document.createElement("span");
         moreSpan.style.cssText = "color:#2563eb; cursor:pointer; font-weight:600; font-size:13px;";
         moreSpan.innerHTML = `Xem thêm ${reviews.length - 3} đánh giá <i class="fas fa-chevron-down"></i>`;
         moreSpan.addEventListener('click', function() {
             // Hiện tất cả đánh giá đã ẩn / Show all hidden reviews
             document.querySelectorAll('.review-hidden-item').forEach(e => e.style.display = 'flex');
             moreBtn.style.display = 'none'; // Ẩn nút "Xem thêm" / Hide "Show more" button
         });
         moreBtn.appendChild(moreSpan);
         container.appendChild(moreBtn);
    }
}
