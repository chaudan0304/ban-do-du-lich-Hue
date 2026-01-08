// ==========================================
// 1. KHỞI TẠO BẢN ĐỒ LEAFLET
// ==========================================
var map = L.map("map", { zoomControl: false }).setView([16.4637, 107.5909], 14);
L.control.zoom({ position: "bottomright" }).addTo(map);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// Quản lý marker bằng LayerGroup để dễ xóa và tối ưu
var markerLayer = L.layerGroup().addTo(map);

// Biến lưu marker để tra cứu khi click từ danh sách
var markersMap = {};

// ==========================================
// 2. CÁC HÀM XỬ LÝ DỮ LIỆU VÀ TƯƠNG TÁC
// ==========================================
// Hàm lấy Icon theo danh mục
function getIconByCategory(category) {
  // Map trực tiếp category → {class màu, emoji}
  const iconMap = {
    "Di tích": { class: "pin-ditich", symbol: "🏛️" },
    "Tâm linh": { class: "pin-tamlinh", symbol: "🛕" },
    "Lăng tẩm": { class: "pin-langtam", symbol: "🏯" },
    "Ẩm thực": { class: "pin-amthuc", symbol: "🍜" },
    "Mua sắm": { class: "pin-muasam", symbol: "🛍️" },
    "Tham quan": { class: "pin-thamquan", symbol: "🎡" },
    "Thiên nhiên": { class: "pin-thiennhien", symbol: "🌳" },
    "Bãi biển": { class: "pin-baibien", symbol: "🏖️" },
  };

  // Lấy config tương ứng, nếu không có thì dùng mặc định
  const config = iconMap[category] || { class: "pin-khac", symbol: "📍" };

  return L.divIcon({
    className: "custom-div-icon",
    html: `<div class='custom-pin ${config.class}'><i>${config.symbol}</i></div>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40],
  });
}

// Hàm helper tạo thẻ img với fallback no-image.png
function createPlaceImage(src, alt = "Địa điểm du lịch Huế") {
  return `<img src="${src}" alt="${alt}" onerror="this.src='/static/images/no-image.png'" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
}

// Hàm bay đến vị trí và mở Popup
function flyToLocation(lat, lng, name) {
  // 1. Bay đến vị trí
  map.flyTo([lat, lng], 16, {
    duration: 1.5,
    easeLinearity: 0.25,
  });

  // 2. Tìm marker tương ứng và mở Popup
  const marker = markersMap[name];
  if (marker) {
    map.once("moveend", () => {
      marker.openPopup();
    });
  }
}

// ==========================================
// 3. LOGIC CHÍNH: TẢI ĐỊA ĐIỂM & GỢI Ý
// ==========================================
function loadLocations(category = "All") {
  markerLayer.clearLayers();
  markersMap = {}; // Reset bản đồ marker

  var listContainer = document.getElementById("locationList");
  listContainer.innerHTML = '<div class="list-title">Đang tải dữ liệu...</div>';

  var url = "/api/locations";
  if (category !== "All") url += `?category=${encodeURIComponent(category)}`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (data.length === 0) {
        listContainer.innerHTML = '<div class="list-title">Không tìm thấy địa điểm nào 😔</div>';
        return;
      }

      listContainer.innerHTML = `<div class="list-title">Tìm thấy ${data.length} địa điểm</div>`;

      data.forEach((loc) => {
        const safeDesc = loc.description ? loc.description : "Chưa có mô tả.";
        const shortDesc = safeDesc.length > 60 ? safeDesc.substring(0, 60) + "..." : safeDesc;
        // === 1. Tạo CARD ===
        const card = document.createElement("div"); // Dùng const để scope rõ ràng
        card.className = "card";
        card.innerHTML = `
          <div class="card-img">${createPlaceImage(loc.image)}</div>
          <div class="card-body">
            <div class="card-name">${loc.name}</div>
            <div class="card-meta">
              <span class="card-cat">${loc.category}</span>
              <span class="card-rating">⭐ ${loc.rating}</span>
            </div>
          </div>
        `;

        // Click card → bay đến địa điểm
        card.onclick = () => flyToLocation(loc.lat, loc.lng, loc.name);
        listContainer.appendChild(card);

        // === 2. Tạo MARKER ===
        const marker = L.marker([loc.lat, loc.lng], {
          icon: getIconByCategory(loc.category),
        });

        // Popup content
        const popupContent = `
          <div class="popup-body">
            <div style="height:120px; overflow:hidden; border-radius:12px 12px 0 0;">
              ${createPlaceImage(loc.image)}
            </div>

            <b>${loc.name}</b>
            <div style="font-size:12px; color:#666; margin:5px 0;">
              ${shortDesc}
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-top:8px;">
              <span class="card-rating">⭐ ${loc.rating}</span>
              <span style="font-size:11px; background:#eee; padding:2px 6px; border-radius:4px;">
                ${loc.category}
              </span>
            </div>

            <a href="https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}" target="_blank"
               style="display:block; margin-top:5px; text-decoration:none; background:#3498db; color:white; padding:5px; border-radius:4px; font-size:12px; font-weight:bold; text-align:center;">
               🗺️ Mở Google Maps
            </a>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.addTo(markerLayer);

        // Lưu marker để flyTo và hover
        markersMap[loc.name] = marker;

        // === 3. Hover effect: card hover → mở popup marker ===
        card.addEventListener("mouseenter", () => marker.openPopup());
        card.addEventListener("mouseleave", () => marker.closePopup());
      });
    })
    .catch((err) => {
      console.error("Lỗi tải locations:", err);
      listContainer.innerHTML = '<div class="list-title">Lỗi kết nối server 😢</div>';
    });
}

// Hàm xử lý khi bấm nút bộ lọc
function filterData(cat, btn) {
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  loadLocations(cat);
}

// Hàm gọi ý thông minh (AI)
function getRecommendations() {
  var user = document.getElementById("usernameInput").value.trim();
  if (!user) {
    document.getElementById("results").innerHTML = "<small>Vui lòng nhập tên người dùng.</small>";
    return;
  }

  var resBox = document.getElementById("results");
  resBox.innerHTML = "<small>⏳ Đang phân tích sở thích của bạn...</small>";

  fetch(`/api/recommend/${user}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.length === 0) {
        resBox.innerHTML = "<small>Không có gợi ý.</small>";
        return;
      }
      resBox.innerHTML = '<small style="color:#27ae60; font-weight:bold">🔥 Dành riêng cho bạn:</small>';
      data.forEach((loc) => {
        let labelText = "";
        let labelColor = "#555";

        if (!loc.common_users || loc.common_users === 0) {
          let score = loc.pr ? loc.pr.toFixed(2) : "N/A";
          labelText = "🏆 Địa điểm nổi bật (PR: " + score + ")";
          labelColor = "#e67e22";
        } else if (loc.common_users >= 3) {
          labelText = "👥 Nhiều người cùng gu đã đến đây";
          labelColor = "#26e615ff";
        } else {
          labelText = "👤 " + loc.common_users + " người cùng sở thích với bạn đã đến đây";
          labelColor = "#3498db";
        }

        var div = document.createElement("div");
        div.className = "card rec-card";
        div.style.marginBottom = "5px";
        div.innerHTML = `
            <div style="display:flex; padding:8px; align-items:center">
              <div style="width:50px; height:50px; border-radius:8px; overflow:hidden; margin-right:10px; flex-shrink:0;">
                ${createPlaceImage(loc.image)}
              </div>
              <div style="flex:1; min-width:0;">
                <div style="font-weight:bold; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${loc.name}
                </div>
                <div style="font-size:11px; color:${labelColor}; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${labelText}
                </div>
              </div>
            </div>
          `;
        div.onclick = () => flyToLocation(loc.lat, loc.lng, loc.name);
        resBox.appendChild(div);
      });
    });
}

// ==========================================
// 7. TÍNH NĂNG ẨN/HIỆN AI BOX
// ==========================================
function toggleAI() {
  var content = document.getElementById("ai-content");
  var arrow = document.getElementById("ai-arrow");

  if (content.classList.contains("expanded")) {
    content.classList.remove("expanded");
    arrow.style.transform = "rotate(-90deg)"; // Xoay mũi tên ngang
  } else {
    content.classList.add("expanded");
    arrow.style.transform = "rotate(0deg)"; // Xoay mũi tên xuống
  }
}

// ==========================================
// TÍNH NĂNG: ẨN/HIỆN TOÀN BỘ SIDEBAR
// ==========================================
function toggleSidebar() {
  var sidebar = document.getElementById("sidebar");
  var btn = document.getElementById("toggleSidebarBtn");

  // 1. Toggle class để ẩn/hiện
  sidebar.classList.toggle("collapsed");

  // 2. Đổi icon nút bấm
  if (sidebar.classList.contains("collapsed")) {
    btn.innerHTML = "➜";
    btn.style.left = "15px";
  } else {
    btn.innerHTML = "⬅";
    btn.style.left = "350px";
  }

  setTimeout(() => map.invalidateSize(), 400); // Cập nhật lại kích thước bản đồ sau khi ẩn/hiện sidebar
}

// ==========================================
// 3. TÍNH NĂNG KÉO THẢ & CUỘN NGANG (Desktop + Mobile + Touchpad)
// ==========================================
const slider = document.querySelector(".filter-container");
if (slider) {
  // Wheel + Touchpad (ngăn scroll trang)
  slider.addEventListener(
    "wheel",
    (e) => {
      if (slider.scrollWidth <= slider.clientWidth) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      e.preventDefault();
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      slider.scrollLeft += delta * 1.5;
    },
    { passive: false }
  );

  // Kéo thả bằng chuột
  let isDown = false;
  let startX;
  let scrollLeft;

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

  // Touch cho mobile/tablet
  slider.addEventListener("touchstart", (e) => {
    isDown = true;
    startX = e.touches[0].pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });
  slider.addEventListener("touchmove", (e) => {
    if (!isDown) return;
    const x = e.touches[0].pageX - slider.offsetLeft;
    const walk = (x - startX) * 2;
    slider.scrollLeft = scrollLeft - walk;
  });
  slider.addEventListener("touchend", () => {
    isDown = false;
  });
}

// ==========================================
// THE END. KHỞI CHẠY ỨNG DỤNG
// ==========================================
loadLocations("All");
