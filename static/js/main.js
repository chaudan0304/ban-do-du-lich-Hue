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

// Hàm tạo icon marker theo category
function getMarkerIcon(category) {
    const colors = {
        'Di tích': '#e74c3c',
        'Ẩm thực': '#f39c12',
        'Thiên nhiên': '#27ae60',
        'Lưu trú': '#3498db',
        'default': '#95a5a6'
    };
    const color = colors[category] || colors.default;
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color:${color};width:30px;height:30px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.4);"></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
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
// 4. CHẠY LẦN ĐẦU
// ==========================================
loadLocations('All');