"""
Run All Tests
Execute all test suites for Hue Travel AI
"""

import subprocess
import sys
import os

# Change to project root
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("\n" + "=" * 60)
print("🧪 HUE TRAVEL AI - TEST RUNNER")
print("=" * 60)

test_files = [
    "tests/test_auth.py",
    "tests/test_recommend.py",
    "tests/test_planner.py",
]

results = []

for test_file in test_files:
    print(f"\n▶ Running: {test_file}")
    result = subprocess.run(
        [sys.executable, test_file], capture_output=False, text=True
    )
    results.append((test_file, result.returncode))

print("\n" + "=" * 60)
print("📊 TEST SUMMARY")
print("=" * 60)

all_passed = True
for test_file, code in results:
    status = "✅ PASS" if code == 0 else "❌ FAIL"
    if code != 0:
        all_passed = False
    print(f"  {status} - {test_file}")

print("=" * 60)
if all_passed:
    print("🎉 ALL TESTS PASSED!")
else:
    print("⚠️ SOME TESTS FAILED - Check output above")
print("=" * 60)
