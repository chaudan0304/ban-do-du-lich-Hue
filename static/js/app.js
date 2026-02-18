// ============================================================================
// ĐIỂM KHỞI CHẠY ỨNG DỤNG / MAIN APP ENTRY POINT
//
// Mô tả / Description:
//   File chính khởi tạo toàn bộ ứng dụng khi DOM sẵn sàng.
//   Main file that initializes the entire application when DOM is ready.
//   Gọi lần lượt: khởi tạo bản đồ → kiểm tra đăng nhập → thiết lập sự kiện
//   → tải dữ liệu ban đầu → kích hoạt tương tác UI.
//   Sequentially calls: init map → check login → setup events
//   → load initial data → activate UI interactivity.
//
// Nội dung / Contents:
//   - DOMContentLoaded listener   → Luồng khởi tạo chính / Main initialization flow
//   - switchSidebarTab()          → Chuyển tab sidebar / Switch sidebar tabs
//   - setupDragScroll()           → Kéo-cuộn thanh filter / Drag-scroll filter bar
//   - setupSidebarResizer()       → Kéo thay đổi kích thước sidebar / Sidebar resize handler
//
// Phụ thuộc / Dependencies:
//   - map.js     → initMap(), loadLocations(), handleLocalSearch()
//   - auth.js    → checkLoginStatus()
//   - utils.js   → Biến & hàm toàn cục / Global variables & functions
// ============================================================================

// ── LUỒNG KHỞI TẠO CHÍNH / MAIN INITIALIZATION FLOW ──
// Chạy sau khi toàn bộ DOM đã được phân tích (parsed) xong.
// Runs after the entire DOM has been fully parsed.
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing Hue Travel App...");

  // Bước 1: Khởi tạo bản đồ Leaflet / Step 1: Initialize Leaflet map
  if(typeof initMap === 'function') {
      initMap();
  } else {
      console.error("Map module not loaded!");
  }

  // Bước 2: Kiểm tra trạng thái đăng nhập (session cookie) / Step 2: Check login status (session cookie)
  if(typeof checkLoginStatus === 'function') {
      await checkLoginStatus();
  }

  // Bước 3: Thiết lập sự kiện toàn cục / Step 3: Setup global events

  // Tìm kiếm với debounce 300ms để tránh gọi API liên tục khi gõ
  // Search with 300ms debounce to avoid excessive API calls while typing
  const searchInput = document.getElementById("miniSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
       if(window.searchTimeout) clearTimeout(window.searchTimeout);
       window.searchTimeout = setTimeout(() => {
           if(typeof handleLocalSearch === 'function') handleLocalSearch();
       }, 300);
    });
  }
  
  // Bước 4: Tải danh sách địa điểm ban đầu ("All" = tất cả danh mục)
  // Step 4: Load initial location list ("All" = all categories)
  if(typeof loadLocations === 'function') {
      loadLocations("All");
  }

  // Bước 5: Kích hoạt tương tác UI / Step 5: Activate UI interactivity
  setupDragScroll();
  setupSidebarResizer();
  
  console.log("Client App Ready ✅");
});

// ============================================================================
// HÀM TIỆN ÍCH UI / UI HELPER FUNCTIONS
// ============================================================================

// ── CHUYỂN TAB SIDEBAR / SIDEBAR TAB SWITCHING ──
// Mục đích: Chuyển đổi giữa các tab "Khám phá" (explore) và "Gợi ý" (foryou) trên sidebar.
// Purpose:  Switches between sidebar tabs like "Explore" and "For You".
// Tham số / Parameter: tabId — ID của tab đích (tương ứng với id "tab-{tabId}")
//                      tabId — Target tab ID (corresponds to element id "tab-{tabId}")
// Cơ chế / Mechanism:
//   1. Xóa class "active" khỏi tất cả nút tab, rồi thêm lại cho nút phù hợp.
//      Removes "active" class from all tab buttons, then adds it to the matching one.
//   2. Ẩn tất cả panel tab, rồi hiện panel tương ứng với tabId.
//      Hides all tab panes, then shows the one matching tabId.
function switchSidebarTab(tabId) {
    document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.onclick && btn.onclick.toString().includes(tabId)) {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.style.display = 'none';
        pane.classList.remove('active');
    });
    
    const activePane = document.getElementById('tab-' + tabId);
    if (activePane) {
        activePane.style.display = 'flex';
        activePane.classList.add('active');
    }
}

// ── KÉO CUỘN THANH LỌC DANH MỤC / DRAG SCROLL FOR FILTER CHIPS ──
// Mục đích: Cho phép người dùng kéo-cuộn ngang thanh filter chips (danh mục địa điểm).
// Purpose:  Enables horizontal drag-scrolling on the filter chips bar (location categories).
// Hỗ trợ / Supports:
//   A. Máy tính: mousedown/mouseup/mousemove + cuộn bằng con lăn chuột/touchpad
//      Desktop: mousedown/mouseup/mousemove + scroll via mouse wheel/touchpad
//   B. Điện thoại: touchstart/touchend/touchmove (cảm ứng)
//      Mobile: touchstart/touchend/touchmove (touch events)
function setupDragScroll() {
  const slider = document.querySelector(".filter-chips");
  let isDown = false;
  let startX;
  let scrollLeft;

  if (slider) {
    // --- A. DÀNH CHO MÁY TÍNH (CHUỘT) / FOR DESKTOP (MOUSE) ---
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
      const walk = (x - startX) * 2; // Hệ số tốc độ cuộn / Scroll speed multiplier
      slider.scrollLeft = scrollLeft - walk;
    });

    // Cuộn bằng Touchpad / Con lăn chuột / Scroll via Touchpad / Mouse wheel
    slider.addEventListener("wheel", (e) => {
      if (slider.scrollWidth <= slider.clientWidth) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // Chỉ xử lý cuộn dọc → chuyển ngang / Only handle vertical → convert to horizontal
      e.preventDefault();
      slider.scrollLeft += e.deltaX || e.deltaY;
    }, { passive: false }); // passive: false vì có e.preventDefault() / passive: false because of e.preventDefault()

    // --- B. DÀNH CHO ĐIỆN THOẠI (CẢM ỨNG) / FOR MOBILE (TOUCH) ---
    slider.addEventListener("touchstart", (e) => {
      isDown = true;
      startX = e.touches[0].pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    }, { passive: true });
    slider.addEventListener("touchend", () => {
      isDown = false;
    }, { passive: true });
    slider.addEventListener("touchmove", (e) => {
      if (!isDown) return;
      const x = e.touches[0].pageX - slider.offsetLeft;
      const walk = (x - startX) * 2; // Tốc độ cuộn / Scroll speed
      slider.scrollLeft = scrollLeft - walk;
    }, { passive: true });
  }
}

// ── THANH THAY ĐỔI KÍCH THƯỚC SIDEBAR / SIDEBAR RESIZER ──
// Mục đích: Cho phép kéo thanh resizer để thay đổi chiều rộng sidebar.
// Purpose:  Allows dragging the resizer bar to change sidebar width.
// Giới hạn / Limits: min = 390px, max = 750px
// Kỹ thuật / Technique:
//   - Lắng nghe mousedown trên resizer, mousemove trên document (để kéo mượt),
//     mouseup trên document (để kết thúc kéo).
//   - Listens mousedown on resizer, mousemove on document (for smooth dragging),
//     mouseup on document (to end dragging).
//   - Sau khi thả chuột, gọi map.invalidateSize() để bản đồ Leaflet tự điều chỉnh kích thước.
//   - After mouse release, calls map.invalidateSize() so Leaflet map adjusts its size.
function setupSidebarResizer() {
    const sidebar = document.querySelector('.sidebar');
    const resizer = document.getElementById('sidebarResizer');
    
    if (!sidebar || !resizer) return;

    let isResizing = false;

    // Khi người dùng bấm chuột vào thanh resizer / When user mousedowns on resizer
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        sidebar.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        e.preventDefault(); // Ngăn chọn text / Prevent text selection
    });

    // Khi di chuyển chuột (trên toàn document để không bị tuột)
    // When mouse moves (on document to prevent losing drag)
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        // Tính toán width mới / Calculate new width
        let newWidth = e.clientX;
        
        // Giới hạn Min/Max / Enforce Min/Max limits
        if (newWidth < 390) newWidth = 390;
        if (newWidth > 750) newWidth = 750;
        
        // Cập nhật CSS Variable / Update CSS Variable
        document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
        
        // Cập nhật style trực tiếp / Update style directly
        sidebar.style.width = newWidth + 'px';
    });

    // Khi thả chuột ra / When mouse is released
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            sidebar.classList.remove('resizing');
            document.body.style.cursor = '';
            
            // Cập nhật lại bản đồ Leaflet sau 50ms
            // Refresh Leaflet map after 50ms delay
            setTimeout(() => {
                if (window.map) map.invalidateSize();
            }, 50);
        }
    });
}
