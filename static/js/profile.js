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

    listContainer.innerHTML = items.map(item => {
        if(currentActivityTab === "liked") {
            return `
                <div class="history-item" style="cursor: pointer;" onclick="showDetailFromData('${item.location}')">
                    <img src="${item.image}" class="item-thumb" onerror="this.src='/static/images/no-image.png'">
                    <div class="item-info">
                        <p class="item-name">${item.location}</p>
                        <span class="item-cat">${item.category || "Địa điểm"}</span>
                    </div>
                    <button class="delete-btn" onclick="event.stopPropagation(); handleUnlikeFromProfile('${item.location}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        } else if(currentActivityTab === "reviews") {
            return `
                <div class="history-item" style="cursor: pointer;" onclick="showDetailFromData('${item.location}')">
                    <img src="${item.image}" class="item-thumb" onerror="this.src='/static/images/no-image.png'">
                    <div class="item-info">
                        <p class="item-name">${item.location}</p>
                        <span class="item-cat">${"★".repeat(item.rating)} - ${item.comment.substring(0, 30)}...</span>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="history-item" style="cursor: pointer;" onclick="if(typeof viewSavedItinerary === 'function') viewSavedItinerary('${item.id}')">
                     <i class="fas fa-map-marked-alt" style="font-size: 24px; color:#14b8a6; margin: 0 10px;"></i>
                    <div class="item-info">
                        <p class="item-name">${item.title}</p>
                        <span class="item-cat">${item.days} ngày - ${new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <button class="delete-btn" onclick="event.stopPropagation(); handleDeletePlanFromProfile('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }
    }).join("");
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

async function handleDeletePlanFromProfile(planId) {
    if(!confirm("Bạn có chắc chắn muốn xóa lộ trình này?")) return;
    try {
        await apiFetch(`/api/itineraries/${planId}`, { method: "DELETE" });
        userActivityData.plans = userActivityData.plans.filter(p => p.id !== planId);
        renderActivityList();
    } catch(e) { console.error(e); }
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

// ===========================================
// REVIEWS LOGIC
// ===========================================

function toggleReviewForm() {
    const form = document.getElementById("reviewFormContainer");
    if(!form) return;
    form.style.display = (form.style.display === "none" || form.style.display === "") ? "block" : "none";
}

async function submitReview(locationName) {
    const ratingInput = document.querySelector('input[name="rating"]:checked');
    const commentInput = document.getElementById("reviewComment");
    
    if (!ratingInput) { showNotification({type: 'warning', message: "Vui lòng chọn số sao!"}); return; }
    
    const rating = parseInt(ratingInput.value);
    const comment = commentInput.value.trim();

    try {
        const res = await apiFetch("/api/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location_name: locationName, rating: rating, comment: comment })
        });

        if (res.success) {
            showNotification({type: "success", title: "Cảm ơn", message: "Đánh giá thành công!"});
            document.getElementById("reviewFormContainer").style.display = "none";
            commentInput.value = "";
            loadReviews(locationName);
            if(typeof analyzeUser === 'function') analyzeUser(true);
        } else {
            showNotification({type: "error", message: res.error});
        }
    } catch(e) { showNotification({type: "error", message: "Lỗi gửi đánh giá"}); }
}

async function loadReviews(locationName) {
    const container = document.getElementById("reviewList");
    if(!container) return;
    container.innerHTML = `<div style="text-align:center; color:#9ca3af;">Đang tải đánh giá...</div>`;
    try {
        const res = await apiFetch(`/api/reviews/${encodeURIComponent(locationName)}`);
        container.innerHTML = "";
        if (!res || res.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:10px; color:#9ca3af; font-size:13px;">Chưa có đánh giá nào.</div>`;
            return;
        }
        res.forEach(rev => {
            const stars = "★".repeat(rev.rating) + "☆".repeat(5 - rev.rating);
            const div = document.createElement("div");
            div.className = "review-item";
            div.innerHTML = `
                <div class="review-user-avatar"><i class="fas fa-user"></i></div>
                <div class="review-content">
                    <div class="review-author">${rev.user_fullname || rev.username} <span class="review-stars">${stars}</span></div>
                    <div class="review-text">${rev.comment || ""}</div>
                    <div class="review-date">${formatTime(rev.created_at)}</div>
                </div>
            `;
            container.appendChild(div);
        });
    } catch(e) { container.innerHTML = "Lỗi tải đánh giá."; }
}

// ===========================================
// SIMILAR LOCATIONS & AI RECOMMEND
// ===========================================

function analyzeUser(isLoggedInUser = false) {
    let targetUser = isLoggedInUser ? (currentUser ? currentUser.username : "") : (document.getElementById("usernameInput") ? document.getElementById("usernameInput").value.trim() : "");
    if (!targetUser) return;
  
    apiFetch(`/api/history/${targetUser}`).then((data) => {
      userLikedSet.clear();
      const histDiv = document.getElementById("user-history");
      const histList = document.getElementById("history-list");
      if(!histDiv || !histList) return;
      if (data && data.length > 0) {
        data.forEach((item) => userLikedSet.add(item.name));
        histDiv.style.display = "block";
        histList.innerHTML = data.map(place => `<div class="hist-chip" onclick="showDetailFromData('${place.name}')"><img src="${place.image}" onerror="this.src='/static/images/no-image.png'"> ${place.name}</div>`).join("");
      } else { histDiv.style.display = "none"; }
    });
    getRecommendations(targetUser);
}

function getRecommendations(user) {
    const recArea = document.getElementById("recommendation-area");
    if(!recArea) return;
    recArea.innerHTML = `<div style="text-align:center; padding:40px; color:#6b7280;"><i class="fas fa-circle-notch fa-spin fa-2x"></i></div>`;
  
    apiFetch(`/api/recommend/${user}`).then((data) => {
      recArea.innerHTML = "";
      if (!data || data.length === 0) {
        recArea.innerHTML = `<div class="empty-state">Chưa có gợi ý nào cho ${user}</div>`;
        return;
      }
      data.forEach((loc) => {
        const card = document.createElement("div");
        card.className = "ai-card";
        card.innerHTML = `<div class="card-thumb"><img src="${loc.image}" onerror="this.src='/static/images/no-image.png'"></div><div class="card-content"><div class="card-title">${loc.name}</div><div class="card-desc">${loc.description || "..."}</div><div class="algo-badge badge-${loc.reason_type || 'default'}">${loc.reason_icon || '🤖'} ${loc.reason || 'AI'}</div></div>`;
        card.onclick = () => showDetail(loc);
        recArea.appendChild(card);
      });
    });
}

function loadSimilarLocations(locationName) {
  const container = document.getElementById("similar-locations-list");
  if (!container) return;

  apiFetch(`/api/similar/${encodeURIComponent(locationName)}`)
    .then((data) => {
      container.innerHTML = "";
      
      if (!data || data.length === 0) {
        container.innerHTML = `<div class="similar-empty">Không có địa điểm tương tự</div>`;
        return;
      }

      data.forEach((loc) => {
        const score = ((loc.score || 0) * 100).toFixed(1);
        const card = document.createElement("div");
        card.className = "similar-card";
        card.innerHTML = `
          <img src="${loc.image}" loading="lazy" class="similar-card-img" onerror="this.src='/static/images/no-image.png'">
          <div class="similar-card-info">
            <div class="similar-card-name">${loc.name}</div>
            <div class="similar-card-score"><i class="fas fa-chart-bar"></i> ${score}</div>
          </div>
        `;
        card.onclick = () => showDetail(loc);
        container.appendChild(card);
      });
    })
    .catch((err) => {
      console.error("Lỗi tải địa điểm tương tự:", err);
      container.innerHTML = `<div class="similar-empty">Không thể tải dữ liệu</div>`;
    });
}
