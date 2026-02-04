// ===========================================
// MAIN APP ENTRY POINT
// ===========================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing Hue Travel App...");

  // 1. Khởi tạo Map
  if(typeof initMap === 'function') {
      initMap();
  } else {
      console.error("Map module not loaded!");
  }

  // 2. Check Login Status
  if(typeof checkLoginStatus === 'function') {
      await checkLoginStatus();
  }

  // 3. Setup Global Events
  
  // Guest Search Input Enter Key
  const guestInput = document.getElementById("usernameInput");
  if (guestInput) {
      guestInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
              e.preventDefault();
              if(typeof analyzeUser === 'function') analyzeUser(false);
          }
      });
  }

  // Search debounce
  const searchInput = document.getElementById("miniSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
       if(window.searchTimeout) clearTimeout(window.searchTimeout);
       window.searchTimeout = setTimeout(() => {
           if(typeof handleLocalSearch === 'function') handleLocalSearch();
       }, 300);
    });
  }
  
  // 4. Load Initial Data
  if(typeof loadLocations === 'function') {
      loadLocations("All");
  }

  // 5. Setup UI Interactivity
  setupDragScroll();
  setupSidebarResizer();
  
  console.log("Client App Ready ✅");
});

// ===========================================
// UI HELPER FUNCTIONS
// ===========================================

// --- TAB SWITCHING LOGIC (SIDEBAR) ---
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

// Drag Scroll (Kéo thả để cuộn thanh lọc danh mục)
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
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // Chỉ xử lý cuộn ngang
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

// SideBar Resizer
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
