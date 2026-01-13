// BIẾN TOÀN CỤC
let cachedAllLocations = null;
var map;
var markerLayer;
var markersMap = {};
var currentUser = null;
var userRole = "user";
var userLikedSet = new Set();
var currentOpenLoc = null;

// ================================================================
// 0. HÀM GỌI API CHUNG VỚI LOG VÀ XỬ LÝ LỖI
// ================================================================
async function apiFetch(url, options = {}) {
  try {
    console.log(`[API CALL] ${url}`);
    const response = await fetch(url, options);

    // Nếu có lỗi từ Server (400, 401, 403, 500...)
    if (!response.ok) {
      let errorMessage = `Lỗi ${response.status}`;

      // 1. Cố gắng đọc nội dung lỗi dưới dạng JSON (để lấy message từ Python)
      try {
        const errorData = await response.json();
        // Backend trả về: {"error": "Tên tài khoản đã tồn tại!"}
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // Nếu không phải JSON, đọc dưới dạng text thường
        const text = await response.text();
        if (text) errorMessage = text;
      }

      // Ném lỗi ra ngoài với nội dung sạch sẽ (đã decode unicode)
      throw new Error(errorMessage);
    }

    // Nếu thành công
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`[API FAIL] ${url}:`, err);

    throw err;
  }
}

// ================================================================
// 1. KHỞI TẠO BẢN ĐỒ
// ================================================================
// Khởi tạo khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  checkLoginStatus();
  loadLocations("All");
});
// Khởi tạo bản đồ Leaflet
function initMap() {
  map = L.map("map", { zoomControl: false }).setView([16.4637, 107.5909], 14);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
}

// ================================================================
// 2. AUTHENTICATION
// ================================================================
// Kiểm tra trạng thái đăng nhập
function checkLoginStatus() {
  apiFetch("/api/current_user")
    .then((data) => {
      if (data && data.is_logged_in) {
        currentUser = data.username;
        console.log("Đã đăng nhập với user:", currentUser);

        showLoggedView(data.username);
        analyzeUser(true);
        // Nếu panel chi tiết đang mở, cập nhật lại nội dung
        const detailPanel = document.getElementById("detail-panel");
        if (detailPanel && detailPanel.classList.contains("active") && currentOpenLoc) {
          // Gọi lại showDetail để nó cập nhật giao diện theo user mới
          showDetail(currentOpenLoc);
        }
      } else {
        currentUser = null;
        showGuestView();
      }
    })
    .catch((err) => console.error("Lỗi kiểm tra Auth:", err));
}

// Hiển thị giao diện khi đã đăng nhập
function showLoggedView(username) {
  // 1. Ẩn các thành phần của khách
  const guestView = document.getElementById("guest-view");
  const searchBox = document.getElementById("guest-search-box");

  if (guestView) guestView.style.display = "none";
  if (searchBox) searchBox.style.display = "none"; //

  // 2. Hiện giao diện User
  const loggedView = document.getElementById("logged-view");
  if (loggedView) loggedView.style.display = "block";

  // 3. Xử lý Header (Ẩn nút login, hiện info user)
  const btnLogin = document.getElementById("header-login-btn");
  if (btnLogin) btnLogin.style.display = "none";

  const userInfo = document.getElementById("header-user-info");
  if (userInfo) {
    userInfo.style.display = "flex";
    const nameSpan = document.getElementById("header-username");
    if (nameSpan) nameSpan.innerText = username;

    // Xử lý nút Admin
    const adminBtn = document.getElementById("btn-admin-panel");
    if (adminBtn) {
      if (username === "admin" || (typeof userRole !== "undefined" && userRole === "admin")) {
        adminBtn.style.display = "block";
      } else {
        adminBtn.style.display = "none";
      }
    }
  }
}

function showGuestView() {
  // 1. Header (Hiện nút login)
  const btnLogin = document.getElementById("header-login-btn");
  const userInfo = document.getElementById("header-user-info");

  if (btnLogin) btnLogin.style.display = "flex";
  if (userInfo) userInfo.style.display = "none";

  // 2. Sidebar (Ẩn giao diện user, hiện giao diện khách)
  const loggedView = document.getElementById("logged-view");
  const guestView = document.getElementById("guest-view");
  const searchBox = document.getElementById("guest-search-box"); // [MỚI]

  if (loggedView) loggedView.style.display = "none";
  if (guestView) guestView.style.display = "block";

  // [QUAN TRỌNG] Hiện lại ô tìm kiếm, dùng 'flex' để không bị vỡ giao diện
  if (searchBox) searchBox.style.display = "flex";

  // Reset kết quả
  const recArea = document.getElementById("recommendation-area");
  if (recArea) {
    recArea.innerHTML = `
        <div class="empty-state">
            <img src="https://cdn-icons-png.flaticon.com/512/1086/1086933.png" alt="AI">
            <h3>Sẵn sàng phân tích</h3>
            <p>Nhập tên User hoặc Đăng nhập để xem gợi ý.</p>
        </div>`;
  }
  const histDiv = document.getElementById("user-history");
  if (histDiv) histDiv.style.display = "none";
}

// -----MODAL AUTH-----
// Mở modal
function openAuthModal() {
  document.getElementById("authModal").classList.add("active");
  // Xóa thông báo lỗi cũ
  document.getElementById("loginMsg").innerText = "";
  document.getElementById("regMsg").innerText = "";
  // Xóa dữ liệu cũ
  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";
  document.getElementById("regUser").value = "";
  document.getElementById("regPass").value = "";
}
// Đóng modal
function closeAuthModal() {
  document.getElementById("authModal").classList.remove("active");
}
// Chuyển tab trong modal
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
// Xử lý đăng nhập
function handleLogin() {
  const u = document.getElementById("loginUser").value.trim();
  const p = document.getElementById("loginPass").value;
  const msg = document.getElementById("loginMsg");

  if (!u || !p) {
    msg.innerText = "Vui lòng nhập đủ thông tin";
    return;
  }
  msg.innerText = "Đang xử lý...";

  apiFetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  })
    .then((res) => {
      if (res && res.message) {
        // Lưu role
        userRole = res.role || "user";
        closeAuthModal();
        checkLoginStatus();
      } else {
        msg.innerText = res?.error || "Lỗi đăng nhập";
      }
    })
    .catch((err) => {
      msg.innerText = err.message;
      msg.style.color = "red";
      console.error("Login error logic:", err);
    });
}

// Xử lý đăng ký
function handleRegister() {
  // Lấy dữ liệu
  const u = document.getElementById("regUser").value.trim();
  const p = document.getElementById("regPass").value;
  const msg = document.getElementById("regMsg");

  // Kiểm tra dữ liệu
  if (!u || !p) {
    msg.innerText = "Vui lòng nhập đủ thông tin";
    msg.style.color = "red";
    return;
  }

  // Gửi yêu cầu đăng ký
  msg.innerText = "Đang đăng ký...";
  msg.style.color = "#6b7280";

  // Gọi API
  apiFetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  })
    .then((res) => {
      if (!res) {
        msg.innerText = "Lỗi đăng ký";
        msg.style.color = "red";
        return;
      }

      if (res.success === true) {
        showNotification({
          type: "success",
          title: "Đăng ký thành công!",
          message: `Tài khoản <b>${u}</b> đã được tạo. Bạn có thể đăng nhập ngay bây giờ.`,
          btnText: "Đăng nhập ngay",
          onConfirm: () => {
            switchTab("login");
            document.getElementById("loginUser").value = u;
            document.getElementById("loginPass").value = "";
            document.getElementById("loginPass").focus();
          },
        });
        msg.innerText = "";
      } else {
        msg.innerText = "Đăng ký thất bại (Tên tài khoản có thể đã tồn tại)";
        msg.style.color = "red";
      }
    })
    .catch((err) => {
      msg.innerText = err.message;
      msg.style.color = "red";
      console.error("Register error logic:", err);
    });
}
// Xử lý đăng xuất
function handleLogout() {
  apiFetch("/api/logout", { method: "POST" }).then(() => {
    checkLoginStatus();
  });
}

// ================================================================
// 3. RECOMMENDATION & HISTORY
// ================================================================
// Hàm debounce để giảm tần suất gọi hàm khi gõ input
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
// Lắng nghe sự kiện gõ phím trong ô tìm kiếm User
document.getElementById("usernameInput").addEventListener(
  "input",
  debounce(() => {
    const val = document.getElementById("usernameInput").value.trim();
    if (val.length > 2) analyzeUser(false);
  }, 800)
);
// Phân tích User (đã đăng nhập hoặc nhập tên)
function analyzeUser(isLoggedInUser = false) {
  const targetUser = isLoggedInUser ? currentUser : document.getElementById("usernameInput").value.trim();
  if (!targetUser) return alert("Vui lòng nhập tên User!");

  // History
  apiFetch(`/api/history/${targetUser}`)
    .then((data) => {
      userLikedSet.clear();
      if (data && data.length > 0) {
        data.forEach((item) => userLikedSet.add(item.name));
        const histDiv = document.getElementById("user-history");
        const histList = document.getElementById("history-list");
        histDiv.style.display = "block";
        histList.innerHTML = data
          .map(
            (place) => `
            <div class="hist-chip" onclick="showDetailFromData('${place.name}', ${place.lat}, ${place.lng}, '${place.image}')">
              <img src="${place.image}" onerror="this.src='/static/images/no-image.png'">
              ${place.name}
            </div>
          `
          )
          .join("");
      } else {
        document.getElementById("user-history").style.display = "none";
      }
    })
    .catch((err) => console.error("History error:", err));

  getRecommendations(targetUser);
}
// Lấy gợi ý cho User
function getRecommendations(user) {
  const recArea = document.getElementById("recommendation-area");
  recArea.innerHTML = `
    <div style="text-align:center; padding:60px 20px; color:#6b7280;">
      <i class="fas fa-circle-notch fa-spin fa-2x"></i><br><br>
      Đang phân tích sở thích của <strong>${user}</strong>...
    </div>`;

  apiFetch(`/api/recommend/${user}`)
    .then((data) => {
      console.log("Recommendation data:", data);
      recArea.innerHTML = "";
      if (!data || data.length === 0) {
        recArea.innerHTML = `
          <div class="empty-state">
            <p>Chưa có gợi ý nào cho ${user}. Hãy thích thêm địa điểm!</p>
          </div>`;
        return;
      }

      data.forEach((loc) => {
        let badgeHTML = "";
        if (!loc.common_users || loc.common_users === 0) {
          let score = loc.pr ? loc.pr.toFixed(2) : "N/A";
          badgeHTML = `<div class="algo-badge badge-pr"><i class="fas fa-chart-line"></i> PageRank: ${score}</div>`;
        } else {
          badgeHTML = `<div class="algo-badge badge-collab"><i class="fas fa-users"></i> ${loc.common_users} người cùng sở thích</div>`;
        }

        const card = document.createElement("div");
        card.className = "ai-card";
        card.innerHTML = `
          <div class="card-thumb">${createPlaceImage(loc.image)}</div>
          <div class="card-content">
            <div class="card-title">${loc.name}</div>
            <div class="card-desc">${loc.description || "Đang cập nhật..."}</div>
            ${badgeHTML}
          </div>
        `;
        card.onclick = () => showDetail(loc);
        recArea.appendChild(card);
      });
    })
    .catch((err) => {
      console.error("Recommend error:", err);
      recArea.innerHTML = `<div style="text-align:center; color:red; padding:20px;">Lỗi tải gợi ý: ${err.message}</div>`;
    });
}

// ================================================================
// 4. HELPER & DETAIL
// ================================================================
// Tạo thẻ img với xử lý lỗi ảnh
function createPlaceImage(src) {
  return `<img src="${src}" onerror="this.src='/static/images/no-image.png'">`;
}
// Lấy icon theo category
function getIconByCategory(category) {
  const iconMap = {
    "Di tích": { class: "pin-ditich", symbol: "🏛️" },
    "Tâm linh": { class: "pin-tamlinh", symbol: "🛕" },
    "Lăng tẩm": { class: "pin-langtam", symbol: "🏯" },
    "Bãi biển": { class: "pin-bien", symbol: "🏖️" },
    "Tham quan": { class: "pin-thamquan", symbol: "🏞️" },
    "Ẩm thực": { class: "pin-amthuc", symbol: "🍜" },
    "Thiên nhiên": { class: "pin-thiennhien", symbol: "🌳" },
  };
  const config = iconMap[category] || { class: "pin-khac", symbol: "📍" };
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div class='custom-pin ${config.class}'><i>${config.symbol}</i></div>`,
    iconSize: [34, 46],
    iconAnchor: [17, 46],
    popupAnchor: [0, -42],
  });
}
// Di chuyển bản đồ đến vị trí và mở popup
function flyToLocation(lat, lng, name) {
  map.flyTo([lat, lng], 16, { duration: 1 });
  if (markersMap[name]) {
    map.once("moveend", () => markersMap[name].openPopup());
  }
}
// Hiển thị chi tiết địa điểm
function showDetail(loc) {
  console.log("Đang mở chi tiết địa điểm:", loc.name); // Log kiểm tra
  currentOpenLoc = loc; // [QUAN TRỌNG] Lưu lại để dùng sau khi login

  flyToLocation(loc.lat, loc.lng, loc.name);
  const panel = document.getElementById("detail-panel");
  const content = document.getElementById("detail-content");

  const googleLink = `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`;

  // Thẻ badge thuật toán
  let badgeInfo = "";
  if (loc.common_users !== undefined) {
    badgeInfo =
      loc.common_users === 0
        ? `<span class="algo-badge badge-pr">🏆 Địa điểm nổi bật (PageRank Top)</span>`
        : `<span class="algo-badge badge-collab">👥 ${loc.common_users} người cùng sở thích</span>`;
  }

  // Nút thích địa điểm
  let likeButton = currentUser
    ? `<button class="${userLikedSet.has(loc.name) ? "btn-action btn-like liked" : "btn-action btn-like"}"
               onclick="handleLike(this, '${loc.name}')">
        <i class="${userLikedSet.has(loc.name) ? "fas" : "far"} fa-heart"></i> 
        ${userLikedSet.has(loc.name) ? "Đã thích" : "Yêu thích"}
      </button>`
    : `<button class="btn-action btn-like" onclick="openAuthModal()">
        <i class="fas fa-lock"></i> Đăng nhập để thích
      </button>`;

  content.innerHTML = `
    <img src="${loc.image}" class="detail-hero" onerror="this.src='/static/images/no-image.png'">
    <div class="detail-body">
      <div style="margin-bottom:10px;">${badgeInfo}</div>
      <h1 class="detail-title">${loc.name}</h1>
      <div class="detail-meta">
        <span>⭐ ${loc.rating || 5}/5</span> • <span>${loc.category || "Địa điểm"}</span>
      </div>
      <p class="detail-desc">${loc.description || "Chưa có mô tả."}</p>
      <div class="detail-actions">
        ${likeButton}
        <a href="${googleLink}" target="_blank" class="btn-action btn-maps">
          <i class="fas fa-directions"></i> Chỉ đường
        </a>
      </div>
    </div>
  `;
  panel.classList.add("active");
}
// Xử lý thích địa điểm
function handleLike(btnElement, locName) {
  const icon = btnElement.querySelector("i");
  icon.className = "fas fa-spinner fa-spin";

  apiFetch("/api/like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location_name: locName }),
  })
    .then((data) => {
      if (data && data.liked) {
        btnElement.classList.add("liked");
        btnElement.innerHTML = `<i class="fas fa-heart"></i> Đã thích`;
      } else {
        btnElement.classList.remove("liked");
        btnElement.innerHTML = `<i class="far fa-heart"></i> Yêu thích`;
      }
      analyzeUser(true);
    })
    .catch((err) => {
      console.error("Like error:", err);
      alert("Lỗi khi thích địa điểm!");
      icon.className = userLikedSet.has(locName) ? "fas fa-heart" : "far fa-heart";
    });
}
// Hiển thị chi tiết từ dữ liệu thô (không có marker)
function showDetailFromData(name, lat, lng, image) {
  const fakeLoc = {
    name,
    lat,
    lng,
    image,
    description: "Bạn đã thích địa điểm này.",
    category: "Đã ghé thăm",
    rating: 5,
  };
  showDetail(fakeLoc);
}
// Đóng panel chi tiết
function closeDetail() {
  document.getElementById("detail-panel").classList.remove("active");
}

// ================================================================
// 5. DATA EXPLORER
// ================================================================
// Tải và hiển thị địa điểm theo category
async function loadLocations(category = "All") {
  markerLayer.clearLayers();
  markersMap = {};

  const list = document.getElementById("locationList");
  list.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #6b7280;">
      <i class="fas fa-circle-notch fa-spin fa-2x"></i>
      <p style="margin-top: 12px;">Đang tải địa điểm${category !== "All" ? ` (${category})` : ""}...</p>
    </div>`;

  try {
    let data;
    if (category === "All" && cachedAllLocations) {
      data = cachedAllLocations;
      console.log("[Cache Hit] Locations");
    } else {
      let url = "/api/locations";
      if (category !== "All") url += `?category=${encodeURIComponent(category)}`;
      data = await apiFetch(url);
      if (!data) throw new Error("Không nhận được dữ liệu");
      if (category === "All") cachedAllLocations = data;
    }

    list.innerHTML = "";
    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = `
        <div style="grid-column: 1 / -1; text-align:center; padding:40px; color:#9ca3af;">
          <i class="fas fa-map-marker-alt" style="font-size:48px; opacity:0.5;"></i><br><br>
          Không tìm thấy địa điểm nào.
        </div>`;
      return;
    }

    const latLngs = [];
    data.forEach((loc) => {
      const div = document.createElement("div");
      div.className = "mini-item";
      div.innerHTML = `
        <img src="${loc.image}" class="mini-img" alt="${loc.name}" onerror="this.src='/static/images/no-image.png'">
        <div style="flex:1; overflow:hidden;">
          <div class="mini-name">${loc.name}</div>
          <div style="font-size:11px; color:#f59e0b; margin-top:2px;">⭐ ${
            loc.rating ? loc.rating.toFixed(1) : "5.0"
          }</div>
        </div>
      `;
      div.onclick = () => showDetail(loc);
      list.appendChild(div);

      const marker = L.marker([loc.lat, loc.lng], { icon: getIconByCategory(loc.category) });

      const popupContent = document.createElement("div");
      popupContent.innerHTML = `
        <img src="${loc.image}" class="popup-hero" alt="${loc.name}" onerror="this.src='/static/images/no-image.png'">
        <div class="popup-body">
          <div class="popup-title">${loc.name}</div>
          <div class="popup-cat">${loc.category || "Địa điểm"}</div>
          <button class="view-detail-btn">Xem chi tiết</button>
        </div>
      `;
      popupContent.querySelector(".view-detail-btn").onclick = () => showDetail(loc);

      marker.bindPopup(popupContent);
      marker.on("click", () => showDetail(loc));
      marker.addTo(markerLayer);
      markersMap[loc.name] = marker;
      latLngs.push([loc.lat, loc.lng]);
    });

    if (latLngs.length > 0) {
      map.fitBounds(latLngs, { padding: [60, 60], maxZoom: 15 });
    }

    setTimeout(() => map.invalidateSize(), 300);
  } catch (err) {
    console.error("Load locations error:", err);
    list.innerHTML = `
      <div style="color:#ef4444; text-align:center; grid-column: 1 / -1; padding:30px;">
        <i class="fas fa-exclamation-triangle" style="font-size:36px;"></i><br><br>
        Lỗi: ${err.message}
      </div>`;
  }
}
// Lọc dữ liệu theo category
function filterData(cat, btn) {
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  loadLocations(cat);
}

// ================================================================
// 6. ADMIN PANEL
// ================================================================
function openAdminModal() {
  document.getElementById("adminModal").classList.add("active");
  loadAdminUsers();
}
// Đóng modal
function closeAdminModal() {
  document.getElementById("adminModal").classList.remove("active");
}
// Tải danh sách user
function loadAdminUsers() {
  const tbody = document.getElementById("adminUserList");
  tbody.innerHTML = '<tr><td style="padding:15px; text-align:center;">Đang tải...</td></tr>';

  apiFetch("/api/admin/users").then((data) => {
    tbody.innerHTML = "";
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td style="padding:15px; text-align:center;">Chưa có user nào.</td></tr>';
      return;
    }

    data.forEach((u) => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #eee";
      tr.innerHTML = `
                <td style="padding: 10px; font-weight: 600;">${u.name}</td>
                <td style="padding: 10px; color: #666; font-size: 12px;">❤️ ${u.liked_count} thích</td>
                <td style="padding: 10px; text-align: right;">
                    <button onclick="deleteUser('${u.name}')" style="background: #fee2e2; color: #dc2626; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </td>
            `;
      tbody.appendChild(tr);
    });
  });
}
// Xóa user
function deleteUser(username) {
  if (!confirm(`Bạn có chắc muốn xóa tài khoản "${username}" không? Hành động này không thể hoàn tác.`)) return;

  apiFetch(`/api/admin/users/${username}`, { method: "DELETE" }).then((res) => {
    if (res) {
      showNotification({
        type: "delete",
        title: "Xóa tài khoản thành công",
        message: `Tài khoản <b>${username}</b> đã được xóa.`,
        btnText: "Đóng",
      });
      loadAdminUsers(); // Load lại danh sách
    }
  });
}

// --- HÀM HIỂN THỊ THÔNG BÁO ĐA NĂNG ---
function showNotification({ type, title, message, btnText, onConfirm }) {
  const modal = document.getElementById("notificationModal");
  const icon = document.getElementById("notif-icon");
  const titleEl = document.getElementById("notif-title");
  const msgEl = document.getElementById("notif-msg");
  const btn = document.getElementById("notif-btn");

  // 1. Cài đặt nội dung
  titleEl.innerText = title;
  msgEl.innerHTML = message; // Dùng innerHTML để hỗ trợ xuống dòng <br> hoặc bôi đậm <b>
  btn.innerText = btnText || "Đóng";

  // 2. Cài đặt giao diện theo Loại (type)
  if (type === "success") {
    // Màu Xanh (Đăng ký thành công)
    icon.className = "fas fa-check-circle";
    icon.style.color = "#10b981"; // Xanh lá
    btn.style.backgroundColor = "#2563eb"; // Xanh dương
  } else if (type === "delete") {
    // Màu Đỏ (Xóa thành công)
    icon.className = "fas fa-trash-alt";
    icon.style.color = "#ef4444"; // Đỏ
    btn.style.backgroundColor = "#ef4444"; // Nút màu đỏ
  }

  // 3. Xử lý sự kiện nút bấm
  // Trước khi gán sự kiện mới, ta clone nút để xóa sạch các sự kiện cũ (tránh bị lặp)
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.onclick = () => {
    modal.classList.remove("active"); // Luôn đóng modal trước
    if (onConfirm) onConfirm(); // Chạy hàm callback nếu có
  };

  // 4. Hiện Modal
  modal.classList.add("active");
}

// ================================================================
// 7. TÍNH NĂNG KÉO THẢ & CUỘN NGANG (dành cho mobile + desktop + touchpad)
// ================================================================
const slider = document.querySelector(".filter-chips");
let isDown = false;
let startX;
let scrollLeft;

if (slider) {
  // Cuộn ngang với touchpad / bánh xe chuột
  slider.addEventListener("wheel", (e) => {
    if (slider.scrollWidth <= slider.clientWidth) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    e.preventDefault();
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    slider.scrollLeft += delta * 1.5; // Điều chỉnh tốc độ
  });

  // Kéo thả với chuột
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
    const walk = (x - startX) * 2; // Tốc độ cuộn
    slider.scrollLeft = scrollLeft - walk;
  });

  // Kéo thả với cảm ứng (touch)
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
