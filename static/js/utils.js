// ===========================================
// UTILITIES & API HELPER
// ===========================================

// Biến global để kiểm tra trạng thái login (sẽ được set từ main.js hoặc auth.js)
let currentUser = null; 

/**
 * Wrapper cho fetch API
 */
async function apiFetch(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (res.status === 401) {
            // Unauthorized -> Show login
            showNotification({
                type: "warning",
                title: "Yêu cầu đăng nhập",
                message: "Phiên đăng nhập hết hạn hoặc bạn chưa đăng nhập.",
                btnText: "Đăng nhập",
                onConfirm: () => openAuthModal()
            });
            throw new Error("Unauthorized");
        }
        return await res.json();
    } catch (e) {
        throw e;
    }
}

/**
 * Hiển thị Notification Modal
 */
function showNotification({ type, title, message, btnText, onConfirm, showCancel, cancelText, onCancel }) {
  const modal = document.getElementById("notificationModal");
  const content = document.getElementById("notif-content");
  const icon = document.getElementById("notif-icon");
  const titleEl = document.getElementById("notif-title");
  const msgEl = document.getElementById("notif-msg");
  
  const btn = document.getElementById("notif-btn");
  const btnCancel = document.getElementById("notif-cancel-btn");

  // 1. Reset lớp màu cũ
  content.className = "modal-content-notification"; 
  
  // 2. Thêm lớp màu mới & Icon
  let iconClass = "fas fa-info";
  if (type === "success") {
    content.classList.add("type-success");
    iconClass = "fas fa-check";
  } else if (type === "error") {
    content.classList.add("type-error");
    iconClass = "fas fa-times";
  } else if (type === "warning") {
    content.classList.add("type-warning");
    iconClass = "fas fa-exclamation";
  } else if (type === "delete" || type === "question") {
    content.classList.add("type-info");
    iconClass = "fas fa-question";
  } else {
    content.classList.add("type-info");
    iconClass = "fas fa-info";
  }
  
  icon.className = iconClass;

  // 3. Cập nhật nội dung
  titleEl.innerText = title || "Thông báo";
  msgEl.innerHTML = message;
  btn.innerText = btnText || "Đóng";

  // 4. Xử lý nút Cancel
  if (showCancel) {
      btnCancel.style.display = "block";
      btnCancel.innerText = cancelText || "Hủy";
      
      const newBtnCancel = btnCancel.cloneNode(true);
      btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
      
      newBtnCancel.onclick = () => {
          modal.classList.remove("active");
          if (onCancel) onCancel();
      };
  } else {
      btnCancel.style.display = "none";
  }

  // 5. Reset event nút chính
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  const closeModal = () => {
    modal.classList.remove("active");
    if (onConfirm) onConfirm();
  };

  newBtn.onclick = closeModal;
  
  // Hiển thị
  modal.classList.add("active");
  
  if (showCancel) {
      if(document.getElementById("notif-cancel-btn")) document.getElementById("notif-cancel-btn").focus(); 
  } else {
      newBtn.focus();
  }
}

// Hàm format thời gian
function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString("vi-VN");
}
