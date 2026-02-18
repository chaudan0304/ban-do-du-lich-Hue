// ============================================================================
// LOGIC GỢI Ý AI / AI RECOMMENDATION LOGIC
//
// Mô tả / Description:
//   Tách từ profile.js để tổ chức code tốt hơn.
//   Separated from profile.js for better code organization.
//   Chịu trách nhiệm phân tích sở thích người dùng và hiển thị gợi ý AI.
//   Responsible for analyzing user preferences and displaying AI recommendations.
//
// Nội dung / Contents:
//   - analyzeUser()              → Entry point (debounce 500ms) / Entry point with 500ms debounce
//   - _runAnalyzeUser()          → Logic chính: tải lịch sử + gọi gợi ý / Main logic: load history + fetch recommendations
//   - getRecommendations()       → Tải danh sách gợi ý từ API / Fetch recommendation list from API
//   - loadGuestRecommendations() → Gợi ý Top PageRank cho khách / Top PageRank recommendations for guests
//   - loadSimilarLocations()     → Tải địa điểm tương tự / Load similar locations
//
// Thuật toán / Algorithms:
//   - Collaborative Filtering: Dựa trên người dùng tương đồng / Based on similar users
//   - Content-based: Dựa trên danh mục sở thích / Based on category preferences
//   - Weighted PageRank: Điểm phổ biến / Popularity score
//
// Phụ thuộc / Dependencies:
//   - utils.js    → currentUser, userLikedSet, apiFetch(), escapeHTML()
//   - map.js      → cachedAllLocations, showDetailFromData(), showDetailWithAI()
//   - app.js      → switchSidebarTab()
//   - profile.js  → openUserProfile()
// ============================================================================

// ── PHÂN TÍCH NGƯỜI DÙNG (ENTRY POINT) / ANALYZE USER (ENTRY POINT) ──
// Mục đích: Debounce 500ms trước khi chạy phân tích thực sự.
//           Tránh gọi API quá nhiều lần khi user like/unlike liên tục.
// Purpose:  Debounces 500ms before running actual analysis.
//           Prevents excessive API calls when user rapidly likes/unlikes.
// Tham số / Parameter: isLoggedInUser — true nếu phân tích cho user đang đăng nhập
//                      isLoggedInUser — true if analyzing for currently logged-in user
let _analyzeTimeout = null;
function analyzeUser(isLoggedInUser = false) {
    clearTimeout(_analyzeTimeout);
    _analyzeTimeout = setTimeout(() => _runAnalyzeUser(isLoggedInUser), 500);
}

// ── LOGIC PHÂN TÍCH CHÍNH / MAIN ANALYSIS LOGIC ──
// Mục đích: Xác định user cần phân tích → chuyển tab sidebar sang "Gợi ý"
//           → tải lịch sử yêu thích → hiển thị chips lịch sử → gọi getRecommendations().
// Purpose:  Determines target user → switches sidebar to "For You" tab
//           → loads like history → displays history chips → calls getRecommendations().
// Chi tiết / Details:
//   - Nếu isLoggedInUser = true → lấy username từ currentUser
//     If isLoggedInUser = true → gets username from currentUser
//   - Nếu isLoggedInUser = false → lấy từ input #usernameInput (dành cho admin xem profile khác)
//     If isLoggedInUser = false → gets from #usernameInput (for admin viewing other profiles)
function _runAnalyzeUser(isLoggedInUser = false) {
    // Xác định target user / Determine target user
    let targetUser = isLoggedInUser 
        ? (currentUser ? currentUser.username : "") 
        : (document.getElementById("usernameInput") ? document.getElementById("usernameInput").value.trim() : "");
    
    if (!targetUser) return;
  
    // Tự động chuyển tab sidebar sang "Gợi ý" / Auto-switch sidebar tab to "For You"
    if (typeof switchSidebarTab === 'function') switchSidebarTab('foryou');
  
    // ── Tải lịch sử yêu thích / Load like history ──
    apiFetch(`/api/history/${targetUser}`).then((data) => {
        userLikedSet.clear();
        const histDiv = document.getElementById("user-history");
        const histList = document.getElementById("history-list");
        
        if(!histDiv || !histList) return;
        
        if (data && data.length > 0) {
            // Cập nhật userLikedSet toàn cục / Update global userLikedSet
            data.forEach((item) => userLikedSet.add(item.name));
            histDiv.style.display = "block";
            
            // GIỚI HẠN HIỂN THỊ: Chỉ hiện 6 chips (~ 2 dòng) để tránh chiếm quá nhiều không gian
            // DISPLAY LIMIT: Only show 6 chips (~ 2 lines) to avoid taking too much space
            const LIMIT = 6;
            const visibleItems = data.slice(0, LIMIT);
            
            // Xây dựng history chips bằng DOM API (chống XSS — không dùng innerHTML)
            // Build history chips using DOM API (XSS prevention — no innerHTML)
            histList.innerHTML = "";
            visibleItems.forEach(place => {
                const chip = document.createElement("div");
                chip.className = "hist-chip";
                const img = document.createElement("img");
                img.src = place.image;
                img.onerror = function() { this.src = '/static/images/no-image.png'; };
                chip.appendChild(img);
                chip.appendChild(document.createTextNode(" " + place.name));
                // Click chip → xem chi tiết / Click chip → view detail
                chip.addEventListener("click", () => showDetailFromData(place.name));
                histList.appendChild(chip);
            });

            // Nút "Xem thêm" nếu có nhiều hơn LIMIT / "See more" button if more than LIMIT
            if (data.length > LIMIT) {
                const moreChip = document.createElement("div");
                moreChip.className = "hist-chip more-chip";
                moreChip.style.cssText = "background: #eef2ff; color: var(--primary); font-weight: 600; cursor: pointer;";
                moreChip.textContent = `+${data.length - LIMIT} xem thêm`;
                moreChip.addEventListener("click", () => openUserProfile());
                histList.appendChild(moreChip);
            }
        } else { 
            // Ẩn section lịch sử nếu chưa thích gì / Hide history section if nothing liked
            histDiv.style.display = "none"; 
        }
    });
    
    // Gọi API lấy danh sách gợi ý / Call API to get recommendation list
    getRecommendations(targetUser);
}

// ── LẤY GỢI Ý TỪ AI / FETCH AI RECOMMENDATIONS ──
// Mục đích: Gọi API /api/recommend/:user, render danh sách thẻ gợi ý.
//           Mỗi thẻ hiển thị: ảnh, tên, mô tả, và badge lý do gợi ý (collab/content-based/pagerank).
// Purpose:  Calls API /api/recommend/:user, renders recommendation cards.
//           Each card shows: image, name, description, and reason badge (collab/content-based/pagerank).
// Tham số / Parameter: user — Username cần lấy gợi ý / Username to get recommendations for
function getRecommendations(user) {
    const recArea = document.getElementById("recommendation-area");
    if(!recArea) return;
    
    // Hiển thị loading spinner / Show loading spinner
    recArea.innerHTML = `<div style="text-align:center; padding:40px; color:#6b7280;"><i class="fas fa-circle-notch fa-spin fa-2x"></i></div>`;
  
    apiFetch(`/api/recommend/${user}`).then((data) => {
        recArea.innerHTML = "";
        
        // Trường hợp không có gợi ý / No recommendations available
        if (!data || data.length === 0) {
            recArea.innerHTML = `<div class="empty-state">Chưa có gợi ý nào cho ${user}</div>`;
            return;
        }
        
        // Render từng thẻ gợi ý / Render each recommendation card
        data.forEach((loc) => {
            const card = document.createElement("div");
            card.className = "ai-card";
            card.innerHTML = `
                <div class="card-thumb">
                    <img src="${loc.image}" onerror="this.src='/static/images/no-image.png'">
                </div>
                <div class="card-content">
                    <div class="card-title">${escapeHTML(loc.name)}</div>
                    <div class="card-desc">${escapeHTML(loc.description) || "..."}</div>
                    <div class="algo-badge badge-${loc.reason_type || 'default'}">${loc.reason_icon || '🤖'} ${escapeHTML(loc.reason) || 'AI'}</div>
                </div>`;
            
            // Click thẻ → hiển thị chi tiết kèm dữ liệu AI / Click card → show detail with AI data
            card.onclick = () => { 
                if(typeof showDetailWithAI === 'function') showDetailWithAI(loc); 
                else showDetail(loc); 
            };
            
            recArea.appendChild(card);
        });
    });
}

// ── GỢI Ý CHO KHÁCH (CHƯA ĐĂNG NHẬP) / GUEST RECOMMENDATIONS (NOT LOGGED IN) ──
// Mục đích: Hiển thị Top 12 địa điểm phổ biến nhất (theo PageRank score) cho khách.
//           Dùng cache nếu có, tránh gọi API trùng lặp.
// Purpose:  Shows Top 12 most popular locations (by PageRank score) for guests.
//           Uses cache if available, avoids redundant API calls.
// Cơ chế xếp hạng / Ranking mechanism:
//   Top 1 → Badge vàng 🥇 / Gold badge
//   Top 2-5 → Badge đỏ 🔥 / Red badge
//   Top 6-10 → Badge cam ⭐ / Orange badge
//   Top 11-12 → Badge xanh 📍 / Blue badge
function loadGuestRecommendations() {
    const recArea = document.getElementById("recommendation-area");
    if (!recArea) return;

    // Loading spinner
    recArea.innerHTML = `<div style="text-align:center; padding:40px; color:#6b7280;"><i class="fas fa-circle-notch fa-spin fa-2x"></i></div>`;

    // Sử dụng cache nếu đã có, tránh gọi API trùng lặp
    // Use cache if available, avoid redundant API calls
    const dataPromise = (typeof cachedAllLocations !== 'undefined' && cachedAllLocations && cachedAllLocations.length > 0)
        ? Promise.resolve(cachedAllLocations)
        : apiFetch("/api/locations");

    dataPromise.then((data) => {
        recArea.innerHTML = "";

        if (!data || data.length === 0) {
            recArea.innerHTML = `<div class="empty-state">Chưa có dữ liệu địa điểm</div>`;
            return;
        }

        // Sắp xếp theo score (PageRank) giảm dần, lấy Top 12
        // Sort by score (PageRank) descending, take Top 12
        const topLocations = [...data]
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 12);

        topLocations.forEach((loc, index) => {
            const rank = index + 1;
            
            // Badge hiển thị theo thứ hạng / Badge based on rank
            let badgeHTML = '';
            if (rank === 1) {
                badgeHTML = `<div class="algo-badge badge-top1">🥇 Top 1 Nổi bật</div>`;
            } else if (rank <= 5) {
                badgeHTML = `<div class="algo-badge badge-top5">🔥 Top ${rank} Nổi bật</div>`;
            } else if (rank <= 10) {
                badgeHTML = `<div class="algo-badge badge-top10">⭐ Top ${rank} Nổi bật</div>`;
            } else {
                badgeHTML = `<div class="algo-badge badge-pr">📍 Địa điểm nổi bật</div>`;
            }

            const card = document.createElement("div");
            card.className = "ai-card";
            card.innerHTML = `
                <div class="card-thumb">
                    <img src="${loc.image}" onerror="this.src='/static/images/no-image.png'">
                </div>
                <div class="card-content">
                    <div class="card-title">${escapeHTML(loc.name)}</div>
                    <div class="card-desc">${escapeHTML(loc.description) || "..."}</div>
                    ${badgeHTML}
                </div>`;

            // Click → hiển thị chi tiết / Click → show detail
            card.onclick = () => {
                if (typeof showDetailWithAI === 'function') showDetailWithAI(loc);
                else if (typeof showDetail === 'function') showDetail(loc);
            };

            recArea.appendChild(card);
        });
    });
}

// ── TẢI ĐỊA ĐIỂM TƯƠNG TỰ / LOAD SIMILAR LOCATIONS ──
// Mục đích: Gọi API /api/similar/:locationName, render danh sách thẻ "Khám phá thêm".
//           Mỗi thẻ hiển thị ảnh, tên, và điểm tương đồng (cosine similarity × 100).
// Purpose:  Calls API /api/similar/:locationName, renders "Explore More" card list.
//           Each card shows image, name, and similarity score (cosine similarity × 100).
// Tham số / Parameter: locationName — Tên địa điểm gốc cần tìm tương tự
//                      locationName — Name of the base location to find similar ones for
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
                // Điểm tương đồng (0.0-1.0) × 100 để hiển thị %
                // Similarity score (0.0-1.0) × 100 for display %
                const score = ((loc.score || 0) * 100).toFixed(1);
                const card = document.createElement("div");
                card.className = "similar-card";
                card.innerHTML = `
                    <img src="${loc.image}" loading="lazy" class="similar-card-img" onerror="this.src='/static/images/no-image.png'">
                    <div class="similar-card-info">
                        <div class="similar-card-name">${escapeHTML(loc.name)}</div>
                        <div class="similar-card-score"><i class="fas fa-chart-bar"></i> ${score}</div>
                    </div>
                `;
                
                // Click → hiển thị chi tiết / Click → show detail
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
