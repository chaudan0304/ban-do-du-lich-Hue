// ===========================================
// AI RECOMMENDATION LOGIC
// ===========================================
// Tách từ profile.js để tổ chức code tốt hơn

/**
 * Phân tích lịch sử người dùng và hiển thị gợi ý
 * @param {boolean} isLoggedInUser - true nếu là user đang đăng nhập
 */
function analyzeUser(isLoggedInUser = false) {
    let targetUser = isLoggedInUser 
        ? (currentUser ? currentUser.username : "") 
        : (document.getElementById("usernameInput") ? document.getElementById("usernameInput").value.trim() : "");
    
    if (!targetUser) return;
  
    // Tự động chuyển tab sang Gợi ý
    if (typeof switchSidebarTab === 'function') switchSidebarTab('foryou');
  
    // Lấy lịch sử liked của user
    apiFetch(`/api/history/${targetUser}`).then((data) => {
        userLikedSet.clear();
        const histDiv = document.getElementById("user-history");
        const histList = document.getElementById("history-list");
        
        if(!histDiv || !histList) return;
        
        if (data && data.length > 0) {
            data.forEach((item) => userLikedSet.add(item.name));
            histDiv.style.display = "block";
            
            // LIMIT DISPLAY (2 lines approx ~ 6 items)
            const LIMIT = 6;
            const visibleItems = data.slice(0, LIMIT);
            let html = visibleItems.map(place => 
                `<div class="hist-chip" onclick="showDetailFromData('${place.name}')">
                    <img src="${place.image}" onerror="this.src='/static/images/no-image.png'"> ${place.name}
                 </div>`
            ).join("");

            if (data.length > LIMIT) {
                html += `<div class="hist-chip more-chip" onclick="openUserProfile()" style="background: #eef2ff; color: var(--primary); font-weight: 600; cursor: pointer;">
                            +${data.length - LIMIT} xem thêm
                         </div>`;
            }
            
            histList.innerHTML = html;
        } else { 
            histDiv.style.display = "none"; 
        }
    });
    
    // Lấy danh sách gợi ý
    getRecommendations(targetUser);
}

/**
 * Lấy và hiển thị danh sách gợi ý từ API
 * @param {string} user - Username để lấy gợi ý
 */
function getRecommendations(user) {
    const recArea = document.getElementById("recommendation-area");
    if(!recArea) return;
    
    // Loading state
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
            card.innerHTML = `
                <div class="card-thumb">
                    <img src="${loc.image}" onerror="this.src='/static/images/no-image.png'">
                </div>
                <div class="card-content">
                    <div class="card-title">${loc.name}</div>
                    <div class="card-desc">${loc.description || "..."}</div>
                    <div class="algo-badge badge-${loc.reason_type || 'default'}">${loc.reason_icon || '🤖'} ${loc.reason || 'AI'}</div>
                </div>`;
            
            card.onclick = () => { 
                if(typeof showDetailWithAI === 'function') showDetailWithAI(loc); 
                else showDetail(loc); 
            };
            
            recArea.appendChild(card);
        });
    });
}

/**
 * Tải và hiển thị các địa điểm tương tự
 * @param {string} locationName - Tên địa điểm cần tìm tương tự
 */
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
                
                card.onclick = () => { 
                    if(typeof showDetailWithAI === 'function') showDetailWithAI(loc); 
                    else showDetail(loc); 
                };
                
                container.appendChild(card);
            });
        })
        .catch((err) => {
            console.error("Lỗi tải địa điểm tương tự:", err);
            container.innerHTML = `<div class="similar-empty">Không thể tải dữ liệu</div>`;
        });
}
