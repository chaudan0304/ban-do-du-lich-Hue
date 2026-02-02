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
  
  // Category Chips
  const catButtons = document.querySelectorAll(".scroll-menu .chip");
  catButtons.forEach(btn => {
      btn.addEventListener("click", function() {
          let cat = this.innerText.trim();
          // Map "Tất cả" -> "All" logic
          if (cat === "Tất cả") cat = "All";
          
          if(typeof filterData === 'function') {
              filterData(cat, this);
          }
      });
  });

  // 4. Load Initial Data
  if(typeof loadLocations === 'function') {
      loadLocations("All");
  }
  
  console.log("Client App Ready ✅");
});
