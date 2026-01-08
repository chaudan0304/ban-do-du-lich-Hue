# Ghi chú lấy tọa độ trong main.js

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
`         <div style="text-align:center">
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
