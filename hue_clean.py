import json


def clean_osm_data(input_file, output_file):
    with open(input_file, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    cleaned_places = []

    for element in raw_data.get("elements", []):
        tags = element.get("tags", {})

        # 1. Lọc: Chỉ lấy địa điểm có Tên
        if "name" not in tags:
            continue

        # 2. Xử lý tọa độ (Node dùng lat/lon, Way/Relation dùng center)
        lat = element.get("lat")
        lon = element.get("lon")

        if lat is None and "center" in element:
            lat = element["center"]["lat"]
            lon = element["center"]["lon"]

        if lat is None or lon is None:
            continue  # Bỏ qua nếu không tìm thấy tọa độ

        # 3. Phân loại (Category)
        category = "Khác"
        if "tourism" in tags:
            if tags["tourism"] == "museum":
                category = "Bảo tàng"
            elif tags["tourism"] == "attraction":
                category = "Điểm tham quan"
            elif tags["tourism"] == "hotel":
                category = "Lưu trú"
        elif "historic" in tags:
            category = "Di tích lịch sử"
        elif "religion" in tags or "amenity" == "place_of_worship":
            category = "Tôn giáo"

        # 4. Tạo object sạch
        place = {
            "id": element["id"],
            "name": tags["name"],
            "category": category,
            "address": tags.get("addr:street", "Thừa Thiên Huế"),
            "lat": lat,
            "lon": lon,
        }
        cleaned_places.append(place)

    # Lưu ra file mới
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(cleaned_places, f, ensure_ascii=False, indent=4)

    print(f"✅ Đã xử lý xong! Tìm thấy {len(cleaned_places)} địa điểm.")
    print(f"📁 Dữ liệu sạch đã lưu tại: {output_file}")


# --- CHẠY HÀM ---
# Nhớ lưu nội dung bạn vừa gửi vào file hue_raw.json trước khi chạy nhé
clean_osm_data("hue_raw.json", "hue_clean.json")
