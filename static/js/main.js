// ============================================================================
// PHẦN 1: BIẾN TOÀN CỤC & HÀM CỐT LÕI (CORE)
// ============================================================================
let cachedAllLocations = null;
var map, markerLayer;
var markersMap = {};
var currentUser = null;
var currentListData = [];
var userRole = "user";
var userLikedSet = new Set();
var currentOpenLoc = null;
var isPickingMode = false;

// Hàm gọi API chung
async function apiFetch(url, options = {}) {
  try {
    console.log(`[API CALL] ${url}`);
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

  // Các tính năng UX
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

  // Sự kiện click bản đồ (Admin chọn tọa độ)
  map.on("click", (e) => {
    if (isPickingMode) {
      document.getElementById("addLat").value = e.latlng.lat.toFixed(5);
      document.getElementById("addLng").value = e.latlng.lng.toFixed(5);
      isPickingMode = false;
      document.getElementById("map").style.cursor = "grab";
      openAddModal();
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
  // Blur ô tìm kiếm nhỏ để ẩn bàn phím mobile
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
  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) adminPanel.style.display = "none";
  const recArea = document.getElementById("recommendation-area");
  if (recArea) recArea.innerHTML = `<div class="empty-state">...Sẵn sàng phân tích...</div>`;
}

// --- Modal Auth Logic ---
function openAuthModal() {
  document.getElementById("authModal").classList.add("active");
}
function closeAuthModal() {
  document.getElementById("authModal").classList.remove("active");
}
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
  if (!u || !p) {
    showNotification({
      type: "error",
      title: "Cảnh báo",
      message: "Thiếu tài khoản hoặc mật khẩu",
      btnText: "Đóng",
    });
    return;
  }

  document.getElementById("loginMsg").innerText = "";
  apiFetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  })
    .then((res) => {
      if (res.message) {
        currentUser = res.username;
        userRole = res.role;
        closeAuthModal();
        checkLoginStatus();

        if (currentOpenLoc) {
          showDetail(currentOpenLoc);
        }
        showNotification({
          type: "success",
          title: "Đăng nhập thành công",
          message: `Chào mừng <b>${res.username}</b>! đã quay trở lại.`,
          btnText: "Bắt đầu",
        });
      } else {
        document.getElementById("loginMsg").innerText = res.error;
      }
    })
    .catch((err) => (document.getElementById("loginMsg").innerText = err.message));
}

function handleRegister() {
  const u = document.getElementById("regUser").value.trim();
  const p = document.getElementById("regPass").value;
  if (!u || !p) return alert("Thiếu thông tin");

  const msg = document.getElementById("regMsg");
  msg.innerText = "Đang đăng ký...";

  apiFetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  })
    .then((res) => {
      if (res.success) {
        showNotification({
          type: "success",
          title: "Đăng ký thành công!",
          message: `Tài khoản <b>${u}</b> đã được tạo.`,
          btnText: "Đăng nhập ngay",
          onConfirm: () => {
            switchTab("login");
            document.getElementById("loginUser").value = u;
            document.getElementById("loginPass").focus();
          },
        });
        msg.innerText = "";
      } else {
        msg.innerText = "Tên tài khoản đã tồn tại";
      }
    })
    .catch((err) => (msg.innerText = err.message));
}

// Hàm đăng xuất
function handleLogout() {
  if (!confirm("Bạn có chắc chắn muốn đăng xuất?")) return;

  apiFetch("/api/logout", { method: "POST" }).then(() => checkLoginStatus());
  showNotification({
    type: "success",
    title: "Đăng xuất thành công",
    message: "Hẹn gặp lại bạn! 👋",
    btnText: "Đóng",
  });
}

// ============================================================================
// PHẦN 4: LOGIC GỢI Ý (AI RECOMMENDATION)
// ============================================================================
function analyzeUser(isLoggedInUser = false) {
  const targetUser = isLoggedInUser ? currentUser : document.getElementById("usernameInput").value.trim();
  if (!targetUser) return;

  // 1. History
  apiFetch(`/api/history/${targetUser}`).then((data) => {
    userLikedSet.clear();
    const histDiv = document.getElementById("user-history");
    const histList = document.getElementById("history-list");

    if (data && data.length > 0) {
      data.forEach((item) => userLikedSet.add(item.name));
      histDiv.style.display = "block";
      histList.innerHTML = data
        .map(
          (place) =>
            `<div class="hist-chip" onclick="showDetailFromData('${place.name}', ${place.lat}, ${place.lng}, '${place.image}')">
                   <img src="${place.image}" onerror="this.src='/static/images/no-image.png'"> ${place.name}
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
      let badgeHTML = !loc.common_users
        ? `<div class="algo-badge badge-pr">🏆 PageRank: ${loc.pr?.toFixed(2)}</div>`
        : `<div class="algo-badge badge-collab">👥 ${loc.common_users} người cùng sở thích</div>`;

      const card = document.createElement("div");
      card.className = "ai-card";
      card.innerHTML = `
                <div class="card-thumb"><img src="${loc.image}" onerror="this.src='/static/images/no-image.png'"></div>
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

// ============================================================================
// PHẦN 5: GIAO DIỆN & BẢN ĐỒ
// ============================================================================
async function loadLocations(cat = "All") {
  document.getElementById("locationList").innerHTML = `<div style="text-align:center; padding:20px;">Đang tải...</div>`;
  try {
    let data;
    if (cat === "All" && cachedAllLocations) data = cachedAllLocations;
    else {
      let url = "/api/locations";
      if (cat !== "All") url += `?category=${encodeURIComponent(cat)}`;
      data = await apiFetch(url);
      if (cat === "All") cachedAllLocations = data;
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
    list.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:20px; color:#9ca3af;">
        Không tìm thấy địa điểm nào.
      </div>`;
    return;
  }

  const latLngs = [];
  data.forEach((loc) => {
    // List item
    const div = document.createElement("div");
    div.className = "mini-item";
    div.innerHTML = `
      <img src="${loc.image}" class="mini-img" onerror="this.src='/static/images/no-image.png'">
      <div style="flex:1; overflow:hidden;">
        <div class="mini-name">${loc.name}</div>
        <div style="font-size:11px; color:#f59e0b;">⭐ ${loc.rating ? loc.rating.toFixed(1) : "5.0"}</div>
      </div>
    `;
    div.onclick = () => showDetail(loc);
    list.appendChild(div);

    // Marker + Popup thông minh
    const marker = L.marker([loc.lat, loc.lng], { icon: getIconByCategory(loc.category) });

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

  // Tự động fitBounds khi lọc danh mục
  if (latLngs.length > 0 && map) {
    setTimeout(() => {
      map.fitBounds(latLngs, { padding: [50, 50], maxZoom: 15 });
    }, 100);
  }
}

function showDetail(loc) {
  currentOpenLoc = loc;

  let mapLink = "";
  if (loc.lat && loc.lng) {
    // ⚠️ QUAN TRỌNG: Phải dùng dấu HUYỀN (`) - Phím nằm dưới phím Esc
    // Link này dùng chế độ "Search" để ghim đúng tọa độ (không bị tự động bắt vào đường)
    mapLink = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
  } else {
    // Tìm kiếm theo tên nếu thiếu tọa độ
    mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + " Thừa Thiên Huế")}`;
  }

  flyToLocation(loc.lat, loc.lng, loc.name);
  const panel = document.getElementById("detail-panel");
  const content = document.getElementById("detail-content");

  let adminActions = "";
  if (currentUser === "admin" || userRole === "admin") {
    adminActions = `
      <div class="admin-actions-container">
        <button class="btn-admin-tool btn-tool-edit" onclick="openEditModal()"><i class="fas fa-edit"></i> Chỉnh sửa</button>
        <button class="btn-admin-tool btn-tool-delete" onclick="deleteLocation('${loc.name}')"><i class="fas fa-trash"></i> Xóa</button>
      </div>
    `;
  }

  let likeBtn = currentUser
    ? `<button class="${userLikedSet.has(loc.name) ? "btn-action btn-like liked" : "btn-action btn-like"}" onclick="handleLike(this, '${loc.name}')">
             <i class="${userLikedSet.has(loc.name) ? "fas" : "far"} fa-heart"></i> ${userLikedSet.has(loc.name) ? "Đã thích" : "Yêu thích"}
           </button>`
    : `<button class="btn-action btn-like" onclick="openAuthModal()"><i class="fas fa-lock"></i> Đăng nhập để thích</button>`;

  content.innerHTML = `
        <img src="${loc.image}" class="detail-hero" onerror="this.src='/static/images/no-image.png'">
        <div class="detail-body">
            <h1 class="detail-title">${loc.name}</h1>
            <div class="detail-meta"><span>⭐ ${loc.rating || 5}/5</span> • <span>${loc.category}</span></div>
            <p class="detail-desc">${loc.description || "..."}</p>
            <div class="detail-actions">
                ${likeBtn}
                <a href="${mapLink}" target="_blank" class="btn-action btn-maps"><i class="fas fa-directions"></i> Chỉ đường</a>
            </div>
            ${adminActions}
        </div>
    `;
  panel.classList.add("active");
}

function handleLike(btn, name) {
  apiFetch("/api/like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

function getIconByCategory(cat) {
  const iconMap = {
    "Di tích": "🏛️",
    "Ẩm thực": "🍜",
    "Thiên nhiên": "🌳",
    "Bãi biển": "🏖️",
    "Tâm linh": "🛕",
    "Lăng tẩm": "🏯",
    "Tham quan": "🏞️",
    "Mua sắm": "🛍️",
  };
  const symbol = iconMap[cat] || "📍";
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div class='custom-pin'>${symbol}</div>`,
    iconSize: [30, 42],
  });
}

function flyToLocation(lat, lng, name) {
  if (window.innerWidth <= 768) {
    console.log("Mobile mode: Skip map flying");
    return;
  }

  if (map) {
    map.flyTo([lat, lng], 16, { duration: 1.5 });
    if (markersMap[name]) {
      map.once("moveend", () => markersMap[name].openPopup());
    }
  }
}

function showDetailFromData(name, lat, lng, image) {
  showDetail({ name, lat, lng, image, category: "Đã ghé thăm", description: "Địa điểm trong lịch sử" });
}

function closeDetail() {
  document.getElementById("detail-panel").classList.remove("active");
}

function filterData(cat, btn) {
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  loadLocations(cat);
}

function handleLocalSearch() {
  const input = document.getElementById("miniSearchInput");
  if (!input) return;

  const keyword = input.value.toLowerCase().trim();
  if (!keyword) {
    renderLocations(currentListData);
    return;
  }

  const filtered = currentListData.filter((loc) => {
    const nameMatch = loc.name.toLowerCase().includes(keyword);
    const descMatch = loc.description ? loc.description.toLowerCase().includes(keyword) : false;
    return nameMatch || descMatch;
  });

  renderLocations(filtered);
}

// ============================================================================
// PHẦN 6: QUẢN TRỊ HỆ THỐNG
// ============================================================================
function checkAdminAccess(username) {
  console.log("Admin logged in:", username);
}

async function loadAdminStats() {
  try {
    const d = await apiFetch("/api/admin/stats");
    document.getElementById("stat-user").innerText = d.user_count;
    document.getElementById("stat-loc").innerText = d.location_count;
    document.getElementById("stat-like").innerText = d.like_count;
    document.getElementById("stat-link").innerText = d.link_count;
  } catch (e) {}
}

async function triggerAI() {
  const btn = document.querySelector("#adminModal .btn-ai");
  const originalText = btn.innerHTML;

  btn.innerHTML = "<i class='fas fa-snipner fa-spin'></i> Đang chạy...";
  btn.disabled = true;

  try {
    await apiFetch("/api/admin/run-algo", { method: "POST" });
    alert("✅ Đã cập nhật xong!");
    loadAdminStats();
  } catch (e) {
    alert("Lỗi: " + e.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function openAdminUserModal() {
  document.getElementById("adminModal").classList.add("active");
  loadAdminUsersList();
  loadAdminStats();
}

function closeAdminModal() {
  document.getElementById("adminModal").classList.remove("active");
}

async function loadAdminUsersList() {
  const tbody = document.getElementById("adminUserList");
  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">⏳ Đang tải...</td></tr>';
  try {
    const users = await apiFetch("/api/admin/users");
    tbody.innerHTML = "";
    users.forEach((u) => {
      if (u.name === "admin") return;
      tbody.innerHTML += `
                <tr style="border-bottom:1px solid #eee">
                    <td style="padding:10px; font-weight:600">${u.name}</td>
                    <td style="padding:10px">❤️ ${u.liked_count}</td>
                    <td style="padding:10px; text-align:right">
                        <button onclick="deleteUser('${u.name}')" style="background:#fee2e2; color:red; border:none; padding:5px 10px; border-radius:4px; cursor:pointer"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
    });
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="3" style="color:red">Lỗi tải danh sách</td></tr>';
  }
}

async function deleteUser(name) {
  if (!confirm(`⚠️ Xóa user "${name}"?\n(Hành động không thể hoàn tác)`)) return;
  await apiFetch(`/api/admin/users/${name}`, { method: "DELETE" });
  showNotification({
    type: "delete",
    title: "Xóa tài khoản thành công",
    message: `Tài khoản <b>${name}</b> đã bị xóa khỏi hệ thống.`,
    btnText: "Đóng",
  });
  loadAdminUsersList();
  loadAdminStats();
}

// ============================================================================
// PHẦN 7: QUẢN TRỊ DỮ LIỆU ĐỊA ĐIỂM
// ============================================================================
function openAddModal() {
  document.getElementById("addModal").classList.add("active");
}
function closeAddModal() {
  document.getElementById("addModal").classList.remove("active");
}

function activateMapPicker() {
  closeAddModal();
  closeAdminModal();
  isPickingMode = true;

  showNotification({
    type: "success",
    title: "Chế độ chọn vị trí",
    message: "Hãy click chuột vào điểm bạn muốn chọn trên bản đồ.",
    btnText: "Đóng",
  });

  document.getElementById("addLat").value = "";
  document.getElementById("addLng").value = "";
  document.getElementById("map").style.cursor = "crosshair";
}

async function submitAddLocation() {
  const body = {
    name: document.getElementById("addName").value,
    lat: document.getElementById("addLat").value,
    lng: document.getElementById("addLng").value,
    category: document.getElementById("addCategory").value,
    image: document.getElementById("addImage").value,
    description: document.getElementById("addDesc").value,
  };
  if (!body.name || !body.lat) return alert("Thiếu tên hoặc tọa độ!");

  await apiFetch("/api/admin/location/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  alert("✅ Thêm thành công!");
  closeAddModal();
  loadLocations("All");
  cachedAllLocations = null;
  loadAdminStats();
}

function openEditModal() {
  if (!currentOpenLoc) return;
  document.getElementById("editModal").classList.add("active");
  document.getElementById("editOldName").value = currentOpenLoc.name;
  document.getElementById("editName").value = currentOpenLoc.name;
  document.getElementById("editLat").value = currentOpenLoc.lat;
  document.getElementById("editLng").value = currentOpenLoc.lng;
  document.getElementById("editCategory").value = currentOpenLoc.category;
  document.getElementById("editRating").value = currentOpenLoc.rating;
  document.getElementById("editImage").value = currentOpenLoc.image;
  document.getElementById("editDesc").value = currentOpenLoc.description;
}
function closeEditModal() {
  document.getElementById("editModal").classList.remove("active");
}

async function submitEditLocation() {
  const body = {
    old_name: document.getElementById("editOldName").value,
    name: document.getElementById("editName").value,
    lat: document.getElementById("editLat").value,
    lng: document.getElementById("editLng").value,
    category: document.getElementById("editCategory").value,
    rating: document.getElementById("editRating").value,
    image: document.getElementById("editImage").value,
    description: document.getElementById("editDesc").value,
  };
  await apiFetch("/api/admin/location/update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  alert("✅ Cập nhật xong!");
  closeEditModal();
  closeDetail();
  loadLocations("All");
  cachedAllLocations = null;

  // Reset nút bộ lọc về tất cả
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  document.querySelector(".chip:first-child").classList.add("active");
}

async function deleteLocation(name) {
  if (!confirm(`⚠️ Xóa vĩnh viễn địa điểm "${name}"?`)) return;
  await apiFetch("/api/admin/location/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  alert("✅ Đã xóa!");
  closeDetail();
  loadLocations("All");
  cachedAllLocations = null;
  loadAdminStats();
}

// ============================================================================
// PHẦN 8: TIỆN ÍCH & TRẢI NGHIỆM NGƯỜI DÙNG (UTILS & UX)
// ============================================================================

// 8.1. Debounce Search (Chống spam API khi gõ phím)
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
function setupDebounceSearch() {
  document.getElementById("usernameInput").addEventListener(
    "input",
    debounce(() => {
      const val = document.getElementById("usernameInput").value.trim();
      if (val.length > 2) analyzeUser(false);
    }, 800),
  );
}

// 8.2. Drag Scroll (Kéo thả để cuộn thanh lọc danh mục)
function setupDragScroll() {
  const slider = document.querySelector(".filter-chips");
  let isDown = false;
  let startX;
  let scrollLeft;

  if (slider) {
    // --- A. DÀNH CHO MÁY TÍNH (CHUỘT) ---
    slider.addEventListener("mousedown", (e) => {
      isDown = true;
      slider.classList.add("active");
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
      slider.style.cursor = "grabbing";
    });
    slider.addEventListener("mouseleave", () => {
      isDown = false;
      slider.classList.remove("active");
      slider.style.cursor = "grab";
    });
    slider.addEventListener("mouseup", () => {
      isDown = false;
      slider.classList.remove("active");
      slider.style.cursor = "grab";
    });
    slider.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 2;
      slider.scrollLeft = scrollLeft - walk;
    });

    // Cuộn bằng Touchpad / Con lăn chuột
    slider.addEventListener("wheel", (e) => {
      if (slider.scrollWidth <= slider.clientWidth) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      slider.scrollLeft += e.deltaX || e.deltaY;
    });

    // --- B. DÀNH CHO ĐIỆN THOẠI (CẢM ỨNG) ---
    slider.addEventListener("touchstart", (e) => {
      isDown = true;
      startX = e.touches[0].pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener("touchend", () => {
      isDown = false;
    });
    slider.addEventListener("touchmove", (e) => {
      if (!isDown) return;
      const x = e.touches[0].pageX - slider.offsetLeft;
      const walk = (x - startX) * 2; // Tốc độ cuộn
      slider.scrollLeft = scrollLeft - walk;
    });
  }
}

// 8.3. Notification Modal (Thông báo đẹp)
function showNotification({ type, title, message, btnText, onConfirm }) {
  const modal = document.getElementById("notificationModal");
  const icon = document.getElementById("notif-icon");
  const titleEl = document.getElementById("notif-title");
  const msgEl = document.getElementById("notif-msg");
  const btn = document.getElementById("notif-btn");

  // 1. Cập nhật nội dung
  titleEl.innerText = title;
  msgEl.innerHTML = message;
  btn.innerText = btnText || "Đóng";

  // 2. Cập nhật giao diện (Màu sắc/Icon)
  if (type === "success") {
    icon.className = "fas fa-check-circle";
    icon.style.color = "#10b981"; // Xanh lá
    btn.style.backgroundColor = "#2563eb"; // Xanh dương
  } else if (type === "delete") {
    icon.className = "fas fa-trash-alt";
    icon.style.color = "#ef4444"; // Đỏ
    btn.style.backgroundColor = "#ef4444"; // Nút đỏ
  } else if (type === "error") {
    icon.className = "fas fa-exclamation-triangle";
    icon.style.color = "#f59e0b"; // Vàng
    btn.style.backgroundColor = "#f59e0b"; // Nút vàng
  } else {
    icon.className = "fas fa-info-circle";
    icon.style.color = "#2563eb"; // Xanh dương
    btn.style.backgroundColor = "#2563eb"; // Nút xanh dương
  }

  // 3. Tạo nút để xóa sự kiện cũ
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  // Hàm đóng Modal chung
  const closeModal = () => {
    modal.classList.remove("active");
    document.removeEventListener("keydown", handleEnterKey);
    if (onConfirm) onConfirm();
  };

  // Hàm xử lý phím Enter
  const handleEnterKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Ngăn hành vi mặc định (như submit form nền)
      closeModal();
    }
  };

  // Gán sự kiện
  newBtn.onclick = closeModal;
  document.addEventListener("keydown", handleEnterKey);

  // Hiển thị & Focus vào nút đóng (để tiện cho người dùng dùng phím)
  modal.classList.add("active");
  newBtn.focus();
}
