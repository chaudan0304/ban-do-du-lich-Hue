// ============================================================================
// AI PLANNER & LOGIC LỘ TRÌNH / AI PLANNER & ITINERARY LOGIC
//
// Mô tả / Description:
//   Quản lý toàn bộ tính năng lập lộ trình thông minh:
//   nhập liệu → gọi AI sinh lộ trình → hiển thị timeline → chỉnh sửa → lưu/tải.
//   Manages the entire smart itinerary planning feature:
//   input → AI itinerary generation → timeline display → editing → save/load.
//
// Nội dung / Contents:
//   ─ Input Modal (Nhập liệu / Input):
//     - openPlannerInputModal()       → Mở modal nhập, setup logic checkbox
//     - closePlannerInputModal()      → Đóng modal nhập
//     - changePlanDays()              → Tăng/giảm số ngày
//     - submitPlanner()               → Gọi API sinh lộ trình
//   ─ Result Modal (Hiển thị kết quả / Display Results):
//     - openPlannerResultModal()      → Mở modal kết quả
//     - closePlannerResultModal()     → Đóng modal kết quả
//     - renderItinerary()             → Render timeline lộ trình
//   ─ Edit Itinerary (Chỉnh sửa lộ trình / Edit):
//     - removeActivity()              → Xóa hoạt động khỏi lộ trình
//     - replaceActivity()             → Mở modal chọn địa điểm thay thế
//     - confirmReplacement()          → Xác nhận thay thế (kiểm tra trùng lặp)
//     - refreshAISection()            → Đổi batch gợi ý AI trong modal thay thế
//     - createCandidateItem()         → Tạo UI item ứng viên thay thế
//   ─ Save/Load (Lưu & Tải / Save & Load):
//     - saveCurrentItinerary()        → Lưu lộ trình hiện tại
//     - loadUserItinerariesList()     → Tải danh sách lộ trình đã lưu
//     - deleteSavedItinerary()        → Xóa lộ trình đã lưu
//     - viewSavedItinerary()          → Xem lại lộ trình đã lưu
//
// Phụ thuộc / Dependencies:
//   - utils.js    → apiFetch(), showNotification(), escapeHTML(), formatTime()
//   - map.js      → showDetailFromData()
//   - profile.js  → closeUserProfile()
// ============================================================================

// ── BIẾN TRẠNG THÁI / STATE VARIABLE ──
// currentItineraryData: Dữ liệu lộ trình đang hiển thị/chỉnh sửa (mảng các ngày)
//                       Currently displayed/edited itinerary data (array of days)
let currentItineraryData = null;

// ══════════════════════════════════════════════════════════
// MODAL NHẬP LIỆU / INPUT MODAL
// ══════════════════════════════════════════════════════════

// ── MỞ MODAL NHẬP / OPEN INPUT MODAL ──
// Mục đích: Mở form nhập liệu cho AI Planner. Setup logic tương tác giữa
//           checkbox "Chỉ nơi đã thích" và các checkbox sở thích (mutually exclusive).
//           Chỉ setup event listeners 1 lần đầu (dùng window.plannerLogicInited flag).
// Purpose:  Opens AI Planner input form. Sets up interaction logic between
//           "Use Liked Only" checkbox and preference checkboxes (mutually exclusive).
//           Event listeners are set up only once (uses window.plannerLogicInited flag).
// Logic tương tác / Interaction logic:
//   - Chọn "Chỉ nơi đã thích" → Tắt tất cả sở thích / Checking "Use Liked" → Disables all preferences
//   - Chọn bất kỳ sở thích → Tắt "Chỉ nơi đã thích" / Checking any preference → Disables "Use Liked"
function openPlannerInputModal() {
    if (!currentUser) {
        openAuthModal();
        return;
    }
    // Reset số ngày về 1 / Reset days to 1
    document.getElementById("planDays").value = 1;
    document.getElementById("dayDisplay").innerText = "1 Ngày";

    // Setup logic tương tác (chạy 1 lần duy nhất) / Setup interaction logic (runs only once)
    if (!window.plannerLogicInited) {
        const useLikes = document.getElementById("planUseLikes");
        const prefs = document.querySelectorAll("input[name='planPref']");
        
        // 1. Khi chọn "Chỉ nơi đã thích" → Bỏ chọn & Làm mờ tất cả Sở thích
        //    When "Use Liked Only" is checked → Uncheck & Dim all Preferences
        if(useLikes) {
            useLikes.addEventListener("change", function() {
                if(this.checked) {
                    prefs.forEach(p => {
                        p.checked = false;
                        p.parentElement.style.opacity = "0.5";
                        p.parentElement.style.pointerEvents = "none"; // Vô hiệu hóa click / Disable click
                    });
                } else {
                    // Kích hoạt lại / Re-enable
                    prefs.forEach(p => {
                        p.parentElement.style.opacity = "1";
                        p.parentElement.style.pointerEvents = "auto";
                    });
                }
            });
        }

        // 2. Logic ngược lại: Khi chọn bất kỳ Sở thích → Vô hiệu hóa "Chỉ nơi đã thích"
        //    Reverse logic: When any Preference is checked → Disable "Use Liked Only"
        prefs.forEach(p => {
             p.addEventListener("change", function() {
                 const anyChecked = Array.from(prefs).some(cb => cb.checked);
                 if(anyChecked) {
                     useLikes.checked = false;
                     useLikes.disabled = true;
                     useLikes.parentElement.style.opacity = "0.5";
                     useLikes.parentElement.style.pointerEvents = "none";
                 } else {
                     useLikes.disabled = false;
                     useLikes.parentElement.style.opacity = "1";
                     useLikes.parentElement.style.pointerEvents = "auto";
                 }
             });
        });
        
        window.plannerLogicInited = true;
    }

    // Reset state khi mở modal / Reset state when opening modal
    const uL = document.getElementById("planUseLikes");
    if(uL) {
        uL.checked = false;
        uL.disabled = false;
        uL.parentElement.style.opacity = "1";
        uL.parentElement.style.pointerEvents = "auto";

        // Reset tất cả Preferences / Reset all Preferences
        document.querySelectorAll("input[name='planPref']").forEach(p => {
            p.checked = false;
            p.parentElement.style.opacity = "1";
            p.parentElement.style.pointerEvents = "auto";
        });
    }

    document.getElementById("plannerInputModal").classList.add("active");
}

// Đóng modal nhập / Close input modal
function closePlannerInputModal() {
    document.getElementById("plannerInputModal").classList.remove("active");
}

// ── TĂNG/GIẢM SỐ NGÀY / CHANGE PLAN DAYS ──
// Mục đích: Tăng/giảm số ngày lộ trình. Giới hạn 1-5 ngày (demo).
// Purpose:  Increases/decreases itinerary days. Limited to 1-5 days (demo).
function changePlanDays(delta) {
    const input = document.getElementById("planDays");
    const display = document.getElementById("dayDisplay");
    let val = parseInt(input.value) || 1;
    val += delta;
    if (val < 1) val = 1;
    if (val > 5) val = 5; // Giới hạn 5 ngày demo / Limited to 5 days for demo
    input.value = val;
    display.innerText = val + " Ngày";
}

// ── GỬI YÊU CẦU SINH LỘ TRÌNH / SUBMIT PLANNER REQUEST ──
// Mục đích: Thu thập tham số (số ngày, sở thích, dùng liked places) → gọi API POST /api/planner/generate.
//           Hiển thị loading trên nút. Xử lý các loại lỗi khác nhau (no_likes, no_results, unknown).
// Purpose:  Collects parameters (days, preferences, use liked) → calls API POST /api/planner/generate.
//           Shows loading on button. Handles different error types (no_likes, no_results, unknown).
async function submitPlanner() {
    const days = parseInt(document.getElementById("planDays").value) || 1;
    const useLiked = document.getElementById("planUseLikes").checked;
    
    // Lấy danh sách sở thích đã chọn / Get selected preferences list
    const checkboxes = document.querySelectorAll("input[name='planPref']:checked");
    const preferences = Array.from(checkboxes).map(cb => cb.value);

    // Hiển thị loading trên nút / Show loading on button
    const btn = document.querySelector("#plannerInputModal .btn-save-gradient");
    if(btn) {
        var originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang AI tính toán...`;
        btn.disabled = true;
    }

    try {
        const res = await apiFetch("/api/planner/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                days: days,
                preferences: preferences,
                use_liked: useLiked
            })
        });

        if (res.success && res.plan && res.plan.length > 0) {
            // Thành công → đóng modal nhập, render kết quả, mở modal kết quả
            // Success → close input modal, render results, open result modal
            closePlannerInputModal();
            currentItineraryData = res.plan;
            renderItinerary(res.plan);
            openPlannerResultModal();
        } else {
            // Xử lý lỗi theo loại / Handle errors by type
            const errorMsg = res.error || "Không thể tạo lộ trình.";
            const errorType = res.error_type || "unknown";
            
            if (errorType === "no_likes") {
                // User chưa thích địa điểm nào nhưng chọn "Dùng nơi đã thích"
                // User hasn't liked any location but selected "Use Liked"
                showNotification({ 
                    type: 'warning', 
                    message: errorMsg,
                    duration: 5000
                });
            } else if (errorType === "no_results") {
                // Không tìm thấy kết quả phù hợp / No matching results found
                showNotification({ 
                    type: 'info', 
                    message: errorMsg,
                    duration: 4000
                });
            } else {
                showNotification({ type: 'error', message: errorMsg });
            }
        }
    } catch (e) {
        console.error(e);
        showNotification({ type: 'error', message: "Lỗi kết nối AI Planner." });
    } finally {
        // Khôi phục nút / Restore button
        if(btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// ══════════════════════════════════════════════════════════
// MODAL KẾT QUẢ & RENDER / RESULT MODAL & RENDERING
// ══════════════════════════════════════════════════════════

// Mở/đóng modal kết quả / Open/close result modal
function openPlannerResultModal() {
    document.getElementById("plannerResultModal").classList.add("active");
}

function closePlannerResultModal() {
    document.getElementById("plannerResultModal").classList.remove("active");
}

// ── RENDER TIMELINE LỘ TRÌNH / RENDER ITINERARY TIMELINE ──
// Mục đích: Render timeline lộ trình theo từng ngày, mỗi ngày gồm các hoạt động
//           với thời gian, tên, danh mục, mô tả, ảnh, và nút thay thế/xóa.
// Purpose:  Renders itinerary timeline by day, each day contains activities
//           with time, name, category, description, image, and replace/remove buttons.
// Cấu trúc HTML / HTML structure:
//   Day Marker → Activity Node → Circle + Card (time + info + image + edit buttons)
function renderItinerary(plan) {
    const container = document.getElementById("plannerTimeline");
    const summaryTitle = document.getElementById("itineraryTitle");
    if(!container) return;
    container.innerHTML = "";
    
    if (!plan || plan.length === 0) {
        container.innerHTML = `<div class="empty-state">Không tìm thấy lộ trình phù hợp.</div>`;
        return;
    }

    // Cập nhật tiêu đề tổng quan / Update summary title
    if(summaryTitle) summaryTitle.innerText = `Hành trình ${plan.length} ngày`;

    plan.forEach((day, dayIndex) => {
        // Marker phân cách ngày / Day separator marker
        const dayMarker = document.createElement("div");
        dayMarker.className = "day-marker-pill";
        dayMarker.innerText = `Ngày ${day.day}`;
        container.appendChild(dayMarker);

        if (day.activities && day.activities.length > 0) {
             day.activities.forEach((act, actIndex) => {
                const loc = act.location;
                if(!loc) return;
                
                const node = document.createElement("div");
                node.className = "activity-node";
                // Lưu index vào data attribute để tham chiếu khi sửa/xóa
                // Store index in data attribute for reference when editing/removing
                node.dataset.dayIndex = dayIndex;
                node.dataset.actIndex = actIndex;
                
                node.innerHTML = `
                    <div class="activity-circle"></div>
                    <div class="activity-card-fancy">
                        <div class="activity-time-box">
                            <i class="fas fa-camera"></i>
                            <span>${act.time || ''}</span>
                        </div>
                        <div class="activity-main-info">
                            <div class="activity-title-fancy">${escapeHTML(loc.name)}</div>
                            <div class="activity-tag-fancy">${escapeHTML(loc.category || 'Địa điểm')}</div>
                            <div class="activity-desc-fancy">${escapeHTML(loc.description || 'Khám phá địa điểm thú vị tại cố đô Huế.')}</div>
                        </div>
                        <img src="${loc.image}" class="activity-img-fancy" onerror="this.src='/static/images/no-image.png'">
                        <div class="activity-edit-btns">
                            <button class="btn-activity-replace" title="Thay thế địa điểm khác">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                            <button class="btn-activity-remove" title="Xóa khỏi lộ trình">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                `;

                // Gắn event an toàn (tránh XSS từ loc.name) / Attach safe events (prevent XSS from loc.name)
                const locName = loc.name; // Capture trong closure / Capture in closure
                node.querySelector('.activity-main-info').addEventListener('click', () => showDetailFromData(locName));
                node.querySelector('.activity-img-fancy').addEventListener('click', () => showDetailFromData(locName));
                node.querySelector('.btn-activity-replace').addEventListener('click', () => replaceActivity(dayIndex, actIndex));
                node.querySelector('.btn-activity-remove').addEventListener('click', () => removeActivity(dayIndex, actIndex));

                container.appendChild(node);
             });
        } else {
            // Ngày không có hoạt động (nghỉ ngơi) / Day with no activities (rest day)
            const emptyNode = document.createElement("div");
            emptyNode.style.padding = "0 0 30px 60px";
            emptyNode.innerHTML = "<p style='color:#94a3b8; font-size:13px;'>Ngày nghỉ ngơi tự do.</p>";
            container.appendChild(emptyNode);
        }
    });
}

// ══════════════════════════════════════════════════════════
// CHỈNH SỬA LỘ TRÌNH / EDIT ITINERARY
// ══════════════════════════════════════════════════════════

// ── XÓA HOẠT ĐỘNG / REMOVE ACTIVITY ──
// Mục đích: Xóa 1 hoạt động khỏi lộ trình (với dialog xác nhận).
// Purpose:  Removes 1 activity from itinerary (with confirmation dialog).
function removeActivity(dayIndex, activityIndex) {
    if (!currentItineraryData) return;
    
    const activity = currentItineraryData[dayIndex]?.activities[activityIndex];
    if (!activity) return;
    
    const locName = activity.location?.name || "địa điểm này";
    
    showNotification({
        type: 'question',
        title: 'Xóa địa điểm',
        message: `Bạn muốn xóa "${locName}" khỏi lộ trình?`,
        btnText: 'Xóa',
        showCancel: true,
        onConfirm: () => {
            // Xóa từ mảng gốc / Remove from original array
            currentItineraryData[dayIndex].activities.splice(activityIndex, 1);
            renderItinerary(currentItineraryData);
            showNotification({ type: 'success', message: `Đã xóa "${locName}" khỏi lộ trình.` });
        }
    });
}

// ══════════════════════════════════════════════════════════
// MODAL THAY THẾ ĐỊA ĐIỂM / REPLACEMENT MODAL
// ══════════════════════════════════════════════════════════

// ── BIẾN TRẠNG THÁI THAY THẾ / REPLACEMENT STATE VARIABLES ──
let replacementContext = null;   // { day, act } — vị trí cần thay thế / Position to replace
let currentAICandidates = [];    // Danh sách ứng viên từ AI / AI candidate list
let currentAIIndex = 0;         // Index hiện tại trong danh sách (phân trang) / Current index in list (pagination)

// Đóng modal thay thế / Close replacement modal
function closeReplacementModal() {
    const m = document.getElementById("replacementModal");
    if(m) {
        m.classList.remove("active");
        setTimeout(()=> m.style.display="none", 300);
    }
    replacementContext = null;
}

// ── TẠO UI ITEM ỨNG VIÊN / CREATE CANDIDATE ITEM UI ──
// Mục đích: Tạo 1 phần tử DOM cho ứng viên thay thế, với hover effects và nút "Chọn".
// Purpose:  Creates 1 DOM element for a replacement candidate, with hover effects and "Select" button.
// Tham số / Parameters:
//   - cand:    Đối tượng địa điểm ứng viên / Candidate location object
//   - isLiked: true nếu nằm trong danh sách "đã thích" / true if in "liked" list
function createCandidateItem(cand, isLiked = false) {
    const score = (cand.score * 10).toFixed(1);
    const div = document.createElement("div");
    
    // Viền hồng cho liked, viền xám cho AI / Pink border for liked, gray for AI
    const borderColor = isLiked ? "#fbcfe8" : "#e2e8f0"; 
    
    div.style.cssText = `
        display: flex; 
        gap: 15px; 
        padding: 12px; 
        background: white; 
        border: 1px solid ${borderColor}; 
        border-radius: 12px; 
        margin-bottom: 12px; 
        cursor: pointer; 
        transition: all 0.2s ease;
        align-items: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    `;
    
    // Icon theo danh mục / Icon by category
    let catIcon = cand.category === 'Ẩm thực' ? 'fa-utensils' : 'fa-map-marker-alt';
    // Tag "Đã thích" cho liked items / "Liked" tag for liked items
    const tagLabel = isLiked ? `<span style="background:#fce7f3; color:#db2777; padding:2px 8px; border-radius:4px; font-size:11px; margin-right:6px;"><i class="fas fa-heart"></i> Đã thích</span>` : "";

    div.innerHTML = `
        <div style="width: 70px; height: 70px; flex-shrink: 0; position: relative; border-radius: 10px; overflow: hidden;">
            <img src="${cand.image}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/static/images/no-image.png'">
        </div>
        <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${cand.name}
            </div>
            <div style="display: flex; gap: 12px; font-size: 12px; color: #64748b; align-items: center;">
                ${tagLabel}
                <span style="display: flex; align-items: center; gap: 4px; background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">
                    <i class="fas ${catIcon}" style="color: #64748b; font-size: 10px;"></i> ${cand.category || 'Địa điểm'}
                </span>
                <span style="display: flex; align-items: center; gap: 4px; color: #d97706; font-weight: 600;">
                    <i class="fas fa-star" style="font-size: 10px;"></i> AI: ${score}
                </span>
            </div>
            <div style="margin-top: 6px; font-size: 12px; color: #94a3b8; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;">
                ${cand.description || 'Một điểm đến thú vị tại Huế...'}
            </div>
        </div>
        <div style="flex-shrink: 0;">
            <button class="btn-select-cand" style="background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; transition: 0.2s;">
                Chọn
            </button>
        </div>
    `;

    // Hover effects / Hover effects
    div.onmouseover = () => {
        div.style.transform = "translateY(-2px)";
        div.style.boxShadow = "0 8px 12px -3px rgba(0,0,0,0.06)";
        if(!isLiked) div.style.borderColor = "#94a3b8";
        div.querySelector('.btn-select-cand').style.background = "#2563eb";
        div.querySelector('.btn-select-cand').style.color = "white";
    };
    div.onmouseout = () => {
        div.style.transform = "none";
        div.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
        div.style.borderColor = borderColor;
        div.querySelector('.btn-select-cand').style.background = "#eff6ff";
        div.querySelector('.btn-select-cand').style.color = "#2563eb";
    };

    // Click chọn ứng viên / Click to select candidate
    div.onclick = function() { confirmReplacement(cand); };
    return div;
}

// ── LÀM MỚI DANH SÁCH GỢI Ý AI / REFRESH AI SUGGESTIONS ──
// Mục đích: Hiển thị batch tiếp theo (5 items) trong danh sách ứng viên AI.
//           Khi hết danh sách → quay lại đầu.
// Purpose:  Shows next batch (5 items) from AI candidate list.
//           When list is exhausted → wraps back to beginning.
function refreshAISection() {
    const aiContainer = document.getElementById("ai-candidates-list");
    if(!aiContainer) return;
    
    // Animation mờ nhẹ / Slight fade animation
    aiContainer.style.opacity = "0.5";
    
    setTimeout(() => {
        const batchSize = 5;
        let nextBatch = currentAICandidates.slice(currentAIIndex, currentAIIndex + batchSize);
        
        // Quay lại đầu nếu hết / Wrap to beginning if exhausted
        if (nextBatch.length === 0) {
            if(currentAICandidates.length > 0) {
                currentAIIndex = 0;
                nextBatch = currentAICandidates.slice(0, batchSize);
                showNotification({type:'info', message:'Đã quay lại đầu danh sách gợi ý.'});
            }
        }
        
        currentAIIndex += batchSize;
        if (currentAIIndex >= currentAICandidates.length) currentAIIndex = 0; 
    
        aiContainer.innerHTML = "";
        
        if (nextBatch.length > 0) {
            nextBatch.forEach(cand => {
                aiContainer.appendChild(createCandidateItem(cand, false));
            });
        } else {
             aiContainer.innerHTML = `<div style="text-align:center; padding:10px; color:#94a3b8;">Không có gợi ý thêm từ AI.</div>`;
        }
        
        aiContainer.style.opacity = "1";
    }, 200); // Delay 200ms cho animation / 200ms delay for animation
}

// ── MỞ MODAL THAY THẾ (HÀM CHÍNH) / OPEN REPLACEMENT MODAL (MAIN FUNCTION) ──
// Mục đích: Tạo modal thay thế địa điểm với 2 phần: "Đã thích" và "Gợi ý AI".
//           Gọi API /api/planner/suggest-replacement để lấy danh sách ứng viên.
// Purpose:  Creates replacement modal with 2 sections: "Liked" and "AI Suggestions".
//           Calls API /api/planner/suggest-replacement for candidate list.
// Kỹ thuật / Technique:
//   Modal được tạo động (insertAdjacentHTML) thay vì đặt sẵn trong HTML,
//   vì có thể mở nhiều lần và cần fresh state mỗi lần.
//   Modal is created dynamically (insertAdjacentHTML) instead of static HTML,
//   because it may open multiple times and needs fresh state each time.
async function replaceActivity(dayIndex, activityIndex) {
    if (!currentItineraryData) return;
    const activity = currentItineraryData[dayIndex]?.activities[activityIndex];
    if (!activity) return;
    
    // Xóa modal cũ nếu có / Remove old modal if exists
    let existingModal = document.getElementById("replacementModal");
    if (existingModal) existingModal.remove();

    console.log("🛠️ Re-creating Replacement Modal (Dual Section)...");
    
    // Tạo HTML modal động / Create dynamic modal HTML
    const modalHTML = `
    <div class="modal" id="replacementModal" style="z-index: 9990 !important; display:none;">
        <div class="modal-content-fancy" style="max-width: 600px; overflow: hidden; border-radius: 16px;">
            <div style="background: linear-gradient(135deg, #0f766e, #14b8a6); padding: 16px 20px; color: white; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-exchange-alt" style="font-size: 16px;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Chọn địa điểm thay thế</h3>
                        <span style="font-size: 12px; opacity: 0.9;">Ưu tiên sở thích & AI gợi ý</span>
                    </div>
                </div>
                <button onclick="closeReplacementModal()" style="background: transparent; border: none; color: white; opacity: 0.8; font-size: 20px; cursor: pointer;"><i class="fas fa-times"></i></button>
            </div>

            <div class="planner-body" style="padding: 0; background: #f8fafc; display: flex; flex-direction: column; height: 500px;">
                 <div id="replacement-main-content" style="flex: 1; overflow-y: auto; padding: 20px;">
                     <!-- Loading state -->
                     <div id="replacement-loading" style="text-align:center; padding-top: 50px;">
                        <div class="spinner-large" style="margin: 0 auto 15px;"></div>
                        <p style="color:#64748b;">Đang tìm địa điểm phù hợp...</p>
                     </div>

                     <!-- Section: Địa điểm đã thích / Liked locations section -->
                     <div id="section-liked" style="display: none; margin-bottom: 25px;">
                        <div style="font-size: 13px; font-weight: 800; color: #db2777; margin-bottom: 12px; letter-spacing: 0.5px; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-heart"></i> ĐỊA ĐIỂM BẠN ĐÃ THÍCH
                        </div>
                        <div id="liked-candidates-list"></div>
                     </div>

                     <!-- Section: Gợi ý AI / AI suggestions section -->
                     <div id="section-ai" style="display: none;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="font-size: 13px; font-weight: 800; color: #0f766e; letter-spacing: 0.5px; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-robot"></i> GỢI Ý TỪ AI
                            </div>
                            <button onclick="refreshAISection()" style="background: white; border: 1px solid #cbd5e1; font-size: 12px; padding: 4px 10px; border-radius: 6px; cursor: pointer; color: #475569; display: flex; align-items: center; gap: 4px;">
                                <i class="fas fa-sync-alt"></i> Đổi đề xuất
                            </button>
                        </div>
                        <div id="ai-candidates-list"></div>
                     </div>
                 </div>
            </div>
            
            <div style="padding: 12px 20px; background: white; border-top: 1px solid #e2e8f0; text-align: right;">
                <button onclick="closeReplacementModal()" class="btn-cancel">Đóng</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById("replacementModal");
    
    // Hiện modal với animation / Show modal with animation
    modal.style.display = "flex"; 
    setTimeout(() => modal.classList.add("active"), 10);
    
    // Lưu context thay thế / Save replacement context
    replacementContext = { day: dayIndex, act: activityIndex };

    try {
        // Gọi API lấy danh sách ứng viên (liked + AI)
        // Call API for candidate list (liked + AI)
        const res = await apiFetch("/api/planner/suggest-replacement", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                exclude: getUsedLocationNames(), // Loại trừ địa điểm đã dùng / Exclude used locations
                type: activity.type,
                category: activity.location?.category || ""
            })
        });

        // Ẩn loading / Hide loading
        const loading = document.getElementById("replacement-loading");
        if(loading) loading.style.display = "none";
        
        if (res.success) {
            // 1. RENDER SECTION ĐÃ THÍCH / RENDER LIKED SECTION
            if (res.liked && res.liked.length > 0) {
                document.getElementById("section-liked").style.display = "block";
                const likedContainer = document.getElementById("liked-candidates-list");
                res.liked.forEach(cand => {
                    likedContainer.appendChild(createCandidateItem(cand, true));
                });
            }

            // 2. SETUP SECTION AI / SETUP AI SECTION
            if (res.ai && res.ai.length > 0) {
                document.getElementById("section-ai").style.display = "block";
                currentAICandidates = res.ai; // Lưu toàn cục / Save globally
                currentAIIndex = 0; // Reset index phân trang / Reset pagination index
                refreshAISection(); // Render batch đầu tiên / Render first batch
            } else if (!res.liked || res.liked.length === 0) {
                // Cả 2 section đều rỗng / Both sections empty
                document.getElementById("replacement-main-content").innerHTML = `
                    <div style="text-align:center; padding: 40px 20px;">
                        <img src="https://cdn-icons-png.flaticon.com/512/7486/7486754.png" style="width: 60px; opacity: 0.5; margin-bottom: 10px;">
                        <p style="color:#64748b;">Không tìm thấy địa điểm nào phù hợp.</p>
                    </div>`;
            }
        } else {
             if(loading) loading.innerText = "Lỗi khi tải dữ liệu.";
        }
    } catch (e) {
        console.error(e);
        if(loading) loading.innerText = "Lỗi kết nối server.";
    }
}

// ── XÁC NHẬN THAY THẾ / CONFIRM REPLACEMENT ──
// Mục đích: Kiểm tra trùng lặp → nếu trùng thì hỏi xác nhận → thực hiện thay thế.
// Purpose:  Checks for duplicates → if duplicate asks for confirmation → performs replacement.
function confirmReplacement(newLocation) {
    if (!replacementContext || !currentItineraryData) return;
    
    const { day, act } = replacementContext;

    // Kiểm tra index hợp lệ / Validate index bounds
    if(day < 0 || day >= currentItineraryData.length || 
       act < 0 || act >= currentItineraryData[day].activities.length) {
         console.error("❌ Index out of bounds");
         return;
    }

    const oldLocName = currentItineraryData[day].activities[act].location.name;
    const newLocName = newLocation.name;

    // ── KIỂM TRA TRÙNG LẶP / DUPLICATE CHECK ──
    // Kiểm tra xem địa điểm mới đã tồn tại ở đâu đó trong lịch trình chưa (trừ vị trí hiện tại)
    // Check if new location already exists somewhere in the itinerary (excluding current position)
    let isDuplicate = false;
    for (let d = 0; d < currentItineraryData.length; d++) {
        const activities = currentItineraryData[d].activities || [];
        for (let a = 0; a < activities.length; a++) {
            if (d === day && a === act) continue; // Bỏ qua vị trí đang sửa / Skip current position
            
            if (activities[a].location && activities[a].location.name === newLocName) {
                isDuplicate = true;
                break;
            }
        }
        if (isDuplicate) break;
    }

    if (isDuplicate) {
        // Nếu trùng → hiện dialog cảnh báo / If duplicate → show warning dialog
        showNotification({
            type: 'question',
            title: 'Cảnh báo trùng lặp',
            message: `Địa điểm "${newLocName}" đã có trong lịch trình. Bạn vẫn muốn chọn?`,
            btnText: 'Vẫn chọn',
            showCancel: true,
            onConfirm: () => {
                _doReplacement(day, act, oldLocName, newLocation);
            }
        });
        return; // Chờ user xác nhận / Wait for user confirmation
    }

    // Không trùng → thực hiện luôn / No duplicate → proceed immediately
    _doReplacement(day, act, oldLocName, newLocation);
}

// ── HÀM THỰC HIỆN THAY THẾ / REPLACEMENT EXECUTION HELPER ──
// Tách ra hàm riêng để dùng chung cho cả trường hợp xác nhận duplicate và không duplicate.
// Separated into standalone function for reuse in both duplicate-confirmed and non-duplicate cases.
function _doReplacement(day, act, oldLocName, newLocation) {
    // Thay thế location trong dữ liệu / Replace location in data
    currentItineraryData[day].activities[act].location = newLocation;
    console.log(`✅ Updated location: ${oldLocName} -> ${newLocation.name}`);
    
    // Render lại timeline / Re-render timeline
    renderItinerary(currentItineraryData);
    
    // Đóng modal + thông báo / Close modal + notification
    setTimeout(() => {
        closeReplacementModal();
        showNotification({ 
            type: 'success', 
            message: `Đã thay "${oldLocName}" bằng "${newLocation.name}"` 
        });
    }, 100);
}

// ── LẤY DANH SÁCH ĐỊA ĐIỂM ĐÃ DÙNG / GET USED LOCATION NAMES ──
// Mục đích: Thu thập tên tất cả địa điểm trong lộ trình hiện tại.
//           Dùng để gửi lên API suggest-replacement → loại trừ trùng lặp.
// Purpose:  Collects names of all locations in current itinerary.
//           Sent to suggest-replacement API → excludes duplicates.
function getUsedLocationNames() {
    if (!currentItineraryData) return [];
    
    const names = [];
    currentItineraryData.forEach(day => {
        if (day.activities) {
            day.activities.forEach(act => {
                if (act.location?.name) {
                    names.push(act.location.name);
                }
            });
        }
    });
    return names;
}

// ══════════════════════════════════════════════════════════
// LƯU & TẢI LỘ TRÌNH / SAVE & LOAD ITINERARY
// ══════════════════════════════════════════════════════════

// ── LƯU LỘ TRÌNH HIỆN TẠI / SAVE CURRENT ITINERARY ──
// Mục đích: Hỏi tên lộ trình (prompt) → gọi API POST /api/itineraries để lưu.
// Purpose:  Asks for itinerary name (prompt) → calls API POST /api/itineraries to save.
async function saveCurrentItinerary() {
    if (!currentItineraryData) return;
    try {
        const dayCount = currentItineraryData.length;
        const defaultName = `Lịch trình Huế ${dayCount} Ngày - ${new Date().toLocaleDateString('vi-VN')}`;
        
        // Hỏi tên (dùng prompt gốc — nên chuyển sang modal custom)
        // Ask for name (uses native prompt — should migrate to custom modal)
        const name = prompt("Đặt tên cho lịch trình:", defaultName);
        if (!name) return;

        const res = await apiFetch("/api/itineraries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                itinerary: {
                    title: name,
                    plan: currentItineraryData
                }
            })
        });

        if (res.success) {
            showNotification({ type: 'success', message: "Đã lưu lịch trình thành công!" });
        } else {
            showNotification({ type: 'error', message: res.error });
        }
    } catch (e) {
        showNotification({ type: 'error', message: "Lỗi lưu lịch trình" });
    }
}

// ── TẢI DANH SÁCH LỘ TRÌNH ĐÃ LƯU / LOAD SAVED ITINERARIES LIST ──
// Mục đích: Gọi API GET /api/itineraries, render danh sách với nút Xem/Xóa.
// Purpose:  Calls API GET /api/itineraries, renders list with View/Delete buttons.
async function loadUserItinerariesList() {
    try {
        const res = await apiFetch("/api/itineraries");
        const listContainer = document.getElementById("saved-itineraries-list");
        if(!listContainer) return;
        
        listContainer.innerHTML = "";
        if (res && res.length > 0) {
            res.forEach(it => {
                const div = document.createElement("div");
                div.className = "saved-itinerary-item"; 
                div.innerHTML = `
                    <div style="flex:1">
                        <strong>${escapeHTML(it.name || '')}</strong><br>
                        <small>${formatTime(it.created_at)}</small>
                    </div>
                `;
                // Nút Xem — dùng addEventListener (tránh XSS) / View button — uses addEventListener (XSS prevention)
                const btnView = document.createElement('button');
                btnView.className = 'btn-icon';
                btnView.innerHTML = '<i class="fas fa-eye"></i>';
                btnView.addEventListener('click', () => viewSavedItinerary(it.id));
                div.appendChild(btnView);

                // Nút Xóa — dùng addEventListener (tránh XSS) / Delete button — uses addEventListener (XSS prevention)
                const btnDel = document.createElement('button');
                btnDel.className = 'btn-icon delete';
                btnDel.innerHTML = '<i class="fas fa-trash"></i>';
                btnDel.addEventListener('click', () => deleteSavedItinerary(it.id));
                div.appendChild(btnDel);

                listContainer.appendChild(div);
            });
        } else {
            listContainer.innerHTML = "<p>Chưa có lịch trình nào được lưu.</p>";
        }
    } catch (e) { console.error(e); }
}

// ── XÓA LỘ TRÌNH ĐÃ LƯU / DELETE SAVED ITINERARY ──
// Mục đích: Xác nhận → gọi API DELETE /api/itineraries/:id → reload danh sách.
// Purpose:  Confirms → calls API DELETE /api/itineraries/:id → reloads list.
function deleteSavedItinerary(id) {
    showNotification({
        type: 'question',
        title: 'Xóa lịch trình',
        message: 'Bạn có chắc muốn xóa lịch trình này?',
        btnText: 'Xóa',
        showCancel: true,
        onConfirm: async () => {
            try {
                await apiFetch(`/api/itineraries/${id}`, { method: "DELETE" });
                loadUserItinerariesList();
                showNotification({ type: 'success', message: 'Đã xóa lịch trình.' });
            } catch(e) {
                showNotification({ type: 'error', message: 'Lỗi khi xóa lịch trình.' });
            }
        }
    });
}

// ── XEM LẠI LỘ TRÌNH ĐÃ LƯU / VIEW SAVED ITINERARY ──
// Mục đích: Tìm lộ trình trong cache (userActivityData.plans) trước, nếu không có thì fetch API.
//           Parse JSON nếu data dạng string, xử lý wrapper cũ {title, plan}.
// Purpose:  Finds itinerary in cache (userActivityData.plans) first, if missing then fetches API.
//           Parses JSON if data is string, handles legacy {title, plan} wrapper.
async function viewSavedItinerary(id) {
    // Đóng profile modal nếu đang mở / Close profile modal if open
    if (typeof closeUserProfile === 'function') closeUserProfile();
    
    let plan = null;
    
    // 1. Thử tìm trong cache trước (nhanh, không cần gọi API)
    //    Try cache first (fast, no API call needed)
    if (window.userActivityData && window.userActivityData.plans) {
        plan = window.userActivityData.plans.find(p => p.id == id);
    }
    
    // 2. Nếu không có trong cache, fetch từ API
    //    If not in cache, fetch from API
    if (!plan) {
        try {
            const res = await apiFetch("/api/itineraries");
            if (res.success && res.data) {
                window.userActivityData.plans = res.data;
                plan = res.data.find(p => p.id == id);
            }
        } catch(e) {
            console.error("Fetch itinerary error:", e);
        }
    }
    
    if (plan && plan.data) {
        let pData = plan.data;
        // Parse JSON string nếu cần / Parse JSON string if needed
        if(typeof pData === 'string') {
            try { pData = JSON.parse(pData); } catch(e) { console.error("JSON parse error", e); }
        }
        
        // Xử lý dữ liệu cũ dạng wrapper {title, plan} / Handle legacy wrapper {title, plan}
        if (pData && !Array.isArray(pData) && pData.plan) {
            pData = pData.plan;
        }
        
        // Render nếu dữ liệu hợp lệ / Render if data is valid
        if (Array.isArray(pData) && pData.length > 0) {
            currentItineraryData = pData;
            if (typeof renderItinerary === 'function') {
                renderItinerary(pData);
                openPlannerResultModal();
            }
        } else {
            showNotification({type: 'error', message: 'Dữ liệu lộ trình không hợp lệ.'});
        }
    } else {
        showNotification({type: 'error', message: 'Không tìm thấy dữ liệu lộ trình này.'});
    }
}
