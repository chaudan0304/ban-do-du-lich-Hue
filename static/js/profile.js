// ===========================================
// USER PROFILE & REVIEWS
// ===========================================

// --- AI SUGGESTION & HISTORY LOGIC (Moved here or shared) ---
function analyzeUser(isLoggedInUser = false) {
    let targetUser = "";
    if (isLoggedInUser) {
        if (!currentUser) return;
        targetUser = currentUser.username;
    } else {
        const input = document.getElementById("usernameInput");
        if(input) targetUser = input.value.trim();
    }
    
    if (!targetUser) return;
  
    // 1. History
    apiFetch(`/api/history/${targetUser}`).then((data) => {
      userLikedSet.clear();
      const histDiv = document.getElementById("user-history");
      const histList = document.getElementById("history-list");
      
      if(!histDiv || !histList) return;
  
      if (data && data.length > 0) {
        data.forEach((item) => userLikedSet.add(item.name));
        histDiv.style.display = "block";
        histList.innerHTML = data
          .map(
            (place) =>
              `<div class="hist-chip" onclick="showDetailFromData('${place.name}')">
                     <img src="${place.image}" loading = "lazy" onerror="this.src='/static/images/no-image.png'"> ${place.name}
                   </div>`,
          )
          .join("");
      } else {
        histDiv.style.display = "none";
      }
    });
  
    // 2. Recommendation
    getRecommendations(targetUser);
  }
  
  function getRecommendations(user) {
    const recArea = document.getElementById("recommendation-area");
    if(!recArea) return;

    recArea.innerHTML = `<div style="text-align:center; padding:60px 20px; color:#6b7280;">
      <i class="fas fa-circle-notch fa-spin fa-2x"></i><br><br>
      Đang phân tích sở thích của <strong>${user}</strong>...
    </div>`;
  
    apiFetch(`/api/recommend/${user}`).then((data) => {
      recArea.innerHTML = "";
      if (!data || data.length === 0) {
        recArea.innerHTML = `<div class="empty-state"><p>Chưa có gợi ý nào cho ${user}</p></div>`;
        return;
      }
      data.forEach((loc) => {
        // Sử dụng thông tin giải thích mới từ API
        const reasonIcon = loc.reason_icon || "🤖";
        const reason = loc.reason || "Được gợi ý bởi AI";
        const reasonType = loc.reason_type || "default";
        
        // Tạo badge với class theo loại lý do
        const badgeClass = `algo-badge badge-${reasonType}`;
        const badgeHTML = `<div class="${badgeClass}">${reasonIcon} ${reason}</div>`;
  
        const card = document.createElement("div");
        card.className = "ai-card";
        card.innerHTML = `
                  <div class="card-thumb"><img src="${loc.image}" loading = "lazy" onerror="this.src='/static/images/no-image.png'"></div>
                  <div class="card-content">
                      <div class="card-title">${loc.name}</div>
                      <div class="card-desc">${loc.description || "..."}</div>
                      ${badgeHTML}
                  </div>
              `;
        card.onclick = () => showDetail(loc);
        recArea.appendChild(card);
      });
    });
  }

function openUserProfile() {
    if (!currentUser) return;
    document.getElementById("profileModal").classList.add("active");
    
    // Load Data safely
    if(document.getElementById("profileUsername")) document.getElementById("profileUsername").value = currentUser.username || ""; 
    if(document.getElementById("profileFullname")) document.getElementById("profileFullname").value = currentUser.fullname || "";
    if(document.getElementById("profileEmail")) document.getElementById("profileEmail").value = currentUser.email || "";
    if(document.getElementById("profileRole")) document.getElementById("profileRole").innerText = currentUser.role || "Thành viên";
    
    // Switch to Info tab default (if tabs exist)
    if(typeof switchProfileTab === 'function') switchProfileTab('info');
}

function closeUserProfile() {
    document.getElementById("profileModal").classList.remove("active");
}

function switchProfileTab(tabName) {
    const contents = document.querySelectorAll(".profile-tab-content");
    contents.forEach(c => c.style.display = "none");
    
    const btns = document.querySelectorAll(".profile-tab-btn");
    btns.forEach(b => b.classList.remove("active"));
    
    const target = document.getElementById(`tab-${tabName}`);
    if(target) target.style.display = "block";
    
    const activeBtn = document.querySelector(`.profile-tab-btn[data-tab="${tabName}"]`);
    if(activeBtn) activeBtn.classList.add("active");

    if (tabName === 'plans') {
        if(typeof loadUserItinerariesList !== 'undefined') loadUserItinerariesList();
    }
}

async function submitProfileUpdate() {
    const fullname = document.getElementById("profileFullname").value;
    const email = document.getElementById("profileEmail").value;
   
    try {
        const res = await apiFetch("/api/profile", { 
             method: "POST",
             headers: {"Content-Type": "application/json"},
             body: JSON.stringify({ fullname, email })
        });
        
        if(res.success) {
            showNotification({type: 'success', message: 'Cập nhật hồ sơ thành công'});
            // Update global user
            if(currentUser) {
                currentUser.fullname = fullname;
                currentUser.email = email;
            }
            // Update Header Display
            const headerName = document.getElementById("header-username");
            if(headerName) headerName.innerText = fullname || currentUser.username;
        } else {
             showNotification({type: 'error', message: res.error || "Không thể cập nhật"});
        }
    } catch(e) { 
        console.error(e);
        showNotification({type: 'error', message: "Lỗi kết nối cập nhật hồ sơ"});
    }
}

// --- REVIEWS LOGIC ---

function toggleReviewForm() {
    const form = document.getElementById("reviewFormContainer");
    if(!form) return;
    
    if (form.style.display === "none" || form.style.display === "") {
        if (!currentUser) {
            openAuthModal();
            return;
        }
        form.style.display = "block";
    } else {
        form.style.display = "none";
    }
}

async function submitReview(locationName) {
    const ratingInput = document.querySelector('input[name="rating"]:checked');
    const commentInput = document.getElementById("reviewComment");
    
    if (!ratingInput) {
        showNotification({type: 'warning', message: "Vui lòng chọn số sao!"});
        return;
    }
    
    const rating = parseInt(ratingInput.value);
    const comment = commentInput.value.trim();

    try {
        const res = await apiFetch("/api/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                location_name: locationName,
                rating: rating,
                comment: comment
            })
        });

        if (res.success) {
            showNotification({type: "success", message: "Cảm ơn đánh giá của bạn!"});
            document.getElementById("reviewFormContainer").style.display = "none";
            commentInput.value = ""; // Reset
            loadReviews(locationName); // Reload list
            
            // Auto Update History/Recommendation
            if(typeof analyzeUser === 'function') analyzeUser(true);

        } else {
            showNotification({type: "error", message: res.error});
        }
    } catch(e) {
        showNotification({type: "error", message: "Lỗi gửi đánh giá"});
    }
}

async function loadReviews(locationName) {
    const container = document.getElementById("reviewList");
    if(!container) return;
    
    container.innerHTML = `<div style="text-align:center; color:#9ca3af;">Đang tải đánh giá...</div>`;

    try {
        const res = await apiFetch(`/api/reviews/${encodeURIComponent(locationName)}`);
        container.innerHTML = "";
        
        if (!res || res.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:10px; color:#9ca3af; font-size:13px;">Chưa có đánh giá nào. Hãy là người đầu tiên!</div>`;
            return;
        }

        res.forEach(rev => {
            const stars = "★".repeat(rev.rating) + "☆".repeat(5 - rev.rating);
            const div = document.createElement("div");
            div.className = "review-item";
            div.innerHTML = `
                <div class="review-user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="review-content">
                    <div class="review-author">
                        ${rev.user_fullname || rev.username} 
                        <span class="review-stars">${stars}</span>
                    </div>
                    <div class="review-text">${rev.comment || ""}</div>
                    <div class="review-date">${formatTime(rev.created_at)}</div>
                </div>
            `;
            container.appendChild(div);
        });

    } catch(e) {
        container.innerHTML = "Không thể tải đánh giá.";
    }
}

// --- SIMILAR LOCATIONS LOGIC ---
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
