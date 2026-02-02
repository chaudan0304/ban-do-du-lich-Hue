// ===========================================
// AI PLANNER & ITINERARY LOGIC
// ===========================================

let currentItineraryData = null; // Lưu lộ trình đang hiển thị

// --- Input Modal ---
function openPlannerInputModal() {
    if (!currentUser) {
        openAuthModal();
        return;
    }
    // Mặc định reset lại ngày = 1
    document.getElementById("planDays").value = 1;
    document.getElementById("dayDisplay").innerText = "1 Ngày";
    document.getElementById("plannerInputModal").classList.add("active");
}

function closePlannerInputModal() {
    document.getElementById("plannerInputModal").classList.remove("active");
}

function changePlanDays(delta) {
    const input = document.getElementById("planDays");
    const display = document.getElementById("dayDisplay");
    let val = parseInt(input.value) || 1;
    val += delta;
    if (val < 1) val = 1;
    if (val > 5) val = 5; // Giới hạn 5 ngày demo
    input.value = val;
    display.innerText = val + " Ngày";
}

// --- Submit & API Call ---
async function submitPlanner() {
    const days = parseInt(document.getElementById("planDays").value) || 1;
    const useLiked = document.getElementById("planUseLikes").checked;
    
    // Lấy options sở thích
    const checkboxes = document.querySelectorAll("input[name='planPref']:checked");
    const preferences = Array.from(checkboxes).map(cb => cb.value);

    // Call API
    // Có thể hiện loading state
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

        if (res.success) {
            closePlannerInputModal();
            currentItineraryData = res.plan;
            renderItinerary(res.plan);
            openPlannerResultModal();
        } else {
            showNotification({ type: 'error', message: res.error || "Không thể tạo lộ trình." });
        }
    } catch (e) {
        console.error(e);
        showNotification({ type: 'error', message: "Lỗi kết nối AI Planner." });
    } finally {
        if(btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// --- Result Modal & Rendering ---
function openPlannerResultModal() {
    document.getElementById("plannerResultModal").classList.add("active");
}

function closePlannerResultModal() {
    document.getElementById("plannerResultModal").classList.remove("active");
}

function renderItinerary(plan) {
    const container = document.getElementById("plannerTimeline");
    const summaryTitle = document.getElementById("itineraryTitle");
    if(!container) return;
    container.innerHTML = "";
    
    if (!plan || plan.length === 0) {
        container.innerHTML = `<div class="empty-state">Không tìm thấy lộ trình phù hợp.</div>`;
        return;
    }

    // Update Summary
    if(summaryTitle) summaryTitle.innerText = `Hành trình ${plan.length} ngày`;

    plan.forEach(day => {
        // Day Marker
        const dayMarker = document.createElement("div");
        dayMarker.className = "day-marker-pill";
        dayMarker.innerText = `Ngày ${day.day}`;
        container.appendChild(dayMarker);

        if (day.activities && day.activities.length > 0) {
             day.activities.forEach(act => {
                const loc = act.location;
                if(!loc) return;
                
                const node = document.createElement("div");
                node.className = "activity-node";
                
                node.innerHTML = `
                    <div class="activity-circle"></div>
                    <div class="activity-card-fancy" onclick="showDetailFromData('${loc.name}')">
                        <div class="activity-time-box">
                            <i class="fas fa-camera"></i>
                            <span>${act.time || ''}</span>
                        </div>
                        <div class="activity-main-info">
                            <div class="activity-title-fancy">${loc.name}</div>
                            <div class="activity-tag-fancy">${loc.category || 'Địa điểm'}</div>
                            <div class="activity-desc-fancy">${loc.description || 'Khám phá địa điểm thú vị tại cố đô Huế.'}</div>
                        </div>
                        <img src="${loc.image}" class="activity-img-fancy" onerror="this.src='/static/images/no-image.png'">
                    </div>
                `;
                container.appendChild(node);
             });
        } else {
            const emptyNode = document.createElement("div");
            emptyNode.style.padding = "0 0 30px 60px";
            emptyNode.innerHTML = "<p style='color:#94a3b8; font-size:13px;'>Ngày nghỉ ngơi tự do.</p>";
            container.appendChild(emptyNode);
        }
    });
}

// --- CRUD Itinerary (Save/Load) ---

async function saveCurrentItinerary() {
    if (!currentItineraryData) return;
    try {
        // Tự động đặt tên: "Lịch trình Huế 3N2Đ - 02/02"
        const dayCount = currentItineraryData.length;
        const defaultName = `Lịch trình Huế ${dayCount} Ngày - ${new Date().toLocaleDateString('vi-VN')}`;
        
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

// Hàm load danh sách để hiển thị trong Profile (Sẽ được gọi từ ui.js hoặc profile.js)
async function loadUserItinerariesList() {
    try {
        const res = await apiFetch("/api/itineraries");
        const listContainer = document.getElementById("saved-itineraries-list");
        if(!listContainer) return;
        
        listContainer.innerHTML = "";
        if (res && res.length > 0) {
            res.forEach(it => {
                const div = document.createElement("div");
                div.className = "saved-itinerary-item"; // Cần thêm class này trong CSS
                div.innerHTML = `
                    <div style="flex:1">
                        <strong>${it.name}</strong><br>
                        <small>${formatTime(it.created_at)}</small>
                    </div>
                    <button class="btn-icon" onclick="viewSavedItinerary('${it.id}')"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon delete" onclick="deleteSavedItinerary('${it.id}')"><i class="fas fa-trash"></i></button>
                `;
                listContainer.appendChild(div);
            });
        } else {
            listContainer.innerHTML = "<p>Chưa có lịch trình nào được lưu.</p>";
        }
    } catch (e) {
        console.error(e);
    }
}

async function deleteSavedItinerary(id) {
    if(!confirm("Xóa lịch trình này?")) return;
    try {
        await apiFetch(`/api/itineraries/${id}`, { method: "DELETE" });
        loadUserItinerariesList(); // Reload list
    } catch(e) {
        alert("Lỗi xóa");
    }
}

// Xem lại lịch trình đã lưu
async function viewSavedItinerary(id) {
    if (typeof closeUserProfile === 'function') closeUserProfile();
    
    // Tìm trong cache của window.userActivityData (từ profile.js)
    let plan = null;
    if (window.userActivityData && window.userActivityData.plans) {
        // Lưu ý: ID có thể là string hoặc int
        plan = window.userActivityData.plans.find(p => p.id == id);
    }
    
    if (plan && plan.data) {
        let pData = plan.data;
        // Parse if string (đề phòng backend trả về chuỗi JSON)
        if(typeof pData === 'string') {
            try { pData = JSON.parse(pData); } catch(e) { console.error("JSON parse error", e); }
        }
        
        currentItineraryData = pData;
        
        if (typeof renderItinerary === 'function') {
             renderItinerary(pData);
             openPlannerResultModal();
        }
    } else {
        showNotification({type: 'error', message: 'Không tìm thấy dữ liệu lộ trình này.'});
    }
}
