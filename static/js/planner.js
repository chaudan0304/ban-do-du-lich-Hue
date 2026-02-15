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

    // Setup Logic tương tác (chạy 1 lần duy nhất)
    if (!window.plannerLogicInited) {
        const useLikes = document.getElementById("planUseLikes");
        const prefs = document.querySelectorAll("input[name='planPref']");
        
        // 1. Khi chọn "Chỉ nơi đã thích" -> Bỏ chọn & Làm mờ tất cả Sở thích
        if(useLikes) {
            useLikes.addEventListener("change", function() {
                if(this.checked) {
                    prefs.forEach(p => {
                        p.checked = false;
                        p.parentElement.style.opacity = "0.5";
                        p.parentElement.style.pointerEvents = "none"; // Disable click
                    });
                } else {
                    // Enable lại
                    prefs.forEach(p => {
                        p.parentElement.style.opacity = "1";
                        p.parentElement.style.pointerEvents = "auto";
                    });
                }
            });
        }

        // 2. Logic ngược lại: Khi chọn bất kỳ Pref nào -> Disable "User Likes"
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

    // Reset State khi mở Modal
    const uL = document.getElementById("planUseLikes");
    if(uL) {
        uL.checked = false;
        uL.disabled = false;
        uL.parentElement.style.opacity = "1";
        uL.parentElement.style.pointerEvents = "auto";

        // Reset Prefs
        document.querySelectorAll("input[name='planPref']").forEach(p => {
            p.checked = false;
            p.parentElement.style.opacity = "1";
            p.parentElement.style.pointerEvents = "auto";
        });
    }

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

        if (res.success && res.plan && res.plan.length > 0) {
            closePlannerInputModal();
            currentItineraryData = res.plan;
            renderItinerary(res.plan);
            openPlannerResultModal();
        } else {
            // Hiển thị thông báo lỗi cụ thể
            const errorMsg = res.error || "Không thể tạo lộ trình.";
            const errorType = res.error_type || "unknown";
            
            // Thông báo khác nhau tùy loại lỗi
            if (errorType === "no_likes") {
                showNotification({ 
                    type: 'warning', 
                    message: errorMsg,
                    duration: 5000
                });
            } else if (errorType === "no_results") {
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

    plan.forEach((day, dayIndex) => {
        // Day Marker
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

                // Gắn event an toàn (tránh XSS từ loc.name)
                const locName = loc.name; // closure capture
                node.querySelector('.activity-main-info').addEventListener('click', () => showDetailFromData(locName));
                node.querySelector('.activity-img-fancy').addEventListener('click', () => showDetailFromData(locName));
                node.querySelector('.btn-activity-replace').addEventListener('click', () => replaceActivity(dayIndex, actIndex));
                node.querySelector('.btn-activity-remove').addEventListener('click', () => removeActivity(dayIndex, actIndex));

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

// --- EDIT ITINERARY FUNCTIONS ---

// Xóa một địa điểm khỏi lộ trình
function removeActivity(dayIndex, activityIndex) {
    if (!currentItineraryData) return;
    
    // Xác nhận trước khi xóa
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
            currentItineraryData[dayIndex].activities.splice(activityIndex, 1);
            renderItinerary(currentItineraryData);
            showNotification({ type: 'success', message: `Đã xóa "${locName}" khỏi lộ trình.` });
        }
    });
}

// --- REPLACEMENT MODAL LOGIC (New Dual Section + Refresh) ---
let replacementContext = null; 
let currentAICandidates = [];
let currentAIIndex = 0;

function closeReplacementModal() {
    const m = document.getElementById("replacementModal");
    if(m) {
        m.classList.remove("active");
        setTimeout(()=> m.style.display="none", 300);
    }
    replacementContext = null;
}

// Helper: Create Candidate Item
function createCandidateItem(cand, isLiked = false) {
    const score = (cand.score * 10).toFixed(1);
    const div = document.createElement("div");
    
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
    
    let catIcon = cand.category === 'Ẩm thực' ? 'fa-utensils' : 'fa-map-marker-alt';
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

    div.onclick = function() { confirmReplacement(cand); };
    return div;
}

// Refresh AI Logic
function refreshAISection() {
    const aiContainer = document.getElementById("ai-candidates-list");
    if(!aiContainer) return;
    
    // Animate fade out slightly
    aiContainer.style.opacity = "0.5";
    
    setTimeout(() => {
        const batchSize = 5;
        let nextBatch = currentAICandidates.slice(currentAIIndex, currentAIIndex + batchSize);
        
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
    }, 200);
}

// Main Replace Function
async function replaceActivity(dayIndex, activityIndex) {
    if (!currentItineraryData) return;
    const activity = currentItineraryData[dayIndex]?.activities[activityIndex];
    if (!activity) return;
    
    let existingModal = document.getElementById("replacementModal");
    if (existingModal) existingModal.remove();

    console.log("🛠️ Re-creating Replacement Modal (Dual Section)...");
    
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
                     <div id="replacement-loading" style="text-align:center; padding-top: 50px;">
                        <div class="spinner-large" style="margin: 0 auto 15px;"></div>
                        <p style="color:#64748b;">Đang tìm địa điểm phù hợp...</p>
                     </div>

                     <div id="section-liked" style="display: none; margin-bottom: 25px;">
                        <div style="font-size: 13px; font-weight: 800; color: #db2777; margin-bottom: 12px; letter-spacing: 0.5px; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-heart"></i> ĐỊA ĐIỂM BẠN ĐÃ THÍCH
                        </div>
                        <div id="liked-candidates-list"></div>
                     </div>

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
    
    modal.style.display = "flex"; 
    setTimeout(() => modal.classList.add("active"), 10);
    
    replacementContext = { day: dayIndex, act: activityIndex };

    try {
        const res = await apiFetch("/api/planner/suggest-replacement", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                exclude: getUsedLocationNames(),
                type: activity.type,
                category: activity.location?.category || ""
            })
        });

        const loading = document.getElementById("replacement-loading");
        if(loading) loading.style.display = "none";
        
        if (res.success) {
            // 1. RENDER LIKED SECTION
            if (res.liked && res.liked.length > 0) {
                document.getElementById("section-liked").style.display = "block";
                const likedContainer = document.getElementById("liked-candidates-list");
                res.liked.forEach(cand => {
                    likedContainer.appendChild(createCandidateItem(cand, true));
                });
            }

            // 2. SETUP AI SECTION
            if (res.ai && res.ai.length > 0) {
                document.getElementById("section-ai").style.display = "block";
                currentAICandidates = res.ai; // Save global
                currentAIIndex = 0; // Reset index
                refreshAISection(); // Render first batch
            } else if (!res.liked || res.liked.length === 0) {
                // Both empty
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

function confirmReplacement(newLocation) {
    if (!replacementContext || !currentItineraryData) return;
    
    const { day, act } = replacementContext;

    if(day < 0 || day >= currentItineraryData.length || 
       act < 0 || act >= currentItineraryData[day].activities.length) {
         console.error("❌ Index out of bounds");
         return;
    }

    const oldLocName = currentItineraryData[day].activities[act].location.name;
    const newLocName = newLocation.name;

    // --- DUPLICATE CHECK ---
    // Kiểm tra xem địa điểm mới đã tồn tại ở đâu đó trong lịch trình chưa (trừ vị trí hiện tại)
    let isDuplicate = false;
    for (let d = 0; d < currentItineraryData.length; d++) {
        const activities = currentItineraryData[d].activities || [];
        for (let a = 0; a < activities.length; a++) {
            // Bỏ qua chính activity đang sửa
            if (d === day && a === act) continue; 
            
            if (activities[a].location && activities[a].location.name === newLocName) {
                isDuplicate = true;
                break;
            }
        }
        if (isDuplicate) break;
    }

    if (isDuplicate) {
        // Dùng showNotification async thay confirm()
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
        return; // Chờ user confirm
    }

    // Không trùng → thực hiện luôn
    _doReplacement(day, act, oldLocName, newLocation);
}

// Helper: Thực hiện thay thế (tách ra để dùng chung cho cả confirm callback)
function _doReplacement(day, act, oldLocName, newLocation) {
    currentItineraryData[day].activities[act].location = newLocation;
    console.log(`✅ Updated location: ${oldLocName} -> ${newLocation.name}`);
    
    renderItinerary(currentItineraryData);
    
    setTimeout(() => {
        closeReplacementModal();
        showNotification({ 
            type: 'success', 
            message: `Đã thay "${oldLocName}" bằng "${newLocation.name}"` 
        });
    }, 100);
}

// Lấy danh sách tên các địa điểm đã dùng trong lộ trình hiện tại
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

// --- CRUD Itinerary (Save/Load) ---

async function saveCurrentItinerary() {
    if (!currentItineraryData) return;
    try {
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
                // Nút Xem — dùng addEventListener
                const btnView = document.createElement('button');
                btnView.className = 'btn-icon';
                btnView.innerHTML = '<i class="fas fa-eye"></i>';
                btnView.addEventListener('click', () => viewSavedItinerary(it.id));
                div.appendChild(btnView);

                // Nút Xóa — dùng addEventListener
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

// Xem lại lịch trình đã lưu
async function viewSavedItinerary(id) {
    if (typeof closeUserProfile === 'function') closeUserProfile();
    
    let plan = null;
    
    // 1. Thử tìm trong cache trước
    if (window.userActivityData && window.userActivityData.plans) {
        plan = window.userActivityData.plans.find(p => p.id == id);
    }
    
    // 2. Nếu không có trong cache, fetch từ API
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
        if(typeof pData === 'string') {
            try { pData = JSON.parse(pData); } catch(e) { console.error("JSON parse error", e); }
        }
        
        // Handle data cũ dạng {title, plan} wrapper
        if (pData && !Array.isArray(pData) && pData.plan) {
            pData = pData.plan;
        }
        
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
