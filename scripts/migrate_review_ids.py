import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import run_query


def migrate_ids():
    print("Migrating Review IDs...")
    query = """
    MATCH ()-[r:REVIEWED]->()
    WHERE r.id IS NULL
    SET r.id = randomUUID()
    RETURN count(r) as updated_count
    """
    try:
        res = run_query(query)
        print(f"Update Result: {res}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    migrate_ids()
