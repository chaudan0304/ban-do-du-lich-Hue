// ===========================================
// ADMIN TOOLKIT
// ===========================================

function openAddModal() {
  document.getElementById("addModal").classList.add("active");
  // Clean form
  document.getElementById("addName").value = "";
  document.getElementById("addDesc").value = "";
  if(document.getElementById("addLat")) document.getElementById("addLat").value = "";
  if(document.getElementById("addLng")) document.getElementById("addLng").value = "";
  document.getElementById("addImage").value = "";
  document.getElementById("addCat").value = "Tham quan";
}

function closeAddModal() {
  document.getElementById("addModal").classList.remove("active");
}

async function submitAddLocation() {
  const name = document.getElementById("addName").value;
  const cat = document.getElementById("addCat").value;
  const desc = document.getElementById("addDesc").value;
  const lat = parseFloat(document.getElementById("addLat").value);
  const lng = parseFloat(document.getElementById("addLng").value);
  const img = document.getElementById("addImage").value;

  if (!name || isNaN(lat) || isNaN(lng)) {
      showNotification({type: 'warning', message: "Vui lòng nhập tên và tọa độ hợp lệ!"});
      return;
  }

  try {
    const res = await apiFetch("/api/admin/add_location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category: cat, description: desc, lat, lng, image: img }),
    });

    if (res.success) {
      showNotification({type: 'success', message: "Thêm địa điểm thành công!"});
      closeAddModal();
      // Reload cache and map
      if(typeof cachedAllLocations !== 'undefined') cachedAllLocations = null; 
      if(typeof loadLocations !== 'undefined') loadLocations(currentCategory, false);
    } else {
      showNotification({type: 'error', message: res.error});
    }
  } catch (e) {
    showNotification({type: 'error', message: "Lỗi kết nối admin add"});
  }
}

function openEditModal() {
  if (!currentOpenLoc) return;
  document.getElementById("editModal").classList.add("active");
  document.getElementById("editOldName").value = currentOpenLoc.name;
  document.getElementById("editName").value = currentOpenLoc.name;
  
  // Set category robustly
  const catSelect = document.getElementById("editCat");
  catSelect.value = currentOpenLoc.category;
  
  document.getElementById("editDesc").value = currentOpenLoc.description || "";
  document.getElementById("editLat").value = currentOpenLoc.lat;
  document.getElementById("editLng").value = currentOpenLoc.lng;
  document.getElementById("editImage").value = currentOpenLoc.image || "";
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("active");
}

async function submitEditLocation() {
  const oldName = document.getElementById("editOldName").value;
  const name = document.getElementById("editName").value;
  const cat = document.getElementById("editCat").value;
  const desc = document.getElementById("editDesc").value;
  const lat = parseFloat(document.getElementById("editLat").value);
  const lng = parseFloat(document.getElementById("editLng").value);
  const img = document.getElementById("editImage").value;

  try {
    const res = await apiFetch("/api/admin/edit_location", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_name: oldName, name, category: cat, description: desc, lat, lng, image: img }),
    });

    if (res.success) {
      showNotification({type: 'success', message: "Cập nhật thành công!"});
      closeEditModal();
      if(typeof closeDetail !== 'undefined') closeDetail(); 
      
      if(typeof cachedAllLocations !== 'undefined') cachedAllLocations = null; 
      if(typeof loadLocations !== 'undefined') loadLocations(currentCategory, false);
      
      if (typeof showDetailFromData !== 'undefined') {
          setTimeout(() => showDetailFromData(name), 500); 
      }
    } else {
        showNotification({type: 'error', message: res.error});
    }
  } catch (e) {
      showNotification({type: 'error', message: "Lỗi edit"});
  }
}

async function deleteLocation(name) {
  showNotification({
      type: 'delete',
      title: 'Xóa địa điểm',
      message: `Bạn có chắc muốn xóa <b>${name}</b> vĩnh viễn?`,
      btnText: 'Xóa',
      showCancel: true,
      onConfirm: async () => {
         try {
            const res = await apiFetch(`/api/admin/delete_location/${encodeURIComponent(name)}`, { method: "DELETE" });
            if (res.success) {
                if(typeof closeDetail !== 'undefined') closeDetail();
                if(typeof cachedAllLocations !== 'undefined') cachedAllLocations = null; 
                if(typeof loadLocations !== 'undefined') loadLocations(currentCategory, false);
                showNotification({type: 'success', message: 'Đã xóa địa điểm.'});
            } else {
                showNotification({type: 'error', message: res.error});
            }
         } catch(e) { 
             showNotification({type: 'error', message: "Lỗi xóa"});
         }
      }
  });
}
