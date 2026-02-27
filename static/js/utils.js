// ============================================================================
// TIỆN ÍCH & HÀM GỌI API / UTILITIES & API HELPER
//
// Mô tả / Description:
//   File chứa các biến toàn cục và hàm tiện ích dùng chung cho toàn bộ ứng dụng.
//   Contains global variables and shared utility functions used across the app.
//
// Nội dung / Contents:
//   - currentUser, userLikedSet → Biến trạng thái đăng nhập / Login state variables
//   - escapeHTML()             → Chống XSS khi chèn HTML / XSS prevention for innerHTML
//   - apiFetch()               → Wrapper gọi API có xử lý 401 / Fetch wrapper with 401 handling
//   - showNotification()       → Hiển thị modal thông báo / Display notification modal
//   - formatTime()             → Định dạng thời gian locale / Format timestamp to locale string
//
// Được sử dụng bởi / Used by:
//   Tất cả các file JS khác (auth.js, map.js, admin.js, profile.js, ...)
//   All other JS files depend on this module.
// ============================================================================

// ── BIẾN TOÀN CỤC / GLOBAL VARIABLES ──
// currentUser: Lưu thông tin người dùng đang đăng nhập (username, role, fullname)
//              Stores the currently logged-in user info (set by auth.js)
// userLikedSet: Tập hợp tên các địa điểm user đã thích, dùng để đồng bộ trạng thái nút "Thích"
//               Set of location names the user has liked, used to sync "Like" button states
let currentUser = null; 
let userLikedSet = new Set(); 

// ── HÀM THOÁT KÝ TỰ HTML / HTML ESCAPE FUNCTION ──
// Mục đích: Ngăn chặn tấn công XSS bằng cách chuyển đổi ký tự đặc biệt HTML
//           (<, >, &, ", ') thành dạng entity an toàn trước khi chèn vào innerHTML.
// Purpose:  Prevents XSS attacks by converting special HTML characters
//           into safe entity representations before inserting into innerHTML.
// Cách hoạt động: Tạo một thẻ div tạm, gán text vào textContent (tự động escape),
//                 rồi lấy lại qua innerHTML (đã được escape an toàn).
// How it works:   Creates a temporary div, assigns text to textContent (auto-escapes),
//                 then retrieves via innerHTML (safely escaped).
function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// ── HÀM GỌI API / API FETCH WRAPPER ──
// Mục đích: Bọc (wrap) hàm fetch() gốc, thêm xử lý tự động cho HTTP 401 (Unauthorized).
//           Khi nhận mã 401, hiển thị modal yêu cầu đăng nhập thay vì fail im lặng.
// Purpose:  Wraps the native fetch(), adding automatic handling for HTTP 401 (Unauthorized).
//           When a 401 is received, displays a login prompt modal instead of silently failing.
// Tham số / Parameters:
//   - url:     Đường dẫn API cần gọi / API endpoint to call
//   - options: Tùy chọn fetch (method, headers, body, ...) / Fetch options (method, headers, body, ...)
// Trả về / Returns: Parsed JSON response
// Lưu ý / Note: Không dùng cho /api/login vì endpoint đó trả 401 khi sai mật khẩu (bình thường).
//               Not used for /api/login because that endpoint returns 401 for wrong passwords (expected).
async function apiFetch(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (res.status === 401) {
            // Unauthorized → Hiện modal đăng nhập / Show login modal
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

// ── HÀM HIỂN THỊ THÔNG BÁO / NOTIFICATION MODAL FUNCTION ──
// Mục đích: Hiển thị modal thông báo đa năng (thành công, lỗi, cảnh báo, hỏi xác nhận).
//           Thay thế alert() và confirm() gốc bằng UI đẹp hơn.
// Purpose:  Displays a versatile notification modal (success, error, warning, question).
//           Replaces native alert() and confirm() with a better-looking UI.
// Tham số / Parameters:
//   - type:       Loại thông báo / Notification type: 'success' | 'error' | 'warning' | 'delete'/'question' | 'info'
//   - title:      Tiêu đề / Title (default: "Thông báo")
//   - message:    Nội dung HTML / HTML message content
//   - btnText:    Text nút chính / Main button text (default: "Đóng")
//   - onConfirm:  Callback khi nhấn nút chính / Callback when main button is clicked
//   - showCancel: Hiện nút Hủy / Show cancel button (boolean)
//   - cancelText: Text nút Hủy / Cancel button text (default: "Hủy")
//   - onCancel:   Callback khi nhấn Hủy / Callback when cancel button is clicked
// Kỹ thuật / Technique:
//   Dùng cloneNode() để reset event listener trước khi gán mới — tránh bị gọi callback cũ.
//   Uses cloneNode() to reset event listeners before assigning new ones — prevents stale callbacks.
function showNotification({ type, title, message, btnText, onConfirm, showCancel, cancelText, onCancel }) {
  // Lấy các phần tử DOM của modal thông báo / Get notification modal DOM elements
  const modal = document.getElementById("notificationModal");
  const content = document.getElementById("notif-content");
  const icon = document.getElementById("notif-icon");
  const titleEl = document.getElementById("notif-title");
  const msgEl = document.getElementById("notif-msg");
  
  const btn = document.getElementById("notif-btn");
  const btnCancel = document.getElementById("notif-cancel-btn");

  // Bước 1: Reset lớp CSS màu cũ / Step 1: Reset old color classes
  content.className = "modal-content-notification"; 
  
  // Bước 2: Thêm lớp màu mới & Icon phù hợp theo loại / Step 2: Add new color class & matching icon
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

  // Bước 3: Cập nhật nội dung text / Step 3: Update text content
  titleEl.innerText = title || "Thông báo";
  msgEl.innerHTML = message;
  btn.innerText = btnText || "Đóng";

  // Bước 4: Xử lý nút Cancel (nếu cần) / Step 4: Handle Cancel button (if needed)
  if (showCancel) {
      btnCancel.style.display = "block";
      btnCancel.innerText = cancelText || "Hủy";
      
      // CloneNode để xóa event listener cũ / CloneNode to remove old event listeners
      const newBtnCancel = btnCancel.cloneNode(true);
      btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
      
      newBtnCancel.onclick = () => {
          modal.classList.remove("active");
          if (onCancel) onCancel();
      };
  } else {
      btnCancel.style.display = "none";
  }

  // Bước 5: Reset event nút chính (cloneNode) / Step 5: Reset main button event (cloneNode)
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  const closeModal = () => {
    modal.classList.remove("active");
    if (onConfirm) onConfirm();
  };

  newBtn.onclick = closeModal;
  
  // Hiển thị modal / Show modal
  modal.classList.add("active");
  
  // Focus vào nút phù hợp / Focus on the appropriate button
  if (showCancel) {
      if(document.getElementById("notif-cancel-btn")) document.getElementById("notif-cancel-btn").focus(); 
  } else {
      newBtn.focus();
  }
}

// ── HÀM ĐỊNH DẠNG THỜI GIAN / TIME FORMAT FUNCTION ──
// Mục đích: Chuyển timestamp (ISO string hoặc epoch) sang định dạng ngày giờ Việt Nam.
// Purpose:  Converts a timestamp (ISO string or epoch) to Vietnamese locale date-time format.
// Ví dụ / Example: "2026-02-18T21:14:50Z" → "18/02/2026, 04:14:50"
function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString("vi-VN");
}
