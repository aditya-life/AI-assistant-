# =========================================================
# PROFESSIONAL MOBILE QA AUTOMATED TEST SUITE
# =========================================================

import unittest
import json
import urllib.request
from pathlib import Path

BASE_URL = "http://127.0.0.1:3000"
PROJECT_DIR = Path(__file__).resolve().parent

class TestJarvisMobileQA(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=======================================================")
        print("📱 STARTING MOBILE-SPECIFIC QA AUDIT FOR J.A.R.V.I.S.")
        print("=======================================================")

    def test_01_mobile_viewport_and_pwa_meta_tags(self):
        """Verify index.html contains correct mobile viewport, PWA, and safe-area meta tags."""
        html_file = PROJECT_DIR / "public/index.html"
        with open(html_file, "r") as f:
            content = f.read()

        required_meta = [
            'name="viewport"',
            'content="width=device-width, initial-scale=1.0',
            'name="theme-color"',
            'name="apple-mobile-web-app-capable"',
            'rel="manifest"'
        ]
        for meta in required_meta:
            self.assertIn(meta, content, f"Missing mobile meta tag: {meta}")
        print("  [PASS] 01: Mobile viewport, iOS standalone & PWA meta tags verified.")

    def test_02_pwa_manifest_validity(self):
        """Validate manifest.json schema for Android and iOS Add to Home Screen."""
        manifest_file = PROJECT_DIR / "public/manifest.json"
        self.assertTrue(manifest_file.exists(), "manifest.json missing")
        with open(manifest_file, "r") as f:
            manifest = json.load(f)

        self.assertEqual(manifest["display"], "standalone")
        self.assertEqual(manifest["start_url"], "/")
        self.assertIn("icons", manifest)
        self.assertGreaterEqual(len(manifest["icons"]), 1)
        print("  [PASS] 02: PWA manifest standalone configuration verified.")

    def test_03_service_worker_asset_caching(self):
        """Verify sw.js exists and caches core app shell assets."""
        sw_file = PROJECT_DIR / "public/sw.js"
        self.assertTrue(sw_file.exists(), "sw.js missing")
        with open(sw_file, "r") as f:
            sw_content = f.read()

        self.assertIn("caches.open", sw_content)
        self.assertIn("/index.html", sw_content)
        self.assertIn("/styles.css", sw_content)
        self.assertIn("/app.js", sw_content)
        print("  [PASS] 03: PWA Service Worker offline caching verified.")

    def test_04_mobile_user_agent_http_requests(self):
        """Simulate requests from Android Chrome & iPhone Safari."""
        user_agents = {
            "Android_Chrome": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
            "iPhone_Safari": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1"
        }
        for device, ua in user_agents.items():
            req = urllib.request.Request(
                f"{BASE_URL}/",
                headers={"User-Agent": ua}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                self.assertEqual(response.status, 200)
                html = response.read().decode()
                self.assertIn("STARK INDUSTRIES", html)
            print(f"  [PASS] 04: HTTP response OK for {device}.")

    def test_05_css_mobile_safe_areas_and_touch_targets(self):
        """Verify CSS contains safe-area insets and touch-action optimizations."""
        css_file = PROJECT_DIR / "public/styles.css"
        with open(css_file, "r") as f:
            css = f.read()

        self.assertIn("env(safe-area-inset-top)", css)
        self.assertIn("env(safe-area-inset-bottom)", css)
        self.assertIn("touch-action: manipulation", css)
        self.assertIn("@media (max-width: 900px)", css)
        print("  [PASS] 05: Mobile safe-area notches, touch-action & media queries verified.")

    def test_06_mobile_api_latency_benchmark(self):
        """Benchmark /api/info latency for mobile connections."""
        import time
        latencies = []
        for _ in range(5):
            t0 = time.time()
            req = urllib.request.Request(f"{BASE_URL}/api/info")
            with urllib.request.urlopen(req, timeout=5) as res:
                self.assertEqual(res.status, 200)
            latencies.append((time.time() - t0) * 1000)

        avg_lat = sum(latencies) / len(latencies)
        self.assertLess(avg_lat, 10.0, f"Latency too high: {avg_lat}ms")
        print(f"  [PASS] 06: Mobile API Benchmark Average Latency: {avg_lat:.2f}ms (Target < 10ms).")

if __name__ == "__main__":
    unittest.main()
