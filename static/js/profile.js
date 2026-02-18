// ============================================================================
// HỒ SƠ CÁ NHÂN & TƯƠNG TÁC NGƯỜI DÙNG / USER PROFILE & ACTIVITY
//
// Mô tả / Description:
//   Quản lý hồ sơ cá nhân, lịch sử hoạt động (yêu thích, đánh giá, lộ trình),
//   và tương tác Like/Unlike trên bản đồ.
//   Manages user profile, activity history (likes, reviews, plans),
//   and Like/Unlike interactions on the map.
//
// Nội dung / Contents:
//   - openUserProfile()            → Mở modal hồ sơ + tải dữ liệu / Open profile modal + load data
//   - closeUserProfile()           → Đóng modal hồ sơ / Close profile modal
//   - loadUserActivityHistory()    → Tải lịch sử likes, reviews, plans / Load likes, reviews, plans history
//   - switchActivityTab()          → Chuyển tab trong lịch sử / Switch history tabs
//   - renderActivityList()         → Render danh sách theo tab đang chọn / Render list for selected tab
//   - handleUnlikeFromProfile()    → Bỏ thích từ profile / Unlike from profile
//   - handleLike()                 → Thích/Bỏ thích từ bản đồ / Like/Unlike from map
//   - handleDeletePlanFromProfile() → Xóa lộ trình từ profile / Delete plan from profile
//   - submitProfileUpdate()        → Cập nhật thông tin cá nhân / Update personal info
//
// Phụ thuộc / Dependencies:
//   - utils.js      → currentUser, userLikedSet, apiFetch(), showNotification(), escapeHTML()
//   - auth.js       → openAuthModal()
//   - map.js        → showDetailFromData(), loadLocations(), currentCategory
//   - recommend.js  → analyzeUser()
//   - planner.js    → viewSavedItinerary()
// ============================================================================

// ── BIẾN TRẠNG THÁI / STATE VARIABLES ──
// userActivityData: Object lưu cache lịch sử hoạt động (likes, reviews, plans)
//                   Object caching activity history data
// currentActivityTab: Tab đang được chọn trong lịch sử ("liked" | "reviews" | "plans")
//                     Currently selected history tab
window.userActivityData = { likes: [], reviews: [], plans: [] };
let currentActivityTab = "liked";

// ── MỞ HỒ SƠ CÁ NHÂN / OPEN USER PROFILE ──
// Mục đích: Kiểm tra đăng nhập → hiện modal → điền thông tin cơ bản từ local state
//           → fetch thêm chi tiết (email, ngày tham gia) từ API → tải lịch sử.
// Purpose:  Checks login → shows modal → fills basic info from local state
//           → fetches additional details (email, join date) from API → loads history.
async function openUserProfile() {
    if (!currentUser) {
        openAuthModal();
        return;
    }
    document.getElementById("profileModal").classList.add("active");
    
    // Bước 1: Điền dữ liệu cơ bản từ state local (nhanh, không cần API)
    // Step 1: Fill basic data from local state (fast, no API needed)
    const displayName = currentUser.fullname || currentUser.username;
    if(document.getElementById("profileFullname")) document.getElementById("profileFullname").value = currentUser.fullname || "";
    if(document.getElementById("profileShortUsername")) document.getElementById("profileShortUsername").innerText = "@" + currentUser.username;
    if(document.getElementById("profileUsername")) document.getElementById("profileUsername").innerText = currentUser.username || ""; 
    if(document.getElementById("profileRole")) document.getElementById("profileRole").innerText = currentUser.role || "Thành viên";
    
    // Bước 2: Fetch chi tiết từ server (email, ngày tạo tài khoản)
    // Step 2: Fetch full details from server (email, account creation date)
    try {
        const res = await apiFetch("/api/profile");
        if(res && !res.error) {
            if(document.getElementById("profileEmail")) document.getElementById("profileEmail").value = res.email || "";
            if(document.getElementById("profileJoinDate")) {
                const joinDate = res.created_at ? new Date(res.created_at).toLocaleDateString('vi-VN') : "30/1/2026";
                document.getElementById("profileJoinDate").innerText = joinDate;
            }
            // Cập nhật local state cho nhất quán / Update local state for consistency
            currentUser.email = res.email;
            currentUser.fullname = res.fullname;
        }
    } catch(e) {
        console.error("Failed to load full profile:", e);
    }
    
    // Bước 3: Tải lịch sử hoạt động / Step 3: Load activity history
    loadUserActivityHistory();
}

// Đóng hồ sơ cá nhân / Close user profile
function closeUserProfile() {
    document.getElementById("profileModal").classList.remove("active");
}

// ── TẢI LỊCH SỬ HOẠT ĐỘNG / LOAD ACTIVITY HISTORY ──
// Mục đích: Gọi 2 API song song: /api/user/activity (likes + reviews) và /api/itineraries (plans).
//           Lưu kết quả vào userActivityData rồi render.
// Purpose:  Calls 2 APIs in parallel: /api/user/activity (likes + reviews) and /api/itineraries (plans).
//           Stores results in userActivityData then renders.
async function loadUserActivityHistory() {
    const listContainer = document.getElementById("activity-content-list");
    if(!listContainer) return;
    
    // Hiển thị loading spinner / Show loading spinner
    listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;

    try {
        // Gọi API lấy Activity (Likes & Reviews) / Fetch Activity (Likes & Reviews)
        const activityRes = await apiFetch("/api/user/activity");
        if(activityRes.success) {
            userActivityData.likes = activityRes.likes || [];
            userActivityData.reviews = activityRes.reviews || [];
        }

        // Gọi API lấy Plans (lộ trình đã lưu) / Fetch Plans (saved itineraries)
        const plansRes = await apiFetch("/api/itineraries");
        if(plansRes.success) {
            userActivityData.plans = plansRes.data || [];
        }

        renderActivityList();
    } catch(e) {
        console.error("Error loading history:", e);
        listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444;">Không thể tải dữ liệu</div>`;
    }
}

// ── CHUYỂN TAB LỊCH SỬ / SWITCH HISTORY TAB ──
// Mục đích: Chuyển đổi giữa các tab "Đã thích", "Đánh giá", "Lộ trình" trong profile modal.
// Purpose:  Switches between "Liked", "Reviews", "Plans" tabs in the profile modal.
// Tham số / Parameter: tabName — "liked" | "reviews" | "plans"
function switchActivityTab(tabName) {
    currentActivityTab = tabName;
    
    // Cập nhật trạng thái active cho các nút tab / Update active state on tab buttons
    const btns = document.querySelectorAll(".activity-tab-btn");
    btns.forEach(b => {
        if(b.getAttribute("data-subtab") === tabName) b.classList.add("active");
        else b.classList.remove("active");
    });

    renderActivityList();
}

// ── RENDER DANH SÁCH HOẠT ĐỘNG / RENDER ACTIVITY LIST ──
// Mục đích: Hiển thị danh sách items theo tab đang chọn (likes/reviews/plans).
//           Mỗi loại tab có HTML template khác nhau.
// Purpose:  Displays item list based on currently selected tab (likes/reviews/plans).
//           Each tab type has a different HTML template.
// Bảo mật / Security:
//   - Dùng escapeHTML() cho text nội dung / Uses escapeHTML() for text content
//   - Dùng addEventListener thay onclick inline (tránh XSS) / Uses addEventListener instead of inline onclick (XSS prevention)
function renderActivityList() {
    const listContainer = document.getElementById("activity-content-list");
    if(!listContainer) return;

    // Chọn nguồn dữ liệu theo tab / Select data source by tab
    let items = [];
    if(currentActivityTab === "liked") items = userActivityData.likes;
    else if(currentActivityTab === "reviews") items = userActivityData.reviews;
    else if(currentActivityTab === "plans") items = userActivityData.plans;

    // Trường hợp rỗng / Empty case
    if(items.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8; font-size:13px;">Chưa có hoạt động nào.</div>`;
        return;
    }

    // Xóa nội dung cũ / Clear old content
    listContainer.innerHTML = "";

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "history-item";
        div.style.cursor = "pointer";

        if(currentActivityTab === "liked") {
            // ── Tab Đã thích / Liked Tab ──
            div.innerHTML = `
                <img src="${escapeHTML(item.image)}" class="item-thumb" onerror="this.src='/static/images/no-image.png'">
                <div class="item-info">
                    <p class="item-name">${escapeHTML(item.location)}</p>
                    <span class="item-cat">${escapeHTML(item.category) || "Địa điểm"}</span>
                </div>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            `;
            // Click item → xem chi tiết / Click item → view detail
            div.addEventListener("click", () => showDetailFromData(item.location));
            // Click nút xóa → bỏ thích / Click delete button → unlike
            const deleteBtn = div.querySelector(".delete-btn");
            if(deleteBtn) {
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation(); // Ngăn sự kiện lan lên div cha / Prevent event bubbling to parent div
                    handleUnlikeFromProfile(item.location);
                });
            }
        } else if(currentActivityTab === "reviews") {
            // ── Tab Đánh giá / Reviews Tab ──
            div.innerHTML = `
                <img src="${escapeHTML(item.image)}" class="item-thumb" onerror="this.src='/static/images/no-image.png'">
                <div class="item-info">
                    <p class="item-name">${escapeHTML(item.location)}</p>
                    <span class="item-cat">${"★".repeat(item.rating)} - ${escapeHTML((item.comment || "").substring(0, 30))}...</span>
                </div>
            `;
            div.addEventListener("click", () => showDetailFromData(item.location));
        } else {
            // ── Tab Lộ trình / Plans Tab ──
            div.innerHTML = `
                 <i class="fas fa-map-marked-alt" style="font-size: 24px; color:#14b8a6; margin: 0 10px;"></i>
                <div class="item-info">
                    <p class="item-name">${escapeHTML(item.title)}</p>
                    <span class="item-cat">${item.days} ngày - ${new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            `;
            // Click item → xem lộ trình đã lưu / Click item → view saved itinerary
            div.addEventListener("click", () => {
                if(typeof viewSavedItinerary === 'function') viewSavedItinerary(item.id);
            });
            // Click nút xóa → xóa lộ trình / Click delete button → delete plan
            const deleteBtn = div.querySelector(".delete-btn");
            if(deleteBtn) {
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    handleDeletePlanFromProfile(item.id);
                });
            }
        }

        listContainer.appendChild(div);
    });
}


// ── BỎ THÍCH TỪ PROFILE / UNLIKE FROM PROFILE ──
// Mục đích: Gọi API toggle like (/api/like), cập nhật local state và render lại danh sách.
//           Cũng cập nhật bản đồ nếu đang xem danh mục đó.
// Purpose:  Calls toggle like API (/api/like), updates local state and re-renders list.
//           Also updates map if currently viewing that category.
async function handleUnlikeFromProfile(locName) {
    try {
        const res = await apiFetch("/api/like", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ location_name: locName })
        });
        
        // API trả về {liked: bool, message: str} / API returns {liked: bool, message: str}
        if(!res.error) {
            // Xóa khỏi danh sách local / Remove from local list
            userActivityData.likes = userActivityData.likes.filter(l => l.location !== locName);
            userLikedSet.delete(locName);
            renderActivityList();
            showNotification({type: 'success', message: res.message || "Đã cập nhật"});
            
            // Cập nhật lại bản đồ nếu cần / Refresh map if needed
            if(typeof loadLocations === 'function') loadLocations(currentCategory || "All", false);
        }
    } catch(e) { console.error(e); }
}

// ── XỬ LÝ THÍCH TỪ BẢN ĐỒ / HANDLE LIKE FROM MAP ──
// Mục đích: Toggle trạng thái "thích" cho địa điểm. Cập nhật giao diện nút và userLikedSet.
//           Sau khi thích/bỏ thích, kích hoạt phân tích AI để cập nhật gợi ý.
// Purpose:  Toggles "like" status for a location. Updates button UI and userLikedSet.
//           After like/unlike, triggers AI analysis to refresh recommendations.
// Tham số / Parameters:
//   - btn:  Phần tử nút DOM / The button DOM element
//   - name: Tên địa điểm / Location name
async function handleLike(btn, name) {
    try {
        const res = await apiFetch("/api/like", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location_name: name }),
        });
        
        if (res.liked) {
            // Đã thích → cập nhật UI / Liked → update UI
            btn.classList.add("liked");
            btn.innerHTML = `<i class="fas fa-heart"></i> Đã thích`;
            userLikedSet.add(name);
        } else {
            // Bỏ thích → cập nhật UI / Unliked → update UI
            btn.classList.remove("liked");
            btn.innerHTML = `<i class="far fa-heart"></i> Yêu thích`;
            userLikedSet.delete(name);
        }
        
        // Kích hoạt phân tích AI để cập nhật gợi ý sau khi thay đổi sở thích
        // Trigger AI analysis to refresh recommendations after preference change
        if(typeof analyzeUser === 'function') analyzeUser(true);
        
    } catch(e) {
        console.error("Like failed:", e);
    }
}

// ── XÓA LỘ TRÌNH TỪ PROFILE / DELETE PLAN FROM PROFILE ──
// Mục đích: Hiện dialog xác nhận → gọi API xóa lộ trình → cập nhật danh sách.
// Purpose:  Shows confirmation dialog → calls delete itinerary API → refreshes list.
function handleDeletePlanFromProfile(planId) {
    showNotification({
        type: "question",
        title: "Xóa lộ trình",
        message: "Bạn có chắc chắn muốn xóa lộ trình này?",
        btnText: "Xóa",
        showCancel: true,
        onConfirm: async () => {
            try {
                await apiFetch(`/api/itineraries/${planId}`, { method: "DELETE" });
                // Cập nhật local state / Update local state
                userActivityData.plans = userActivityData.plans.filter(p => p.id !== planId);
                renderActivityList();
                showNotification({type: "success", message: "Đã xóa lộ trình"});
            } catch(e) { console.error(e); }
        }
    });
}

// ── CẬP NHẬT HỒ SƠ / UPDATE PROFILE ──
// Mục đích: Gửi thông tin cập nhật (fullname, email, password) lên API.
//           Cập nhật header hiển thị tên nếu thay đổi.
//           Xóa password field sau khi submit (bảo mật).
// Purpose:  Sends updated info (fullname, email, password) to API.
//           Updates header name display if changed.
//           Clears password field after submit (security).
async function submitProfileUpdate() {
    const fullname = document.getElementById("profileFullname").value;
    const email = document.getElementById("profileEmail").value;
    const password = document.getElementById("profilePassword").value;
   
    try {
        const res = await apiFetch("/api/profile", { 
             method: "POST",
             headers: {"Content-Type": "application/json"},
             body: JSON.stringify({ fullname, email, password })
        });
        
        if(res.success) {
            showNotification({type: 'success', title: 'Thành công', message: 'Cập nhật hồ sơ thành công'});
            // Cập nhật local state / Update local state
            if(currentUser) {
                currentUser.fullname = fullname;
                currentUser.email = email;
            }
            // Cập nhật tên hiển thị trên header / Update display name in header
            const headerName = document.getElementById("header-username");
            if(headerName) headerName.innerText = fullname || currentUser.username;
            // Xóa password field (bảo mật) / Clear password field (security)
            if(password) document.getElementById("profilePassword").value = "";
        } else {
             showNotification({type: 'error', title: 'Thất bại', message: res.error || "Không thể cập nhật"});
        }
    } catch(e) { 
        console.error(e);
        showNotification({type: 'error', title: 'Lỗi', message: "Lỗi kết nối cập nhật hồ sơ"});
    }
}


