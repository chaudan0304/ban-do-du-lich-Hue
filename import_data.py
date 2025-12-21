import pandas as pd
from db import run_query, close_driver

def main():
    print("⏳ Đang đọc file Excel...")
    try:
        # Xóa dữ liệu cũ
        run_query("MATCH (n) DETACH DELETE n")
        
        # Nạp Locations (QUAN TRỌNG: Có nạp image)
        df_loc = pd.read_excel('data.xlsx', sheet_name='Locations')
        print(f"📥 Đang nạp {len(df_loc)} địa điểm...")
        
        for i, row in df_loc.iterrows():
            q_loc = """
            MERGE (c:City {name: $city})
            MERGE (cat:Category {name: $cat})
            MERGE (l:Location {id: $id})
            SET l.name = $name, l.desc = $desc, l.rating = $rating, 
                l.lat = $lat, l.lng = $lng, 
                l.image = $image   
            MERGE (l)-[:LOCATED_IN]->(c)
            MERGE (l)-[:HAS_CATEGORY]->(cat)
            """
            run_query(q_loc, {
                'id': row['id'], 'name': row['name'], 'desc': row['description'],
                'city': row['city'], 'cat': row['category'], 'rating': row['rating'],
                'lat': row['lat'], 'lng': row['lng'], 
                'image': row['image']
            })

        # Nạp Users
        df_user = pd.read_excel('data.xlsx', sheet_name='Users')
        for i, row in df_user.iterrows():
            q_user = """
            MERGE (u:User {name: $name})
            WITH u
            MATCH (l:Location {id: $lid})
            MERGE (u)-[:LIKED]->(l)
            """
            run_query(q_user, {'name': row['user_name'], 'lid': row['liked_id']})

        print("✅ NẠP DỮ LIỆU THÀNH CÔNG! (Đã có ảnh)")
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")
    finally:
        close_driver()

if __name__ == '__main__':
    main()