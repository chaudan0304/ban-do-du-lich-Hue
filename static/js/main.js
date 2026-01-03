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

// BIẾN QUẢN LÝ ĐƯỜNG ĐI
var routingControl = null;
// ==========================================
// 2. CÁC HÀM XỬ LÝ DỮ LIỆU (Load, Marker, AI)
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

// Hàm helper tạo thẻ img với fallback no-image.png (local, nhanh, đẹp)
function createPlaceImage(src, alt = "Địa điểm du lịch Huế") {
  return `<img src="${src}" alt="${alt}" onerror="this.src='/static/images/no-image.png'" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
}

// Hàm tải danh sách địa điểm
function loadLocations(category = "All") {
  markerLayer.clearLayers();
  markersMap = {}; // Reset để tránh lỗi cũ

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
              ${loc.description.substring(0, 60)}...
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-top:8px;">
              <span class="card-rating">⭐ ${loc.rating}</span>
              <span style="font-size:11px; background:#eee; padding:2px 6px; border-radius:4px;">
                ${loc.category}
              </span>
            </div>
            
            <button onclick="showRoute(${loc.lat}, ${loc.lng}, '${loc.name.replace(/'/g, "\\'")}')" 
              style="cursor:pointer; width:100%; margin-top:8px; border:none; background:#27ae60; color:white; padding:8px; border-radius:8px; font-weight:bold; font-size:14px;">
              🚗 Tìm đường đi đến → ${loc.name}
            </button>

            <a href="https://www.google.com/maps?q=${loc.lat},${loc.lng}" target="_blank"
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

// ==========================================
// HÀM HELPER: BAY ĐẾN & MỞ POPUP
// ==========================================
function flyToLocation(lat, lng, name) {
  // 1. Bay đến vị trí
  map.flyTo([lat, lng], 16, {
    duration: 1.5,
    easeLinearity: 0.25,
  });

  // 2. Tìm marker tương ứng và mở Popup
  var marker = markersMap[name];
  if (marker) {
    // Đợi 1.2s cho bay gần tới nơi rồi mới bung popup ra
    setTimeout(() => {
      marker.openPopup();
    }, 1200);
  }
}

// Hàm xử lý khi bấm nút bộ lọc
function filterData(cat, btn) {
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  loadLocations(cat);
}

// Hàm gọi ý thông minh (AI)
function getRecommendations() {
  var user = document.getElementById("usernameInput").value;
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
                <div style="font-size:11px; color:#555;">
                  ${loc.common_users ? loc.common_users + " người cùng sở thích" : "Địa điểm nổi bật (PageRank cao)"}
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
// 3. TÍNH NĂNG KÉO THẢ & CUỘN NGANG (Desktop + Mobile + Touchpad)
// ==========================================
const slider = document.querySelector(".filter-container");
let isDown = false;
let startX;
let scrollLeft;

if (slider) {
  // 1. FIX: Wheel + Touchpad gesture (2-ngón trượt)
  slider.addEventListener("wheel", (e) => {
    if (slider.scrollWidth <= slider.clientWidth) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    e.preventDefault();
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    slider.scrollLeft += delta * 1.5; // Điều chỉnh tốc độ tại đây nếu cần
  });

  // 2. Kéo thả bằng chuột (desktop)
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

  // 3. Touch cho mobile/tablet
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
// 4. CÔNG CỤ LẤY TỌA ĐỘ (DEV TOOL)
// ==========================================
var popup = L.popup();

function onMapClick(e) {
  var lat = e.latlng.lat.toFixed(5); // Lấy 5 số thập phân
  var lng = e.latlng.lng.toFixed(5);

  var copyText = `'lat': ${lat}, 'lng': ${lng}`;

  popup
    .setLatLng(e.latlng)
    .setContent(
      `
           <div style="text-align:center">
                <b>Tọa độ vị trí này:</b><br>
                <code style="background:#eee; padding:2px 5px; border-radius:3px; font-size:12px">${copyText}</code><br>
                <button onclick="navigator.clipboard.writeText(&quot;${copyText}&quot;)" style="margin-top:5px; cursor:pointer; border:1px solid #ccc; background:#fff; padding:2px 8px; border-radius:4px;">
                    📋 Copy ngay
                </button>
            </div>
        `
    )
    .openOn(map);

  console.log(`Bạn vừa click tại: ${lat}, ${lng}`);
}
map.on("click", onMapClick);

// ==========================================
// 5. TÍNH NĂNG TÌM KIẾM TỌA ĐỘ (ĐÃ NÂNG CẤP)
// ==========================================
function searchCoordinate() {
  var input = document.getElementById("coordInput").value.trim();

  // 1. Làm sạch chuỗi nhập vào
  // Cho phép nhập: "16.123, 107.123" hoặc "['lat': 16.123, 'lng': 107.123]" đều được
  input = input.replace(/[\[\]'":a-zA-Z]/g, "");

  var parts = input.split(/[ ,]+/);
  parts = parts.filter((item) => item !== "");

  if (parts.length >= 2) {
    var lat = parseFloat(parts[0]);
    var lng = parseFloat(parts[1]);

    if (!isNaN(lat) && !isNaN(lng)) {
      // Định dạng số liệu đẹp (5 số thập phân)
      var latFixed = lat.toFixed(5);
      var lngFixed = lng.toFixed(5);

      // Chuẩn định dạng copy: 'lat': 16.xxxxx, 'lng': 107.xxxxx
      var copyText = `'lat': ${latFixed}, 'lng': ${lngFixed}`;

      // Bay đến vị trí
      map.flyTo([lat, lng], 18);

      // Tạo marker + Popup có nút Copy
      L.marker([lat, lng])
        .addTo(map)
        .bindPopup(
          `
                    <div style="text-align:center; min-width: 200px">
                        <b style="color:#2c3e50">📍 Vị trí tìm kiếm</b><br>
                        <div style="background:#f8f9fa; border:1px solid #eee; padding:5px; margin:5px 0; border-radius:4px; font-family:monospace; color:#c0392b">
                            ${copyText}
                        </div>
                        <button onclick="navigator.clipboard.writeText(&quot;${copyText}&quot;)" style="cursor:pointer; border:1px solid #2980b9; background:#3498db; color:white; padding:4px 12px; border-radius:4px; font-weight:bold; width:100%">
                            📋 Sao chép
                        </button>
                    </div>
                `
        )
        .openPopup();
    } else {
      alert("❌ Tọa độ không hợp lệ!");
    }
  } else {
    alert("⚠️ Vui lòng nhập đúng định dạng: Vĩ độ, Kinh độ");
  }
}
// ==========================================
// 6. HÀM VẼ ĐƯỜNG ĐI TỐI ƯU (ROUTING)
// ==========================================
let routingLayer = null; // Quản lý layer đường đi

function showRoute(destLat, destLng, destName) {
  if (routingLayer) {
    map.removeLayer(routingLayer);
    routingLayer = null;
  }

  const endName = destName.trim();

  if (!endName) {
    alert("⚠️ Tên địa điểm đích không hợp lệ!");
    return;
  }

  // Hiển thị loading nhẹ (tùy chọn nâng cao)
  const loadingPopup = L.popup({ closeOnClick: false, closeButton: false })
    .setLatLng([destLat, destLng])
    .setContent("<small>⏳ Đang xác định điểm xuất phát và tính đường đi...</small>")
    .openOn(map);

  // Ưu tiên lấy vị trí hiện tại của người dùng
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const startLat = position.coords.latitude;
        const startLng = position.coords.longitude;
        calculateRoute(startLat, startLng, null, endName, loadingPopup); // null nghĩa là dùng tọa độ thực
      },
      (error) => {
        console.warn("Không lấy được vị trí hiện tại:", error);
        map.closePopup(loadingPopup);
        // Fallback: Cho phép người dùng nhập tên điểm xuất phát
        const startName = prompt(
          "Không lấy được vị trí hiện tại.\nVui lòng nhập tên điểm xuất phát (ví dụ: Hoàng Thành Huế hoặc Ga Huế):",
          "Hoàng Thành Huế"
        );
        if (!startName || startName.trim() === "") {
          alert("⚠️ Vui lòng nhập điểm xuất phát hợp lệ!");
          return;
        }
        calculateRoute(null, null, startName.trim(), endName, null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  } else {
    // Nếu browser không hỗ trợ geolocation
    map.closePopup(loadingPopup);
    const startName = prompt("Trình duyệt không hỗ trợ định vị.\nVui lòng nhập tên điểm xuất phát:", "Hoàng Thành Huế");
    if (!startName || startName.trim() === "") {
      alert("⚠️ Vui lòng nhập điểm xuất phát hợp lệ!");
      return;
    }
    calculateRoute(null, null, startName.trim(), endName, null);
  }
}

// Hàm tách riêng để tính đường đi (hỗ trợ cả tọa độ và tên)
function calculateRoute(startLat, startLng, startName, endName, loadingPopup) {
  let url;
  if (startLat && startLng) {
    alert("Backend hiện tại chỉ hỗ trợ tên địa điểm. Hãy nhập tên gần nhất.");
    const fallbackName = prompt("Nhập tên điểm xuất phát gần vị trí hiện tại:", "Ga Huế");
    url = `/api/route?start=${encodeURIComponent(fallbackName)}&end=${encodeURIComponent(endName)}`;
  } else {
    url = `/api/route?start=${encodeURIComponent(startName)}&end=${encodeURIComponent(endName)}`;
  }

  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("Server lỗi");
      return res.json();
    })
    .then((data) => {
      console.log("👉 Dữ liệu Server trả về:", data);

      if (loadingPopup) map.closePopup(loadingPopup);

      if (data.error) {
        alert(`❌ Không tìm thấy đường đi:\n${data.error}`);
        return;
      }

      const latlngs = data.path_nodes.map((node) => [node.lat, node.lng]);

      const polyline = L.polyline(latlngs, {
        color: "#3498db",
        weight: 6,
        opacity: 0.9,
        smoothFactor: 1,
      });

      routingLayer = L.layerGroup([polyline]).addTo(map);

      // 1. Kiểm tra xem có totalCost không (phòng trường hợp lỗi)
      if (data.totalCost !== undefined) {
        // 2. Đổi từ mét sang km và làm tròn 2 số thập phân
        var distanceKm = (data.totalCost / 1000).toFixed(2);

        // 3. Tạo nội dung Popup đẹp mắt
        var popupContent = `
              <div style="text-align:center; min-width: 150px">
                  <b style="color:#2c3e50">🏁 Lộ trình tham quan</b><br>
                  <hr style="margin:5px 0; border:0; border-top:1px solid #eee;">
                  Khoảng cách: <b style="color:#e67e22; font-size:15px">${distanceKm} km</b>
              </div>
          `;

        // 4. Gắn popup vào đường đi và tự động mở ra
        polyline.bindPopup(popupContent).openPopup();
      }
      // ---------------------
      // Marker điểm đầu (xanh lá để phân biệt là start)
      const startIcon = L.divIcon({
        className: "custom-pin pin-thiennhien", // Sử dụng class xanh lá có sẵn trong CSS
        iconSize: [30, 30],
        html: "<i>🚩</i>",
      });
      L.marker(latlngs[0], { icon: startIcon })
        .addTo(routingLayer)
        .bindPopup(`🚩 <b>${startLat ? "Vị trí hiện tại của bạn" : startName || "Điểm xuất phát"}</b><br>Start`)
        .openPopup();

      // Marker điểm cuối (giữ icon category hoặc mặc định)
      L.marker(latlngs[latlngs.length - 1], { icon: getIconByCategory("Tham quan") })
        .addTo(routingLayer)
        .bindPopup(`📍 <b>${endName}</b><br>Điểm đến`)
        .openPopup();

      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    })
    .catch((err) => {
      if (loadingPopup) map.closePopup(loadingPopup);
      console.error("Lỗi routing:", err);
      alert("🔌 Lỗi kết nối đến Neo4j hoặc không có đường đi khả dụng.");
    });
}
// ==========================================
// THE END. KHỞI CHẠY ỨNG DỤNG
// ==========================================
// Khởi chạy lần đầu: Load tất cả địa điểm
loadLocations("All");
