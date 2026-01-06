# File: app.py
from flask import request, Flask, jsonify, render_template
from db import run_query, close_driver
import atexit

app = Flask(__name__)

# Đóng kết nối database khi tắt app
atexit.register(close_driver)


# =======================================================
# 1. HÀM TỰ ĐỘNG NẠP GRAPH (AUTO-LOADER)
# =======================================================
def auto_load_graph():
    print("🔄 [System] Đang kiểm tra trạng thái GDS (Graph Data Science)...")
    try:
        # Bước 1: Kiểm tra xem graph đã tồn tại chưa
        check_query = "CALL gds.graph.exists('roadGraph') YIELD exists RETURN exists"
        data = run_query(check_query)

        if data and data[0]["exists"]:
            print("✅ [System] Graph 'roadGraph' đã có sẵn trong RAM. Sẵn sàng!")
            return

        # Bước 2: Nếu chưa có, nạp lại (Project) từ dữ liệu ổ cứng
        print("⚠️ [System] Graph chưa có trong RAM. Đang nạp lại từ Database...")

        project_query = """
        CALL gds.graph.project(
            'roadGraph',
            'Location',
            {
                NEAR: {
                    type: 'NEAR',
                    orientation: 'UNDIRECTED',
                    properties: 'distance'
                }
            }
        ) YIELD graphName, nodeCount, relationshipCount
        """
        result = run_query(project_query)

        if result:
            info = result[0]
            print(
                f"🚀 [System] Đã nạp thành công! ({info['nodeCount']} nodes, {info['relationshipCount']} edges)"
            )
        else:
            print(
                "❌ [System] Không thể nạp graph. Vui lòng kiểm tra lại quá trình thiết lập ban đầu."
            )

    except Exception as e:
        print(f"❌ [System] Lỗi khởi tạo GDS: {e}")


# =======================================================
# 2. CÁC API FLASK
# =======================================================
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/locations", methods=["GET"])
def get_locations():
    category_filter = request.args.get("category")

    query = """
    MATCH (l:Location)
    MATCH (l)-[:HAS_CATEGORY]->(cat:Category)
    """
    if category_filter and category_filter != "All":
        query += f" WHERE cat.name = '{category_filter}' "

    query += """
    RETURN l.name AS name, l.desc AS description, 
           l.rating AS rating, l.lat AS lat, l.lng AS lng,
           l.image AS image, cat.name AS category
    """

    data = run_query(query)
    return jsonify(data)


@app.route("/api/recommend/<user_name>", methods=["GET"])
def recommend(user_name):
    # Logic gợi ý: Dựa trên người dùng có cùng sở thích (Collaborative Filtering đơn giản)
    cypher_query = """
    MATCH (me:User {name: $name})-[:LIKED]->(my_place:Location)
    MATCH (other:User)-[:LIKED]->(my_place)
    WHERE other.name <> $name
    
    MATCH (other)-[:LIKED]->(suggestion:Location)
    WHERE NOT (me)-[:LIKED]->(suggestion)
    
    RETURN suggestion.name AS name, 
           suggestion.desc AS description, 
           suggestion.rating AS rating,
           suggestion.lat AS lat,      
           suggestion.lng AS lng,
           suggestion.pagerankScore AS pr,
           suggestion.image AS image, 
           count(other) AS common_users
           
    ORDER BY common_users DESC, pr DESC 
    LIMIT 5
    """

    results = run_query(cypher_query, {"name": user_name})

    # Fallback: Nếu user mới chưa có dữ liệu, gợi ý theo PageRank (độ nổi tiếng)
    if not results:
        fallback_query = """
        MATCH (l:Location) 
        RETURN l.name AS name, l.desc AS description, l.rating AS rating, 
               l.lat AS lat, l.lng AS lng, l.pagerankScore as pr,
               l.image as image,
               'Dia diem noi bat' as reason
        ORDER BY l.pagerankScore DESC
        LIMIT 3
        """
        results = run_query(fallback_query)

    return jsonify(results)


@app.route("/api/route", methods=["GET"])
def get_route():
    start_name = request.args.get("start")
    end_name = request.args.get("end")

    if not start_name or not end_name:
        return jsonify({"error": "Vui lòng cung cấp điểm đi và điểm đến"}), 400

    # Kiểm tra xem graph đã nạp chưa (auto-loader)
    try:
        run_query("CALL gds.graph.exists('roadGraph')")
    except:
        return (
            jsonify({"error": "Graph ảo chưa được nạp. Vui lòng restart server."}),
            500,
        )

    query = """
    MATCH (source:Location {name: $start}), (target:Location {name: $end})
    
    CALL gds.shortestPath.dijkstra.stream('roadGraph', {
        sourceNode: source,
        targetNode: target,
        relationshipWeightProperty: 'distance'
    })
    YIELD index, sourceNode, targetNode, totalCost, nodeIds, costs, path
    
    RETURN [nodeId IN nodeIds | {
        name: gds.util.asNode(nodeId).name,
        lat: gds.util.asNode(nodeId).lat,
        lng: gds.util.asNode(nodeId).lng
    }] AS path_nodes, totalCost
    """

    try:
        data = run_query(query, {"start": start_name, "end": end_name})
        if not data:
            return (
                jsonify(
                    {"error": "Không tìm thấy đường đi (quá xa hoặc không kết nối)"}
                ),
                404,
            )
        return jsonify(data[0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =======================================================
# 3. MAIN RUN
# =======================================================
if __name__ == "__main__":
    # --- GỌI HÀM TỰ ĐỘNG NẠP ---
    with app.app_context():
        auto_load_graph()

    print("🚀 Server đang chạy tại: http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
