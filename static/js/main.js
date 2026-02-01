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
let currentItineraryData = null;

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
  setupSidebarResizer(); // Kích hoạt tính năng kéo dãn Sidebar

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

  // Sự kiện click bản đồ
  map.on("click", (e) => {
    // Lấy tọa độ và làm tròn 5 số cho đẹp
    const lat = e.latlng.lat.toFixed(5);
    const lng = e.latlng.lng.toFixed(5);

    // --- TRƯỜNG HỢP 1: ĐANG THÊM MỚI (ADD) ---
    if (isPickingMode === "add" || document.getElementById("addModal").classList.contains("active")) {
      document.getElementById("addLat").value = lat;
      document.getElementById("addLng").value = lng;

      // Reset trạng thái
      isPickingMode = null;
      document.getElementById("map").style.cursor = ""; // Trả lại con trỏ chuột

      // Đảm bảo form thêm hiện lên
      document.getElementById("addModal").classList.add("active");

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

      // 4. (Tùy chọn) Cập nhật lại tọa độ khi kéo thả marker này
      tempMarker.on("dragend", function (event) {
        var marker = event.target;
        var position = marker.getLatLng();
        document.getElementById("editLat").value = position.lat.toFixed(5);
        document.getElementById("editLng").value = position.lng.toFixed(5);
      });

      // Reset trạng thái
      isPickingMode = null;
      document.getElementById("map").style.cursor = "";

      // QUAN TRỌNG: Bật lại Modal Sửa (lúc nãy đã bị ẩn đi để nhìn bản đồ)
      document.getElementById("editModal").classList.add("active");

      // Đóng thông báo hướng dẫn phía trên (nếu có)
      const notifModal = document.getElementById("notificationModal");
      if (notifModal) notifModal.classList.remove("active");

      // Thông báo nhỏ
      L.popup().setLatLng(e.latlng).setContent("Đã thay đổi vị trí cho địa điểm hiện tại!").openOn(map);
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
        // Truyền thêm fullname vào hàm hiển thị
        showLoggedView(data.username, data.fullname);
        analyzeUser(true);
      } else {
        currentUser = null;
        userRole = "user";
        showGuestView();
      }
    })
    .catch(() => showGuestView());
}

function showLoggedView(username, fullname) {
  document.getElementById("header-login-btn").style.display = "none";
  const userInfo = document.getElementById("header-user-info");
  
  // Ưu tiên hiển thị fullname nếu có
  const displayName = fullname || username;

  if (userInfo) {
    userInfo.style.display = "flex";
    // document.getElementById("header-username").innerText = displayName; // Đã có trong template bên dưới

    // Nút Profile (Đã gộp vào Avatar) - Giữ code cũ để tham khảo nếu cần
    // const btnProfile = ...

    // Nút Admin
    let btnAdminHTML = "";
    if (username === "admin" || userRole === "admin") {
      btnAdminHTML = `
        <button id="btn-admin-panel" class="btn-logout-mini" onclick="openAdminUserModal()" title="Quản lý Người dùng" style="display: inline-block; margin-right: 5px; color: #3b82f6;">
           <i class="fas fa-users-cog"></i>
        </button>
      `;
    }

    // Nút Logout
    const btnLogout = `
      <button class="btn-logout-mini" onclick="handleLogout()" title="Đăng xuất">
         <i class="fas fa-sign-out-alt"></i>
      </button>
    `;

    // Cập nhật lại HTML của header-user-info
    userInfo.innerHTML = `
      <i class="fas fa-user-circle" onclick="openUserProfile()" title="Hồ sơ cá nhân / Chỉnh sửa" style="font-size: 28px; color: var(--primary); cursor: pointer; transition: transform 0.2s;"></i>
      <span id="header-username" onclick="openUserProfile()" style="cursor: pointer;" title="Hồ sơ cá nhân">${displayName}</span>
      ${btnAdminHTML}
      ${btnLogout}
    `;
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

function openResetPasswordModal() {
  closeAuthModal(); // Đóng modal đăng nhập trước
  document.getElementById("resetPasswordModal").classList.add("active");
}

function closeResetPasswordModal() {
  document.getElementById("resetPasswordModal").classList.remove("active");
}

async function handleResetPassword() {
  const username = document.getElementById("resetUsername").value;
  const email = document.getElementById("resetEmail").value;
  const newPass = document.getElementById("resetNewPass").value;
  const msgEl = document.getElementById("resetMsg");

  if (!username || !email || !newPass) {
    msgEl.innerText = "Vui lòng nhập đầy đủ thông tin.";
    return;
  }
  if (newPass.length < 6) {
    msgEl.innerText = "Mật khẩu mới phải có ít nhất 6 ký tự.";
    return;
  }

  msgEl.innerText = "Đang xử lý...";
  msgEl.style.color = "#4f46e5";

  try {
    const res = await apiFetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, new_password: newPass }),
    });

    showNotification({
      type: "success",
      title: "Thành công",
      message: res.message || "Đã đổi mật khẩu thành công!",
      btnText: "Đăng nhập ngay",
    });

    closeResetPasswordModal();
    openAuthModal();
  } catch (err) {
    msgEl.innerText = err.message || "Lỗi xử lý.";
    msgEl.style.color = "red";
  }
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

// --- Login & Register Logic ---
function handleLogin() {
  const u = document.getElementById("loginUser").value.trim();
  const p = document.getElementById("loginPass").value;

  // 1. Kiểm tra đầu vào
  if (!u || !p) {
    showNotification({
      type: "error",
      title: "Cảnh báo",
      message: "Vui lòng nhập đầy đủ tài khoản và mật khẩu!",
      btnText: "Đóng",
    });
    return;
  }

  // Lấy thẻ thông báo lỗi để dùng nhiều lần
  const msgElement = document.getElementById("loginMsg");
  msgElement.innerText = "Đang xử lý...";

  // 2. Dùng FETCH chuẩn (Thay vì apiFetch để tránh lỗi stream)
  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  })
    .then(async (response) => {
      // ✅ ĐỌC DỮ LIỆU 1 LẦN DUY NHẤT VÀO BIẾN 'data'
      const data = await response.json();

      // Kiểm tra HTTP Status (200 là thành công)
      if (response.ok) {
        // --- XỬ LÝ THÀNH CÔNG ---
        currentUser = data.username;
        userRole = data.role;

        closeAuthModal();
        checkLoginStatus(); // Gọi cái này nó sẽ tự fetch fullname và hiển thị luôn

        // Load lại chi tiết địa điểm nếu đang mở (để cập nhật nút Like)
        if (typeof currentOpenLoc !== "undefined" && currentOpenLoc !== null) {
          showDetail(currentOpenLoc);
        }

        showNotification({
          type: "success",
          title: "Đăng nhập thành công",
          message: `Chào mừng <b>${data.fullname || data.username}</b>!`,
          btnText: "Bắt đầu",
        });

        msgElement.innerText = ""; // Xóa thông báo lỗi
      } else {
        // --- XỬ LÝ LỖI ---
        // Dùng biến 'data' đã đọc ở trên, lấy thuộc tính .error
        msgElement.innerText = data.error || "Đăng nhập thất bại";
        msgElement.style.color = "red";
      }
    })
    .catch((err) => {
      console.error("Login Error:", err);
      msgElement.innerText = "Lỗi kết nối đến máy chủ!";
      msgElement.style.color = "red";
    });
}

function handleRegister() {
  const u = document.getElementById("regUser").value.trim();
  const p = document.getElementById("regPass").value;
  if (!u || !p) {
      showNotification({ type: "warning", message: "Vui lòng nhập đầy đủ thông tin" });
      return;
  }

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
  showNotification({
    type: "question",
    title: "Đăng xuất",
    message: "Bạn có chắc chắn muốn đăng xuất?",
    btnText: "Đồng ý",
    showCancel: true,
    onConfirm: () => {
        apiFetch("/api/logout", { method: "POST" }).then(() => {
            checkLoginStatus();
            showNotification({
                type: "success",
                title: "Đã đăng xuất",
                message: "Hẹn gặp lại bạn! 👋"
            });
        });
    }
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

// ============================================================================
// PHẦN 5: GIAO DIỆN & BẢN ĐỒ
// ============================================================================
async function loadLocations(cat = "All", autoFit = true) {
  const listEl = document.getElementById("locationList");
  listEl.innerHTML = `<div style="text-align:center; padding:20px;">Đang tải...</div>`;
  
  try {
    // 1. Nếu chưa có cache, gọi API lấy toàn bộ 1 lần
    if (!cachedAllLocations) {
       const initialData = await apiFetch("/api/locations"); // Mặc định lấy All
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
    
    // Trả về promise resolved (dù không cần dữ liệu trả về)
    return Promise.resolve();

  } catch (err) {
    console.error(err);
    listEl.innerHTML = "Lỗi tải dữ liệu";
  }
}

function renderLocations(data, autoFit = true) {
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
    //Tính điểm PageRank hiển thị
    let displayScore = (loc.score * 100).toFixed(1);

    // List item
    const div = document.createElement("div");
    div.className = "mini-item";
    div.innerHTML = `
      <img src="${loc.image}" loading = "lazy"class="mini-img" onerror="this.src='/static/images/no-image.png'">
      <div style="flex:1; overflow:hidden;">
        <div class="mini-name">${loc.name}</div>

        <div style="font-size:12px; color:#059669; font-weight:700; margin-top:2px">
          <i class="fas fa-chart-bar"></i> Điểm nổi tiếng: ${displayScore}
        </div>

      </div>
    `;
    div.onclick = () => showDetail(loc);
    list.appendChild(div);

    // Marker + Popup thông minh
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

  // Tự động fitBounds khi lọc danh mục
  if (autoFit && latLngs.length > 0 && map) {
    setTimeout(() => {
      map.fitBounds(latLngs, { padding: [50, 50], maxZoom: 15 });
    }, 100);
  }
}

async function showDetail(loc) {
  console.log(`[DEBUG] Clicked: ${loc.name}, Category: ${loc.category}, Current Filter: ${currentCategory}`);

  // Tự động lọc bản đồ theo danh mục của địa điểm đang xem
  if (currentCategory !== loc.category) {
    console.log(`[DEBUG] Switching filter to: ${loc.category}`);
    // Gọi hàm lọc dữ liệu và ĐỢI nó xong (để marker được vẽ lại)
    // autoFit = false: Không zoom toàn bộ category, để dành zoom vào địa điểm cụ thể bên dưới
    await filterData(loc.category, null, false);
    
    // Cập nhật giao diện nút bấm (Chip)
    const chips = document.querySelectorAll(".chip");
    chips.forEach(c => {
        if (c.innerText.includes(loc.category)) c.classList.add("active");
        else c.classList.remove("active");
    });
  }

  currentOpenLoc = loc;

  let rawScore = loc.score !== undefined ? loc.score : loc.pr !== undefined ? loc.pr : 0;
  let displayScore = (rawScore * 100).toFixed(1);

  let mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + " Thừa Thiên Huế")}`;

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

  // Tạo section giải thích AI nếu có thông tin reason
  let aiExplanationHTML = "";
  if (loc.reason && loc.reason_details) {
    const details = loc.reason_details;
    const reasonType = loc.reason_type || "default";
    
    aiExplanationHTML = `
      <div class="ai-explanation-section">
        <div class="ai-explanation-header">
          <i class="fas fa-robot"></i> Tại sao gợi ý cho bạn?
        </div>
        <div class="ai-reason-main ${reasonType}">
          <span class="reason-icon">${loc.reason_icon}</span>
          <span class="reason-text">${loc.reason}</span>
        </div>
        <div class="ai-score-breakdown">
          <div class="score-bar-item">
            <div class="score-label">
              <span class="score-icon">👥</span>
              <!-- Hidden Label -->
              <span class="score-value">${details.collab.percent.toFixed(0)}%</span>
            </div>
            <div class="score-bar">
              <div class="score-bar-fill collab" style="width: ${details.collab.percent}%"></div>
            </div>
            <div class="score-desc">${details.collab.desc}</div>
          </div>
          <div class="score-bar-item">
            <div class="score-label">
              <span class="score-icon">🎯</span>
              <!-- Hidden Label -->
              <span class="score-value">${details.content.percent.toFixed(0)}%</span>
            </div>
            <div class="score-bar">
              <div class="score-bar-fill content" style="width: ${details.content.percent}%"></div>
            </div>
            <div class="score-desc">${details.content.desc}</div>
          </div>
          <div class="score-bar-item">
            <div class="score-label">
              <span class="score-icon">🏆</span>
              <!-- Hidden Label -->
              <span class="score-value">${details.pagerank.percent.toFixed(0)}%</span>
            </div>
            <div class="score-bar">
              <div class="score-bar-fill pagerank" style="width: ${details.pagerank.percent}%"></div>
            </div>
            <div class="score-desc">${details.pagerank.desc}</div>
          </div>
        </div>
      </div>
    `;
  }

  content.innerHTML = `
        <img src="${loc.image}" loading="lazy" class="detail-hero" onerror="this.src='/static/images/no-image.png'">
        <div class="detail-body">
            <h1 class="detail-title">${loc.name}</h1>

            <div class="detail-meta">
              <span class="meta-tag" style="background:#059669; color:white;">⭐ ${displayScore}</span>
              <span class="meta-tag"><i class="fas fa-tag"></i> ${loc.category}</span>
              ${userLikedSet.has(loc.name) ? '<span class="meta-tag visited-tag"><i class="fas fa-check-circle"></i> Đã ghé thăm</span>' : ''}
            </div>

            <p class="detail-desc">${loc.description || "..."}</p>

            ${aiExplanationHTML}

            <div class="detail-actions">
                ${likeBtn}
                <a href="${mapLink}" target="_blank" class="btn-action btn-maps"><i class="fas fa-directions"></i> Chỉ đường</a>
            </div>
            ${adminActions}

            <!-- REVIEW SECTION -->
            <div class="review-section">
                <div class="review-header">
                    <span><i class="fas fa-comments"></i> Đánh giá & Bình luận</span>
                    <button class="btn-write-review" onclick="toggleReviewForm()"><i class="fas fa-pen"></i> Viết đánh giá</button>
                </div>
                <div id="reviewFormContainer" class="review-form" style="display:none;">
                    <div class="rating-input">
                        <input type="radio" id="star5" name="rating" value="5" /><label for="star5">★</label>
                        <input type="radio" id="star4" name="rating" value="4" /><label for="star4">★</label>
                        <input type="radio" id="star3" name="rating" value="3" /><label for="star3">★</label>
                        <input type="radio" id="star2" name="rating" value="2" /><label for="star2">★</label>
                        <input type="radio" id="star1" name="rating" value="1" /><label for="star1">★</label>
                    </div>
                    <textarea id="reviewComment" class="review-textarea" placeholder="Chia sẻ trải nghiệm..."></textarea>
                    <div style="text-align:right;"><button class="btn-submit" onclick="submitReview('${loc.name}')">Gửi</button></div>
                </div>
                <div id="reviewList" class="review-list"><div style="text-align:center; padding:10px; color:#9ca3af;">Đang tải...</div></div>
            </div>

            <!-- Section gợi ý địa điểm cùng danh mục -->
            <div class="similar-locations-section">
              <div class="section-head" style="margin-top:24px; margin-bottom:12px;">
                <h2><i class="fas fa-map-marker-alt"></i> Khám phá thêm</h2>
              </div>
              <div class="similar-locations-list" id="similar-locations-list">
                <div class="similar-loading" style="text-align:center; font-size:12px; color:#9ca3af;">
                  <i class="fas fa-spinner fa-spin"></i> Đang tải...
                </div>
              </div>
            </div>
        </div>
    `;
  panel.classList.add("active");

  // Tải các địa điểm cùng danh mục
  loadSimilarLocations(loc.name);
  loadReviews(loc.name);
}

// Hàm tải địa điểm cùng danh mục
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
    // Đóng modal profile nếu đang mở để hiển thị map bên dưới
    closeUserProfile();

    // Tìm thông tin đầy đủ trong bộ nhớ đệm
    let realLoc = null;
    if (cachedAllLocations) {
        realLoc = cachedAllLocations.find(l => l.name === name);
    }
    if (!realLoc && currentListData) {
        realLoc = currentListData.find(l => l.name === name);
    }

    if (realLoc) {
        showDetail(realLoc);
    } else {
        // Fallback nếu chưa tải dữ liệu (ít khi xảy ra)
        showDetail({ 
            name, lat, lng, image, 
            category: "Đã ghé thăm", 
            description: "Đang tải thông tin chi tiết...", // Sửa lại nội dung placeholder
            score: 0 
        });
        // Có thể gọi loadLocations("All") ngầm để cập nhật sau
    }
}

function closeDetail() {
  document.getElementById("detail-panel").classList.remove("active");
}

function filterData(cat, btn, autoFit = true) {
  // Cập nhật biến toàn cục
  currentCategory = cat;

  // 1. Xử lý giao diện nút
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

  // 2. Tải lại dữ liệu (TRẢ VỀ PROMISE)
  return loadLocations(cat, autoFit);
}

function handleLocalSearch() {
  const input = document.getElementById("miniSearchInput");
  if (!input) return;

  const keyword = input.value.toLowerCase().trim();
  if (!keyword) {
    renderLocations(currentListData);
    return;
  }

  // Ưu tiên tìm trên toàn bộ dữ liệu (cache) nếu có
  const sourceData = cachedAllLocations || currentListData;

  const filtered = sourceData.filter((loc) => {
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

    console.log("👉 Tổng số user Server trả về:", users.length);
    console.log(
      "👉 Danh sách tên:",
      users.map((u) => u.name),
    );

    // Kiểm tra xem có user nào tên là "admin" trong này không?
    const hasAdmin = users.find((u) => u.name === "admin");
    console.log("👉 Có user 'admin' trong danh sách không?", hasAdmin ? "CÓ" : "KHÔNG");
    tbody.innerHTML = "";
    users.forEach((u) => {
      if (u.name === "admin") return;
      tbody.innerHTML += `
                <tr style="border-bottom:1px solid #eee">
                    <td style="padding:10px;">
                        <div style="font-weight:600; color:var(--text-main);">${u.name}</div>
                        <div style="font-size:11px; color:var(--text-light); cursor:pointer;" onclick="viewUserDetails('${u.name}')">
                            <span style="color:var(--primary); text-decoration: underline;">Xem thông tin chi tiết</span>
                        </div>
                    </td>
                    <td style="padding:10px">
                        <div style="display:flex; flex-direction:column; gap:4px; font-size:12px;">
                            <span style="color:#e11d48"><i class="fas fa-heart"></i> ${u.liked_count || 0} thích</span>
                            <span style="color:#2563eb"><i class="fas fa-comment"></i> ${u.comment_count || 0} đánh giá</span>
                        </div>
                    </td>
                    <td style="padding:10px; text-align:right">
                        <div style="display:flex; justify-content:flex-end; gap:6px;">
                            <button onclick="deleteUser('${u.name}')" title="Xóa tài khoản" style="background:#fee2e2; color:red; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; transition:all 0.2s;"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
    });
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="3" style="color:red">Lỗi tải danh sách</td></tr>';
  }
}

async function viewUserDetails(username) {
  const modal = document.getElementById("userCommentsModal");
  const list = document.getElementById("userCommentsList");
  const title = document.getElementById("commentUserTitle");
  
  const modalHeader = modal.querySelector(".modal-title-fancy");
  if(modalHeader) modalHeader.innerText = "📋 Hồ sơ người dùng";

  title.innerText = `@${username}`;
  list.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;"><div class="spinner-large" style="width:24px; height:24px; border-width:2px; margin:0 auto 10px;"></div>Đang tải thông tin...</div>`;
  modal.classList.add("active");

  try {
    const profile = await apiFetch(`/api/admin/user_profile/${username}`);
    
    if (!profile) {
       list.innerHTML = `<div style="color:red; text-align:center;">Không tìm thấy thông tin user.</div>`;
       return;
    }

    const createdDate = profile.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : 'Không rõ';
    const comments = profile.reviews || [];

    let html = `
      <!-- Profile Header -->
      <div style="background: linear-gradient(to right, #f8fafc, #f1f5f9); padding: 16px; border-radius: 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 16px; border: 1px solid #e2e8f0;">
          <div style="width: 60px; height: 60px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--primary); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <i class="fas fa-user"></i>
          </div>
          <div>
            <div style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 2px;">${profile.fullname || profile.name}</div>
            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px;">@${profile.name}</div>
            
            ${profile.email ? `<div style="font-size: 12px; color: var(--text-light); margin-bottom: 6px;"><i class="fas fa-envelope"></i> ${profile.email}</div>` : ''}

            <div style="font-size: 11px; color: var(--text-light); display: flex; gap: 12px; align-items:center;">
                <span><i class="far fa-calendar-alt"></i> ${createdDate}</span>
                <span style="color:${profile.role==='admin'?'var(--danger)':'var(--info)'}; font-weight:600; text-transform:uppercase; font-size:10px; border:1px solid currentColor; padding:0 4px; border-radius:4px;">${profile.role || 'user'}</span>
            </div>
          </div>
      </div>

      <!-- Stats Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
          <div style="background: #fff1f2; padding: 12px; border-radius: 8px; border: 1px solid #fecdd3; text-align: center;">
              <div style="font-size: 20px; font-weight: 800; color: #e11d48;">${profile.liked_count}</div>
              <div style="font-size: 11px; color: #9f1239; font-weight: 600;">ĐỊA ĐIỂM ĐÃ THÍCH</div>
          </div>
          <div style="background: #eff6ff; padding: 12px; border-radius: 8px; border: 1px solid #bfdbfe; text-align: center;">
              <div style="font-size: 20px; font-weight: 800; color: #2563eb;">${profile.comment_count}</div>
              <div style="font-size: 11px; color: #1e40af; font-weight: 600;">BÌNH LUẬN</div>
          </div>
      </div>

      <!-- Liked Locations List -->
      <div style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 10px; text-transform: uppercase;">
        <i class="fas fa-heart"></i> Danh sách yêu thích
      </div>
      <div style="margin-bottom: 20px;">
         ${
            (!profile.liked_locations || profile.liked_locations.length === 0) 
            ? `<div style="text-align:center; padding:15px; color:#94a3b8; font-size:12px; bg: #f8fafc; border:1px dashed #e2e8f0; border-radius:8px;">Chưa thích địa điểm nào</div>`
            : `<div style="display:flex; overflow-x:auto; gap:10px; padding-bottom:5px; scrollbar-width:thin;">` + 
              profile.liked_locations.map(l => `
               <div onclick="showDetailFromData('${l.name}', ${l.lat}, ${l.lng}, '${l.image}')" 
                    title="${l.name}"
                    style="min-width:100px; width:100px; cursor:pointer; background:white; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0; transition:transform 0.2s;">
                  <div style="height:70px; width:100%; background:#f1f5f9;">
                      <img src="${l.image || ''}" loading="lazy" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='/static/images/no-image.png'">
                  </div>
                  <div style="padding:6px;">
                      <div style="font-size:11px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text-main);">${l.name}</div>
                      <div style="font-size:9px; color:var(--text-light); white-space:nowrap;">${l.category||''}</div>
                  </div>
               </div>
              `).join('') + `</div>`
         }
      </div>

      <div style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 10px; text-transform: uppercase;">
        <i class="fas fa-history"></i> Lịch sử hoạt động (${comments.length})
      </div>
    `;

    if (comments.length === 0) {
      html += `<div style="text-align:center; padding:30px; color:#94a3b8; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;"><i class="fas fa-comment-slash" style="font-size:24px; margin-bottom:8px;"></i><br>User chưa có hoạt động bình luận nào.</div>`;
    } else {
      html += `<div style="display: flex; flex-direction: column; gap: 10px;">`;
      comments.forEach(c => {
        const stars = '★'.repeat(c.rating) + '☆'.repeat(5 - c.rating);
        html += `
          <div class="review-item" style="padding: 12px; background: white; border: 1px solid #f1f5f9; border-radius: 8px;">
              <div class="review-avatar" style="width: 32px; height: 32px; font-size: 14px; background: #f1f5f9; color: var(--text-secondary);">${c.rating}</div>
              <div class="review-content">
                  <div class="review-head" style="margin-bottom: 4px;">
                      <div class="review-user-name" style="color:var(--primary); font-size:13px;">${c.location}</div>
                      <div class="review-date" style="font-size:10px;">${c.time || ""}</div>
                  </div>
                  <div class="review-rating" style="margin-bottom: 4px;">
                      <span class="review-stars" style="font-size:10px; color:#f59e0b;">${stars}</span>
                  </div>
                  <div class="review-text" style="font-size:12px;">${c.comment}</div>
              </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    list.innerHTML = html;

  } catch (err) {
    list.innerHTML = `<div style="color:red; text-align:center;">Lỗi tải hồ sơ: ${err.message}</div>`;
  }
}

function closeUserCommentsModal() {
  document.getElementById("userCommentsModal").classList.remove("active");
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
  isPickingMode = "add";

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

function activateEditMapPicker() {
  // Ẩn form sửa đi để nhìn thấy bản đồ
  document.getElementById("editModal").classList.remove("active");

  // Gán trạng thái là edit
  isPickingMode = "edit";

  showNotification({
    type: "info",
    title: "Chọn vị trí mới",
    message: "Click vào vị trí mới trên bản đồ để cập nhật.",
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

  showNotification({
    type: "success",
    title: "Thành công",
    message: "Đã thêm địa điểm mới vào hệ thống.",
    btnText: "OK",
  });

  closeAddModal();
  cachedAllLocations = null;
  loadLocations("All");
  loadAdminStats();
}

function openEditModal() {
  if (!currentOpenLoc) return;

  // 1. Điền các thông tin văn bản (Tên, mô tả...)
  document.getElementById("editOldName").value = currentOpenLoc.name;
  document.getElementById("editName").value = currentOpenLoc.name;
  document.getElementById("editCategory").value = currentOpenLoc.category;
  // document.getElementById("editRating").value = currentOpenLoc.rating; (Đã bỏ)
  document.getElementById("editImage").value = currentOpenLoc.image;
  document.getElementById("editDesc").value = currentOpenLoc.description;

  // 2. Tính toán tọa độ (Logic quan trọng)
  let finalLat = currentOpenLoc.lat; // Mặc định lấy từ Database
  let finalLng = currentOpenLoc.lng;

  // Kiểm tra xem có ghim tạm thời đang cắm trên bản đồ không?
  if (tempMarker) {
    const pos = tempMarker.getLatLng();
    finalLat = pos.lat.toFixed(5);
    finalLng = pos.lng.toFixed(5);
    console.log("👉 Đã phát hiện ghim tạm, ưu tiên sử dụng tọa độ mới:", finalLat, finalLng);
  } else {
    console.log("ℹ️ Không có ghim tạm, sử dụng tọa độ gốc từ Database.");
  }

  // 3. GÁN GIÁ TRỊ VÀO Ô INPUT (Chỉ làm 1 lần tại đây)
  // Dùng setTimeout 0ms để đẩy việc này xuống cuối hàng đợi xử lý của trình duyệt
  // Giúp khắc phục lỗi giao diện chưa kịp cập nhật
  setTimeout(() => {
    document.getElementById("editLat").value = finalLat;
    document.getElementById("editLng").value = finalLng;
  }, 0);

  // 4. Hiển thị Modal
  document.getElementById("editModal").classList.add("active");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("active");

  isPickingMode = null;
  document.getElementById("map").style.cursor = "";

  const notifModal = document.getElementById("notificationModal");
  if (notifModal) notifModal.classList.remove("active");
}

async function submitEditLocation() {
  // 1. Lấy dữ liệu (Logic ưu tiên Marker như bài trước)
  let submitLat = document.getElementById("editLat").value;
  let submitLng = document.getElementById("editLng").value;

  if (tempMarker) {
    const pos = tempMarker.getLatLng();
    submitLat = pos.lat;
    submitLng = pos.lng;
  }

  const body = {
    old_name: document.getElementById("editOldName").value,
    name: document.getElementById("editName").value,
    lat: submitLat,
    lng: submitLng,
    category: document.getElementById("editCategory").value,
    // Cho phép rating mặc định hoặc giữ nguyên (backend sẽ xử lý hoặc bỏ qua)
    image: document.getElementById("editImage").value,
    description: document.getElementById("editDesc").value,
  };

  try {
    // Gọi API cập nhật
    await apiFetch("/api/admin/location/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // --- ✅ KHẮC PHỤC LỖI KHÔNG CẬP NHẬT NGAY ---

    // 1. Xóa ghim tạm (Temp Marker)
    if (tempMarker) {
      map.removeLayer(tempMarker);
      tempMarker = null;
    }

    // 2. XÓA BỘ NHỚ ĐỆM DỮ LIỆU
    cachedAllLocations = null;
    currentListData = [];

    // 3. XÓA SẠCH CÁC GHIM CŨ TRÊN BẢN ĐỒ (Quan trọng)
    // Nếu bạn dùng markerLayer (như khai báo đầu file), hãy xóa nó
    if (typeof markerLayer !== "undefined" && markerLayer) {
      markerLayer.clearLayers();
    }

    // 4. CẬP NHẬT BIẾN currentOpenLoc (Quan trọng)
    // Để nếu bạn click vào xem chi tiết ngay, nó sẽ hiển thị dữ liệu mới
    if (currentOpenLoc && currentOpenLoc.name === body.old_name) {
      // Gán đè dữ liệu mới vào biến hiện tại
      currentOpenLoc.name = body.name;
      currentOpenLoc.lat = body.lat;
      currentOpenLoc.lng = body.lng;
      currentOpenLoc.image = body.image;
      currentOpenLoc.category = body.category;
      currentOpenLoc.description = body.description;
    }
    // ----------------------------------------------

    showNotification({
      type: "success",
      title: "Thành công",
      message: "Đã cập nhật dữ liệu mới.",
      btnText: "OK",
    });

    closeEditModal();
    closeDetail();

    // 5. Tải lại dữ liệu mới từ Server
    // Thêm await để đảm bảo tải xong mới làm việc khác
    await loadLocations("All");

    // Reset bộ lọc UI
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    document.querySelector(".chip:first-child").classList.add("active");
  } catch (error) {
    console.error(error);
    showNotification({ type: "error", title: "Lỗi", message: "Lỗi lưu: " + error.message });
  }
}

async function deleteLocation(name) {
  if (!confirm(`⚠️ Xóa vĩnh viễn địa điểm "${name}"?`)) return;
  await apiFetch("/api/admin/location/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  showNotification({
    type: "delete",
    title: "Thành công",
    message: "Đã xóa địa điểm khỏi hệ thống.",
    btnText: "OK",
  });

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

// 8.3. Notification Modal (Thông báo đẹp & Confirm)
function showNotification({ type, title, message, btnText, onConfirm, showCancel, cancelText, onCancel }) {
  const modal = document.getElementById("notificationModal");
  const content = document.getElementById("notif-content");
  const icon = document.getElementById("notif-icon");
  const titleEl = document.getElementById("notif-title");
  const msgEl = document.getElementById("notif-msg");
  
  const btn = document.getElementById("notif-btn");
  const btnCancel = document.getElementById("notif-cancel-btn");

  // 1. Reset lớp màu cũ
  content.className = "modal-content-notification"; 
  
  // 2. Thêm lớp màu mới & Icon
  let iconClass = "fas fa-info";
  if (type === "success") {
    content.classList.add("type-success");
    iconClass = "fas fa-check";
  } else if (type === "error") {
    content.classList.add("type-error");
    iconClass = "fas fa-times";
  } else if (type === "warning") {
    content.classList.add("type-warning");
    iconClass = "fas fa-exclamation";
  } else if (type === "delete" || type === "question") {
    content.classList.add("type-info"); // Hoặc type riêng
    iconClass = "fas fa-question";
  } else {
    content.classList.add("type-info");
    iconClass = "fas fa-info";
  }
  
  icon.className = iconClass;

  // 3. Cập nhật nội dung
  titleEl.innerText = title || "Thông báo";
  msgEl.innerHTML = message;
  btn.innerText = btnText || "Đóng";

  // 4. Xử lý nút Cancel (Confirm Mode)
  if (showCancel) {
      btnCancel.style.display = "block";
      btnCancel.innerText = cancelText || "Hủy";
      
      // Clone để xóa event cũ
      const newBtnCancel = btnCancel.cloneNode(true);
      btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
      
      newBtnCancel.onclick = () => {
          modal.classList.remove("active");
          if (onCancel) onCancel();
      };
  } else {
      btnCancel.style.display = "none";
  }

  // 5. Reset event nút chính
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  const closeModal = () => {
    modal.classList.remove("active");
    if (onConfirm) onConfirm();
  };

  newBtn.onclick = closeModal;
  
  // Hiển thị
  modal.classList.add("active");
  // Focus vào nút Hủy nếu là confirm để tránh bấm nhầm, ngược lại focus nút đóng
  if (showCancel) {
      // Tìm nút cancel mới (do đã render lại)
      document.getElementById("notif-cancel-btn").focus(); 
  } else {
      newBtn.focus();
  }
}

/* ============================================================================
   PHẦN 9: MAP EXTENSIONS & REVIEWS
   ============================================================================ */

function getDynamicIcon(loc) {
  const iconMap = {
    "Di tích": "🏛️", "Ẩm thực": "🍜", "Thiên nhiên": "🌳",
    "Bãi biển": "🏖️", "Tâm linh": "🛕", "Lăng tẩm": "🏯",
    "Tham quan": "🏞️", "Mua sắm": "🛍️",
  };
  const symbol = iconMap[loc.category] || "📍";
  
  let extraClass = "";
  
  // LOGIC MÀU SẮC CHO LEGEND
  if (loc.is_personalized || (loc.reason && loc.reason_type === 'collab')) {
      extraClass = "pin-collab"; // Xanh dương
  } 
  else if (loc.score && loc.score >= 0.35) {
      extraClass = "pin-pr"; // Đỏ
  }

  return L.divIcon({
    className: "custom-div-icon",
    html: `<div class='custom-pin ${extraClass}'>${symbol}</div>`,
    iconSize: [30, 30] 
  });
}

function toggleHeatmap() {
    const btn = document.getElementById('btn-toggle-heatmap');
    
    if (isHeatmapActive) {
        // Tắt Heatmap
        if (heatLayer && map.hasLayer(heatLayer)) { map.removeLayer(heatLayer); }
        if (markerLayer) { map.addLayer(markerLayer); }
        
        isHeatmapActive = false;
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-fire"></i> Bản đồ nhiệt';
        const legend = document.getElementById('heatmap-legend');
        if(legend) legend.style.display = 'none';
        
    } else {
        // Bật Heatmap
        if (!cachedAllLocations || cachedAllLocations.length === 0) {
            showNotification({type: 'error', title: 'Lỗi', message: 'Chưa có dữ liệu.', btnText: 'Đóng'});
            return;
        }

        const heatPoints = cachedAllLocations.map(loc => {
            let val = loc.score || loc.pagerankScore || 0;
            if (val === 0) val = 0.1;
            return [loc.lat, loc.lng, val * 5];
        });

        if (markerLayer) map.removeLayer(markerLayer);

        heatLayer = L.heatLayer(heatPoints, { radius: 30, blur: 20, max: 1.0 }).addTo(map);

        isHeatmapActive = true;
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-fire-alt"></i> Tắt Heatmap';
        const legend = document.getElementById('heatmap-legend');
        if(legend) legend.style.display = 'block';
        
        showNotification({type: 'success', title: 'Heatmap', message: 'Đang hiển thị mức độ phổ biến.', btnText: 'OK'});
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
        
        // Tính thống kê
        const positiveCount = data.filter(r => r.rating >= 4).length;
        const totalCount = data.length;
        
        // Thêm dòng thống kê vào đầu danh sách
        let html = `<div class="review-stats">
            <i class="fas fa-smile-beam"></i>
            <div class="review-stats-text">
                <b>Tuyệt vời! ${positiveCount}/${totalCount} khách hài lòng</b>
                <span>Dựa trên đánh giá tích cực (4-5 sao)</span>
            </div>
        </div>`;

        html += data.map(rev => {
            let actions = "";
            if(currentUser && rev.user === currentUser) {
                const safeComment = (rev.comment || "").replace(/"/g, "&quot;").replace(/'/g, "\\'");
                actions = `
                    <div style="margin-left:auto; font-size:11px;">
                        <a href="#" onclick="editReview('${locationName}', ${rev.rating}, '${safeComment}'); return false;" style="color:#2563eb; margin-right:8px;">Sửa</a>
                        <a href="#" onclick="deleteReview('${locationName}'); return false;" style="color:#ef4444;">Xóa</a>
                    </div>`;
            }

            // Xử lý hiển thị cảm xúc
            let sentimentHtml = "";
            if (rev.sentiment === "Positive") {
                sentimentHtml = `<span class="sentiment-badge sentiment-positive" title="AI phân tích: Tích cực"><i class="fas fa-smile"></i> Tích cực</span>`;
            } else if (rev.sentiment === "Negative") {
                sentimentHtml = `<span class="sentiment-badge sentiment-negative" title="AI phân tích: Tiêu cực"><i class="fas fa-frown"></i> Tiêu cực</span>`;
            } else {
                sentimentHtml = `<span class="sentiment-badge sentiment-neutral" title="AI phân tích: Trung tính"><i class="fas fa-meh"></i> Trung tính</span>`;
            }

            return `
            <div class="review-item">
                <div class="review-avatar"><i class="fas fa-user-circle"></i></div>
                <div class="review-content">
                    <div class="review-head">
                        <div class="review-user-name">${rev.user}</div>
                        <div class="review-date">${rev.time || "Vừa xong"}</div>
                    </div>
                    
                    <div class="review-rating">
                        <span class="review-stars">${'★'.repeat(rev.rating)}</span>
                        ${sentimentHtml}
                        ${actions}
                    </div>
                    
                    <div class="review-text">${rev.comment || ""}</div>
                </div>
            </div>`;
        }).join("");
        
        list.innerHTML = html;

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

// ============================================================================
// PHẦN 8: QUẢN LÝ HỒ SƠ CÁ NHÂN (PROFILE)
// ============================================================================
let userActivityData = { likes: [], reviews: [] };

async function openUserProfile() {
    const modal = document.getElementById("profileModal");
    modal.classList.add("active");
    
    // Tải thông tin
    try {
        const data = await apiFetch("/api/profile");
        if(data) {
            document.getElementById("profileUsername").innerText = "@" + data.username;
            document.getElementById("profileFullname").value = data.fullname || "";
            document.getElementById("profileEmail").value = data.email || "";
            document.getElementById("profileRole").innerText = data.role === "admin" ? "Quản trị viên" : "Thành viên";
            document.getElementById("profileJoinDate").innerText = data.created_at ? new Date(data.created_at).toLocaleDateString('vi-VN') : "N/A";
        }

        // Tải lịch sử hoạt động VÀ lộ trình
        const [activity, itineraries] = await Promise.all([
             apiFetch("/api/user/activity"),
             apiFetch("/api/itineraries")
        ]);

        if(activity && activity.success) {
            userActivityData.likes = activity.likes || [];
            userActivityData.reviews = activity.reviews || [];
        }
        if(itineraries && itineraries.success) {
            userActivityData.itineraries = itineraries.data || [];
        } else {
            userActivityData.itineraries = [];
        }

        // Mặc định hiển thị tab 'likes'
        const activeTabBtn = document.querySelector(".activity-tabs .tab-btn.active");
        let currentTab = 'likes';
        if (activeTabBtn.innerText.includes("Đánh giá")) currentTab = 'reviews';
        if (activeTabBtn.innerText.includes("Lộ trình")) currentTab = 'itineraries';
        
        renderActivity(currentTab);

    } catch(e) {
        console.error(e);
        showNotification({ type: "error", message: "Không thể tải thông tin hồ sơ" });
    }
}

function switchActivityTab(tab, btn) {
    // UI toggle
    document.querySelectorAll(".activity-tabs .tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderActivity(tab);
}

function renderActivity(tab) {
    const container = document.getElementById("activityContent");
    container.innerHTML = "";
    
    const items = userActivityData[tab] || [];
    
    if (items.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#9ca3af; font-size:12px;">Chưa có hoạt động nào</div>`;
        return;
    }
    
    if (tab === 'likes') {
        container.innerHTML = items.map(p => `
            <div class="activity-item-compact">
                <img src="${p.image || '/static/images/no-image.png'}" onerror="this.src='/static/images/no-image.png'">
                <div class="activity-info">
                    <h5>${p.name || p.location}</h5>
                    <p>${p.category}</p>
                </div>
                <button class="btn-tool-delete" style="padding:4px 8px;" onclick="handleLikeInProfile(this, '${p.name || p.location}')"><i class="fas fa-trash"></i></button>
            </div>
        `).join("");
    } else if (tab === 'reviews') {
        container.innerHTML = items.map(r => `
            <div class="activity-item-compact">
                <div class="activity-info">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h5>${r.location}</h5>
                        <span class="review-tag">${r.rating} ⭐</span>
                    </div>
                    <p style="font-style:italic;">"${r.comment || 'Không có bình luận'}"</p>
                    <p style="font-size:10px; margin-top:4px;"><i class="fas fa-calendar-alt"></i> ${r.time || 'N/A'}</p>
                </div>
            </div>
        `).join("");
    } else if (tab === 'itineraries') {
        container.innerHTML = items.map(it => `
            <div class="activity-item-compact">
                <div class="activity-info">
                    <h5><i class="fas fa-route"></i> ${it.title}</h5>
                    <p style="font-size:11px;">Thời lượng: ${it.days} ngày</p>
                    <p style="font-size:10px; color:#666; margin-top:2px;">Tạo ngày: ${it.created_at || 'Vừa xong'}</p>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="btn-tool-edit" onclick='viewSavedItinerary(${JSON.stringify(it.data)})'><i class="fas fa-eye"></i></button>
                    <button class="btn-tool-delete" onclick="deleteItinerary('${it.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join("");
    }
}

// Helper: Xem lại lộ trình đã lưu
function viewSavedItinerary(planData) {
    if (!planData) return;
    renderItinerary(planData);
    openPlannerResultModal();
    // Ẩn modal profile để nhìn rõ hơn
    document.getElementById("profileModal").classList.remove("active");
}

// Helper: Xóa lộ trình
async function deleteItinerary(id) {
    if (!confirm("Bạn muốn xóa lộ trình này?")) return;
    try {
        await apiFetch(`/api/itineraries/${id}`, { method: "DELETE" });
        // Tải lại danh sách
        openUserProfile(); 
    } catch(e) {
        alert("Lỗi xóa: " + e.message);
    }
}

// Hàm phụ để Unlike ngay trong Profile
async function handleLikeInProfile(btn, name) {
    if (!confirm(`Bạn muốn bỏ thích ${name}?`)) return;
    
    try {
        const res = await apiFetch("/api/like", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ location_name: name }),
        });
        
        if (res) {
            // Cập nhật local data và render lại
            userActivityData.likes = userActivityData.likes.filter(l => l.location !== name);
            renderActivity('likes');
            
            // Cập nhật global state
            userLikedSet.delete(name);
            analyzeUser(true); // Cập nhật sidebar
            
            // Nếu panel đang mở địa điểm này, cập nhật nút like
            if (currentOpenLoc && currentOpenLoc.name === name) {
                const globalLikeBtn = document.querySelector('.btn-like');
                if (globalLikeBtn) {
                    globalLikeBtn.classList.remove('liked');
                    globalLikeBtn.innerHTML = `<i class="far fa-heart"></i> Yêu thích`;
                }
            }
        }
    } catch(e) {
        alert("Lỗi khi thực hiện thao tác");
    }
}

function closeUserProfile() {
    document.getElementById("profileModal").classList.remove("active");
}

async function saveUserProfile() {
    const fullname = document.getElementById("profileFullname").value;
    const email = document.getElementById("profileEmail").value;
    const password = document.getElementById("profilePassword").value;
    
    if(!fullname) {
        showNotification({ type: "warning", title: "Thiếu thông tin", message: "Vui lòng nhập họ tên hiển thị" });
        return;
    }

    const btn = document.querySelector("#profileModal .btn-save-gradient");
    const oldText = btn.innerText;
    btn.innerText = "Đang lưu...";
    btn.disabled = true;

    try {
        const res = await apiFetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullname, email, password })
        });
        
        showNotification({ 
            type: "success", 
            title: "Thành công", 
            message: "Đã cập nhật hồ sơ!" 
        });
        
        closeUserProfile();
        // Cập nhật lại UI nếu cần (VD: tên hiển thị trên header)
        checkLoginStatus(); 
        
    } catch(e) {
        showNotification({ type: "error", title: "Lỗi", message: e.message || "Lỗi cập nhật" });
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
}

function deleteReview(locationName) {
    showNotification({
        type: "delete",
        title: "Xác nhận xóa",
        message: "Bạn có chắc chắn muốn xóa đánh giá này không?",
        btnText: "Xóa ngay",
        showCancel: true,
        onConfirm: () => {
            apiFetch('/api/review', {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location_name: locationName })
            }).then(res => {
                if(res.success) {
                    showNotification({ type: "success", title: "Thành công", message: "Đã xóa đánh giá của bạn!" });
                    loadReviews(locationName); // Reload reviews list
                    
                    // Reset form state
                    const form = document.getElementById('reviewFormContainer');
                    delete form.dataset.editing;
                    document.querySelector('#reviewFormContainer button.btn-submit').innerText = "Gửi";
                    
                    // Reset input
                     document.getElementById('reviewComment').value = "";
                     const checked = document.querySelector('input[name="rating"]:checked');
                     if(checked) checked.checked = false;
                     
                } else {
                     showNotification({ type: "error", title: "Lỗi", message: res.error });
                }
            });
        }
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
            showNotification({
                type: 'success',
                title: isEditing ? 'Cập nhật thành công!' : 'Đánh giá thành công!',
                message: `Địa điểm <b>${locationName}</b> đã được lưu vào danh sách yêu thích của bạn.`,
                btnText: 'OK'
            });
            document.getElementById('reviewComment').value = '';
            const form = document.getElementById('reviewFormContainer');
            form.style.display = 'none';
            delete form.dataset.editing;
            
            // Reset button to standard state
            const btn = document.querySelector('#reviewFormContainer button.btn-submit');
            btn.innerText = 'Gửi';
            // Important: clone to clear old event listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.onclick = () => submitReview(currentOpenLoc ? currentOpenLoc.name : '');

            // Tải lại danh sách review
            loadReviews(locationName);
            
            // ✅ QUAN TRỌNG: Reload dữ liệu user vì backend đã tự động LIKE
            // Cập nhật userLikedSet, history, và recommendations
            if (currentUser) {
                userLikedSet.add(locationName); // Thêm vào set ngay lập tức
                analyzeUser(true); // Reload history + recommendations
                
                // Cập nhật UI nút Like nếu đang hiển thị
                if (currentOpenLoc && currentOpenLoc.name === locationName) {
                    const likeBtn = document.querySelector('.btn-like');
                    if (likeBtn && !likeBtn.classList.contains('liked')) {
                        likeBtn.classList.add('liked');
                        likeBtn.innerHTML = `<i class="fas fa-heart"></i> Đã thích`;
                    }
                }
            }
        } else alert('Lỗi: ' + res.error);
    });
}

// ===========================================
// SIDEBAR RESIZER LOGIC
// ===========================================
function setupSidebarResizer() {
    const sidebar = document.querySelector('.sidebar');
    const resizer = document.getElementById('sidebarResizer');
    
    if (!sidebar || !resizer) return;

    let isResizing = false;

    // Khi người dùng bấm chuột vào thanh resizer
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        sidebar.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        e.preventDefault(); // Ngăn chọn text
    });

    // Khi di chuyển chuột (trên toàn document để không bị tuột)
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        // Tính toán width mới
        let newWidth = e.clientX;
        
        // Giới hạn Min/Max
        if (newWidth < 390) newWidth = 390;
        if (newWidth > 750) newWidth = 750;
        
        // Cập nhật CSS Variable
        document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
        
        // Cập nhật style trực tiếp
        sidebar.style.width = newWidth + 'px';
    });

    // Khi thả chuột ra
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            sidebar.classList.remove('resizing');
            document.body.style.cursor = '';
            
            // Cập nhật lại bản đồ Leaflet
            setTimeout(() => {
                if (window.map) map.invalidateSize();
            }, 50);
        }
    });
}



// ===========================================
// AI PLANNER LOGIC
// ===========================================
function openPlannerInputModal() {
    document.getElementById("plannerInputModal").classList.add("active");
}
function closePlannerInputModal() {
    document.getElementById("plannerInputModal").classList.remove("active");
}

function openPlannerResultModal() {
    document.getElementById("plannerResultModal").classList.add("active");
}
function closePlannerResultModal() {
    document.getElementById("plannerResultModal").classList.remove("active");
}

function changePlanDays(delta) {
    const input = document.getElementById("planDays");
    const display = document.getElementById("dayDisplay");
    let val = parseInt(input.value) || 1;
    
    val += delta;
    if (val < 1) val = 1;
    if (val > 7) val = 7; // Max 1 tuần để AI không bị quá tải
    
    input.value = val;
    display.innerText = val + " Ngày";
}

async function submitPlanner() {
    // 1. Get input
    const days = document.getElementById("planDays").value;
    const prefCheckboxes = document.querySelectorAll('input[name="planPref"]:checked');
    const preferences = Array.from(prefCheckboxes).map(cb => cb.value);
    
    // UI state
    const btn = document.querySelector("#plannerInputModal .btn-save-gradient");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang thiết kế...';
    btn.disabled = true;
    
    try {
        const res = await apiFetch("/api/planner/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                days: days,
                preferences: preferences
            })
        });
        
        if (res.success) {
            closePlannerInputModal();
            currentItineraryData = res.plan; // Lưu
            renderItinerary(res.plan);
            openPlannerResultModal();
        } else {
            alert("Lỗi tạo lộ trình: " + (res.error || "Không rõ"));
        }
    } catch (e) {
        alert("Lỗi kết nối AI Planner");
        console.error(e);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function renderItinerary(plan) {
    const container = document.getElementById("plannerTimeline");
    container.innerHTML = "";
    
    if (!plan || plan.length === 0) {
        container.innerHTML = `<div class="empty-state">Không tìm thấy lộ trình phù hợp. Hãy thử thay đổi sở thích.</div>`;
        return;
    }
    
    // Add Summary Header
    const summaryDiv = document.createElement("div");
    summaryDiv.style.textAlign = "center";
    summaryDiv.style.marginBottom = "30px";
    summaryDiv.innerHTML = `
        <h2 style="color:var(--primary); margin-bottom:5px;">Hành trình ${plan.length} ngày</h2>
        <p style="color:var(--text-secondary); font-size:14px;">Khám phá Huế trọn vẹn</p>
    `;
    container.appendChild(summaryDiv);
    
    plan.forEach(dayInfo => {
        const dayBlock = document.createElement("div");
        dayBlock.className = "day-block";
        
        const dayHeader = document.createElement("div");
        dayHeader.className = "day-header";
        dayHeader.innerText = `Ngày ${dayInfo.day}`;
        dayBlock.appendChild(dayHeader);
        
        const timeline = document.createElement("div");
        timeline.className = "day-timeline";
        
        dayInfo.activities.forEach(act => {
            const actEl = document.createElement("div");
            actEl.className = "activity-item";
            
            // Icon Mapping
            let iconClass = "fa-map-marker-alt";
            if (act.type === "food") iconClass = "fa-utensils";
            else if (act.type === "visit") iconClass = "fa-camera";
            else if (act.type === "coffee") iconClass = "fa-coffee";
            
            const loc = act.location;
            
            actEl.innerHTML = `
                <div class="activity-time">
                    <i class="fas ${iconClass} activity-icon"></i>
                    <span>${act.time}</span>
                </div>
                <div class="activity-content">
                    <h4>${loc.name}</h4>
                    <span class="sentiment-badge sentiment-neutral" style="font-size:10px; margin-left:0; margin-bottom:4px; display:inline-block;">${loc.category}</span>
                    <p>${loc.description || "Chưa có mô tả"}</p>
                </div>
                <img src="${loc.image || '/static/images/no-image.png'}" class="act-img" loading="lazy" onerror="this.src='/static/images/no-image.png'">
            `;
            
            // Interaction: Click to show detail
            actEl.onclick = () => showDetail(loc);
            
            timeline.appendChild(actEl);
        });
        
        dayBlock.appendChild(timeline);
        container.appendChild(dayBlock);
    });
}

async function saveItinerary() {
    if (!currentUser) return openAuthModal();
    if (!currentItineraryData) return alert("Không có lộ trình để lưu!");
    
    try {
        const res = await apiFetch("/api/itineraries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itinerary: currentItineraryData })
        });
        
        if (res.success) {
            showNotification({type: "success", title: "Thành công", message: res.message});
            closePlannerResultModal();
        } else {
             showNotification({type: "error", title: "Lỗi", message: res.error});
        }
    } catch (e) {
        showNotification({type: "error", title: "Lỗi", message: e.message});
    }
}
