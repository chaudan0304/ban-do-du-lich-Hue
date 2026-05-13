// ============================================================================
// BẢN ĐỒ & LOGIC ĐỊA ĐIỂM / MAP & LOCATION LOGIC
//
// Mô tả / Description:
//   File lớn nhất của ứng dụng, chịu trách nhiệm khởi tạo bản đồ Leaflet,
//   hiển thị marker, tải dữ liệu địa điểm, hiển thị chi tiết, và xử lý tương tác bản đồ.
//   The largest file in the app, responsible for initializing the Leaflet map,
//   displaying markers, loading location data, showing details, and handling map interactions.
//
// Nội dung / Contents:
//   - initMap()             → Khởi tạo bản đồ Leaflet + map click handler / Init Leaflet map + click handler
//   - getDynamicIcon()      → Tạo icon marker theo danh mục + xếp hạng / Create marker icons by category + rank
//   - loadLocations()       → Tải & cache dữ liệu địa điểm từ API / Load & cache location data from API
//   - renderLocations()     → Render danh sách sidebar + markers trên map / Render sidebar list + map markers
//   - filterData()          → Lọc theo danh mục / Filter by category
//   - handleLocalSearch()   → Tìm kiếm client-side trên cache / Client-side search on cache
//   - flyToLocation()       → Bay đến vị trí trên map / Fly to location on map
//   - showDetail()          → Hiển thị panel chi tiết địa điểm / Show location detail panel
//   - closeDetail()         → Đóng panel chi tiết / Close detail panel
//   - toggleHeatmap()       → Bật/tắt lớp nhiệt / Toggle heatmap layer
//   - showDetailFromData()  → Hiện chi tiết từ tên (từ cache) / Show detail from name (from cache)
//   - showDetailWithAI()    → Hiện chi tiết kèm dữ liệu AI / Show detail with injected AI data
//
// Phụ thuộc / Dependencies:
//   - utils.js      → escapeHTML(), currentUser, userLikedSet, showNotification(), apiFetch()
//   - reviews.js    → loadReviews(), toggleReviewForm(), submitReview()
//   - recommend.js  → loadSimilarLocations()
//   - profile.js    → handleLike(), closeUserProfile()
//   - admin.js      → openEditModal(), deleteLocation()
//
// Thư viện ngoài / External Libraries:
//   - Leaflet.js              → Bản đồ / Map engine
//   - leaflet.markercluster   → Gom nhóm marker / Marker clustering
//   - leaflet.heat            → Bản đồ nhiệt / Heatmap layer
// ============================================================================

// ── BIẾN TOÀN CỤC / GLOBAL VARIABLES ──
let map;                         // Instance bản đồ Leaflet / Leaflet map instance
let markerLayer;                 // Nhóm marker cluster / Marker cluster group
let cachedAllLocations = null;   // Cache toàn bộ địa điểm từ API (chỉ fetch 1 lần) / Cache all locations (fetched once)
let currentListData = [];        // Dữ liệu đang hiển thị sau khi lọc / Currently displayed data (after filtering)
let markersMap = {};             // Map: tên địa điểm → Marker object (để flyTo & openPopup) / Map: location name → Marker object
// currentUser và userLikedSet được khai báo trong utils.js
// currentUser and userLikedSet are declared in utils.js
let currentCategory = "All";    // Danh mục đang được lọc / Currently selected filter category
let currentOpenLoc = null;      // Địa điểm đang mở chi tiết / Currently open location detail
let isPickingMode = null;       // Chế độ chọn vị trí trên bản đồ: "add" | "edit" | null / Map picking mode: "add" | "edit" | null
let tempMarker = null;          // Marker tạm khi chọn vị trí sửa / Temporary marker for edit location picker

// Biến Heatmap / Heatmap variables
let heatLayer = null;           // Layer nhiệt Leaflet / Leaflet heat layer instance
let isHeatmapActive = false;    // Trạng thái bật/tắt / Toggle state
let globalHeatData = [];        // Dữ liệu nhiệt [lat, lng, intensity] / Heat data array

// ── KHỞI TẠO BẢN ĐỒ / MAP INITIALIZATION ──
// Mục đích: Tạo bản đồ Leaflet với tâm tại Huế (16.4637, 107.5909), zoom 14.
//           Thêm tile layer OpenStreetMap, zoom control, và marker cluster group.
//           Thiết lập xử lý click bản đồ cho Admin (chọn tọa độ khi thêm/sửa địa điểm).
// Purpose:  Creates a Leaflet map centered on Huế (16.4637, 107.5909), zoom 14.
//           Adds OpenStreetMap tile layer, zoom control, and marker cluster group.
//           Sets up map click handler for Admin (pick coordinates when adding/editing locations).
function initMap() {
  map = L.map("map", { zoomControl: false }).setView([16.4637, 107.5909], 14);

  // Tile layer OpenStreetMap / OpenStreetMap tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // Zoom control ở góc trên-phải / Zoom control at top-right
  L.control.zoom({ position: "topright" }).addTo(map);

  // Marker Cluster: Gom nhóm markers khi zoom nhỏ, tách ra khi zoom >= 16
  // Marker Cluster: Groups markers at low zoom, separates at zoom >= 16
  markerLayer = L.markerClusterGroup({ disableClusteringAtZoom: 16 });
  map.addLayer(markerLayer);

  // FIXME: Chrome chặn geolocation request không từ user gesture.
  //        Nên chuyển sang nút bấm "Vị trí của tôi" thay vì auto-load.
  // FIXME: Chrome blocks geolocation requests not from user gestures.
  //        Should switch to a "My Location" button instead of auto-loading.
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

  // ── XỬ LÝ CLICK BẢN ĐỒ (CHO ADMIN) / MAP CLICK HANDLER (FOR ADMIN) ──
  // Khi admin bật chế độ chọn vị trí (isPickingMode), click bản đồ sẽ tự
  // điền tọa độ vào form thêm/sửa địa điểm.
  // When admin activates picking mode (isPickingMode), clicking the map will
  // automatically fill coordinates into the add/edit location form.
  map.on("click", (e) => {
    // Lấy tọa độ và làm tròn 5 chữ số thập phân
    // Get coordinates and round to 5 decimal places
    const lat = e.latlng.lat.toFixed(5);
    const lng = e.latlng.lng.toFixed(5);

    // --- TRƯỜNG HỢP 1: ĐANG THÊM MỚI (ADD) / CASE 1: ADDING NEW LOCATION ---
    const addModal = document.getElementById("addModal");
    if (isPickingMode === "add" || (addModal && addModal.classList.contains("active"))) {
      const latInput = document.getElementById("addLat");
      const lngInput = document.getElementById("addLng");

      if (latInput && lngInput) {
        latInput.value = lat;
        lngInput.value = lng;
      }

      // Reset trạng thái chọn / Reset picking state
      isPickingMode = null;
      document.getElementById("map").style.cursor = "";

      // Đảm bảo form thêm hiện lên / Ensure add form is visible
      if (addModal) addModal.classList.add("active");

      // Popup xác nhận vị trí / Confirmation popup
      L.popup().setLatLng(e.latlng).setContent("Đã chọn vị trí này cho địa điểm mới!").openOn(map);
    }

    // --- TRƯỜNG HỢP 2: ĐANG CHỈNH SỬA (EDIT) / CASE 2: EDITING LOCATION ---
    else if (isPickingMode === "edit") {
      document.getElementById("editLat").value = lat;
      document.getElementById("editLng").value = lng;

      // Xóa marker tạm cũ nếu có / Remove old temp marker if exists
      if (tempMarker) {
        map.removeLayer(tempMarker);
      }

      // Tạo Marker mới tại vị trí click (có thể kéo thả)
      // Create new marker at clicked position (draggable)
      tempMarker = L.marker([lat, lng], {
        draggable: true,
      }).addTo(map);

      // Popup hiển thị trạng thái / Status popup
      tempMarker.bindPopup("<b>📍 Vị trí mới</b><br>Đang chờ lưu...").openPopup();

      // Cập nhật tọa độ khi kéo thả marker / Update coordinates when marker is dragged
      tempMarker.on("dragend", function (event) {
        var marker = event.target;
        var position = marker.getLatLng();
        document.getElementById("editLat").value = position.lat.toFixed(5);
        document.getElementById("editLng").value = position.lng.toFixed(5);
      });

      // Reset trạng thái chọn / Reset picking state
      isPickingMode = null;
      document.getElementById("map").style.cursor = "";

      // Bật lại Modal Sửa / Re-open Edit Modal
      document.getElementById("editModal").classList.add("active");

      // Thông báo nhỏ / Quick notification popup
      L.popup().setLatLng(e.latlng).setContent("Đã thay đổi vị trí!").openOn(map);
    }
  });
}

// ── ICON ĐỘNG THEO DANH MỤC / DYNAMIC ICONS BY CATEGORY ──
// Mục đích: Tạo icon marker (divIcon) với emoji phù hợp theo danh mục địa điểm.
//           Phân biệt Top 1/5/10 PageRank bằng màu viền (vàng/đỏ/cam).
// Purpose:  Creates marker icons (divIcon) with appropriate emoji per location category.
//           Distinguishes Top 1/5/10 PageRank with border colors (gold/red/orange).
function getDynamicIcon(loc) {
  // Bảng ánh xạ danh mục → emoji / Category → emoji mapping table
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

  // Tìm symbol theo category / Find symbol by category
  let symbol = "📍"; // Mặc định / Default
  if (loc.category) {
    for (const [key, val] of Object.entries(iconMap)) {
      if (loc.category.includes(key)) {
        symbol = val;
        break;
      }
    }
  }

  // Phân biệt 3 mức Top PageRank bằng class CSS / Distinguish 3 PageRank tiers via CSS class
  let pinClass = 'custom-pin';
  if (loc.topRank === 1) pinClass = 'custom-pin pin-top1';  // Vàng gold / Gold
  else if (loc.topRank <= 5) pinClass = 'custom-pin pin-top5';  // Đỏ / Red
  else if (loc.topRank <= 10) pinClass = 'custom-pin pin-top10'; // Cam / Orange

  return L.divIcon({
    className: "custom-div-icon",
    html: `<div class='${pinClass}'><span>${symbol}</span></div>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40]
  });
}


// ── TẢI & CACHE DỮ LIỆU ĐỊA ĐIỂM / DATA LOADING & CACHING ──
// Mục đích: Tải toàn bộ địa điểm từ API 1 lần rồi cache. Các lần sau lọc client-side.
// Purpose:  Fetches all locations from API once, then caches. Subsequent calls filter client-side.
// Tham số / Parameters:
//   - cat:     Danh mục cần lọc ("All" = tất cả) / Category to filter ("All" = all)
//   - autoFit: Tự động zoom map vào dữ liệu / Auto-zoom map to fit data
async function loadLocations(cat = "All", autoFit = true) {
  const listEl = document.getElementById("locationList");
  if (listEl) listEl.innerHTML = `<div style="text-align:center; padding:20px;">Đang tải...</div>`;

  try {
    // Nếu chưa có cache, gọi API lấy toàn bộ 1 lần
    // If no cache exists, fetch all locations once from API
    if (!cachedAllLocations) {
      const initialData = await apiFetch("/api/locations");
      cachedAllLocations = initialData || [];
    }

    // Lọc dữ liệu từ Cache (client-side filtering)
    // Filter data from Cache (client-side filtering)
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
    if (listEl) listEl.innerHTML = "Lỗi tải dữ liệu";
  }
}

// ── RENDER DANH SÁCH & MARKER / RENDER LIST & MARKERS ──
// Mục đích: Xóa markers cũ, tính toán Top PageRank, render danh sách sidebar + markers trên bản đồ.
// Purpose:  Clears old markers, calculates Top PageRank, renders sidebar list + map markers.
function renderLocations(data, autoFit = true) {
  const list = document.getElementById("locationList");
  if (markerLayer) markerLayer.clearLayers();
  markersMap = {};
  if (list) list.innerHTML = "";

  // Cập nhật dữ liệu Heatmap / Update Heatmap data
  globalHeatData = data.map(l => [l.lat, l.lng, (l.score || 0.1) * 5]); // Intensity * 5
  if (isHeatmapActive) updateHeatmapLayer();

  if (!data || data.length === 0) {
    if (list) list.innerHTML = `<div class="empty-state">Không tìm thấy địa điểm nào.</div>`;
    return;
  }

  // ── TÍNH TOÁN XẾP HẠNG PAGERANK / CALCULATE PAGERANK RANKING ──
  // Dùng toàn bộ cache để xếp hạng nhất quán (không phụ thuộc vào bộ lọc hiện tại)
  // Uses full cache for consistent ranking (regardless of current filter)
  const allData = cachedAllLocations || data;
  const sortedByScore = [...allData].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Tạo map: tên location → thứ hạng (1-based) / Create rank map: name → rank (1-based)
  const rankMap = {};
  sortedByScore.forEach((loc, index) => {
    rankMap[loc.name] = index + 1;
  });

  // Gán topRank cho data hiện tại / Assign topRank to current data
  data.forEach(loc => {
    loc.topRank = rankMap[loc.name] || 999;
  });

  const latLngs = [];
  data.forEach((loc) => {
    let displayScore = ((loc.score || 0) * 100).toFixed(1);

    // ── Render mục sidebar / Render sidebar item ──
    if (list) {
      const div = document.createElement("div");
      div.className = "mini-item";
      div.innerHTML = `
        <img src="${loc.image}" loading="lazy" class="mini-img" onerror="this.src='/static/images/no-image.png'">
        <div class="mini-content">
            <div class="mini-name">${escapeHTML(loc.name)}</div>
            <div class="mini-score">
                <i class="fas fa-fire"></i> Hot: <span class="score-val">${displayScore}</span><span style="color:#94a3b8; font-weight:400;">/100</span>
                ${loc.topRank === 1 ? '<span class="top-badge top-1">Top 1</span>' : loc.topRank <= 5 ? '<span class="top-badge top-5">Top 5</span>' : loc.topRank <= 10 ? '<span class="top-badge top-10">Top 10</span>' : ''}
            </div>
        </div>
        `;
      div.onclick = () => showDetail(loc);
      list.appendChild(div);
    }

    // ── Render marker trên bản đồ / Render map marker ──
    const marker = L.marker([loc.lat, loc.lng], { icon: getDynamicIcon(loc) });
    const popupContent = document.createElement("div");
    popupContent.innerHTML = `
      <div style="text-align:center; cursor:pointer;">
        <b style="font-size:13px">${escapeHTML(loc.name)}</b><br>
        <span style="font-size:11px; color:#666">${escapeHTML(loc.category)}</span>
      </div>
    `;
    popupContent.onclick = () => showDetail(loc);

    marker.bindPopup(popupContent);
    marker.on("click", () => showDetail(loc));
    marker.addTo(markerLayer);
    markersMap[loc.name] = marker;

    latLngs.push([loc.lat, loc.lng]);
  });

  // Auto Zoom: Chỉ trên desktop (> 768px) / Only on desktop (> 768px)
  if (autoFit && latLngs.length > 0 && map && window.innerWidth > 768) {
    setTimeout(() => {
      map.fitBounds(latLngs, { padding: [50, 50], maxZoom: 15 });
    }, 100);
  }
}

// ── LỌC DANH MỤC / CATEGORY FILTER ──
// Mục đích: Lọc địa điểm theo danh mục, cập nhật trạng thái active cho chip filter.
// Purpose:  Filters locations by category, updates active state on filter chips.
function filterData(cat, btn, autoFit = true) {
  currentCategory = cat;

  // Cập nhật UI Active State cho chips / Update UI Active State for chips
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

// ── TÌM KIẾM CLIENT-SIDE / CLIENT-SIDE SEARCH ──
// Mục đích: Lọc địa điểm từ cache theo từ khóa (tên hoặc mô tả).
// Purpose:  Filters locations from cache by keyword (name or description).
function handleLocalSearch() {
  const input = document.getElementById("miniSearchInput");
  if (!input) return;
  const keyword = input.value.toLowerCase().trim();

  if (!keyword) {
    // Nếu xóa hết từ khóa → hiện lại dữ liệu gốc / If keyword cleared → show original data
    if (currentListData.length > 0) renderLocations(currentListData, false);
    else loadLocations("All", false);
    return;
  }

  // Tìm kiếm trên toàn bộ CACHE (không chỉ danh mục hiện tại)
  // Search on FULL CACHE (not just current category)
  const sourceData = cachedAllLocations || [];
  const filtered = sourceData.filter((loc) => {
    return loc.name.toLowerCase().includes(keyword) ||
      (loc.description && loc.description.toLowerCase().includes(keyword));
  });

  renderLocations(filtered, true); // Auto zoom vào kết quả tìm kiếm / Auto zoom to search results
}

// ── BAY ĐẾN VỊ TRÍ / FLY TO LOCATION ──
// Mục đích: Di chuyển bản đồ tới vị trí chỉ định với hiệu ứng bay (flyTo).
// Purpose:  Moves map to specified position with fly animation.
function flyToLocation(lat, lng, name) {
  if (window.innerWidth <= 768) {
    // Mobile: Có thể cuộn panel chi tiết thay vì bay / May scroll detail panel instead
    return;
  }
  if (map) {
    map.flyTo([lat, lng], 16, { duration: 1.5 });
    // Mở popup của marker sau khi bay xong / Open marker popup after fly completes
    if (markersMap[name]) {
      map.once("moveend", () => markersMap[name].openPopup());
    }
  }
}


// ── HIỂN THỊ CHI TIẾT ĐỊA ĐIỂM / SHOW LOCATION DETAIL ──
// Đây là hàm phức tạp nhất trong file, xử lý rất nhiều DOM manipulation:
// This is the most complex function in the file, handling extensive DOM manipulation:
//   1. Đồng bộ filter theo category của địa điểm / Sync filter to location's category
//   2. Tính toán điểm hiển thị / Calculate display score
//   3. Tạo link Google Maps / Create Google Maps direction link
//   4. Bay đến vị trí trên bản đồ / Fly to location on map
//   5. Xây dựng Explainable AI HTML (Cold Start vs Personalized)
//      Build Explainable AI HTML (Cold Start vs Personalized)
//   6. Render toàn bộ panel chi tiết / Render entire detail panel
//   7. Inject review template / Inject review template
//   8. Gắn event listeners an toàn (chống XSS) / Attach safe event listeners (XSS prevention)
async function showDetail(loc) {
  // Đồng bộ Filter: Luôn chuyển sang category của địa điểm
  // Sync Filter: Always switch to location's category
  if (currentCategory !== loc.category) {
    await filterData(loc.category, null, false);
  }

  currentOpenLoc = loc;
  // Điểm số hiển thị: dùng PageRank Norm * 100 / Display score: uses PageRank Norm * 100
  let displayScore = ((loc.score || 0) * 100).toFixed(1);

  // Link chỉ đường Google Maps / Google Maps direction link
  let mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + " Thừa Thiên Huế")}`;
  flyToLocation(loc.lat, loc.lng, loc.name);

  const panel = document.getElementById("detail-panel");
  const content = document.getElementById("detail-content");

  // Kiểm tra trạng thái "đã thích" / Check "liked" status
  const isLiked = userLikedSet.has(loc.name);

  // ══════════════════════════════════════════════════════════
  // XÂY DỰNG HTML GIẢI THÍCH AI / BUILD EXPLAINABLE AI HTML
  // ══════════════════════════════════════════════════════════
  let explainHTML = '';
  if (currentUser && loc.reason_details) {
    const hasHistory = userLikedSet && userLikedSet.size > 0;
    const rd = loc.reason_details;
    const pCollab = rd.collab.percent;
    const pContent = rd.content.percent;
    const pPopReal = ((loc.score || 0) * 100).toFixed(1);
    const chart = rd.chart || { collab: 0, content: 0, pagerank: 100 };

    if (!hasHistory) {
      // ── TRƯỜNG HỢP 1: COLD START (User chưa có lịch sử)
      //    CASE 1: COLD START (User has no history)
      // Hiển thị thông tin nói rằng AI gợi ý dựa trên sự phổ biến chung
      // Shows info that AI recommends based on general popularity
      explainHTML = `
          <div class="ai-reason-card">
              <div class="ai-reason-title"><i class="fas fa-fire" style="color:#ea580c;"></i> ĐỊA ĐIỂM NỔI BẬT</div>
              <div class="ai-highlight-box" style="background: #fff7ed; border-color: #ffedd5;">
                  <i class="fas fa-trophy" style="color:#f59e0b;"></i>
                  <span style="color:#9a3412;">Địa điểm được đánh giá cao nhờ sự phổ biến, vị trí thuận tiện và chất lượng dịch vụ tốt!</span>
              </div>
              <div class="ai-progress-row">
                   <div class="progress-label">
                      <span><i class="fas fa-chart-line" style="color:#f59e0b; width:15px;"></i> Điểm chất lượng AI</span>
                      <span>${pPopReal}</span>
                   </div>
                   <div class="progress-track"><div class="progress-fill" style="width:${pPopReal}%; background: linear-gradient(90deg, #f59e0b, #ea580c);"></div></div>
                   <div style="font-size: 10px; color: #64748b; margin-top: 4px;">(60% Phổ biến • 30% Kết nối • 10% Rating)</div>
              </div>
              <div style="margin-top:12px; font-size:12px; color:#64748b; font-style:italic; border-top:1px dashed #e2e8f0; padding-top:8px;">
                  <i class="fas fa-info-circle"></i> Hãy thả tim <i class="far fa-heart"></i> vài địa điểm để AI hiểu gu của bạn hơn nhé!
              </div>
          </div>`;
    } else {
      // ── TRƯỜNG HỢP 2: PERSONALIZED (User có lịch sử tương tác)
      //    CASE 2: PERSONALIZED (User has interaction history)
      // Hiển thị chi tiết giải thích tại sao AI gợi ý (biểu đồ donut, progress bar, user tương đồng)
      // Shows detailed explanation of why AI recommends (donut chart, progress bars, similar users)
      const simUsersData = rd.collab.similar_users || [];
      const matchedLikes = rd.content.matched_likes || [];

      // Highlight động theo loại gợi ý / Dynamic highlight based on recommendation type
      let highlightIcon = '🤖', highlightMsg = 'Được gợi ý bởi hệ thống AI thông minh';
      let highlightBg = '#eff6ff', highlightBorder = '#dbeafe', highlightColor = '#1e40af';

      if (loc.reason_type === 'collab' && simUsersData.length > 0) {
        // Collaborative Filtering: Gợi ý vì người dùng tương đồng đã thích
        // Collaborative Filtering: Recommended because similar users liked it
        highlightIcon = '👥';
        highlightMsg = simUsersData.map(u => '<b>' + u.name + '</b> (giống ' + u.similarity + '%)').join(', ') + ' đã thích nơi này';
        highlightBg = '#eef2ff'; highlightBorder = '#e0e7ff'; highlightColor = '#3730a3';
      } else if (loc.reason_type === 'content' && matchedLikes.length > 0) {
        // Content-based: Gợi ý vì cùng thể loại với nơi đã thích
        // Content-based: Recommended because same category as liked places
        highlightIcon = '🎯';
        highlightMsg = 'Gợi ý vì bạn đã thích <b>' + matchedLikes.join('</b>, <b>') + '</b>';
        highlightBg = '#fdf2f8'; highlightBorder = '#fce7f3'; highlightColor = '#9d174d';
      } else if (loc.reason_type === 'pagerank') {
        // PageRank: Địa điểm phổ biến trong cộng đồng / PageRank: Popular in community
        highlightIcon = '🔥';
        highlightMsg = 'Địa điểm được đánh giá cao bởi cộng đồng du lịch';
        highlightBg = '#fff7ed'; highlightBorder = '#ffedd5'; highlightColor = '#9a3412';
      }

      // Biểu đồ donut (conic-gradient CSS) / Donut chart (conic-gradient CSS)
      const c1 = chart.collab, c2 = chart.content, c3 = chart.pagerank;
      const conicGrad = 'conic-gradient(#6366f1 0% ' + c1 + '%, #ec4899 ' + c1 + '% ' + (c1 + c2) + '%, #f59e0b ' + (c1 + c2) + '% 100%)';
      const finalScore = loc.final_score ? loc.final_score.toFixed(1) : pPopReal;

      // Chip hiển thị người dùng tương đồng / Similar users display chips
      let simUsersHTML = '';
      if (simUsersData.length > 0) {
        simUsersHTML = '<div class="explai-section">' +
          '<div class="explai-section-title"><i class="fas fa-user-friends" style="color:#6366f1;"></i> Người dùng tương đồng</div>' +
          '<div class="explai-users-list">' +
          simUsersData.map(u =>
            '<div class="explai-user-chip">' +
            '<div class="explai-user-avatar">' + u.name.charAt(0).toUpperCase() + '</div>' +
            '<div class="explai-user-info">' +
            '<span class="explai-user-name">' + u.name + '</span>' +
            '<span class="explai-user-score">Giống ' + u.similarity + '%</span>' +
            '</div>' +
            '</div>'
          ).join('') +
          '</div></div>';
      }

      // Chip hiển thị địa điểm đã thích cùng loại (dùng data attribute thay vì inline onclick)
      // Matched likes chips (uses data attributes instead of inline onclick for XSS prevention)
      let matchedHTML = '';
      if (matchedLikes.length > 0) {
        matchedHTML = '<div class="explai-section">' +
          '<div class="explai-section-title"><i class="fas fa-heart" style="color:#ec4899;"></i> Cùng thể loại với nơi bạn thích</div>' +
          '<div class="explai-matched-list">' +
          matchedLikes.map(name =>
            '<div class="explai-matched-chip" data-loc-name="' + escapeHTML(name) + '" style="cursor:pointer;">' +
            '<i class="fas fa-map-marker-alt"></i> ' + escapeHTML(name) +
            '</div>'
          ).join('') +
          '</div></div>';
      }

      // Ghép tất cả thành HTML card giải thích AI / Combine into AI explanation card HTML
      explainHTML = '<div class="ai-reason-card">' +
        '<div class="ai-reason-title"><i class="fas fa-robot"></i> TẠI SAO GỢI Ý CHO BẠN?</div>' +
        simUsersHTML +
        matchedHTML +
        '</div>';
    }
  }

  // ══════════════════════════════════════════════════════════
  // XÂY DỰNG HTML PANEL CHI TIẾT / BUILD DETAIL PANEL HTML
  // ══════════════════════════════════════════════════════════
  content.innerHTML = `
    <!-- 1. Thanh điều hướng quay lại / Header Navigation -->
    <div class="detail-header-nav" onclick="closeDetail()">
        <button class="detail-back-btn"><i class="fas fa-arrow-left"></i> Quay lại danh sách</button>
    </div>

    <!-- 2. Ảnh đại diện / Hero Image -->
    <div class="detail-hero-frame">
        <img src="${loc.image}" class="detail-hero-img" onerror="this.src='/static/images/no-image.png'">
    </div>

    <div class="detail-main-content">
        <!-- 3. Tiêu đề & Thông tin / Title & Meta -->
        <h1 class="detail-title-large">${escapeHTML(loc.name)}</h1>
        <div class="detail-tags-row">
            <span class="tag-pill tag-green"><i class="fas fa-fire"></i> ${displayScore}<span style="font-weight:400; opacity:0.6;">/100</span></span>
            <span class="tag-pill tag-gray"><i class="fas fa-tag"></i> ${escapeHTML(loc.category)}</span>
        </div>

        <!-- 4. Mô tả / Description -->
        <p class="detail-desc-text">${escapeHTML(loc.description) || "Một địa điểm thú vị tại Huế đang chờ bạn khám phá."}</p>

        ${explainHTML}


        <!-- 6. Nút hành động (Thích, Chỉ đường) / Action Buttons (Like, Directions) -->
        <div class="detail-actions-row">
            ${currentUser
      ? `<button id="btn-like-detail" class="${isLiked ? "btn-large-action btn-outline liked" : "btn-large-action btn-outline"}">
                  <i class="${isLiked ? "fas" : "far"} fa-heart"></i> ${isLiked ? "Đã thích" : "Yêu thích"}
                 </button>`
      : `<button class="btn-large-action btn-outline" onclick="openAuthModal()"><i class="fas fa-lock"></i> Đăng nhập để thích</button>`
    }
            <a href="${mapLink}" target="_blank" class="btn-large-action btn-primary-blue">
                <i class="fas fa-directions"></i> Chỉ đường
            </a>
        </div>

        <!-- Nút quản trị Admin (Sửa/Xóa) / Admin Actions (Edit/Delete) -->
        ${currentUser && currentUser.role === "admin" ? `
        <div class="detail-actions-row admin-row">
            <button class="btn-large-action btn-outline" onclick="openEditModal()">
                <i class="fas fa-edit"></i> Chỉnh sửa
            </button>
            <button id="btn-delete-location" class="btn-large-action btn-outline btn-danger-outline">
                <i class="fas fa-trash-alt"></i> Xóa địa điểm
            </button>
        </div>
        ` : ""}

        <!-- 7. Đánh giá (từ review_template.html) / Reviews (Loaded from Template) -->
        <div id="review-section-placeholder"></div>

        <!-- 8. Địa điểm tương tự / Similar Locations -->
        <div class="section-header-modern">
            <span><i class="fas fa-map-marker-alt"></i> KHÁM PHÁ THÊM</span>
        </div>
        <div id="similar-locations-list" class="similar-locations-list">
             <!-- Sẽ được JS populate / Will be populated by JS -->
             <div style="text-align:center; grid-column:span 3; padding:20px; color:#94a3b8;">Đang tải...</div>
        </div>
    </div>
  `;

  // ── INJECT REVIEW TEMPLATE ──
  // Clone template review từ HTML và gắn event handlers
  // Clone review template from HTML and attach event handlers
  const reviewPlaceholder = content.querySelector("#review-section-placeholder");
  const template = document.getElementById("review-template");
  if (reviewPlaceholder && template) {
    const clone = template.content.cloneNode(true);

    // Gắn event thủ công vì cloneNode mất inline onclick / Wire up events manually since cloneNode loses inline onclicks
    const btnToggle = clone.getElementById("btn-toggle-review");
    if (btnToggle) {
      if (!currentUser) {
        btnToggle.style.display = "none"; // Ẩn nút viết đánh giá nếu chưa đăng nhập / Hide write review button if not logged in
      } else {
        btnToggle.onclick = toggleReviewForm;
      }
    }

    const btnSubmit = clone.getElementById("btn-submit-review");
    if (btnSubmit) btnSubmit.onclick = () => submitReview(loc.name);

    reviewPlaceholder.appendChild(clone);
  }

  // ── GẮN EVENT AN TOÀN (CHỐNG XSS) / ATTACH SAFE EVENT LISTENERS (XSS PREVENTION) ──
  // Dùng addEventListener thay vì inline onclick để tránh XSS injection
  // Uses addEventListener instead of inline onclick to prevent XSS injection

  // Nút Thích / Like button
  const btnLike = content.querySelector('#btn-like-detail');
  if (btnLike) {
    btnLike.addEventListener('click', function () { handleLike(this, loc.name); });
  }

  // Nút Xóa (admin) / Delete button (admin)
  const btnDelete = content.querySelector('#btn-delete-location');
  if (btnDelete) {
    btnDelete.addEventListener('click', () => deleteLocation(loc.name));
  }

  // Chip địa điểm đã thích cùng loại (click để xem chi tiết)
  // Matched likes chips (click to view detail)
  content.querySelectorAll('.explai-matched-chip[data-loc-name]').forEach(chip => {
    chip.addEventListener('click', () => showDetailFromData(chip.dataset.locName));
  });

  // Hiện panel chi tiết / Show detail panel
  panel.classList.add("active");

  // Tải đánh giá & địa điểm tương tự / Load reviews & similar locations
  if (window.loadReviews) window.loadReviews(loc.name);
  if (window.loadSimilarLocations) window.loadSimilarLocations(loc.name);
}

// ── ĐÓNG PANEL CHI TIẾT / CLOSE DETAIL PANEL ──
function closeDetail() {
  document.getElementById("detail-panel").classList.remove("active");
}

// ── BẢN ĐỒ NHIỆT / HEATMAP LOGIC ──
// Mục đích: Bật/tắt lớp bản đổ nhiệt (heatmap) để trực quan hóa mật độ & điểm số địa điểm.
// Purpose:  Toggles heatmap layer to visualize location density & scores.
// Sử dụng / Uses: Plugin leaflet.heat với gradient xanh → vàng → đỏ.
//                 leaflet.heat plugin with blue → yellow → red gradient.
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

// Cập nhật layer nhiệt từ dữ liệu globalHeatData / Update heat layer from globalHeatData
function updateHeatmapLayer() {
  if (!map || !globalHeatData.length) return;
  if (heatLayer) map.removeLayer(heatLayer);

  // Yêu cầu plugin leaflet.heat / Requires leaflet.heat plugin
  if (L.heatLayer) {
    heatLayer = L.heatLayer(globalHeatData, {
      radius: 25,
      blur: 15,
      maxZoom: 14,
      max: 5.0, // Tương ứng max intensity / Should match max intensity scale
      gradient: { 0.2: "blue", 0.4: "lime", 0.6: "yellow", 0.8: "orange", 1.0: "red" }
    }).addTo(map);
  }
}

// ── HIỂN THỊ CHI TIẾT TỪ TÊN / SHOW DETAIL FROM NAME ──
// Mục đích: Tìm địa điểm trong cache bằng tên, rồi gọi showDetail().
//           Dùng khi click từ danh sách lịch sử, gợi ý, hoặc lộ trình.
// Purpose:  Finds location in cache by name, then calls showDetail().
//           Used when clicking from history list, suggestions, or itinerary.
function showDetailFromData(name) {
  if (window.closeUserProfile) window.closeUserProfile();

  // Tìm trong cache / Find in cache
  let loc = cachedAllLocations ? cachedAllLocations.find(l => l.name === name) : null;
  if (loc) showDetail(loc);
  else {
    showNotification({ type: 'error', message: 'Không tìm thấy dữ liệu địa điểm này' });
  }
}

// ── HIỂN THỊ CHI TIẾT KÈM DỮ LIỆU AI / SHOW DETAIL WITH AI DATA ──
// Mục đích: Khi click từ danh sách gợi ý AI, tìm location thật trong cache và
//           merge dữ liệu AI (reason_details, reason_type, ...) vào trước khi hiển thị.
// Purpose:  When clicking from AI recommendation list, finds real location in cache and
//           merges AI data (reason_details, reason_type, ...) before displaying.
// Xử lý chuẩn hóa / Normalization:
//   Chuẩn hóa tên (trim + lowercase) để so sánh, tránh lỗi do khoảng trắng/hoa-thường.
//   Normalizes names (trim + lowercase) for comparison, avoids whitespace/case mismatches.
function showDetailWithAI(aiLoc) {
  console.log("🖱️ showDetailWithAI called for:", aiLoc.name);

  // Đóng profile modal nếu đang mở / Close profile modal if open
  if (window.closeUserProfile) window.closeUserProfile();

  // Helper chuẩn hóa chuỗi để so sánh / Helper to normalize string for comparison
  const normalize = (str) => str ? str.trim().toLowerCase() : "";
  const targetName = normalize(aiLoc.name);

  // Tìm real location trong cache / Find real location in cache
  let realLoc = cachedAllLocations ? cachedAllLocations.find(l => normalize(l.name) === targetName) : null;

  if (realLoc) {
    console.log(`✅ Found "${realLoc.name}" in cache`);
    // Merge AI Data vào real location / Merge AI data into real location
    realLoc.reason_details = aiLoc.reason_details;
    realLoc.reason = aiLoc.reason;
    realLoc.reason_icon = aiLoc.reason_icon;
    realLoc.reason_type = aiLoc.reason_type;

    // Gọi showDetail trực tiếp / Call showDetail directly
    showDetail(realLoc);
  } else {
    console.warn(`⚠️ "${aiLoc.name}" not in cache, using API data directly`);
    // Đảm bảo có category mặc định / Ensure default category exists
    if (!aiLoc.category) aiLoc.category = "Tham quan";
    showDetail(aiLoc);
  }
}
