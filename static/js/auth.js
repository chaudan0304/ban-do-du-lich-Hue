// ===========================================
// AUTHENTICATION LOGIC
// ===========================================

// --- Trạng thái ---
// currentUser được khai báo trong utils.js

async function checkLoginStatus() {
  try {
    const res = await apiFetch("/api/current_user");
    if (res.is_logged_in) {
      currentUser = { username: res.username, role: res.role, fullname: res.fullname };
      // 1. Load User Activity (Likes) để đồng bộ trạng thái
      await fetchUserActivity(); 
      // 2. Show UI
      showLoggedView(res.fullname || res.username, res.username);
    } else {
      currentUser = null;
      userLikedSet.clear(); // Clear local state nếu chưa login
      showGuestView();
    }
  } catch (e) {
    console.error("Login check failed:", e);
    showGuestView();
  }
}

// Hàm lấy danh sách like của user để đồng bộ state
async function fetchUserActivity() {
    try {
        // Gọi API lấy likes & reviews
        const res = await apiFetch("/api/user/activity");
        if (res.success && Array.isArray(res.likes)) {
            // Cập nhật userLikedSet toàn cục
            userLikedSet = new Set(res.likes.map(l => l.name));
            console.log("Synced user likes:", userLikedSet.size);
        }
    } catch (e) {
        console.warn("Failed to sync user activity:", e);
    }
}

// --- View Switchers ---
function showLoggedView(displayName, username) {
  document.getElementById("header-login-btn").style.display = "none";
  const userInfo = document.getElementById("header-user-info");
  userInfo.style.display = "flex";

  // Check admin
  let btnAdminHTML = "";
  if (currentUser && currentUser.role === "admin") {
     btnAdminHTML = `
      <div class="header-action-btn" onclick="openAdminUserModal()" title="Admin Dashboard">
         <i class="fas fa-cogs"></i>
      </div>
     `;
  }

  // Nút Logout
  const btnLogout = `
    <button class="btn-logout-mini" onclick="handleLogout()" title="Đăng xuất">
       <i class="fas fa-sign-out-alt"></i>
    </button>
  `;

  userInfo.innerHTML = `
    <i class="fas fa-user-circle" onclick="openUserProfile()" title="Hồ sơ cá nhân / Chỉnh sửa" style="font-size: 28px; color: var(--primary); cursor: pointer; transition: transform 0.2s;"></i>
    <span id="header-username" onclick="openUserProfile()" style="cursor: pointer;" title="Hồ sơ cá nhân">${displayName}</span>
    ${btnAdminHTML}
    ${btnLogout}
  `;

  document.querySelector(".search-box").style.display = "none";
  document.getElementById("logged-view").style.display = "block";
  checkAdminAccess(username);
  
  // Trigger AI Analysis for Logged In User
  if(typeof analyzeUser === 'function') {
      setTimeout(() => analyzeUser(true), 100);
  }
}

function showGuestView() {
  document.getElementById("header-login-btn").style.display = "flex";
  document.getElementById("header-user-info").style.display = "none";
  document.querySelector(".search-box").style.display = "block";
  document.getElementById("guest-search-box").style.display = "flex";
  document.getElementById("logged-view").style.display = "none";
  
  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) adminPanel.style.display = "none";
  
  const recArea = document.getElementById("recommendation-area");
  if (recArea) recArea.innerHTML = `<div class="empty-state">...Sẵn sàng phân tích...</div>`;
}


// --- Modal Handlers ---
function openAuthModal() {
  document.getElementById("authModal").classList.add("active");
  
  // Hỗ trợ Enter cho Login
  const loginInputs = document.querySelectorAll("#loginForm input");
  loginInputs.forEach(input => {
      input.onkeyup = function(e) {
          if (e.key === "Enter") handleLogin();
      }
  });

  // Hỗ trợ Enter cho Register
  const registerInputs = document.querySelectorAll("#registerForm input");
  registerInputs.forEach(input => {
      input.onkeyup = function(e) {
          if (e.key === "Enter") handleRegister();
      }
  });
}

function closeAuthModal() {
  document.getElementById("authModal").classList.remove("active");
}

function switchTab(tab) {
  const tabs = document.querySelectorAll("#authModal .tab-btn");
  if(tabs.length < 2) return; // Guard clause

  tabs.forEach((t) => t.classList.remove("active"));
  
  // Ẩn tất cả forms
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

// --- Login / Register / Logout API ---
async function handleLogin() {
  const user = document.getElementById("loginUser").value;
  const pass = document.getElementById("loginPass").value;
  if (!user || !pass) return alert("Vui lòng điền đủ thông tin!");

  try {
    const res = await apiFetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass }),
    });

    if (res.success) {
      closeAuthModal();
      checkLoginStatus();
      
      showNotification({
          type: "success",
          title: "Đăng nhập thành công",
          message: `Chào mừng trở lại, ${res.fullname || res.username}!`
      });
    } else {
      showNotification({
          type: "error",
          title: "Lỗi đăng nhập",
          message: res.error || res.message
      });
    }
  } catch (e) {
    console.error(e);
    alert("Lỗi kết nối login");
  }
}


async function handleRegister() {
  const user = document.getElementById("regUser").value;
  const pass = document.getElementById("regPass").value;
  const email = document.getElementById("regEmail").value;
  const fullname = document.getElementById("regRealName").value || user; // Fallback to username if empty
 

  if (!user || !pass || !email) return alert("Vui lòng điền đủ thông tin!");

  try {
    const res = await apiFetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user,
        password: pass,
        email: email,
        fullname: fullname,
      }),
    });

    if (res.success) {
      alert("Đăng ký thành công! Hãy đăng nhập.");
      switchTab("login");
    } else {
      showNotification({
          type: "error",
          title: "Lỗi đăng ký",
          message: res.error
      });
    }
  } catch (e) {
    alert("Lỗi kết nối register");
  }
}

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
            // Reload nhẹ để reset map state nếu cần
            setTimeout(() => location.reload(), 500); 
          } catch (e) {
            console.error(e);
          }
      }
  });
}

// --- Password Reset ---
function openResetPasswordModal() {
  closeAuthModal(); 
  document.getElementById("resetPasswordModal").classList.add("active");
  backToResetStep1();
  
  // Hỗ trợ Enter
  const inputs = document.querySelectorAll("#resetPasswordModal input");
  inputs.forEach(input => {
      input.onkeyup = function(e) {
          if (e.key === "Enter") {
             if (document.getElementById("resetStep1").style.display !== "none") {
                 verifyResetAccount();
             } else {
                 handleResetPassword();
             }
          }
      };
  });
}

function closeResetPasswordModal() {
  document.getElementById("resetPasswordModal").classList.remove("active");
}

function backToResetStep1() {
    document.getElementById("resetStep1").style.display = "block";
    document.getElementById("resetStep2").style.display = "none";
    document.getElementById("resetMsg").innerText = "";
    document.getElementById("resetNewPass").value = "";
    if(document.getElementById("resetUsername")) document.getElementById("resetUsername").value = "";
    if(document.getElementById("resetEmail")) document.getElementById("resetEmail").value = "";
}

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
        openAuthModal();
    } else {
         msgEl.innerText = res.error || "Lỗi thay đổi mật khẩu.";
         msgEl.style.color = "red";
    }

  } catch (err) {
    msgEl.innerText = err.message || "Lỗi xử lý.";
    msgEl.style.color = "red";
  }
}

// --- Admin Access Check Helper ---
function checkAdminAccess(username) {
    // Basic UI check only, real check is on server
    const adminPanel = document.getElementById("admin-panel");
    // Code cũ kiểm tra username == 'admin' cứng, nhưng giờ dùng role
    // Vì checkLoginStatus đã trả về role, ta dùng logic ở showLoggedView để hiển thị nút
    // Hàm này giữ lại để tương thích nếu còn nơi nào gọi
    if (username === "admin" && adminPanel) {
        // adminPanel.style.display = "block"; // Giờ dùng nút pop-up
    }
}
