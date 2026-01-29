// ============================================================================
// PHẦN 1: BIẾN TOÀN CỤC & HÀM CỐT LÕI (CORE)
// ============================================================================
let cachedAllLocations = null;
var map, markerLayer;
var markersMap = {};
var tempMarker = null;
var currentUser = null;
var currentListData = [];
var userRole = "user";
var userLikedSet = new Set();
var currentOpenLoc = null;
var isPickingMode = null;
var currentCategory = "All";
var heatLayer = null;
var isHeatmapActive = false;

// Hàm gọi API chung
async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      let errorMessage = `Lỗi ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.error) errorMessage = errorData.error;
      } catch (e) {
        const text = await response.text();
        if (text) errorMessage = text;
      }
      throw new Error(errorMessage);
    }
    return await response.json();
  } catch (err) {
    console.error(`[API FAIL] ${url}:`, err);
    throw err;
  }
}

// ============================================================================
// PHẦN 2: KHỞI TẠO ỨNG DỤNG
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  checkLoginStatus();
  loadLocations("All");
  setupEnterKey();
  setupDragScroll();
  setupDebounceSearch();
});

function initMap() {
  map = L.map("map", { zoomControl: false }).setView([16.4637, 107.5909], 14);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);

  map.on("click", (e) => {
    const lat = e.latlng.lat.toFixed(5);
    const lng = e.latlng.lng.toFixed(5);

    if (isPickingMode === "add" || document.getElementById("addModal").classList.contains("active")) {
      document.getElementById("addLat").value = lat;
      document.getElementById("addLng").value = lng;
      isPickingMode = null;
      document.getElementById("map").style.cursor = "";
      document.getElementById("addModal").classList.add("active");
      L.popup().setLatLng(e.latlng).setContent("Đã chọn vị trí này!").openOn(map);
    } else if (isPickingMode === "edit") {
      document.getElementById("editLat").value = lat;
      document.getElementById("editLng").value = lng;
      if (tempMarker) map.removeLayer(tempMarker);
      tempMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
      tempMarker.bindPopup("<b>📍 Vị trí mới</b>").openPopup();
      tempMarker.on("dragend", function (event) {
        var position = event.target.getLatLng();
        document.getElementById("editLat").value = position.lat.toFixed(5);
        document.getElementById("editLng").value = position.lng.toFixed(5);
      });
      isPickingMode = null;
      document.getElementById("map").style.cursor = "";
      document.getElementById("editModal").classList.add("active");
    }
  });
}

function setupEnterKey() {
  const bindings = [
    { id: "loginPass", action: handleLogin },
    { id: "regPass", action: handleRegister },
    { id: "usernameInput", action: () => analyzeUser(false) },
  ];
  bindings.forEach((item) => {
    const el = document.getElementById(item.id);
    if (el)
      el.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          item.action();
        }
      });
  });
  document.getElementById("miniSearchInput")?.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      this.blur();
    }
  });
}

// ============================================================================
// PHẦN 3: XÁC THỰC NGƯỜI DÙNG
// ============================================================================
function checkLoginStatus() {
  apiFetch("/api/current_user")
    .then((data) => {
      if (data && data.is_logged_in) {
        currentUser = data.username;
        userRole = data.role || "user";
        showLoggedView(data.username);
        analyzeUser(true);
      } else {
        currentUser = null;
        userRole = "user";
        showGuestView();
      }
    })
    .catch(() => showGuestView());
}

function showLoggedView(username) {
  document.getElementById("header-login-btn").style.display = "none";
  const userInfo = document.getElementById("header-user-info");
  if (userInfo) {
    userInfo.style.display = "flex";
    document.getElementById("header-username").innerText = username;
    const btnAdminHeader = document.getElementById("btn-admin-panel");
    if (btnAdminHeader) {
      btnAdminHeader.style.display = username === "admin" || userRole === "admin" ? "inline-block" : "none";
    }
  }
  document.querySelector(".search-box").style.display = "none";
  document.getElementById("logged-view").style.display = "block";
  checkAdminAccess(username);
}

function showGuestView() {
  document.getElementById("header-login-btn").style.display = "flex";
  document.getElementById("header-user-info").style.display = "none";
  document.querySelector(".search-box").style.display = "block";
  document.getElementById("guest-search-box").style.display = "flex";
  document.getElementById("logged-view").style.display = "none";
  const recArea = document.getElementById("recommendation-area");
  if (recArea) recArea.innerHTML = `<div class="empty-state">...Sẵn sàng phân tích...</div>`;
}

function openAuthModal() { document.getElementById("authModal").classList.add("active"); }
function closeAuthModal() { document.getElementById("authModal").classList.remove("active"); }
function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".auth-form").forEach((f) => (f.style.display = "none"));
  if (tab === "login") {
    document.querySelector(".tab-btn:nth-child(1)").classList.add("active");
    document.getElementById("loginForm").style.display = "block";
  } else {
    document.querySelector(".tab-btn:nth-child(2)").classList.add("active");
    document.getElementById("registerForm").style.display = "block";
  }
}

function handleLogin() {
  const u = document.getElementById("loginUser").value.trim();
  const p = document.getElementById("loginPass").value;
  if (!u || !p) return showNotification({ type: "error", title: "Lỗi", message: "Vui lòng nhập đầy đủ thông tin" });
  
  const msgElement = document.getElementById("loginMsg");
  msgElement.innerText = "Đang xử lý...";

  fetch("/api/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  })
    .then(async (response) => {
      const data = await response.json();
      if (response.ok) {
        currentUser = data.username;
        userRole = data.role;
        closeAuthModal();
        checkLoginStatus();
        if (typeof currentOpenLoc !== "undefined" && currentOpenLoc !== null) showDetail(currentOpenLoc);
        showNotification({ type: "success", title: "Đăng nhập thành công", message: `Chào mừng <b>${data.username}</b>!` });
        msgElement.innerText = "";
      } else {
        msgElement.innerText = data.error || "Đăng nhập thất bại";
        msgElement.style.color = "red";
      }
    })
    .catch((err) => {
      msgElement.innerText = "Lỗi kết nối!";
      msgElement.style.color = "red";
    });
}

function handleRegister() {
  const u = document.getElementById("regUser").value.trim();
  const p = document.getElementById("regPass").value;
  if (!u || !p) return alert("Thiếu thông tin");
  const msg = document.getElementById("regMsg");
  msg.innerText = "Đang đăng ký...";
  
  apiFetch("/api/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  })
  .then((res) => {
    if (res.success) {
      showNotification({
        type: "success", title: "Thành công", message: `Tài khoản <b>${u}</b> đã được tạo.`,
        btnText: "Đăng nhập ngay", onConfirm: () => {
          switchTab("login");
          document.getElementById("loginUser").value = u;
        },
      });
      msg.innerText = "";
    } else {
      msg.innerText = "Tên tài khoản đã tồn tại";
    }
  }).catch((err) => (msg.innerText = err.message));
}

function handleLogout() {
  if (!confirm("Bạn có chắc chắn muốn đăng xuất?")) return;
  apiFetch("/api/logout", { method: "POST" }).then(() => checkLoginStatus());
  showNotification({ type: "success", title: "Đã đăng xuất", message: "Hẹn gặp lại bạn!" });
}

// ============================================================================
// PHẦN 4: LOGIC GỢI Ý & DATA
// ============================================================================
function analyzeUser(isLoggedInUser = false) {
  const targetUser = isLoggedInUser ? currentUser : document.getElementById("usernameInput").value.trim();
  if (!targetUser) return;

  apiFetch(`/api/history/${targetUser}`).then((data) => {
    userLikedSet.clear();
    const histDiv = document.getElementById("user-history");
    const histList = document.getElementById("history-list");
    if (data && data.length > 0) {
      data.forEach((item) => userLikedSet.add(item.name));
      histDiv.style.display = "block";
      histList.innerHTML = data.map(place => 
        `<div class="hist-chip" onclick="showDetailFromData('${place.name}', ${place.lat}, ${place.lng}, '${place.image}')">
           <img src="${place.image}" loading="lazy" onerror="this.src='/static/images/no-image.png'"> ${place.name}
         </div>`).join("");
    } else {
      histDiv.style.display = "none";
    }
  });
  getRecommendations(targetUser);
}

function getRecommendations(user) {
  const recArea = document.getElementById("recommendation-area");
  recArea.innerHTML = `<div style="text-align:center; padding:60px 20px;"><i class="fas fa-circle-notch fa-spin"></i> Đang phân tích...</div>`;

  apiFetch(`/api/recommend/${user}`).then((data) => {
    recArea.innerHTML = "";
    if (!data || data.length === 0) {
      recArea.innerHTML = `<div class="empty-state"><p>Chưa có gợi ý nào cho ${user}</p></div>`;
      return;
    }
    data.forEach((loc) => {
      const reasonIcon = loc.reason_icon || "🤖";
      const reason = loc.reason || "AI Recommended";
      const reasonType = loc.reason_type || "default";
      const card = document.createElement("div");
      card.className = "ai-card";
      card.innerHTML = `
        <div class="card-thumb"><img src="${loc.image}" loading="lazy" onerror="this.src='/static/images/no-image.png'"></div>
        <div class="card-content">
            <div class="card-title">${loc.name}</div>
            <div class="card-desc">${loc.description || "..."}</div>
            <div class="algo-badge badge-${reasonType}">${reasonIcon} ${reason}</div>
        </div>
      `;
      card.onclick = () => showDetail(loc);
      recArea.appendChild(card);
    });
  });
}

async function loadLocations(cat = "All") {
  document.getElementById("locationList").innerHTML = `<div style="text-align:center; padding:20px;">Đang tải...</div>`;
  try {
    let data;
    if (cat === "All" && cachedAllLocations && cachedAllLocations.length > 0) data = cachedAllLocations;
    else {
      let url = "/api/locations";
      if (cat !== "All") url += `?category=${encodeURIComponent(cat)}`;
      data = await apiFetch(url);
      if (cat === "All" && data && data.length > 0) cachedAllLocations = data;
    }
    currentListData = data || [];
    renderLocations(currentListData);
  } catch (err) {
    document.getElementById("locationList").innerHTML = "Lỗi tải dữ liệu";
  }
}

function renderLocations(data) {
  const list = document.getElementById("locationList");
  if (markerLayer) markerLayer.clearLayers();
  markersMap = {};
  list.innerHTML = "";

  if (!data || data.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding:20px;">Không tìm thấy địa điểm nào.</div>`;
    return;
  }

  const latLngs = [];
  data.forEach((loc) => {
    let displayScore = (loc.score * 100).toFixed(1);
    const div = document.createElement("div");
    div.className = "mini-item";
    div.innerHTML = `
      <img src="${loc.image}" loading="lazy" class="mini-img" onerror="this.src='/static/images/no-image.png'">
      <div style="flex:1; overflow:hidden;">
        <div class="mini-name">${loc.name}</div>
        <div style="font-size:12px; color:#059669; font-weight:700;">${displayScore} pts</div>
      </div>
    `;
    div.onclick = () => showDetail(loc);
    list.appendChild(div);

    const marker = L.marker([loc.lat, loc.lng], { icon: getDynamicIcon(loc) });
    marker.bindPopup(`<b>${loc.name}</b><br>${loc.category}`).on("click", () => showDetail(loc));
    marker.addTo(markerLayer);
    markersMap[loc.name] = marker;
    latLngs.push([loc.lat, loc.lng]);
  });
}

function showDetail(loc) {
  currentOpenLoc = loc;
  flyToLocation(loc.lat, loc.lng, loc.name);
  const panel = document.getElementById("detail-panel");
  const content = document.getElementById("detail-content");

  let adminActions = "";
  if (currentUser === "admin" || userRole === "admin") {
    adminActions = `
      <div class="admin-actions-container">
        <button class="btn-admin-tool btn-tool-edit" onclick="openEditModal()"><i class="fas fa-edit"></i> Sửa</button>
        <button class="btn-admin-tool btn-tool-delete" onclick="deleteLocation('${loc.name}')"><i class="fas fa-trash"></i> Xóa</button>
      </div>
    `;
  }

  let likeBtn = currentUser
    ? `<button class="${userLikedSet.has(loc.name) ? "btn-action btn-like liked" : "btn-action btn-like"}" onclick="handleLike(this, '${loc.name}')">
         <i class="${userLikedSet.has(loc.name) ? "fas" : "far"} fa-heart"></i> ${userLikedSet.has(loc.name) ? "Đã thích" : "Yêu thích"}
       </button>`
    : `<button class="btn-action btn-like" onclick="openAuthModal()"><i class="fas fa-lock"></i> Đăng nhập</button>`;

  // AI Explanation
  let aiExplanationHTML = "";
  if (loc.reason && loc.reason_details) {
    const d = loc.reason_details;
    const type = loc.reason_type || "default";
    aiExplanationHTML = `
      <div class="ai-explanation-section">
        <div class="ai-explanation-header"><i class="fas fa-robot"></i> Tại sao gợi ý?</div>
        <div class="ai-reason-main ${type}"><span class="reason-icon">${loc.reason_icon}</span> <span class="reason-text">${loc.reason}</span></div>
        <div class="ai-score-breakdown">
          <div class="score-bar-item"><div class="score-label"><span>👥 ${d.collab.label}</span> <span class="score-value">${d.collab.percent.toFixed(0)}%</span></div><div class="score-bar"><div class="score-bar-fill collab" style="width:${d.collab.percent}%"></div></div></div>
          <div class="score-bar-item"><div class="score-label"><span>🎯 ${d.content.label}</span> <span class="score-value">${d.content.percent.toFixed(0)}%</span></div><div class="score-bar"><div class="score-bar-fill content" style="width:${d.content.percent}%"></div></div></div>
          <div class="score-bar-item"><div class="score-label"><span>🏆 ${d.pagerank.label}</span> <span class="score-value">${d.pagerank.percent.toFixed(0)}%</span></div><div class="score-bar"><div class="score-bar-fill pagerank" style="width:${d.pagerank.percent}%"></div></div></div>
        </div>
      </div>
    `;
  }

  content.innerHTML = `
    <img src="${loc.image}" loading="lazy" class="detail-hero" onerror="this.src='/static/images/no-image.png'">
    <div class="detail-body">
        <h1 class="detail-title">${loc.name}</h1>
        <div class="detail-meta"><span>${loc.category}</span></div>
        <p class="detail-desc">${loc.description || "..."}</p>
        ${aiExplanationHTML}
        
        <div class="detail-actions">
            ${likeBtn}
            <a href="https://maps.google.com/?q=${encodeURIComponent(loc.name + " Huế")}" target="_blank" class="btn-action btn-maps"><i class="fas fa-directions"></i> Chỉ đường</a>
        </div>
        ${adminActions}

        <!-- REVIEW SECTION -->
        <div class="review-section">
            <div class="review-header">
                <span><i class="fas fa-comments"></i> Đánh giá & Bình luận</span>
                <button class="btn-action" onclick="toggleReviewForm()" style="font-size:12px; padding:4px 8px;"><i class="fas fa-pen"></i> Viết</button>
            </div>
            <div id="reviewFormContainer" class="review-form">
                <div class="star-rating-input">
                    <input type="radio" id="star5" name="rating" value="5" /><label for="star5">★</label>
                    <input type="radio" id="star4" name="rating" value="4" /><label for="star4">★</label>
                    <input type="radio" id="star3" name="rating" value="3" /><label for="star3">★</label>
                    <input type="radio" id="star2" name="rating" value="2" /><label for="star2">★</label>
                    <input type="radio" id="star1" name="rating" value="1" /><label for="star1">★</label>
                </div>
                <textarea id="reviewComment" class="review-textarea" placeholder="Chia sẻ trải nghiệm..."></textarea>
                <div style="text-align:right; margin-top:8px;"><button class="btn-submit" onclick="submitReview('${loc.name}')">Gửi</button></div>
            </div>
            <div id="reviewList" class="review-list"><div style="text-align:center;">Đang tải...</div></div>
        </div>

        <div class="similar-locations-section">
          <div class="similar-header"><span>Địa điểm <strong>${loc.category}</strong> khác</span></div>
          <div class="similar-locations-list" id="similar-locations-list"></div>
        </div>
    </div>
  `;
  panel.classList.add("active");
  loadSimilarLocations(loc.name);
  loadReviews(loc.name);
}

function loadSimilarLocations(locationName) {
  const container = document.getElementById("similar-locations-list");
  apiFetch(`/api/similar/${encodeURIComponent(locationName)}`).then((data) => {
    container.innerHTML = "";
    if (!data || data.length === 0) return;
    data.forEach((loc) => {
      const card = document.createElement("div");
      card.className = "similar-card";
      card.innerHTML = `
        <img src="${loc.image}" loading="lazy" class="similar-card-img" onerror="this.src='/static/images/no-image.png'">
        <div class="similar-card-info"><div class="similar-card-name">${loc.name}</div></div>
      `;
      card.onclick = () => showDetail(loc);
      container.appendChild(card);
    });
  });
}

function handleLike(btn, name) {
  apiFetch("/api/like", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location_name: name }),
  }).then((data) => {
    analyzeUser(true);
    if (data.liked) {
      btn.classList.add("liked");
      btn.innerHTML = `<i class="fas fa-heart"></i> Đã thích`;
    } else {
      btn.classList.remove("liked");
      btn.innerHTML = `<i class="far fa-heart"></i> Yêu thích`;
    }
  });
}

function showDetailFromData(name, lat, lng, image) {
  showDetail({ name, lat, lng, image, category: "Lịch sử", description: "Địa điểm đã xem" });
}
function closeDetail() { document.getElementById("detail-panel").classList.remove("active"); }

function filterData(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  else {
    document.querySelectorAll(".chip").forEach(c => {
        if(c.textContent.includes(cat) || (cat === "All" && c.textContent.includes("Tất cả"))) c.classList.add("active");
    });
  }
  loadLocations(cat);
}

function flyToLocation(lat, lng, name) {
  if (window.innerWidth <= 768) {}
  if (map) {
    map.flyTo([lat, lng], 16, { duration: 1.5 });
    if (markersMap[name]) {
      map.once("moveend", () => markersMap[name].openPopup());
    }
  }
}

// ============================================================================
// PHẦN 5: ADMIN & UTILS
// ============================================================================
function checkAdminAccess(username) { console.log("Admin logged in:", username); }

async function loadAdminStats() {
  try {
    const d = await apiFetch("/api/admin/stats");
    document.getElementById("stat-user").innerText = d.user_count;
    document.getElementById("stat-loc").innerText = d.location_count;
    document.getElementById("stat-like").innerText = d.like_count;
    document.getElementById("stat-link").innerText = d.link_count;
  } catch (e) {}
}

function openAdminUserModal() {
  document.getElementById("adminModal").classList.add("active");
  loadAdminUsersList();
  loadAdminStats();
}
function closeAdminModal() { document.getElementById("adminModal").classList.remove("active"); }

async function loadAdminUsersList() {
    const tbody = document.getElementById("adminUserList");
    tbody.innerHTML = "<tr><td>Đang tải...</td></tr>";
    try {
        const users = await apiFetch("/api/admin/users");
        tbody.innerHTML = "";
        users.forEach(u => {
            if (u.name === "admin") return;
            tbody.innerHTML += `<tr><td>${u.name}</td><td>${u.liked_count} likes</td><td><button onclick="deleteUser('${u.name}')">Xóa</button></td></tr>`;
        });
    } catch(e) { tbody.innerHTML = "Lỗi tải"; }
}
async function deleteUser(name) {
    if(!confirm(`Xóa user ${name}?`)) return;
    await apiFetch(`/api/admin/users/${name}`, {method: 'DELETE'});
    loadAdminUsersList();
}

async function deleteLocation(name) {
  if (!confirm(`Xóa địa điểm "${name}"?`)) return;
  await apiFetch("/api/admin/location/delete", {
    method: "DELETE", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  closeDetail();
  loadLocations("All");
  cachedAllLocations = null;
}

// Utils
function showNotification({ type, title, message, btnText, onConfirm }) {
  // Simplification for reliability
  alert(`${title}\n${message}`); 
  if(onConfirm) onConfirm();
}

function setupDragScroll() {
  const slider = document.querySelector(".filter-chips");
  if (!slider) return;
  let isDown = false, startX, scrollLeft;
  slider.addEventListener("mousedown", (e) => { isDown=true; startX = e.pageX - slider.offsetLeft; scrollLeft=slider.scrollLeft; });
  slider.addEventListener("mouseleave", () => { isDown=false; });
  slider.addEventListener("mouseup", () => { isDown=false; });
  slider.addEventListener("mousemove", (e) => { if(!isDown)return; e.preventDefault(); const x=e.pageX-slider.offsetLeft; slider.scrollLeft = scrollLeft - (x-startX)*2; });
}

function setupDebounceSearch() {
    let timeout;
    document.getElementById("usernameInput").addEventListener("input", () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            if(document.getElementById("usernameInput").value.length > 2) analyzeUser(false);
        }, 800);
    });
}

function openEditModal() { // Simplified placeholder
    if(!currentOpenLoc) return;
    document.getElementById("editModal").classList.add("active");
    // Populate fields
    document.getElementById("editOldName").value = currentOpenLoc.name;
    document.getElementById("editName").value = currentOpenLoc.name;
    document.getElementById("editLat").value = currentOpenLoc.lat;
    document.getElementById("editLng").value = currentOpenLoc.lng;
    document.getElementById("editCategory").value = currentOpenLoc.category;
    document.getElementById("editImage").value = currentOpenLoc.image;
    document.getElementById("editDesc").value = currentOpenLoc.description;
}
function closeEditModal() { document.getElementById("editModal").classList.remove("active"); }

async function submitEditLocation() {
    const body = {
        old_name: document.getElementById("editOldName").value,
        name: document.getElementById("editName").value,
        lat: document.getElementById("editLat").value,
        lng: document.getElementById("editLng").value,
        category: document.getElementById("editCategory").value,
        image: document.getElementById("editImage").value,
        description: document.getElementById("editDesc").value
    };
    await apiFetch("/api/admin/location/update", {
        method: "PUT", headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body)
    });
    alert("Cập nhật thành công!");
    closeEditModal();
    cachedAllLocations = null;
    loadLocations("All");
}

function openAddModal() { document.getElementById("addModal").classList.add("active"); }
function closeAddModal() { document.getElementById("addModal").classList.remove("active"); }
async function submitAddLocation() {
    const body = {
        name: document.getElementById("addName").value,
        lat: document.getElementById("addLat").value,
        lng: document.getElementById("addLng").value,
        category: document.getElementById("addCategory").value,
        image: document.getElementById("addImage").value,
        description: document.getElementById("addDesc").value
    };
    await apiFetch("/api/admin/location/add", {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body)
    });
    alert("Thêm thành công!");
    closeAddModal();
    cachedAllLocations = null;
    loadLocations("All");
}

// ============================================================================
// PHẦN 6: EXTENSIONS (ICONS, HEATMAP, REVIEWS)
// ============================================================================

function getDynamicIcon(loc) {
  const iconMap = {
    "Di tích": "🏛️", "Ẩm thực": "🍜", "Thiên nhiên": "🌳",
    "Bãi biển": "🏖️", "Tâm linh": "🛕", "Lăng tẩm": "🏯",
    "Tham quan": "🏞️", "Mua sắm": "🛍️",
  };
  const symbol = iconMap[loc.category] || "📍";
  let extraClass = "";
  if (loc.is_personalized) extraClass = "pin-collab";
  else if (loc.score >= 0.35) extraClass = "pin-pr";
  
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div class='custom-pin ${extraClass}'>${symbol}</div>`,
    iconSize: [30, 30] 
  });
}

function toggleHeatmap() {
    const btn = document.getElementById('btn-toggle-heatmap');
    if (isHeatmapActive) {
        if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
        if (markerLayer) map.addLayer(markerLayer);
        isHeatmapActive = false;
        btn.classList.remove('active');
        const leg = document.getElementById('heatmap-legend');
        if(leg) leg.style.display = 'none';
    } else {
        if (!cachedAllLocations) return alert("Chưa có dữ liệu");
        const heatPoints = cachedAllLocations.map(loc => [loc.lat, loc.lng, (loc.score||0.1)*5]);
        if (markerLayer) map.removeLayer(markerLayer);
        heatLayer = L.heatLayer(heatPoints, { radius: 30, blur: 20, max: 1.0 }).addTo(map);
        isHeatmapActive = true;
        btn.classList.add('active');
        const leg = document.getElementById('heatmap-legend');
        if(leg) leg.style.display = 'block';
    }
}

// Review Functions
function toggleReviewForm() {
    if (!currentUser) return alert("Bạn cần đăng nhập để đánh giá");
    const form = document.getElementById('reviewFormContainer');
    form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none';
    
    // Reset form if not editing
    if (!form.dataset.editing) {
       document.getElementById('reviewComment').value = "";
       document.querySelectorAll('input[name="rating"]').forEach(i => i.checked = false);
       document.querySelector('#reviewFormContainer button.btn-submit').innerText = "Gửi";
       // Remove any old event listeners by cloning
       const oldBtn = document.querySelector('#reviewFormContainer button.btn-submit');
       const newBtn = oldBtn.cloneNode(true);
       oldBtn.parentNode.replaceChild(newBtn, oldBtn);
       // Re-attach standard submit handler
       newBtn.onclick = () => submitReview(currentOpenLoc ? currentOpenLoc.name : "");
    }
}

function loadReviews(locationName) {
    const list = document.getElementById('reviewList');
    apiFetch(`/api/reviews/${encodeURIComponent(locationName)}`).then(data => {
        if(!data || data.length === 0) return list.innerHTML = `<div class="no-reviews">Chưa có đánh giá nào.</div>`;
        
        list.innerHTML = data.map(rev => {
            let actions = "";
            if(currentUser && rev.user === currentUser) {
                const safeComment = (rev.comment || "").replace(/"/g, "&quot;").replace(/'/g, "\\'");
                actions = `
                    <div style="margin-left:auto; font-size:11px;">
                        <a href="#" onclick="editReview('${locationName}', ${rev.rating}, '${safeComment}'); return false;" style="color:#2563eb; margin-right:8px;">Sửa</a>
                        <a href="#" onclick="deleteReview('${locationName}'); return false;" style="color:#ef4444;">Xóa</a>
                    </div>`;
            }
            return `
            <div class="review-item">
                <div class="review-avatar"><i class="fas fa-user"></i></div>
                <div class="review-content">
                    <div style="display:flex; justify-content:space-between;">
                        <div class="review-user-name">${rev.user}</div>
                        ${actions}
                    </div>
                    <div class="review-meta"><span class="review-stars">${'★'.repeat(rev.rating)}</span> • ${rev.time}</div>
                    <div class="review-text">${rev.comment || ""}</div>
                </div>
            </div>`;
        }).join("");
    }).catch(e => list.innerHTML = "Lỗi tải bình luận");
}

function editReview(locationName, rating, comment) {
    const form = document.getElementById('reviewFormContainer');
    form.style.display = 'block';
    form.dataset.editing = "true";
    
    const ratingInput = document.querySelector(`input[name="rating"][value="${rating}"]`);
    if(ratingInput) ratingInput.checked = true;
    document.getElementById('reviewComment').value = comment;
    
    const btn = document.querySelector('#reviewFormContainer button.btn-submit');
    btn.innerText = "Cập nhật";
    btn.onclick = () => submitReview(locationName);
    
    form.scrollIntoView({behavior: "smooth"});
}

function deleteReview(locationName) {
    if(!confirm("Bạn chắc chắn muốn xóa?")) return;
    apiFetch('/api/review', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_name: locationName })
    }).then(res => {
        if(res.success) {
            alert("Đã xóa!");
            loadReviews(locationName);
            const form = document.getElementById('reviewFormContainer');
            delete form.dataset.editing;
            document.querySelector('#reviewFormContainer button.btn-submit').innerText = "Gửi";
        } else alert("Lỗi: " + res.error);
    });
}

function submitReview(locationName) {
    const ratingEl = document.querySelector('input[name="rating"]:checked');
    if (!ratingEl) return alert("Vui lòng chọn số sao!");
    
    const isEditing = document.getElementById('reviewFormContainer').dataset.editing;
    apiFetch('/api/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            location_name: locationName, rating: ratingEl.value,
            comment: document.getElementById('reviewComment').value.trim()
        })
    }).then(res => {
        if (res.success) {
            alert(isEditing ? "Cập nhật thành công!" : "Đánh giá thành công!");
            document.getElementById('reviewComment').value = "";
            const form = document.getElementById('reviewFormContainer');
            form.style.display = 'none';
            delete form.dataset.editing;
            
            // Reset button to standard state
            const btn = document.querySelector('#reviewFormContainer button.btn-submit');
            btn.innerText = "Gửi";
            // Important: clone to clear old event listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.onclick = () => submitReview(currentOpenLoc ? currentOpenLoc.name : "");

            loadReviews(locationName);
        } else alert("Lỗi: " + res.error);
    });
}
