// ============================================================================
// BỘ CÔNG CỤ QUẢN TRỊ / ADMIN TOOLKIT
//
// Mô tả / Description:
//   Chứa tất cả các hàm dành riêng cho admin: thêm/sửa/xóa địa điểm,
//   quản lý người dùng, chạy thuật toán AI, và chọn vị trí trên bản đồ.
//   Contains all admin-only functions: add/edit/delete locations,
//   manage users, run AI algorithms, and map position picker.
//
// Nội dung / Contents:
//   ─ Quản lý địa điểm / Location Management:
//     - openAddModal/closeAddModal     → Mở/đóng modal thêm / Open/close add modal
//     - submitAddLocation()            → Gọi API thêm địa điểm / Call API to add location
//     - openEditModal/closeEditModal   → Mở/đóng modal sửa / Open/close edit modal
//     - submitEditLocation()           → Gọi API cập nhật địa điểm / Call API to update location
//     - deleteLocation()              → Xóa địa điểm (có xác nhận) / Delete location (with confirmation)
//   ─ Dashboard Admin / Admin Dashboard:
//     - openAdminUserModal/closeAdmin  → Mở/đóng modal admin / Open/close admin modal
//     - triggerAI()                    → Chạy thuật toán PageRank & Recommendations / Run PageRank & Recommendations
//     - loadAdminStats()               → Tải thống kê hệ thống / Load system statistics
//     - loadAdminUsersList()           → Tải danh sách người dùng / Load user list
//     - deleteUser()                   → Xóa tài khoản người dùng / Delete user account
//     - viewUserDetails()              → Xem hồ sơ chi tiết user / View detailed user profile
//     - closeUserCommentsModal()       → Đóng modal hồ sơ user / Close user profile modal
//   ─ Chọn vị trí bản đồ / Map Position Picker:
//     - activateMapPicker()            → Bật chế độ chọn vị trí (thêm mới) / Activate picker mode (add)
//     - activateEditMapPicker()        → Bật chế độ chọn vị trí (sửa) / Activate picker mode (edit)
//
// Phụ thuộc / Dependencies:
//   - utils.js  → apiFetch(), showNotification(), escapeHTML()
//   - map.js    → cachedAllLocations, loadLocations(), closeDetail(), currentOpenLoc,
//                 isPickingMode, showDetailFromData()
// ============================================================================

// ══════════════════════════════════════════════════════════
// QUẢN LÝ ĐỊA ĐIỂM / LOCATION MANAGEMENT
// ══════════════════════════════════════════════════════════

// ── MỞ MODAL THÊM ĐỊA ĐIỂM / OPEN ADD LOCATION MODAL ──
// Mục đích: Mở form thêm địa điểm mới và reset tất cả các trường input.
// Purpose:  Opens the add location form and resets all input fields.
function openAddModal() {
  document.getElementById("addModal").classList.add("active");
  // Xóa dữ liệu cũ trong form / Clear old form data
  if(document.getElementById("addName")) document.getElementById("addName").value = "";
  if(document.getElementById("addDesc")) document.getElementById("addDesc").value = "";
  if(document.getElementById("addLat")) document.getElementById("addLat").value = "";
  if(document.getElementById("addLng")) document.getElementById("addLng").value = "";
  if(document.getElementById("addImage")) document.getElementById("addImage").value = "";
}

// Đóng modal thêm / Close add modal
function closeAddModal() {
  document.getElementById("addModal").classList.remove("active");
}

// ── GỬI YÊU CẦU THÊM ĐỊA ĐIỂM / SUBMIT ADD LOCATION ──
// Mục đích: Thu thập dữ liệu từ form, validate, gọi API POST /api/admin/location/add.
//           Sau khi thành công: đóng modal, xóa cache, tải lại danh sách, cập nhật thống kê.
// Purpose:  Collects form data, validates, calls API POST /api/admin/location/add.
//           On success: closes modal, clears cache, reloads list, updates stats.
async function submitAddLocation() {
  const name = document.getElementById("addName").value;
  const cat = document.getElementById("addCategory") ? document.getElementById("addCategory").value : "";
  const desc = document.getElementById("addDesc").value;
  const lat = parseFloat(document.getElementById("addLat").value);
  const lng = parseFloat(document.getElementById("addLng").value);
  const img = document.getElementById("addImage").value;

  // Validation: Tên và tọa độ bắt buộc / Name and coordinates required
  if (!name || isNaN(lat) || isNaN(lng)) {
      showNotification({type: 'warning', message: "Vui lòng nhập tên và tọa độ hợp lệ!"});
      return;
  }

  try {
    const res = await apiFetch("/api/admin/location/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category: cat, description: desc, lat, lng, image: img }),
    });

    if (res.success || !res.error) {
      showNotification({type: 'success', message: "Thêm địa điểm thành công!"});
      closeAddModal();
      // Xóa cache để forced reload / Clear cache for forced reload
      if(typeof cachedAllLocations !== 'undefined') cachedAllLocations = null; 
      if(typeof loadLocations !== 'undefined') loadLocations("All", false);
      loadAdminStats(); // Cập nhật số liệu thống kê / Update statistics
    } else {
      showNotification({type: 'error', message: res.error || "Lỗi không xác định"});
    }
  } catch (e) {
    showNotification({type: 'error', message: "Lỗi kết nối server khi thêm địa điểm"});
  }
}

// ── MỞ MODAL SỬA ĐỊA ĐIỂM / OPEN EDIT LOCATION MODAL ──
// Mục đích: Điền dữ liệu của địa điểm đang mở (currentOpenLoc) vào form sửa.
// Purpose:  Fills the edit form with data from the currently open location (currentOpenLoc).
function openEditModal() {
  if (!currentOpenLoc) return;
  document.getElementById("editModal").classList.add("active");
  // Điền dữ liệu hiện tại / Fill current data
  document.getElementById("editOldName").value = currentOpenLoc.name; // Tên cũ để server nhận diện / Old name for server identification
  document.getElementById("editName").value = currentOpenLoc.name;
  
  if(document.getElementById("editCategory")) {
      document.getElementById("editCategory").value = currentOpenLoc.category;
  }
  
  document.getElementById("editDesc").value = currentOpenLoc.description || "";
  document.getElementById("editLat").value = currentOpenLoc.lat;
  document.getElementById("editLng").value = currentOpenLoc.lng;
  document.getElementById("editImage").value = currentOpenLoc.image || "";
}

// Đóng modal sửa + reset trạng thái chọn vị trí
// Close edit modal + reset map picking state
function closeEditModal() {
  document.getElementById("editModal").classList.remove("active");
  isPickingMode = null;
  if(document.getElementById("map")) document.getElementById("map").style.cursor = "";
}

// ── GỬI YÊU CẦU CẬP NHẬT ĐỊA ĐIỂM / SUBMIT EDIT LOCATION ──
// Mục đích: Thu thập dữ liệu form sửa, gọi API PUT /api/admin/location/update.
//           Sau khi thành công: đóng modal + detail, xóa cache, cập nhật currentOpenLoc.
// Purpose:  Collects edit form data, calls API PUT /api/admin/location/update.
//           On success: closes modal + detail, clears cache, updates currentOpenLoc.
async function submitEditLocation() {
  const old_name = document.getElementById("editOldName").value;
  const name = document.getElementById("editName").value;
  const category = document.getElementById("editCategory") ? document.getElementById("editCategory").value : "";
  const description = document.getElementById("editDesc").value;
  const lat = parseFloat(document.getElementById("editLat").value);
  const lng = parseFloat(document.getElementById("editLng").value);
  const image = document.getElementById("editImage").value;

  try {
    const res = await apiFetch("/api/admin/location/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_name, name, category, description, lat, lng, image }),
    });

    if (res.success || !res.error) {
      showNotification({type: 'success', message: "Cập nhật thành công!"});
      closeEditModal();
      if(typeof closeDetail === 'function') closeDetail(); 
      
      // Xóa cache để forced reload / Clear cache for forced reload
      cachedAllLocations = null; 
      if(typeof loadLocations === 'function') loadLocations("All", false);
      
      // Cập nhật biến currentOpenLoc nếu đang xem địa điểm này
      // Update currentOpenLoc if currently viewing this location
      if (currentOpenLoc && currentOpenLoc.name === old_name) {
          currentOpenLoc.name = name;
          currentOpenLoc.lat = lat;
          currentOpenLoc.lng = lng;
          currentOpenLoc.image = image;
          currentOpenLoc.category = category;
          currentOpenLoc.description = description;
      }
    } else {
        showNotification({type: 'error', message: res.error});
    }
  } catch (e) {
      showNotification({type: 'error', message: "Lỗi kết nối khi cập nhật"});
  }
}

// ── XÓA ĐỊA ĐIỂM / DELETE LOCATION ──
// Mục đích: Hiển thị dialog xác nhận → gọi API DELETE → reload danh sách.
// Purpose:  Shows confirmation dialog → calls DELETE API → reloads list.
async function deleteLocation(name) {
    if(!name && currentOpenLoc) name = currentOpenLoc.name;
    if(!name) return;

    showNotification({
      type: 'warning',
      title: 'Xóa địa điểm',
      message: `Bạn có chắc muốn xóa <b>${name}</b> vĩnh viễn?`,
      btnText: 'Xóa',
      showCancel: true,
      onConfirm: async () => {
         try {
            const res = await apiFetch(`/api/admin/location/delete/${encodeURIComponent(name)}`, { method: "DELETE" });
            if (res.success || !res.error) {
                if(typeof closeDetail === 'function') closeDetail();
                cachedAllLocations = null; 
                if(typeof loadLocations === 'function') loadLocations("All", false);
                showNotification({type: 'success', message: 'Đã xóa địa điểm.'});
                loadAdminStats();
            } else {
                showNotification({type: 'error', message: res.error});
            }
         } catch(e) { 
             showNotification({type: 'error', message: "Lỗi khi xóa địa điểm"});
         }
      }
    });
}

// ══════════════════════════════════════════════════════════
// DASHBOARD QUẢN TRỊ / ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════

// ── MỞ/ĐÓNG MODAL ADMIN / OPEN/CLOSE ADMIN MODAL ──
// Mục đích: Mở modal admin dashboard và tải dữ liệu (danh sách user + thống kê).
// Purpose:  Opens admin dashboard modal and loads data (user list + stats).
function openAdminUserModal() {
  document.getElementById("adminModal").classList.add("active");
  loadAdminUsersList();
  loadAdminStats();
}

function closeAdminModal() {
  document.getElementById("adminModal").classList.remove("active");
}

// ── CHẠY THUẬT TOÁN AI / TRIGGER AI ALGORITHM ──
// Mục đích: Gọi API POST /api/admin/run-algo để cập nhật PageRank scores và recommendations.
//           Hiển thị loading spinner trên nút trong khi chạy.
// Purpose:  Calls API POST /api/admin/run-algo to update PageRank scores and recommendations.
//           Shows loading spinner on button while running.
async function triggerAI() {
  const btn = document.querySelector("#adminModal .btn-ai");
  const originalText = btn ? btn.innerHTML : "";

  if(btn) {
      btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Đang chạy...";
      btn.disabled = true;
  }

  try {
    await apiFetch("/api/admin/run-algo", { method: "POST" });
    showNotification({type: 'success', title: 'Thành công', message: "✅ Đã cập nhật thuật toán PageRank & Recommendations!"});
    loadAdminStats();
  } catch (e) {
    showNotification({type: 'error', message: "Lỗi AI: " + e.message});
  } finally {
    // Khôi phục nút về trạng thái ban đầu / Restore button to original state
    if(btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
  }
}

// ── TẢI THỐNG KÊ HỆ THỐNG / LOAD SYSTEM STATISTICS ──
// Mục đích: Gọi API /api/admin/stats để cập nhật 4 thẻ thống kê:
//           Users, Locations, Likes, Links (quan hệ graph).
// Purpose:  Calls /api/admin/stats to update 4 stat cards:
//           Users, Locations, Likes, Links (graph relationships).
async function loadAdminStats() {
  try {
    const d = await apiFetch("/api/admin/stats");
    if(document.getElementById("stat-user")) document.getElementById("stat-user").innerText = d.user_count;
    if(document.getElementById("stat-loc")) document.getElementById("stat-loc").innerText = d.location_count;
    if(document.getElementById("stat-like")) document.getElementById("stat-like").innerText = d.like_count;
    if(document.getElementById("stat-link")) document.getElementById("stat-link").innerText = d.link_count;
  } catch (e) {}
}

// ── TẢI DANH SÁCH NGƯỜI DÙNG / LOAD USERS LIST ──
// Mục đích: Gọi API /api/admin/users, render bảng danh sách user (trừ admin).
//           Mỗi dòng có số lượt thích, số bình luận, nút xem chi tiết, nút xóa.
// Purpose:  Calls /api/admin/users, renders user table (excluding admin).
//           Each row shows like count, comment count, view detail button, delete button.
// Bảo mật / Security: Gắn event bằng addEventListener (không dùng inline onclick) để tránh XSS
//                     Uses addEventListener (not inline onclick) to prevent XSS
async function loadAdminUsersList() {
  const tbody = document.getElementById("adminUserList");
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">⏳ Đang tải...</td></tr>';
  try {
    const users = await apiFetch("/api/admin/users");
    const filteredUsers = users.filter(u => u.name !== "admin"); // Loại bỏ admin khỏi danh sách / Exclude admin from list
    
    tbody.innerHTML = "";
    filteredUsers.forEach((u) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #eee';
      tr.innerHTML = `
                <td style="padding:10px;">
                    <div style="font-weight:600; color:var(--text-main);">${escapeHTML(u.name)}</div>
                    <div class="admin-view-details" style="font-size:11px; color:var(--text-light); cursor:pointer;">
                        <span style="color:var(--primary); text-decoration: underline;">Xem thông tin chi tiết</span>
                    </div>
                </td>
                <td style="padding:10px">
                    <div style="display:flex; flex-direction:column; gap:4px; font-size:12px;">
                        <span style="color:#e11d48"><i class="fas fa-heart"></i> ${u.liked_count || 0} thích</span>
                        <span style="color:#2563eb"><i class="fas fa-comment"></i> ${u.comment_count || 0} đánh giá</span>
                    </div>
                </td>
                <td style="padding:10px; text-align:right">
                    <div style="display:flex; justify-content:flex-end; gap:6px;">
                        <button class="admin-delete-user-btn" title="Xóa tài khoản" style="background:#fee2e2; color:red; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; transition:all 0.2s;"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
      `;
      // Gắn event an toàn (tránh XSS từ username) / Attach safe events (prevent XSS from username)
      const viewBtn = tr.querySelector('.admin-view-details');
      if (viewBtn) viewBtn.addEventListener('click', () => viewUserDetails(u.name));

      const delBtn = tr.querySelector('.admin-delete-user-btn');
      if (delBtn) delBtn.addEventListener('click', () => deleteUser(u.name));

      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="3" style="color:red">Lỗi tải danh sách</td></tr>';
  }
}

// ── XÓA NGƯỜI DÙNG / DELETE USER ──
// Mục đích: Xác nhận → gọi API DELETE /api/admin/users/:name → cập nhật danh sách.
// Purpose:  Confirms → calls API DELETE /api/admin/users/:name → refreshes list.
function deleteUser(name) {
    showNotification({
        type: 'warning',
        title: 'Xóa tài khoản',
        message: `Xóa user <b>${escapeHTML(name)}</b>?<br>(Hành động không thể hoàn tác)`,
        btnText: 'Xóa',
        showCancel: true,
        onConfirm: async () => {
            try {
                await apiFetch(`/api/admin/users/${name}`, { method: "DELETE" });
                showNotification({
                    type: "success",
                    title: "Xóa thành công",
                    message: `Tài khoản <b>${escapeHTML(name)}</b> đã bị xóa khỏi hệ thống.`,
                    btnText: "Đóng",
                });
                loadAdminUsersList();
                loadAdminStats();
            } catch(e) {
                showNotification({type: 'error', message: 'Lỗi khi xóa người dùng'});
            }
        }
    });
}

// ── XEM HỒ SƠ CHI TIẾT NGƯỜI DÙNG / VIEW USER DETAILS ──
// Mục đích: Tải hồ sơ đầy đủ của user từ API /api/admin/user_profile/:username,
//           hiển thị avatar, thông tin cá nhân, danh sách yêu thích (scroll ngang),
//           và danh sách bình luận/đánh giá.
// Purpose:  Loads full user profile from API /api/admin/user_profile/:username,
//           displays avatar, personal info, liked locations (horizontal scroll),
//           and comments/reviews list.
async function viewUserDetails(username) {
  const modal = document.getElementById("userCommentsModal");
  const list = document.getElementById("userCommentsList");
  const title = document.getElementById("commentUserTitle");
  if(!modal || !list) return;

  const modalHeader = modal.querySelector(".modal-title-fancy");
  if(modalHeader) modalHeader.innerText = "📋 Hồ sơ người dùng";

  title.innerText = `@${username}`;
  list.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Đang tải thông tin...</div>`;
  modal.classList.add("active");

  try {
    const profile = await apiFetch(`/api/admin/user_profile/${username}`);
    if (!profile) {
       list.innerHTML = `<div style="color:red; text-align:center;">Không tìm thấy thông tin user.</div>`;
       return;
    }

    const createdDate = profile.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : 'Không rõ';

    // ── Xây dựng HTML hồ sơ / Build profile HTML ──
    let html = `
      <!-- Thẻ thông tin user / User info card -->
      <div style="background: linear-gradient(to right, #f8fafc, #f1f5f9); padding: 16px; border-radius: 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 16px; border: 1px solid #e2e8f0;">
          <div style="width: 60px; height: 60px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--primary); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <i class="fas fa-user"></i>
          </div>
          <div>
            <div style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 2px;">${profile.fullname || profile.name}</div>
            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px;">@${profile.name}</div>
            ${profile.email ? `<div style="font-size: 12px; color: var(--text-light); margin-bottom: 6px;"><i class="fas fa-envelope"></i> ${profile.email}</div>` : ''}
            <div style="font-size: 11px; color: var(--text-light); display: flex; gap: 12px; align-items:center;">
                <span><i class="far fa-calendar-alt"></i> ${createdDate}</span>
                <span style="color:${profile.role==='admin'?'var(--danger)':'var(--info)'}; font-weight:600; text-transform:uppercase; font-size:10px; border:1px solid currentColor; padding:0 4px; border-radius:4px;">${profile.role || 'user'}</span>
            </div>
          </div>
      </div>

      <!-- Thẻ thống kê / Stats cards -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
          <div style="background: #fff1f2; padding: 12px; border-radius: 8px; border: 1px solid #fecdd3; text-align: center;">
              <div style="font-size: 20px; font-weight: 800; color: #e11d48;">${profile.liked_count}</div>
              <div style="font-size: 11px; color: #9f1239; font-weight: 600;">ĐỊA ĐIỂM ĐÃ THÍCH</div>
          </div>
          <div style="background: #eff6ff; padding: 12px; border-radius: 8px; border: 1px solid #bfdbfe; text-align: center;">
              <div style="font-size: 20px; font-weight: 800; color: #2563eb;">${profile.comment_count}</div>
              <div style="font-size: 11px; color: #1e40af; font-weight: 600;">BÌNH LUẬN</div>
          </div>
      </div>

      <!-- Danh sách yêu thích (cuộn ngang) / Liked locations (horizontal scroll) -->
      <div style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 10px; text-transform: uppercase;">
        <i class="fas fa-heart"></i> Danh sách yêu thích
      </div>
      <div style="margin-bottom: 20px;">
         ${
            (!profile.liked_locations || profile.liked_locations.length === 0) 
            ? `<div style="text-align:center; padding:15px; color:#94a3b8; font-size:12px; background: #f8fafc; border:1px dashed #e2e8f0; border-radius:8px;">Chưa thích địa điểm nào</div>`
            : `<div id="admin-liked-locations-scroll" style="display:flex; overflow-x:auto; gap:10px; padding-bottom:5px; scrollbar-width:thin;">` + 
              profile.liked_locations.map(l => `
               <div class="admin-liked-card" data-loc-name="${escapeHTML(l.name)}" 
                    title="${escapeHTML(l.name)}"
                    style="min-width:100px; width:100px; cursor:pointer; background:white; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0; transition:transform 0.2s;">
                  <div style="height:70px; width:100%; background:#f1f5f9;">
                      <img src="${l.image || ''}" loading="lazy" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='/static/images/no-image.png'">
                  </div>
                  <div style="padding:6px;">
                      <div style="font-size:11px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text-main);">${escapeHTML(l.name)}</div>
                  </div>
               </div>
              `).join("") + `</div>`
         }
      </div>

      <!-- Bình luận & Đánh giá / Comments & Reviews -->
      <div style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 10px; text-transform: uppercase;">
        <i class="fas fa-comment-dots"></i> Bình luận & Đánh giá
      </div>
      <div style="margin-bottom: 10px;">
         ${
            (!profile.reviews || profile.reviews.length === 0) 
            ? `<div style="text-align:center; padding:15px; color:#94a3b8; font-size:12px; background: #f8fafc; border:1px dashed #e2e8f0; border-radius:8px;">Chưa có bình luận nào</div>`
            : profile.reviews.map(r => {
                const stars = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
                const reviewDate = r.time ? new Date(r.time).toLocaleDateString('vi-VN') : '';
                return `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <div style="font-weight: 600; font-size: 13px; color: var(--text-main);">
                            <i class="fas fa-map-marker-alt" style="color: var(--primary); margin-right: 4px;"></i>${r.location}
                        </div>
                        <div style="font-size: 11px; color: var(--text-light);">${reviewDate}</div>
                    </div>
                    <div style="color: #f59e0b; font-size: 13px; letter-spacing: 2px; margin-bottom: 4px;">${stars}</div>
                    ${r.comment ? `<div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; background: white; padding: 8px 10px; border-radius: 6px; border: 1px solid #f1f5f9;">${r.comment}</div>` : ''}
                </div>`;
              }).join("")
         }
      </div>
    `;
    list.innerHTML = html;

    // Gắn event cho liked location cards (tránh inline onclick)
    // Attach events to liked location cards (avoiding inline onclick)
    list.querySelectorAll('.admin-liked-card[data-loc-name]').forEach(card => {
        card.addEventListener('click', () => {
            if (typeof showDetailFromData === 'function') {
                showDetailFromData(card.dataset.locName);
            }
        });
    });
  } catch (err) {
    list.innerHTML = `<div style="color:red; text-align:center;">Lỗi tải hồ sơ: ${err.message}</div>`;
  }
}

// Đóng modal hồ sơ user / Close user profile modal
function closeUserCommentsModal() {
  const modal = document.getElementById("userCommentsModal");
  if(modal) modal.classList.remove("active");
}

// ══════════════════════════════════════════════════════════
// CHỌN VỊ TRÍ TRÊN BẢN ĐỒ / MAP POSITION PICKER
// ══════════════════════════════════════════════════════════

// ── CHẾ ĐỘ CHỌN VỊ TRÍ (THÊM MỚI) / PICKER MODE (ADD) ──
// Mục đích: Bật chế độ chọn vị trí trên bản đồ khi thêm địa điểm mới.
//           Đóng modal thêm & admin, đổi cursor thành crosshair.
//           Khi user click bản đồ → map.on("click") trong initMap() sẽ xử lý.
// Purpose:  Activates map position picker for adding new locations.
//           Closes add & admin modals, changes cursor to crosshair.
//           When user clicks map → map.on("click") in initMap() handles it.
function activateMapPicker() {
  closeAddModal();
  closeAdminModal();
  isPickingMode = "add";

  showNotification({
    type: "success",
    title: "Chế độ chọn vị trí",
    message: "Hãy click chuột vào điểm bạn muốn chọn trên bản đồ.",
    btnText: "Đóng",
  });

  if(document.getElementById("addLat")) document.getElementById("addLat").value = "";
  if(document.getElementById("addLng")) document.getElementById("addLng").value = "";
  if(document.getElementById("map")) document.getElementById("map").style.cursor = "crosshair";
}

// ── CHẾ ĐỘ CHỌN VỊ TRÍ (SỬA) / PICKER MODE (EDIT) ──
// Mục đích: Tương tự activateMapPicker nhưng cho chế độ sửa.
//           Đóng modal sửa, đổi cursor, chờ user click bản đồ.
// Purpose:  Similar to activateMapPicker but for edit mode.
//           Closes edit modal, changes cursor, waits for user map click.
function activateEditMapPicker() {
  if(document.getElementById("editModal")) document.getElementById("editModal").classList.remove("active");
  isPickingMode = "edit";

  showNotification({
    type: "info",
    title: "Chọn vị trí mới",
    message: "Click vào vị trí mới trên bản đồ để cập nhật.",
    btnText: "Đóng",
  });

  if(document.getElementById("editLat")) document.getElementById("editLat").value = "";
  if(document.getElementById("editLng")) document.getElementById("editLng").value = "";
  if(document.getElementById("map")) document.getElementById("map").style.cursor = "crosshair";
}
