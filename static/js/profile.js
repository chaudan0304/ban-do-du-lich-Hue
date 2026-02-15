// ===========================================
// USER PROFILE & REVIEWS (Teal History Version)
// ===========================================

window.userActivityData = { likes: [], reviews: [], plans: [] };
let currentActivityTab = "liked";

async function openUserProfile() {
    if (!currentUser) {
        openAuthModal();
        return;
    }
    document.getElementById("profileModal").classList.add("active");
    
    // 1. Fill basic data from local state first
    const displayName = currentUser.fullname || currentUser.username;
    if(document.getElementById("profileFullname")) document.getElementById("profileFullname").value = currentUser.fullname || "";
    if(document.getElementById("profileShortUsername")) document.getElementById("profileShortUsername").innerText = "@" + currentUser.username;
    if(document.getElementById("profileUsername")) document.getElementById("profileUsername").innerText = currentUser.username || ""; 
    if(document.getElementById("profileRole")) document.getElementById("profileRole").innerText = currentUser.role || "Thành viên";
    
    // 2. Fetch full details (Email, Join Date etc.)
    try {
        const res = await apiFetch("/api/profile");
        if(res && !res.error) {
            if(document.getElementById("profileEmail")) document.getElementById("profileEmail").value = res.email || "";
            if(document.getElementById("profileJoinDate")) {
                const joinDate = res.created_at ? new Date(res.created_at).toLocaleDateString('vi-VN') : "30/1/2026";
                document.getElementById("profileJoinDate").innerText = joinDate;
            }
            // Update local state for consistency
            currentUser.email = res.email;
            currentUser.fullname = res.fullname;
        }
    } catch(e) {
        console.error("Failed to load full profile:", e);
    }
    
    // 3. Load Activity History
    loadUserActivityHistory();
}

function closeUserProfile() {
    document.getElementById("profileModal").classList.remove("active");
}

async function loadUserActivityHistory() {
    const listContainer = document.getElementById("activity-content-list");
    if(!listContainer) return;
    
    listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>`;

    try {
        // Fetch Activity (Likes & Reviews)
        const activityRes = await apiFetch("/api/user/activity");
        if(activityRes.success) {
            userActivityData.likes = activityRes.likes || [];
            userActivityData.reviews = activityRes.reviews || [];
        }

        // Fetch Plans
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

function switchActivityTab(tabName) {
    currentActivityTab = tabName;
    
    // UI Update
    const btns = document.querySelectorAll(".activity-tab-btn");
    btns.forEach(b => {
        if(b.getAttribute("data-subtab") === tabName) b.classList.add("active");
        else b.classList.remove("active");
    });

    renderActivityList();
}

function renderActivityList() {
    const listContainer = document.getElementById("activity-content-list");
    if(!listContainer) return;

    let items = [];
    if(currentActivityTab === "liked") items = userActivityData.likes;
    else if(currentActivityTab === "reviews") items = userActivityData.reviews;
    else if(currentActivityTab === "plans") items = userActivityData.plans;

    if(items.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8; font-size:13px;">Chưa có hoạt động nào.</div>`;
        return;
    }

    // Xóa nội dung cũ
    listContainer.innerHTML = "";

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "history-item";
        div.style.cursor = "pointer";

        if(currentActivityTab === "liked") {
            div.innerHTML = `
                <img src="${escapeHTML(item.image)}" class="item-thumb" onerror="this.src='/static/images/no-image.png'">
                <div class="item-info">
                    <p class="item-name">${escapeHTML(item.location)}</p>
                    <span class="item-cat">${escapeHTML(item.category) || "Địa điểm"}</span>
                </div>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            `;
            // Attach event bằng addEventListener thay vì inline onclick (chống XSS)
            div.addEventListener("click", () => showDetailFromData(item.location));
            const deleteBtn = div.querySelector(".delete-btn");
            if(deleteBtn) {
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    handleUnlikeFromProfile(item.location);
                });
            }
        } else if(currentActivityTab === "reviews") {
            div.innerHTML = `
                <img src="${escapeHTML(item.image)}" class="item-thumb" onerror="this.src='/static/images/no-image.png'">
                <div class="item-info">
                    <p class="item-name">${escapeHTML(item.location)}</p>
                    <span class="item-cat">${"★".repeat(item.rating)} - ${escapeHTML((item.comment || "").substring(0, 30))}...</span>
                </div>
            `;
            div.addEventListener("click", () => showDetailFromData(item.location));
        } else {
            div.innerHTML = `
                 <i class="fas fa-map-marked-alt" style="font-size: 24px; color:#14b8a6; margin: 0 10px;"></i>
                <div class="item-info">
                    <p class="item-name">${escapeHTML(item.title)}</p>
                    <span class="item-cat">${item.days} ngày - ${new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            `;
            div.addEventListener("click", () => {
                if(typeof viewSavedItinerary === 'function') viewSavedItinerary(item.id);
            });
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


async function handleUnlikeFromProfile(locName) {
    try {
        const res = await apiFetch("/api/like", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ location_name: locName })
        });
        
        // API trả về {liked: bool, message: str}
        if(!res.error) {
            userActivityData.likes = userActivityData.likes.filter(l => l.location !== locName);
            userLikedSet.delete(locName);
            renderActivityList();
            showNotification({type: 'success', message: res.message || "Đã cập nhật"});
            
            // Cập nhật lại bản đồ nếu cần
            if(typeof loadLocations === 'function') loadLocations(currentCategory || "All", false);
        }
    } catch(e) { console.error(e); }
}

async function handleLike(btn, name) {
    try {
        const res = await apiFetch("/api/like", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location_name: name }),
        });
        
        if (res.liked) {
            btn.classList.add("liked");
            btn.innerHTML = `<i class="fas fa-heart"></i> Đã thích`;
            userLikedSet.add(name);
        } else {
            btn.classList.remove("liked");
            btn.innerHTML = `<i class="far fa-heart"></i> Yêu thích`;
            userLikedSet.delete(name);
        }
        
        // Trigger AI analysis refresh if user is logged in
        if(typeof analyzeUser === 'function') analyzeUser(true);
        
    } catch(e) {
        console.error("Like failed:", e);
    }
}

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
                userActivityData.plans = userActivityData.plans.filter(p => p.id !== planId);
                renderActivityList();
                showNotification({type: "success", message: "Đã xóa lộ trình"});
            } catch(e) { console.error(e); }
        }
    });
}

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
            if(currentUser) {
                currentUser.fullname = fullname;
                currentUser.email = email;
            }
            const headerName = document.getElementById("header-username");
            if(headerName) headerName.innerText = fullname || currentUser.username;
            if(password) document.getElementById("profilePassword").value = ""; // Clear password
        } else {
             showNotification({type: 'error', title: 'Thất bại', message: res.error || "Không thể cập nhật"});
        }
    } catch(e) { 
        console.error(e);
        showNotification({type: 'error', title: 'Lỗi', message: "Lỗi kết nối cập nhật hồ sơ"});
    }
}


