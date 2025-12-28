// ==========================================
// 1. KHỞI TẠO BẢN ĐỒ
// ==========================================
var map = L.map('map', {zoomControl: false}).setView([16.4637, 107.5909], 14);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Quản lý marker bằng LayerGroup để dễ xóa và tối ưu
var markerLayer = L.layerGroup().addTo(map);

// ==========================================
// 2. CÁC HÀM XỬ LÝ DỮ LIỆU (Load, Marker, AI)
// ==========================================
// Hàm tải danh sách địa điểm
function loadLocations(category = 'All') {
    markerLayer.clearLayers();
    
    var listContainer = document.getElementById('locationList');
    listContainer.innerHTML = '<div class="list-title">Đang tải dữ liệu...</div>';
    var url = '/api/locations';
    if (category !== 'All') url += `?category=${category}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                listContainer.innerHTML = '<div class="list-title">Không tìm thấy địa điểm nào 😔</div>';
                return;
            }
            listContainer.innerHTML = `<div class="list-title">Tìm thấy ${data.length} địa điểm</div>`;
            
            data.forEach(loc => {
                // A. Tạo thẻ Card bên trái
                var card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <img class="card-img" src="${loc.image}" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/600px-No_image_available.svg.png'">
                    <div class="card-body">
                        <div class="card-name">${loc.name}</div>
                        <div class="card-meta">
                            <span class="card-cat">${loc.category}</span>
                            <span class="card-rating">⭐ ${loc.rating}</span>
                        </div>
                    </div>
                `;
                card.onclick = () => { map.flyTo([loc.lat, loc.lng], 16); };
                listContainer.appendChild(card);
                
                // B. Tạo Marker trên bản đồ
                var marker = addMarker(loc);
                
                // C. Highlight khi hover card
                card.onmouseover = () => {
                    marker.openPopup();
                };
                card.onmouseout = () => {
                    marker.closePopup();
                };
            });
        });
}

// ==========================================
// HÀM TẠO ICON CHẤM TRÒN ĐỔI MÀU
// ==========================================
function getMarkerIcon(category) {
    // 1. Bảng màu cho từng danh mục
    const colors = {
        'Di tích':     '#e74c3c', // Đỏ (Red)
        'Tâm linh':    '#f1c40f', // Vàng (Yellow)
        'Lăng tẩm':    '#8e44ad', // Tím (Purple)
        'Ẩm thực':     '#e67e22', // Cam (Orange)
        'Mua sắm':     '#3498db', // Xanh dương (Blue)
        'Nhà vườn':    '#1abc9c', // Xanh ngọc (Teal)
        'Tham quan':   '#16a085', // Xanh đậm
        'Thiên nhiên': '#27ae60', // Xanh lá (Green)
        'Bãi biển':    '#2980b9', // Xanh biển đậm
        'default':     '#95a5a6'  // Xám (Mặc định nếu không khớp)
    };

    // 2. Lấy màu dựa trên danh mục (nếu không có thì lấy màu default)
    const color = colors[category] || colors.default;

    // 3. Trả về DivIcon (Vẽ bằng code HTML/CSS)
    return L.divIcon({
        className: 'custom-dot-icon', // Class rỗng để xóa style mặc định của Leaflet
        
        // Đoạn HTML vẽ hình tròn
        html: `
            <div style="
                background-color: ${color};
                width: 18px;
                height: 18px;
                border-radius: 50%;
                border: 2px solid #ffffff;
                box-shadow: 0 0 4px rgba(0,0,0,0.4);
            "></div>
        `,
        
        // Kích thước thật của icon (18px + 2px viền trái + 2px viền phải = 22px)
        iconSize: [22, 22],
        
        // Điểm neo (Căn giữa: 22 chia 2 = 11)
        iconAnchor: [11, 11],
        
        // Vị trí hiện bảng tên khi click (cao hơn chấm một chút)
        popupAnchor: [0, -12]
    });
}

// Hàm tạo nội dung popup
function createPopupContent(loc) {
    return `
        <img class="popup-img" src="${loc.image}" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/600px-No_image_available.svg.png'">
        <div class="popup-body">
            <b>${loc.name}</b><br>
            <small>${loc.description || 'Chưa có mô tả'}</small>
        </div>
    `;
}

// Hàm vẽ Marker
function addMarker(loc  ) {
    if (!loc.lat || !loc.lng) return;
    var marker = L.marker([loc.lat, loc.lng], { icon: getMarkerIcon(loc.category) })
        .bindPopup(createPopupContent(loc), { maxWidth: 260 })
        .addTo(markerLayer);
    return marker; // Trả về marker để dùng cho hover
}

// Hàm xử lý khi bấm nút bộ lọc
function filterData(cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadLocations(cat);
}

// Hàm gọi ý thông minh (AI)
function getRecommendations() {
    var user = document.getElementById('usernameInput').value;
    var resBox = document.getElementById('results');
    resBox.innerHTML = '<small>⏳ Đang phân tích sở thích của bạn...</small>';
    fetch(`/api/recommend/${user}`)
        .then(res => res.json())
        .then(data => {
            if(data.length === 0) { resBox.innerHTML = '<small>Không có gợi ý.</small>'; return; }
            resBox.innerHTML = '<small style="color:#27ae60; font-weight:bold">🔥 Dành riêng cho bạn:</small>';
            data.forEach(loc => {
                var div = document.createElement('div');
                div.className = 'card rec-card';
                div.style.marginBottom = '5px';
                div.innerHTML = `
                    <div style="display:flex; padding:8px; align-items:center">
                        <img src="${loc.image}" style="width:50px; height:50px; border-radius:8px; object-fit:cover; margin-right:10px" onerror="this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/600px-No_image_available.svg.png'">
                        <div>
                            <div style="font-weight:bold; font-size:14px">${loc.name}</div>
                            <div style="font-size:11px; color:#555">${loc.score ? 'Có ' + loc.score + ' người giống bạn' : 'Địa điểm Hot'}</div>
                        </div>
                    </div>
                `;
                div.onclick = () => map.flyTo([loc.lat, loc.lng], 16);
                resBox.appendChild(div);
            });
        });
}

// ==========================================
// 3. TÍNH NĂNG KÉO THẢ & CUỘN NGANG (Desktop + Mobile + Touchpad)
// ==========================================
const slider = document.querySelector('.filter-container');
let isDown = false;
let startX;
let scrollLeft;

if (slider) {
    // 1. FIX: Wheel + Touchpad gesture (2-ngón trượt)
    slider.addEventListener('wheel', (e) => {
        if (slider.scrollWidth <= slider.clientWidth) return;
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

        e.preventDefault();
        const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        slider.scrollLeft += delta * 1.5; // Điều chỉnh tốc độ tại đây nếu cần
    });

    // 2. Kéo thả bằng chuột (desktop)
    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('active');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
        slider.style.cursor = 'grabbing';
    });
    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('active');
        slider.style.cursor = 'grab';
    });
    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('active');
        slider.style.cursor = 'grab';
    });
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2;
        slider.scrollLeft = scrollLeft - walk;
    });

    // 3. Touch cho mobile/tablet
    slider.addEventListener('touchstart', (e) => {
        isDown = true;
        startX = e.touches[0].pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        const x = e.touches[0].pageX - slider.offsetLeft;
        const walk = (x - startX) * 2;
        slider.scrollLeft = scrollLeft - walk;
    });
    slider.addEventListener('touchend', () => {
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
        .setContent(`
           <div style="text-align:center">
                <b>Tọa độ vị trí này:</b><br>
                <code style="background:#eee; padding:2px 5px; border-radius:3px; font-size:12px">${copyText}</code><br>
                <button onclick="navigator.clipboard.writeText(&quot;${copyText}&quot;)" style="margin-top:5px; cursor:pointer; border:1px solid #ccc; background:#fff; padding:2px 8px; border-radius:4px;">
                    📋 Copy ngay
                </button>
            </div>
        `)
        .openOn(map);
        
    console.log(`Bạn vừa click tại: ${lat}, ${lng}`);
}
map.on('click', onMapClick);

// ==========================================
// 5. TÍNH NĂNG TÌM KIẾM TỌA ĐỘ (ĐÃ NÂNG CẤP)
// ==========================================
function searchCoordinate() {
    var input = document.getElementById('coordInput').value.trim();
    
    // 1. Làm sạch chuỗi nhập vào
    // Cho phép nhập: "16.123, 107.123" hoặc "['lat': 16.123, 'lng': 107.123]" đều được
    input = input.replace(/[\[\]'":a-zA-Z]/g, ''); 
    
    var parts = input.split(/[ ,]+/);
    parts = parts.filter(item => item !== '');

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
                .bindPopup(`
                    <div style="text-align:center; min-width: 200px">
                        <b style="color:#2c3e50">📍 Vị trí tìm kiếm</b><br>
                        <div style="background:#f8f9fa; border:1px solid #eee; padding:5px; margin:5px 0; border-radius:4px; font-family:monospace; color:#c0392b">
                            ${copyText}
                        </div>
                        <button onclick="navigator.clipboard.writeText(&quot;${copyText}&quot;)" style="cursor:pointer; border:1px solid #2980b9; background:#3498db; color:white; padding:4px 12px; border-radius:4px; font-weight:bold; width:100%">
                            📋 Sao chép
                        </button>
                    </div>
                `)
                .openPopup();
        } else {
            alert("❌ Tọa độ không hợp lệ!");
        }
    } else {
        alert("⚠️ Vui lòng nhập đúng định dạng: Vĩ độ, Kinh độ");
    }
}
// ==========================================
// 6. CHẠY LẦN ĐẦU
// ==========================================
loadLocations('All');