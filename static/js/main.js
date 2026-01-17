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
  setupEnterKey();
});

function setupEnterKey() {
  // 1. Tại ô nhập mật khẩu Đăng nhập -> Gọi hàm handleLogin()
  const loginPassInput = document.getElementById("loginPass");
  if (loginPassInput) {
    loginPassInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleLogin();
      }
    });
  }

  // 2. Tại ô nhập mật khẩu Đăng ký -> Gọi hàm handleRegister()
  const regPass = document.getElementById("regPass");
  if (regPass) {
    regPass.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        handleRegister();
      }
    });
  }

  // 3. Tại ô tìm kiếm User (để xem gợi ý) -> Gọi hàm analyzeUser()
  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) {
    usernameInput.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        // Hủy debounce (nếu đang chờ) và chạy ngay
        analyzeUser(false);
      }
    });
  }

  // 4. Tại ô tìm kiếm địa điểm (Mini search) -> Ẩn bàn phím mobile
  const miniSearch = document.getElementById("miniSearchInput");
  if (miniSearch) {
    miniSearch.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        this.blur(); // Bỏ focus để ẩn bàn phím ảo trên điện thoại
      }
    });
  }
}

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
  // 1. Cập nhật header
  const btnLogin = document.getElementById("header-login-btn");
  if (btnLogin) btnLogin.style.display = "none";

  const userInfo = document.getElementById("header-user-info");
  if (userInfo) {
    userInfo.style.display = "flex";
    const nameSpan = document.getElementById("header-username");
    if (nameSpan) nameSpan.innerText = username;

    // Nút Admin
    const adminBtn = document.getElementById("btn-admin-panel");
    if (adminBtn) {
      if (username === "admin" || (typeof userRole !== "undefined" && userRole === "admin")) {
        adminBtn.style.display = "block";
      } else {
        adminBtn.style.display = "none";
      }
    }
  }

  // 2. Ẩn toàn bộ khung tìm kiếm cho khách
  const searchBox = document.querySelector(".search-box");
  if (searchBox) searchBox.style.display = "none";

  // 3. Hiện khung lịch sử người dùng
  const loggedView = document.getElementById("logged-view");
  if (loggedView) loggedView.style.display = "block";

  // 4. Hiện bảng thống kê Admin
  if (typeof checkAdminAccess === "function") {
    checkAdminAccess(username);
  }
}

// Hiển thị giao diện khi chưa đăng nhập
function showGuestView() {
  // 1. Cập nhật header
  const btnLogin = document.getElementById("header-login-btn");
  if (btnLogin) btnLogin.style.display = "flex";

  const userInfo = document.getElementById("header-user-info");
  if (userInfo) userInfo.style.display = "none";

  //2. Hiện khung tìm kiếm chính
  const searchBox = document.querySelector(".search-box");
  if (searchBox) searchBox.style.display = "block";

  const guestSearchBox = document.getElementById("guest-search-box");
  if (guestSearchBox) guestSearchBox.style.display = "flex";

  // 3. Ẩn khung lịch sử người dùng
  const loggedView = document.getElementById("logged-view");
  if (loggedView) loggedView.style.display = "none";

  // Reset kết quả
  const recArea = document.getElementById("recommendation-area");
  if (recArea) {
    recArea.innerHTML = `
        <div class="empty-state">
            <img src="https://cdn-icons-png.flaticon.com/512/1086/1086933.png" alt="AI">
            <h3>Sẵn sàng phân tích</h3>
            <p>Hệ thống sử dụng <b>PageRank</b> & <b>Collaborative Filtering</b>.</p>
        </div>`;
  }
  const histDiv = document.getElementById("user-history");
  if (histDiv) histDiv.style.display = "none";

  // 4. Ẩn bảng Admin Panel
  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) {
    adminPanel.style.display = "none";
  }
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
// Phân tích User (đã đăng nhập hoặc nhập tên)
function analyzeUser(isLoggedInUser = false) {
  const targetUser = isLoggedInUser ? currentUser : document.getElementById("usernameInput").value.trim();
  if (!targetUser) return alert("Vui lòng nhập tên User!");

  // History
  apiFetch(`/api/history/${targetUser}`)
    .then((data) => {
      userLikedSet.clear();

      const histDiv = document.getElementById("user-history");
      const histList = document.getElementById("history-list");

      // [QUAN TRỌNG] Đã sửa lỗi logic cũ ở đây:
      // Không cần gọi search-box hay mainBox nữa vì layout đã tách biệt.

      if (data && data.length > 0) {
        data.forEach((item) => userLikedSet.add(item.name));

        // Hiện nội dung lịch sử
        if (histDiv) histDiv.style.display = "block";

        // Vẽ danh sách
        if (histList) {
          histList.innerHTML = data
            .map(
              (place) => `
              <div class="hist-chip" onclick="showDetailFromData('${place.name}', ${place.lat}, ${place.lng}, '${place.image}')">
                <img src="${place.image}" onerror="this.src='/static/images/no-image.png'">
                ${place.name}
              </div>`
            )
            .join("");
        }
      } else {
        // Không có dữ liệu thì ẩn div con đi
        if (histDiv) histDiv.style.display = "none";
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
  // 1. Nếu đang ở Mobile (màn hình nhỏ hơn 768px),
  if (window.innerWidth <= 768) {
    console.log("Mobile mode: Skip map flying");
    return;
  }

  // 2. Kiểm tra an toàn xem map có tồn tại không
  if (!map) return;

  // 3. Thực hiện bay trên Desktop
  try {
    map.flyTo([lat, lng], 16, { duration: 1 });
    if (markersMap[name]) {
      map.once("moveend", () => markersMap[name].openPopup());
    }
  } catch (err) {
    console.warn("Lỗi khi di chuyển bản đồ:", err);
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
// 5. DATA EXPLORER (BỘ LỌC & TÌM KIẾM)
// ================================================================

// Biến lưu trữ dữ liệu hiện tại của danh sách (để tìm kiếm client-side)
let currentListData = [];

// --- HÀM 1: LỌC THEO CATEGORY (Gắn vào các nút bấm) ---
function filterData(cat, btn) {
  // 1. Cập nhật giao diện nút bấm (Active state)
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  if (btn) btn.classList.add("active");

  // 2. Xóa nội dung ô tìm kiếm (để tránh gây nhầm lẫn khi chuyển danh mục)
  const searchInput = document.getElementById("miniSearchInput");
  if (searchInput) searchInput.value = "";

  // 3. Tải dữ liệu theo danh mục mới
  loadLocations(cat);
}

// --- HÀM 2: TẢI DỮ LIỆU TỪ API ---
async function loadLocations(category = "All") {
  // Reset UI loading
  const list = document.getElementById("locationList");
  list.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #6b7280;">
      <i class="fas fa-circle-notch fa-spin fa-2x"></i>
      <p style="margin-top: 12px;">Đang tải...</p>
    </div>`;

  try {
    let data;
    // Kiểm tra cache nếu chọn All (để đỡ gọi API nhiều lần)
    if (category === "All" && cachedAllLocations) {
      data = cachedAllLocations;
    } else {
      let url = "/api/locations";
      if (category !== "All") url += `?category=${encodeURIComponent(category)}`;

      data = await apiFetch(url);
      if (category === "All") cachedAllLocations = data; // Lưu cache
    }

    // [QUAN TRỌNG] Lưu data vào biến toàn cục để dùng cho Search
    currentListData = data || [];

    // Gọi hàm hiển thị
    renderLocations(currentListData);
  } catch (err) {
    console.error("Load locations error:", err);
    list.innerHTML = `<div style="text-align:center; color:red; grid-column: 1 / -1;">Lỗi tải dữ liệu</div>`;
  }
}

// --- HÀM 3: HIỂN THỊ DANH SÁCH & MARKER ---
function renderLocations(data) {
  const list = document.getElementById("locationList");

  // Xóa marker cũ & list cũ
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
    // A. Tạo thẻ bên trái (List Item)
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

    // B. Tạo Marker trên bản đồ
    const marker = L.marker([loc.lat, loc.lng], { icon: getIconByCategory(loc.category) });

    // Popup rút gọn khi bấm vào marker
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

  // Fit bản đồ để nhìn thấy các điểm vừa load (nếu có điểm)
  if (latLngs.length > 0 && map) {
    // Dùng setTimeout để tránh lỗi khi map chưa render xong
    setTimeout(() => {
      map.fitBounds(latLngs, { padding: [50, 50], maxZoom: 15 });
    }, 100);
  }
}

// --- HÀM 4: XỬ LÝ TÌM KIẾM KHI GÕ PHÍM (Search Box) ---
function handleLocalSearch() {
  const input = document.getElementById("miniSearchInput");
  if (!input) return;

  const keyword = input.value.toLowerCase().trim();

  if (!keyword) {
    // Nếu xóa hết chữ -> Hiển thị lại toàn bộ danh sách hiện tại
    renderLocations(currentListData);
    return;
  }

  // Lọc dữ liệu trong RAM
  const filteredData = currentListData.filter((loc) => {
    const nameMatch = loc.name.toLowerCase().includes(keyword);
    // Nếu có description thì tìm cả trong description
    const descMatch = loc.description ? loc.description.toLowerCase().includes(keyword) : false;
    return nameMatch || descMatch;
  });

  renderLocations(filteredData);
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

// Hàm kiểm tra Admin khi đăng nhập
function checkAdminAccess(username) {
  const adminPanel = document.getElementById("admin-panel");
  if (username === "admin") {
    adminPanel.style.display = "block";
    loadAdminStats(); // Tải số liệu ngay
  } else {
    adminPanel.style.display = "none";
  }
}

// Gọi hàm này khi người dùng đăng nhập thành công
// (Bạn tìm chỗ xử lý login trong main.js và thêm dòng: checkAdminAccess(username);)

// Hàm tải thống kê
async function loadAdminStats() {
  try {
    const res = await fetch("/api/admin/stats");
    const data = await res.json();

    document.getElementById("stat-user").innerText = data.user_count || 0;
    document.getElementById("stat-loc").innerText = data.location_count || 0;
    document.getElementById("stat-like").innerText = data.like_count || 0;
    document.getElementById("stat-link").innerText = data.link_count || 0;
  } catch (err) {
    console.error("Lỗi tải stats admin", err);
  }
}

// Hàm kích hoạt thuật toán AI
async function triggerAI() {
  const btn = document.querySelector("#admin-panel button");
  const status = document.getElementById("algo-status");

  // Hiệu ứng đang chạy
  btn.disabled = true;
  btn.innerText = "⏳ Đang tính toán (Vui lòng đợi)...";
  btn.style.background = "#95a5a6";
  status.innerText = "Server đang chạy PageRank...";

  try {
    const res = await fetch("/api/admin/run-algo", { method: "POST" });
    const data = await res.json();

    if (data.status === "success") {
      alert("Thành công! Dữ liệu gợi ý đã được cập nhật.");
      status.innerText = "✅ Hoàn tất lúc " + new Date().toLocaleTimeString();
      loadAdminStats(); // Cập nhật lại số liệu nếu có thay đổi
    } else {
      alert("Lỗi: " + data.message);
    }
  } catch (err) {
    alert("Lỗi kết nối server!");
  } finally {
    // Reset nút bấm
    btn.disabled = false;
    btn.innerText = "🚀 Chạy lại thuật toán AI";
    btn.style.background = "#e74c3c";
  }
}
