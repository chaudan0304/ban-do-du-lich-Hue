// ===========================================
// MAP & LOCATION LOGIC
// ===========================================

// --- Global Variables ---
let map;
let markerLayer; 
let cachedAllLocations = null; // Cache toàn bộ địa điểm
let currentListData = [];     // Dữ liệu đang hiển thị (sau khi filter)
let markersMap = {};          // Map name -> Marker object
// currentUser và userLikedSet được khai báo trong utils.js
let currentCategory = "All";
let currentOpenLoc = null;
let isPickingMode = null; // Global Add/Edit mode state
let tempMarker = null;    // Marker for picker

// Heatmap
let heatLayer = null;
let isHeatmapActive = false;
let globalHeatData = [];

// --- Map Initialization ---
function initMap() {
  map = L.map("map", { zoomControl: false }).setView([16.4637, 107.5909], 14);
  
  // Theme Light Mode & Dark Mode
  // Revert to original OpenStreetMap tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  L.control.zoom({ position: "topright" }).addTo(map);
  markerLayer = L.markerClusterGroup({ disableClusteringAtZoom: 16 });
  map.addLayer(markerLayer);

  // Load user location default
  // FIXME: Chrome chặn request geolocation không từ user gesture. 
  // Nên chuyển sang nút bấm "Vị trí của tôi" thay vì auto-load.
  /*
  if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (pos) => {
              const { latitude, longitude } = pos.coords;
              const userIcon = L.divIcon({
                  className: "user-location-pulse",
                  html: '<div class="pulse-ring"></div><div class="user-dot"></div>',
                  iconSize: [20, 20]
              });
              L.marker([latitude, longitude], { icon: userIcon }).addTo(map).bindPopup("Vị trí của bạn");
          },
          (err) => console.log("Không lấy được vị trí người dùng")
      );
  }
  */

  // --- RESTORED LOGIC: MAP CLICK HANDLER (FOR ADMIN) ---
  map.on("click", (e) => {
    // Lấy tọa độ và làm tròn 5 số cho đẹp
    const lat = e.latlng.lat.toFixed(5);
    const lng = e.latlng.lng.toFixed(5);

    // --- TRƯỜNG HỢP 1: ĐANG THÊM MỚI (ADD) ---
    // Kiểm tra biến isPickingMode hoặc nếu đang mở modal Add
    const addModal = document.getElementById("addModal");
    if (isPickingMode === "add" || (addModal && addModal.classList.contains("active"))) {
      const latInput = document.getElementById("addLat");
      const lngInput = document.getElementById("addLng");
      
      if (latInput && lngInput) {
          latInput.value = lat;
          lngInput.value = lng;
      }

      // Reset trạng thái
      isPickingMode = null;
      document.getElementById("map").style.cursor = ""; 

      // Đảm bảo form thêm hiện lên
      if (addModal) addModal.classList.add("active");

      // (Tùy chọn) Hiện popup xác nhận nhanh
      L.popup().setLatLng(e.latlng).setContent("Đã chọn vị trí này cho địa điểm mới!").openOn(map);
    }

    // --- TRƯỜNG HỢP 2: ĐANG CHỈNH SỬA (EDIT) ---
    else if (isPickingMode === "edit") {
      document.getElementById("editLat").value = lat;
      document.getElementById("editLng").value = lng;

      // 1. Xóa marker tạm cũ nếu đã có (để tránh trên map có nhiều ghim rác)
      if (tempMarker) {
        map.removeLayer(tempMarker);
      }

      // 2. Tạo Marker mới tại vị trí vừa click
      tempMarker = L.marker([lat, lng], {
        draggable: true, // Cho phép kéo thả để chỉnh lại cho chuẩn
      }).addTo(map);

      // 3. Gắn popup cho nó để dễ nhìn
      tempMarker.bindPopup("<b>📍 Vị trí mới</b><br>Đang chờ lưu...").openPopup();

      // 4. Cập nhật lại tọa độ khi kéo thả marker này
      tempMarker.on("dragend", function (event) {
        var marker = event.target;
        var position = marker.getLatLng();
        document.getElementById("editLat").value = position.lat.toFixed(5);
        document.getElementById("editLng").value = position.lng.toFixed(5);
      });

      // Reset trạng thái
      isPickingMode = null;
      document.getElementById("map").style.cursor = "";

      // QUAN TRỌNG: Bật lại Modal Sửa
      document.getElementById("editModal").classList.add("active");

      // Thông báo nhỏ
      L.popup().setLatLng(e.latlng).setContent("Đã thay đổi vị trí!").openOn(map);
    }
  });
}

// --- Dynamic Icons ---
function getDynamicIcon(loc) {
    // Logic cũ đơn giản: Icon theo danh mục
    const iconMap = {
        "Di tích": "🏛️",
        "Ẩm thực": "🍜",
        "Thiên nhiên": "🌳",
        "Bãi biển": "🏖️",
        "Tâm linh": "🛕",
        "Lăng tẩm": "🏯",
        "Tham quan": "🏞️",
        "Mua sắm": "🛍️",
        "Cafe": "☕",
        "Check-in": "📸",
        "Dịch vụ": "🏨"
    };

    // Tìm symbol theo category (nếu category chứa từ khóa)
    let symbol = "📍";
    if (loc.category) {
        for (const [key, val] of Object.entries(iconMap)) {
            if (loc.category.includes(key)) {
                symbol = val;
                break;
            }
        }
    }

    // Luôn dùng class 'custom-pin' cơ bản, không biến đổi màu sắc theo PR/AI
    return L.divIcon({
      className: "custom-div-icon",
      html: `<div class='custom-pin'>${symbol}</div>`,
      iconSize: [30, 42],      // Kích thước cũ
      iconAnchor: [15, 42],    // Căn chỉnh lại anchor cho chuẩn với size 30
      popupAnchor: [0, -40]
    });
}


// --- Data Loading & Rendering ---
async function loadLocations(cat = "All", autoFit = true) {
  const listEl = document.getElementById("locationList");
  if(listEl) listEl.innerHTML = `<div style="text-align:center; padding:20px;">Đang tải...</div>`;
  
  try {
    // 1. Nếu chưa có cache, gọi API lấy toàn bộ 1 lần
    if (!cachedAllLocations) {
       const initialData = await apiFetch("/api/locations"); 
       cachedAllLocations = initialData || [];
    }

    // 2. Lọc dữ liệu từ Cache (Client-side filtering)
    let data = cachedAllLocations;
    if (cat !== "All") {
        const keyword = cat.trim().toLowerCase();
        data = cachedAllLocations.filter(loc => 
            loc.category && loc.category.toLowerCase().includes(keyword)
        );
    }
    
    currentListData = data;
    renderLocations(currentListData, autoFit);
    return Promise.resolve();

  } catch (err) {
    console.error(err);
    if(listEl) listEl.innerHTML = "Lỗi tải dữ liệu";
  }
}

function renderLocations(data, autoFit = true) {
  const list = document.getElementById("locationList");
  if (markerLayer) markerLayer.clearLayers();
  markersMap = {};
  if(list) list.innerHTML = "";
  
  // Update Heatmap Data
  globalHeatData = data.map(l => [l.lat, l.lng, (l.score || 0.1) * 5]); // Intensity * 5
  if(isHeatmapActive) updateHeatmapLayer();

  if (!data || data.length === 0) {
    if(list) list.innerHTML = `<div class="empty-state">Không tìm thấy địa điểm nào.</div>`;
    return;
  }

  const latLngs = [];
  data.forEach((loc) => {
    let displayScore = ((loc.score || 0) * 100).toFixed(1);

    // List item (Sidebar)
    if(list) {
        const div = document.createElement("div");
        div.className = "mini-item";
        div.innerHTML = `
        <img src="${loc.image}" loading="lazy" class="mini-img" onerror="this.src='/static/images/no-image.png'">
        <div class="mini-content">
            <div class="mini-name">${loc.name}</div>
            <div class="mini-score">
                <i class="fas fa-fire"></i> Hot: <span class="score-val">${displayScore}</span>
            </div>
        </div>
        `;
        div.onclick = () => showDetail(loc);
        list.appendChild(div);
    }

    // Map Marker
    const marker = L.marker([loc.lat, loc.lng], { icon: getDynamicIcon(loc) });
    const popupContent = document.createElement("div");
    popupContent.innerHTML = `
      <div style="text-align:center; cursor:pointer;">
        <b style="font-size:13px">${loc.name}</b><br>
        <span style="font-size:11px; color:#666">${loc.category}</span>
      </div>
    `;
    popupContent.onclick = () => showDetail(loc);

    marker.bindPopup(popupContent);
    marker.on("click", () => showDetail(loc));
    marker.addTo(markerLayer);
    markersMap[loc.name] = marker;

    latLngs.push([loc.lat, loc.lng]);
  });

  // Auto Zoom
  if (autoFit && latLngs.length > 0 && map && window.innerWidth > 768) {
    setTimeout(() => {
      map.fitBounds(latLngs, { padding: [50, 50], maxZoom: 15 });
    }, 100);
  }
}

function filterData(cat, btn, autoFit = true) {
  currentCategory = cat;

  // UI Active State
  const allChips = document.querySelectorAll(".chip");
  allChips.forEach((c) => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  else {
    allChips.forEach((c) => {
      if (c.innerText.includes(cat) || (cat === "All" && c.innerText === "Tất cả")) {
        c.classList.add("active");
      }
    });
  }

  return loadLocations(cat, autoFit);
}

function handleLocalSearch() {
  const input = document.getElementById("miniSearchInput");
  if (!input) return;
  const keyword = input.value.toLowerCase().trim();
  
  if (!keyword) {
    if(currentListData.length > 0) renderLocations(currentListData, false);
    else loadLocations("All", false);
    return;
  }

  // Search on FULL CACHE
  const sourceData = cachedAllLocations || [];
  const filtered = sourceData.filter((loc) => {
    return loc.name.toLowerCase().includes(keyword) || 
           (loc.description && loc.description.toLowerCase().includes(keyword));
  });

  renderLocations(filtered, true); // Auto zoom to search results
}

function flyToLocation(lat, lng, name) {
  if (window.innerWidth <= 768) {
    // Mobile: Might scroll properties panel instead
    return;
  }
  if (map) {
    map.flyTo([lat, lng], 16, { duration: 1.5 });
    if (markersMap[name]) {
      map.once("moveend", () => markersMap[name].openPopup());
    }
  }
}


// --- Show Detail Logic (Bridge between Map & UI) ---
// Note: This function handles heavy UI DOM manipulation
async function showDetail(loc) {
  // Sync Filter: Always switch to location's category
  if (currentCategory !== loc.category) {
      await filterData(loc.category, null, false);
  }

  currentOpenLoc = loc;
  // Logic đồng bộ điểm số hiển thị
  // Luôn dùng điểm số thực tế của địa điểm (PageRank Norm) để hiển thị Score Tag
  let displayScore = ((loc.score || 0) * 100).toFixed(1);

  let mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + " Thừa Thiên Huế")}`;
  flyToLocation(loc.lat, loc.lng, loc.name);
  
  const panel = document.getElementById("detail-panel");
  const content = document.getElementById("detail-content");
  
  // Fake stats for UI demo if not present
  const simUsers = Math.floor(Math.random() * 5) + 2; 
  const matchScore = Math.floor((loc.score || 0.8) * 100);
  const popScore = Math.floor(Math.random() * 40) + 40;

  // Like Button State
  const isLiked = userLikedSet.has(loc.name);
  
  // HTML Construction
  content.innerHTML = `
    <!-- 1. Header Navigation -->
    <div class="detail-header-nav" onclick="closeDetail()">
        <button class="detail-back-btn"><i class="fas fa-arrow-left"></i> Quay lại danh sách</button>
    </div>

    <!-- 2. Hero Image -->
    <div class="detail-hero-frame">
        <img src="${loc.image}" class="detail-hero-img" onerror="this.src='/static/images/no-image.png'">
    </div>

    <div class="detail-main-content">
        <!-- 3. Title & Meta -->
        <h1 class="detail-title-large">${loc.name}</h1>
        <div class="detail-tags-row">
            <span class="tag-pill tag-green"><i class="fas fa-fire"></i> ${displayScore}</span>
            <span class="tag-pill tag-gray"><i class="fas fa-tag"></i> ${loc.category}</span>
        </div>

        <!-- 4. Description -->
        <p class="detail-desc-text">${loc.description || "Một địa điểm thú vị tại Huế đang chờ bạn khám phá."}</p>

        ${currentUser ? (() => {
            const hasHistory = userLikedSet && userLikedSet.size > 0;
            
            // CHỈ hiển thị nếu có dữ liệu phân tích THẬT từ API (loc.reason_details)
            // Tuyệt đối không dùng số liệu ngẫu nhiên.
            if (!loc.reason_details) return "";

            // Use Backend contribution for Personalized, but Real Score for Cold Start Pop
            const pCollab = loc.reason_details.collab.percent;
            const pContent = loc.reason_details.content.percent;
            const pPop = ((loc.score || 0) * 100).toFixed(1); // Độ phổ biến dựa trên PageRank Score
            
            // ============================================================
            // CASE 1: COLD START (Chưa có lịch sử like)
            // Chỉ hiển thị độ nổi tiếng (PageRank), ẩn các chỉ số cá nhân hóa
            // ============================================================
            if (!hasHistory) {
                // Dùng Real Score chính xác đến 1 số lẻ (90.3%)
                const pPopReal = ((loc.score || 0) * 100).toFixed(1);

                return `
                <div class="ai-reason-card">
                    <div class="ai-reason-title"><i class="fas fa-fire" style="color:#ea580c;"></i> ĐỊA ĐIỂM NỔI BẬT</div>
                    
                    <div class="ai-highlight-box" style="background: #fff7ed; border-color: #ffedd5;">
                        <i class="fas fa-trophy" style="color:#f59e0b;"></i>
                        <span style="color:#9a3412;">Đây là một trong những địa điểm được check-in nhiều nhất tại Huế!</span>
                    </div>

                    <div class="ai-progress-row">
                         <div class="progress-label">
                            <span><i class="fas fa-fire" style="color:#f59e0b; width:15px;"></i> Độ phổ biến</span>
                            <span>${pPopReal}%</span>
                         </div>
                         <div class="progress-track"><div class="progress-fill" style="width:${pPopReal}%; background:#f59e0b;"></div></div>
                    </div>
                    
                     <div style="margin-top:12px; font-size:12px; color:#64748b; font-style:italic; border-top:1px dashed #e2e8f0; padding-top:8px;">
                        <i class="fas fa-info-circle"></i> Hãy thả tim <i class="far fa-heart"></i> vài địa điểm để AI hiểu gu của bạn hơn nhé!
                     </div>
                </div>
                `;
            }

            // ============================================================
            // CASE 2: PERSONALIZED (Đã có lịch sử like)
            // Hiển thị đầy đủ các chỉ số Collaborative, Content-based
            // ============================================================
            // Parse text "5 người..." để lấy số lượng user tương đồng thực tế
            const match = (loc.reason_details.collab.desc || "").match(/(\d+)/);
            const simCount = match ? match[0] : 0;


            return `
            <div class="ai-reason-card">
                <div class="ai-reason-title"><i class="fas fa-robot"></i> TẠI SAO GỢI Ý CHO BẠN?</div>
                
                <div class="ai-highlight-box">
                    <i class="fas fa-user-friends" style="color:#6366f1;"></i>
                    <span>${simCount} người có sở thích giống bạn đã thích địa điểm này</span>
                </div>

                <!-- Progress Bars -->
                <div class="ai-progress-row">
                     <div class="progress-label">
                        <span><i class="fas fa-quote-left" style="color:#6366f1; width:15px;"></i> Người dùng tương đồng</span>
                        <span>${pCollab}%</span>
                     </div>
                     <div class="progress-track"><div class="progress-fill" style="width:${pCollab}%; background:#3b82f6;"></div></div>
                </div>
                
                <div class="ai-progress-row">
                     <div class="progress-label">
                        <span><i class="fas fa-heart" style="color:#ec4899; width:15px;"></i> Tương tự địa điểm đã thích</span>
                        <span>${pContent}%</span>
                     </div>
                     <div class="progress-track"><div class="progress-fill" style="width:${pContent}%; background:#ec4899;"></div></div>
                </div>

                <div class="ai-progress-row">
                     <div class="progress-label">
                        <span><i class="fas fa-fire" style="color:#f59e0b; width:15px;"></i> Độ phổ biến</span>
                        <span>${pPop}%</span>
                     </div>
                     <div class="progress-track"><div class="progress-fill" style="width:${pPop}%; background:#f59e0b;"></div></div>
                </div>
            </div>
            `;
        })() : ""}

        <!-- 6. Action Buttons -->
        <div class="detail-actions-row">
            ${currentUser 
              ? `<button class="${isLiked ? "btn-large-action btn-outline liked" : "btn-large-action btn-outline"}" onclick="handleLike(this, '${loc.name}')">
                  <i class="${isLiked ? "fas" : "far"} fa-heart"></i> ${isLiked ? "Đã thích" : "Yêu thích"}
                 </button>`
              : `<button class="btn-large-action btn-outline" onclick="openAuthModal()"><i class="fas fa-lock"></i> Đăng nhập để thích</button>`
            }
            <a href="${mapLink}" target="_blank" class="btn-large-action btn-primary-blue">
                <i class="fas fa-directions"></i> Chỉ đường
            </a>
        </div>

        <!-- Admin Actions (Edit/Delete) - Cùng layout với nút trên -->
        ${currentUser && currentUser.role === "admin" ? `
        <div class="detail-actions-row admin-row">
            <button class="btn-large-action btn-outline" onclick="openEditModal()">
                <i class="fas fa-edit"></i> Chỉnh sửa
            </button>
            <button class="btn-large-action btn-outline btn-danger-outline" onclick="deleteLocation('${loc.name.replace(/'/g, "\\'")}')">
                <i class="fas fa-trash-alt"></i> Xóa địa điểm
            </button>
        </div>
        ` : ""}

        <!-- 7. Reviews (Loaded from Template) -->
        <div id="review-section-placeholder"></div>

        <!-- 8. Similar Locations -->
        <div class="section-header-modern">
            <span><i class="fas fa-map-marker-alt"></i> KHÁM PHÁ THÊM</span>
        </div>
        <div id="similar-locations-list" class="similar-locations-list" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
             <!-- Will be populated by JS -->
             <div style="text-align:center; grid-column:span 3; padding:20px; color:#94a3b8;">Đang tải...</div>
        </div>
    </div>
  `;

  // --- TEMPLATE LOGIC FOR REVIEWS ---
  const reviewPlaceholder = content.querySelector("#review-section-placeholder");
  const template = document.getElementById("review-template");
  if (reviewPlaceholder && template) {
      const clone = template.content.cloneNode(true);
      
      // Wire up events manually since we lost inline onclicks
      const btnToggle = clone.getElementById("btn-toggle-review");
      if(btnToggle) {
          if (!currentUser) {
              btnToggle.style.display = "none";
          } else {
              btnToggle.onclick = toggleReviewForm;
          }
      }

      const btnSubmit = clone.getElementById("btn-submit-review");
      if(btnSubmit) btnSubmit.onclick = () => submitReview(loc.name);

      reviewPlaceholder.appendChild(clone);
  }

  panel.classList.add("active");
  
  if(window.loadReviews) window.loadReviews(loc.name);
  if(window.loadSimilarLocations) window.loadSimilarLocations(loc.name);
}

function closeDetail() {
  document.getElementById("detail-panel").classList.remove("active");
}

// --- Heatmap Logic ---
function toggleHeatmap() {
    isHeatmapActive = !isHeatmapActive;
    const btn = document.getElementById("btn-toggle-heatmap");
    const legend = document.getElementById("heatmap-legend");

    if (isHeatmapActive) {
        btn.classList.add("active");
        legend.style.display = "block";
        updateHeatmapLayer();
    } else {
        btn.classList.remove("active");
        legend.style.display = "none";
        if (heatLayer) map.removeLayer(heatLayer);
    }
}

function updateHeatmapLayer() {
    if (!map || !globalHeatData.length) return;
    if (heatLayer) map.removeLayer(heatLayer);

    // Requires leaflet.heat plugin script to be loaded
    if (L.heatLayer) {
        heatLayer = L.heatLayer(globalHeatData, {
            radius: 25,
            blur: 15,
            maxZoom: 14,
            max: 5.0, // Should match max intensity scale
            gradient: { 0.2: "blue", 0.4: "lime", 0.6: "yellow", 0.8: "orange", 1.0: "red" }
        }).addTo(map);
    }
}

// Helper: ShowDetailFromData (từ History hoặc Suggestion click)
function showDetailFromData(name) {
    if(window.closeUserProfile) window.closeUserProfile();
    
    // Find in cache
    let loc = cachedAllLocations ? cachedAllLocations.find(l => l.name === name) : null;
    if(loc) showDetail(loc);
    else {
        // Fetch specific location text ignored for now
        showNotification({type: 'error', message: 'Không tìm thấy dữ liệu địa điểm này'});
    }
}

// Helper: Show Detail with injected AI Data (Fix bug click suggestion)
function showDetailWithAI(aiLoc) {
    console.log("🖱️ showDetailWithAI called for:", aiLoc.name);
    
    // Đóng profile modal nếu đang mở
    if(window.closeUserProfile) window.closeUserProfile();

    // Helper chuẩn hóa chuỗi để so sánh
    const normalize = (str) => str ? str.trim().toLowerCase() : "";
    const targetName = normalize(aiLoc.name);

    // Tìm real location trong cache
    let realLoc = cachedAllLocations ? cachedAllLocations.find(l => normalize(l.name) === targetName) : null;
    
    if (realLoc) {
        console.log(`✅ Found "${realLoc.name}" in cache`);
        // Merge AI Data vào real location
        realLoc.reason_details = aiLoc.reason_details;
        realLoc.reason = aiLoc.reason;
        realLoc.reason_icon = aiLoc.reason_icon;
        realLoc.reason_type = aiLoc.reason_type;
        
        // Gọi showDetail trực tiếp
        showDetail(realLoc);
    } else {
        console.warn(`⚠️ "${aiLoc.name}" not in cache, using API data directly`);
        // Đảm bảo có category
        if (!aiLoc.category) aiLoc.category = "Tham quan"; 
        showDetail(aiLoc);
    }
}


