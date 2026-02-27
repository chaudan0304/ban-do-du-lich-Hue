"""
=============================================================================
tests/run_all_tests.py - Chạy toàn bộ test suites (Test Runner)
tests/run_all_tests.py - Run All Test Suites (Test Runner)
=============================================================================
Mô tả / Description:
    Script chạy tất cả các file test và tổng hợp kết quả.
    Script runs all test files and aggregates results.

    Test suites:
    1. test_auth.py    → Xác thực (đăng ký, đăng nhập, hồ sơ)
                         Authentication (register, login, profile)
    2. test_recommend.py → Gợi ý AI (cold-start, PageRank, exclusion)
                           AI Recommendations (cold-start, PageRank, exclusion)
    3. test_planner.py  → Lộ trình AI (tạo kế hoạch với/không preferences)
                          AI Planner (generate plans with/without preferences)

Cách chạy / How to run:
    python tests/run_all_tests.py

Kết quả / Output:
    PASS/FAIL cho từng test file + tóm tắt cuối cùng.
    PASS/FAIL for each test file + final summary.
=============================================================================
"""

import subprocess
import sys
import os

# Các file test cần chạy / Test files to run
TEST_FILES = [
    "tests/test_auth.py",
    "tests/test_recommend.py",
    "tests/test_planner.py",
]


def run_all():
    """
    Chạy từng file test bằng subprocess và thu thập kết quả.
    Run each test file via subprocess and collect results.
    """
    results = {}
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    for test_file in TEST_FILES:
        test_path = os.path.join(base_dir, test_file)
        print(f"\n{'='*60}")
        print(f"🧪 Running: {test_file}")
        print(f"{'='*60}")

        try:
            # Chạy test với Python hiện tại / Run test with current Python
            result = subprocess.run(
                [sys.executable, test_path],
                capture_output=True,
                text=True,
                timeout=120,  # Timeout 2 phút / 2 minute timeout
            )

            print(result.stdout)
            if result.stderr:
                print(result.stderr)

            # Đánh giá kết quả / Evaluate result
            if result.returncode == 0:
                results[test_file] = "✅ PASS"
            else:
                results[test_file] = "❌ FAIL"

        except subprocess.TimeoutExpired:
            results[test_file] = "⏰ TIMEOUT"
        except Exception as e:
            results[test_file] = f"💥 ERROR: {e}"

    # ─── TÓM TẮT KẾT QUẢ (Results Summary) ───
    print(f"\n{'='*60}")
    print("📊 KẾT QUẢ TỔNG HỢP / SUMMARY:")
    print(f"{'='*60}")
    for test_file, status in results.items():
        print(f"  {test_file}: {status}")

    # Exit code: 0 nếu tất cả pass, 1 nếu có fail
    # Exit code: 0 if all pass, 1 if any fail
    if all("PASS" in s for s in results.values()):
        print("\n🎉 Tất cả test đều PASS!")
        sys.exit(0)
    else:
        print("\n⚠️ Có test FAIL!")
        sys.exit(1)


# ═══════════════════════════════════════════════════════
# ENTRY POINT / Chạy: python tests/run_all_tests.py
# ═══════════════════════════════════════════════════════
if __name__ == "__main__":
    run_all()
