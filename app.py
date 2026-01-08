# File: app.py
from flask import request, Flask, jsonify, render_template
from db import run_query, close_driver
import atexit

app = Flask(__name__)

# Đóng kết nối database khi tắt app
atexit.register(close_driver)


# =======================================================
# 1. CÁC API FLASK
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


# =======================================================
# 2. MAIN RUN
# =======================================================
if __name__ == "__main__":
    print("🚀 Server đang chạy tại: http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
