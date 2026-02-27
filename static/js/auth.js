// ============================================================================
// XỬ LÝ XÁC THỰC NGƯỜI DÙNG / AUTHENTICATION LOGIC
//
// Mô tả / Description:
//   Quản lý toàn bộ luồng xác thực: đăng nhập, đăng ký, đăng xuất,
//   đặt lại mật khẩu, và kiểm tra quyền admin.
//   Manages the entire authentication flow: login, register, logout,
//   password reset, and admin access checks.
//
// Nội dung / Contents:
//   - checkLoginStatus()       → Kiểm tra phiên đăng nhập hiện tại / Check current login session
//   - fetchUserActivity()      → Đồng bộ danh sách "đã thích" / Sync liked locations list
//   - showLoggedView()         → Giao diện khi đã đăng nhập / Logged-in UI state
//   - showGuestView()          → Giao diện khách chưa đăng nhập / Guest UI state
//   - openAuthModal/closeAuth  → Mở/đóng modal xác thực / Open/close auth modal
//   - switchTab()              → Chuyển tab Login ↔ Register / Switch Login ↔ Register tab
//   - handleLogin()            → Gọi API đăng nhập / Call login API
//   - handleRegister()         → Gọi API đăng ký / Call register API
//   - handleLogout()           → Đăng xuất với xác nhận / Logout with confirmation
//   - Password Reset flow      → Xác minh tài khoản + đổi mật khẩu / Verify account + change password
//   - checkAdminAccess()       → Kiểm tra quyền admin (UI only) / Check admin access (UI only)
//
// Phụ thuộc / Dependencies:
//   - utils.js      → currentUser, userLikedSet, apiFetch(), showNotification()
//   - recommend.js  → analyzeUser() (gọi sau khi đăng nhập / called after login)
//   - profile.js    → openUserProfile()
// ============================================================================

// ── TRẠNG THÁI / STATE ──
// currentUser được khai báo trong utils.js / currentUser is declared in utils.js

// ── KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP / CHECK LOGIN STATUS ──
// Mục đích: Gọi API /api/current_user để xác định phiên đăng nhập hiện tại (dựa trên session cookie).
//           Nếu đã đăng nhập → hiện giao diện logged, nếu chưa → hiện giao diện khách.
// Purpose:  Calls /api/current_user to determine current login session (via session cookie).
//           If logged in → show logged UI, if not → show guest UI.
async function checkLoginStatus() {
  try {
    const res = await apiFetch("/api/current_user");
    if (res.is_logged_in) {
      currentUser = { username: res.username, role: res.role, fullname: res.fullname };
      // 1. Tải danh sách "đã thích" để đồng bộ nút Like trên bản đồ
      //    Load "liked" list to sync Like buttons on map
      await fetchUserActivity(); 
      // 2. Hiện giao diện đã đăng nhập / Show logged-in UI
      showLoggedView(res.fullname || res.username, res.username);
    } else {
      currentUser = null;
      userLikedSet.clear(); // Xóa state local nếu chưa login / Clear local state if not logged in
      showGuestView();
    }
  } catch (e) {
    console.error("Login check failed:", e);
    showGuestView();
  }
}

// ── ĐỒNG BỘ HOẠT ĐỘNG NGƯỜI DÙNG / SYNC USER ACTIVITY ──
// Mục đích: Tải danh sách địa điểm đã thích của user từ server để đồng bộ userLikedSet.
//           Giúp các nút "Thích" trên bản đồ hiển thị đúng trạng thái.
// Purpose:  Fetches user's liked locations from server to sync userLikedSet.
//           Ensures "Like" buttons on the map display the correct state.
async function fetchUserActivity() {
    try {
        // Gọi API lấy likes & reviews / Call API to get likes & reviews
        const res = await apiFetch("/api/user/activity");
        if (res.success && Array.isArray(res.likes)) {
            // Cập nhật userLikedSet toàn cục / Update global userLikedSet
            userLikedSet = new Set(res.likes.map(l => l.name));
            console.log("Synced user likes:", userLikedSet.size);
        }
    } catch (e) {
        console.warn("Failed to sync user activity:", e);
    }
}

// ── CHUYỂN ĐỔI GIAO DIỆN / VIEW SWITCHERS ──

// --- Giao diện khi đã đăng nhập / Logged-in view ---
// Mục đích: Cập nhật header hiển thị tên user, nút admin (nếu có), và nút đăng xuất.
//           Ẩn banner đăng nhập cho khách, kích hoạt phân tích AI.
// Purpose:  Updates header to show user name, admin button (if applicable), and logout button.
//           Hides guest CTA banner, triggers AI analysis.
function showLoggedView(displayName, username) {
  // Ẩn nút đăng nhập / Hide login button
  document.getElementById("header-login-btn").style.display = "none";
  const userInfo = document.getElementById("header-user-info");
  userInfo.style.display = "flex";

  // Kiểm tra quyền admin → hiện nút Dashboard / Check admin role → show Dashboard button
  let btnAdminHTML = "";
  if (currentUser && currentUser.role === "admin") {
     btnAdminHTML = `
      <div class="header-action-btn" onclick="openAdminUserModal()" title="Admin Dashboard">
         <i class="fas fa-cogs"></i>
      </div>
     `;
  }

  // Nút Logout / Logout button
  const btnLogout = `
    <button class="btn-logout-mini" onclick="handleLogout()" title="Đăng xuất">
       <i class="fas fa-sign-out-alt"></i>
    </button>
  `;

  // Render header user info / Render header user info
  userInfo.innerHTML = `
    <i class="fas fa-user-circle" onclick="openUserProfile()" title="Hồ sơ cá nhân / Chỉnh sửa" style="font-size: 28px; color: var(--primary); cursor: pointer; transition: transform 0.2s;"></i>
    <span id="header-username" onclick="openUserProfile()" style="cursor: pointer;" title="Hồ sơ cá nhân">${displayName}</span>
    ${btnAdminHTML}
    ${btnLogout}
  `;

  // Ẩn banner khách, hiện logged view / Hide guest banner, show logged view
  document.getElementById("guest-cta-banner").style.display = "none";
  document.getElementById("logged-view").style.display = "block";
  checkAdminAccess(username);
  
  // Kích hoạt phân tích AI cho user đã đăng nhập (delay 100ms)
  // Trigger AI analysis for logged-in user (100ms delay)
  if(typeof analyzeUser === 'function') {
      setTimeout(() => analyzeUser(true), 100);
  }
}

// --- Giao diện khách chưa đăng nhập / Guest view ---
// Mục đích: Hiện nút đăng nhập, banner CTA, ẩn panel quản trị.
//           Tự động tải Top PageRank cho khách tham khảo.
// Purpose:  Shows login button, CTA banner, hides admin panel.
//           Automatically loads Top PageRank locations for guest reference.
function showGuestView() {
  document.getElementById("header-login-btn").style.display = "flex";
  document.getElementById("header-user-info").style.display = "none";
  document.getElementById("guest-cta-banner").style.display = "flex";
  document.getElementById("logged-view").style.display = "none";
  
  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) adminPanel.style.display = "none";
  
  // Tự động load gợi ý Top PageRank cho khách chưa đăng nhập
  // Auto-load Top PageRank recommendations for unauthenticated guests
  if (typeof loadGuestRecommendations === 'function') {
      loadGuestRecommendations();
  }
}


// ── XỬ LÝ MODAL XÁC THỰC / AUTH MODAL HANDLERS ──

// Mở modal xác thực (đăng nhập/đăng ký)
// Open authentication modal (login/register)
function openAuthModal() {
  document.getElementById("authModal").classList.add("active");
  // Enter đã được xử lý bởi form onsubmit trong HTML, không cần thêm onkeyup
  // Enter is handled by form onsubmit in HTML, no extra onkeyup needed
}

// Đóng modal xác thực / Close authentication modal
function closeAuthModal() {
  document.getElementById("authModal").classList.remove("active");
}

// Chuyển tab giữa Đăng nhập ↔ Đăng ký / Switch tab between Login ↔ Register
// Tham số / Parameter: tab — 'login' hoặc 'register' / 'login' or 'register'
function switchTab(tab) {
  const tabs = document.querySelectorAll("#authModal .tab-btn");
  if(tabs.length < 2) return; // Guard clause

  tabs.forEach((t) => t.classList.remove("active"));
  
  // Ẩn tất cả forms / Hide all forms
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("registerForm").style.display = "none";

  if (tab === "login") {
    tabs[0].classList.add("active");
    document.getElementById("loginForm").style.display = "block";
  } else {
    tabs[1].classList.add("active");
    document.getElementById("registerForm").style.display = "block";
  }
}

// ── ĐĂNG NHẬP / ĐĂNG KÝ / ĐĂNG XUẤT API ──
// LOGIN / REGISTER / LOGOUT API

// --- Đăng nhập / Login ---
// Lưu ý: Dùng fetch() trực tiếp thay vì apiFetch() vì /api/login trả 401 khi sai mật khẩu
//         là hành vi bình thường, không nên hiện modal "Phiên hết hạn".
// Note:   Uses raw fetch() instead of apiFetch() because /api/login returns 401 for wrong
//         password which is normal behavior, should NOT show "Session expired" modal.
async function handleLogin() {
  const user = document.getElementById("loginUser").value;
  const pass = document.getElementById("loginPass").value;
  if (!user || !pass) return showNotification({ type: 'error', title: 'Thiếu thông tin', message: 'Vui lòng điền đủ thông tin!' });

  try {
    const raw = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass }),
    });
    const res = await raw.json();

    if (res.success) {
      closeAuthModal();
      checkLoginStatus(); // Reload session & UI
      
      showNotification({
          type: "success",
          title: "Đăng nhập thành công",
          message: `Chào mừng trở lại, ${res.fullname || res.username}!`
      });
    } else {
      showNotification({
          type: "error",
          title: "Lỗi đăng nhập",
          message: res.error || "Sai tên đăng nhập hoặc mật khẩu"
      });
    }
  } catch (e) {
    console.error(e);
    showNotification({
        type: "error",
        title: "Lỗi kết nối",
        message: "Không thể kết nối đến máy chủ."
    });
  }
}

// --- Đăng ký / Register ---
// Sau khi đăng ký thành công, tự động điền username/password vào form đăng nhập
// và chuyển sang tab Login để user đăng nhập luôn.
// After successful registration, auto-fills username/password into login form
// and switches to Login tab for the user to log in immediately.
async function handleRegister() {
  const user = document.getElementById("regUser").value.trim();
  const pass = document.getElementById("regPass").value.trim();

  if (!user || !pass) {
    showNotification({
        type: "error",
        title: "Thiếu thông tin",
        message: "Vui lòng nhập tên đăng nhập và mật khẩu!"
    });
    return;
  }

  try {
    const res = await apiFetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user,
        password: pass,
      }),
    });

    if (res.success) {
      showNotification({
          type: "success",
          title: "Đăng ký thành công!",
          message: "Hãy đăng nhập để bắt đầu khám phá."
      });
      // Tự động điền tài khoản & mật khẩu vào form đăng nhập
      // Auto-fill credentials into login form
      document.getElementById("loginUser").value = user;
      document.getElementById("loginPass").value = pass;
      switchTab("login");
    } else {
      showNotification({
          type: "error",
          title: "Lỗi đăng ký",
          message: res.error
      });
    }
  } catch (e) {
    showNotification({
        type: "error",
        title: "Lỗi kết nối",
        message: "Không thể kết nối đến máy chủ."
    });
  }
}

// --- Đăng xuất / Logout ---
// Hiện hộp thoại xác nhận trước khi đăng xuất. Sau khi xác nhận, gọi API /api/logout
// và reload trang sau 500ms để reset toàn bộ state.
// Shows a confirmation dialog before logout. After confirmation, calls /api/logout
// and reloads the page after 500ms to reset all state.
async function handleLogout() {
  showNotification({
      type: "question",
      title: "Đăng xuất",
      message: "Bạn có chắc chắn muốn đăng xuất?",
      btnText: "Đồng ý",
      showCancel: true,
      onConfirm: async () => {
          try {
            await apiFetch("/api/logout", { method: "POST" });
            checkLoginStatus();
            // Reload nhẹ để reset map state nếu cần / Light reload to reset map state if needed
            setTimeout(() => location.reload(), 500); 
          } catch (e) {
            console.error(e);
          }
      }
  });
}

// ── ĐẶT LẠI MẬT KHẨU / PASSWORD RESET ──
// Luồng 2 bước / 2-step flow:
//   Bước 1: Nhập username + email → xác minh tài khoản (verifyResetAccount)
//   Step 1: Enter username + email → verify account (verifyResetAccount)
//   Bước 2: Nhập mật khẩu mới → gọi API đổi mật khẩu (handleResetPassword)
//   Step 2: Enter new password → call password change API (handleResetPassword)

// Mở modal đặt lại mật khẩu / Open reset password modal
function openResetPasswordModal() {
  closeAuthModal(); // Đóng modal xác thực trước / Close auth modal first
  document.getElementById("resetPasswordModal").classList.add("active");
  backToResetStep1();
  
  // Hỗ trợ phím Enter cho cả 2 bước / Support Enter key for both steps
  const inputs = document.querySelectorAll("#resetPasswordModal input");
  inputs.forEach(input => {
      input.onkeyup = function(e) {
          if (e.key === "Enter") {
             if (document.getElementById("resetStep1").style.display !== "none") {
                 verifyResetAccount(); // Bước 1 / Step 1
             } else {
                 handleResetPassword(); // Bước 2 / Step 2
             }
          }
      };
  });
}

// Đóng modal đặt lại mật khẩu / Close reset password modal
function closeResetPasswordModal() {
  document.getElementById("resetPasswordModal").classList.remove("active");
}

// Quay lại bước 1 (reset form) / Back to step 1 (reset form)
function backToResetStep1() {
    document.getElementById("resetStep1").style.display = "block";
    document.getElementById("resetStep2").style.display = "none";
    document.getElementById("resetMsg").innerText = "";
    document.getElementById("resetNewPass").value = "";
    if(document.getElementById("resetUsername")) document.getElementById("resetUsername").value = "";
    if(document.getElementById("resetEmail")) document.getElementById("resetEmail").value = "";
}

// Bước 1: Xác minh tài khoản / Step 1: Verify account
// Gửi username + email lên server để kiểm tra. Nếu khớp → chuyển sang bước 2.
// Sends username + email to server to verify. If matched → transitions to step 2.
async function verifyResetAccount() {
    const username = document.getElementById("resetUsername").value;
    const email = document.getElementById("resetEmail").value;
    const msgEl = document.getElementById("resetMsg");

    if (!username || !email) {
        msgEl.innerText = "Vui lòng nhập tên tài khoản và email.";
        msgEl.style.color = "red";
        return;
    }
    
    msgEl.innerText = "Đang kiểm tra...";
    msgEl.style.color = "#4f46e5";

    try {
        const res = await apiFetch("/api/verify-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email }),
        });
        
        if (res.success) {
             // Chuyển sang bước 2: Nhập mật khẩu mới / Switch to step 2: Enter new password
             document.getElementById("resetStep1").style.display = "none";
             document.getElementById("resetStep2").style.display = "block";
             document.getElementById("resetUserDisplay").innerText = username;
             msgEl.innerText = "";
             document.getElementById("resetNewPass").focus();
        } else {
             msgEl.innerText = res.error || "Thông tin không chính xác.";
             msgEl.style.color = "red";
        }
    } catch (e) {
        msgEl.innerText = "Lỗi kết nối.";
        msgEl.style.color = "red";
    }
}

// Bước 2: Gửi mật khẩu mới / Step 2: Submit new password
// Yêu cầu mật khẩu tối thiểu 6 ký tự. Sau khi đổi thành công,
// đóng modal reset và mở lại modal đăng nhập.
// Requires minimum 6-character password. After successful change,
// closes reset modal and reopens login modal.
async function handleResetPassword() {
  const username = document.getElementById("resetUsername").value;
  const email = document.getElementById("resetEmail").value;
  const newPass = document.getElementById("resetNewPass").value;
  const msgEl = document.getElementById("resetMsg");

  if (newPass.length < 6) {
    msgEl.innerText = "Mật khẩu mới phải có ít nhất 6 ký tự.";
    msgEl.style.color = "red";
    return;
  }

  msgEl.innerText = "Đang xử lý...";
  msgEl.style.color = "#4f46e5";

  try {
    const res = await apiFetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, new_password: newPass }),
    });
    
    if (res.success) {
        showNotification({
          type: "success",
          title: "Thành công",
          message: res.message || "Đã đổi mật khẩu thành công!",
          btnText: "Đăng nhập ngay",
        });

        closeResetPasswordModal();
        openAuthModal(); // Mở lại modal đăng nhập / Reopen login modal
    } else {
         msgEl.innerText = res.error || "Lỗi thay đổi mật khẩu.";
         msgEl.style.color = "red";
    }

  } catch (err) {
    msgEl.innerText = err.message || "Lỗi xử lý.";
    msgEl.style.color = "red";
  }
}

// ── KIỂM TRA QUYỀN ADMIN (UI) / ADMIN ACCESS CHECK (UI ONLY) ──
// Lưu ý: Đây chỉ là kiểm tra UI, bảo mật thực sự nằm ở server (API middleware).
// Note:   This is a UI-only check, real security is on the server (API middleware).
// Hàm này giữ lại để tương thích nếu còn nơi nào gọi.
// This function is kept for backward compatibility.
function checkAdminAccess(username) {
    const adminPanel = document.getElementById("admin-panel");
    // Code cũ kiểm tra username == 'admin' cứng, nhưng giờ dùng role từ API
    // Old code hard-checked username == 'admin', now uses role from API
    // Vì checkLoginStatus đã trả về role, ta dùng logic ở showLoggedView để hiển thị nút
    // Since checkLoginStatus returns role, showLoggedView handles button display
    if (username === "admin" && adminPanel) {
        // adminPanel.style.display = "block"; // Giờ dùng nút pop-up / Now uses popup button
    }
}
