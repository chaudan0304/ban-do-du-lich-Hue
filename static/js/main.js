// ================================================================
// FILE: main.js
// Mô tả: Xử lý Map, Auth (Đăng nhập/Đăng ký) và Logic Gợi ý AI
// ================================================================

// BIẾN TOÀN CỤC
var map;
var markerLayer;
var markersMap = {};
var currentUser = null; // Lưu tên user đang đăng nhập

// ================================================================
// 1. KHỞI TẠO BẢN ĐỒ & SỰ KIỆN LOAD TRANG
// ================================================================

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  checkLoginStatus(); // Kiểm tra xem đã đăng nhập chưa
  loadLocations("All"); // Tải dữ liệu mặc định
});

function initMap() {
  map = L.map("map", { zoomControl: false }).setView([16.4637, 107.5909], 14);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
}

// ================================================================
// 2. AUTHENTICATION (ĐĂNG NHẬP / ĐĂNG KÝ / ĐĂNG XUẤT)
// ================================================================

// --- Kiểm tra trạng thái đăng nhập ---
function checkLoginStatus() {
  fetch("/api/current_user")
    .then((r) => r.json())
    .then((data) => {
      if (data.is_logged_in) {
        currentUser = data.username;
        showLoggedView(data.username);
        // Tự động phân tích hồ sơ của user này
        analyzeUser(true);
      } else {
        currentUser = null;
        showGuestView();
      }
    })
    .catch((err) => console.error("Lỗi kiểm tra Auth:", err));
}

// --- Xử lý Giao diện (UI) ---
function showLoggedView(username) {
  document.getElementById("guest-view").style.display = "none";
  document.getElementById("logged-view").style.display = "block";
  document.getElementById("displayUsername").innerText = username;
}

function showGuestView() {
  document.getElementById("guest-view").style.display = "block";
  document.getElementById("logged-view").style.display = "none";

  // Xóa dữ liệu cũ
  document.getElementById("recommendation-area").innerHTML = `
        <div class="empty-state">
            <img src="https://cdn-icons-png.flaticon.com/512/1086/1086933.png" alt="AI">
            <h3>Sẵn sàng phân tích</h3>
            <p>Đăng nhập hoặc nhập tên User ảo để xem gợi ý.</p>
        </div>`;
  document.getElementById("user-history").style.display = "none";
}

// --- Modal Logic ---
function openAuthModal() {
  document.getElementById("authModal").classList.add("active");
}
function closeAuthModal() {
  document.getElementById("authModal").classList.remove("active");
}

function switchTab(tab) {
  // Reset active buttons
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

// --- API Calls ---
function handleLogin() {
  const u = document.getElementById("loginUser").value;
  const p = document.getElementById("loginPass").value;
  const msg = document.getElementById("loginMsg");

  if (!u || !p) {
    msg.innerText = "Vui lòng nhập đủ thông tin";
    return;
  }
  msg.innerText = "Đang xử lý...";

  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  })
    .then((r) => r.json().then((data) => ({ status: r.status, body: data })))
    .then((res) => {
      if (res.status === 200) {
        closeAuthModal();
        checkLoginStatus(); // Refresh giao diện
      } else {
        msg.innerText = res.body.error || "Lỗi đăng nhập";
      }
    });
}

function handleRegister() {
  const u = document.getElementById("regUser").value;
  const p = document.getElementById("regPass").value;
  const msg = document.getElementById("regMsg");

  if (!u || !p) {
    msg.innerText = "Vui lòng nhập đủ thông tin";
    return;
  }
  msg.innerText = "Đang đăng ký...";

  fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p }),
  })
    .then((r) => r.json().then((data) => ({ status: r.status, body: data })))
    .then((res) => {
      if (res.status === 200) {
        alert("✅ Đăng ký thành công! Bạn có thể đăng nhập ngay.");
        switchTab("login");
      } else {
        msg.innerText = res.body.error || "Tên tài khoản đã tồn tại";
      }
    });
}

function handleLogout() {
  fetch("/api/logout", { method: "POST" }).then(() => {
    checkLoginStatus(); // Quay về giao diện khách
  });
}

// ================================================================
// 3. LOGIC CHÍNH: PHÂN TÍCH USER (PROFILE + RECOMMENDATION)
// ================================================================

function analyzeUser(isLoggedInUser = false) {
  // Nếu bấm nút "Phân tích của tôi" -> Lấy currentUser
  // Nếu bấm nút ở Input khách -> Lấy value input
  let targetUser = isLoggedInUser ? currentUser : document.getElementById("usernameInput").value.trim();

  if (!targetUser) return alert("Vui lòng nhập tên User!");

  // --- A. Tải Lịch sử (User History) ---
  fetch(`/api/history/${targetUser}`)
    .then((r) => r.json())
    .then((data) => {
      const histDiv = document.getElementById("user-history");
      const histList = document.getElementById("history-list");

      // Chỉ hiện lịch sử nếu có dữ liệu
      if (data.length > 0) {
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
        histDiv.style.display = "none";
      }
    });

  // --- B. Tải Gợi ý (Recommendations) ---
  getRecommendations(targetUser);
}

function getRecommendations(user) {
  var recArea = document.getElementById("recommendation-area");
  // Loading State
  recArea.innerHTML = `
        <div style="text-align:center; padding:40px; color:#6b7280;">
            <i class="fas fa-circle-notch fa-spin fa-2x"></i><br><br>
            Đang phân tích đồ thị tri thức...
        </div>`;

  fetch(`/api/recommend/${user}`)
    .then((res) => res.json())
    .then((data) => {
      recArea.innerHTML = ""; // Xóa loading

      if (data.length === 0) {
        recArea.innerHTML = `
                    <div class="empty-state">
                        <p>❌ Không tìm thấy dữ liệu gợi ý.</p>
                    </div>`;
        return;
      }

      // Render Thẻ
      data.forEach((loc) => {
        // Logic Badge
        let badgeHTML = "";
        if (!loc.common_users || loc.common_users === 0) {
          let score = loc.pr ? loc.pr.toFixed(2) : "N/A";
          badgeHTML = `<div class="algo-badge badge-pr"><i class="fas fa-chart-line"></i> PageRank: ${score}</div>`;
        } else {
          badgeHTML = `<div class="algo-badge badge-collab"><i class="fas fa-users"></i> ${loc.common_users} người cùng gu</div>`;
        }

        // Thẻ Card Ngang
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
      console.error(err);
      recArea.innerHTML = `<div style="text-align:center; color:red; padding:20px;">Lỗi kết nối Server!</div>`;
    });
}

// ================================================================
// 4. HELPER & DETAIL VIEW
// ================================================================

function createPlaceImage(src) {
  return `<img src="${src}" onerror="this.src='/static/images/no-image.png'">`;
}

function getIconByCategory(category) {
  const iconMap = {
    "Di tích": { class: "pin-ditich", symbol: "🏛️" },
    "Tâm linh": { class: "pin-tamlinh", symbol: "🛕" },
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

function flyToLocation(lat, lng, name) {
  map.flyTo([lat, lng], 16, { duration: 1.2 });
  if (markersMap[name]) setTimeout(() => markersMap[name].openPopup(), 1200);
}

// Hàm mở chi tiết từ dữ liệu đầy đủ
function showDetail(loc) {
  flyToLocation(loc.lat, loc.lng, loc.name);

  const panel = document.getElementById("detail-panel");
  const content = document.getElementById("detail-content");
  const googleLink = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;

  let badgeInfo = "";
  if (loc.common_users !== undefined) {
    if (!loc.common_users) badgeInfo = `<span class="algo-badge badge-pr">🏆 Địa điểm nổi bật (PageRank Top)</span>`;
    else badgeInfo = `<span class="algo-badge badge-collab">👥 ${loc.common_users} người cùng sở thích</span>`;
  }

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
            <button onclick="handleLike('${loc.name}')" class="btn-action btn-like">
                <i class="fas fa-heart"></i> Yêu thích
            </button>
            
            <a href="${googleLink}" target="_blank" class="btn-action btn-maps">
                <i class="fas fa-directions"></i> Chỉ đường
            </a>
        </div>
    </div>
`;
  panel.classList.add("active");
}

// Helper: Mở chi tiết từ lịch sử (dữ liệu ít hơn)
function showDetailFromData(name, lat, lng, image) {
  // Tạo object giả lập để dùng chung hàm showDetail
  // Vì API history trả về ít trường hơn
  const fakeLoc = {
    name: name,
    lat: lat,
    lng: lng,
    image: image,
    description: "Bạn đã thích địa điểm này.",
    category: "Đã ghé thăm",
    rating: 5,
  };
  showDetail(fakeLoc);
}

function closeDetail() {
  document.getElementById("detail-panel").classList.remove("active");
}

// ================================================================
// 5. DATA EXPLORER
// ================================================================

function loadLocations(category = "All") {
  markerLayer.clearLayers();
  markersMap = {};
  const list = document.getElementById("locationList");
  list.innerHTML = `<div style="text-align:center; font-size:12px; color:#999; grid-column:1/-1;">Đang tải...</div>`;

  let url = "/api/locations";
  if (category !== "All") url += `?category=${encodeURIComponent(category)}`;

  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      list.innerHTML = "";
      data.forEach((loc) => {
        // Mini item
        const div = document.createElement("div");
        div.className = "mini-item";
        div.innerHTML = `
                <img src="${loc.image}" class="mini-img" onerror="this.src='/static/images/no-image.png'">
                <div class="mini-name">${loc.name}</div>
            `;
        div.onclick = () => showDetail(loc);
        list.appendChild(div);

        // Marker
        const m = L.marker([loc.lat, loc.lng], { icon: getIconByCategory(loc.category) });
        m.bindPopup(`<div style="text-align:center"><b>${loc.name}</b><br>${loc.category}</div>`);
        m.on("click", () => showDetail(loc));
        m.addTo(markerLayer);
        markersMap[loc.name] = m;
      });
    });
}

function filterData(cat, btn) {
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  loadLocations(cat);
}

// [File: main.js] - Thêm vào cuối file

function handleLike(locationName) {
  // 1. Kiểm tra nếu chưa đăng nhập thì báo lỗi
  if (!currentUser) {
    alert("⚠️ Bạn cần đăng nhập để lưu sở thích!");
    openAuthModal(); // Mở modal đăng nhập
    return;
  }

  // 2. Gọi API
  fetch("/api/like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location_name: locationName }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.message) {
        alert("❤️ " + data.message);
        // Tùy chọn: Tải lại phân tích ngay lập tức để thấy gợi ý thay đổi
        analyzeUser(true);
      } else {
        alert("Lỗi: " + data.error);
      }
    })
    .catch((err) => console.error("Lỗi Like:", err));
}
