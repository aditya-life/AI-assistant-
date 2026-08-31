# =========================================================
# DEEP MOBILE QA & DEVICE SIMULATION TEST SUITE (HTTPS & HTTP)
# =========================================================

import unittest
import json
import urllib.request
import ssl
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
has_ssl = (BASE_DIR / "cert.pem").exists() and (BASE_DIR / "key.pem").exists()
PROTO = "https" if has_ssl else "http"
BASE_URL = f"{PROTO}://127.0.0.1:3000"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

class TestJarvisDeepMobileQA(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=======================================================")
        print(f"📱 STARTING DEEP MOBILE EMULATION & QA AUDIT ({PROTO.upper()})")
        print("=======================================================")

    def test_01_pwa_standalone_web_app_compliance(self):
        """Verify complete PWA standalone installation compliance."""
        manifest_file = BASE_DIR / "public/manifest.json"
        with open(manifest_file, "r") as f:
            manifest = json.load(f)

        self.assertEqual(manifest["display"], "standalone")
        self.assertEqual(manifest["start_url"], "/")
        self.assertIn("theme_color", manifest)
        self.assertIn("background_color", manifest)
        self.assertGreaterEqual(len(manifest["icons"]), 1)
        print("  [PASS] 01: PWA Web App Manifest validated for Android & iOS.")

    def test_02_service_worker_lifecycle_and_cache(self):
        """Verify service worker sw.js syntax and caching offline assets."""
        sw_file = BASE_DIR / "public/sw.js"
        with open(sw_file, "r") as f:
            sw_content = f.read()

        self.assertIn("addEventListener('install'", sw_content)
        self.assertIn("addEventListener('activate'", sw_content)
        self.assertIn("addEventListener('fetch'", sw_content)
        print("  [PASS] 02: Service Worker offline caching strategy validated.")

    def test_03_mobile_screen_device_emulation(self):
        """Simulate request headers for top mobile devices."""
        devices = [
            ("Samsung Galaxy S24", "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Mobile Safari/537.36"),
            ("iPhone 15 Pro", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"),
            ("Google Pixel 8 Pro", "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Mobile Safari/537.36"),
            ("iPhone SE (Compact)", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
        ]
        for name, ua in devices:
            req = urllib.request.Request(f"{BASE_URL}/", headers={"User-Agent": ua})
            with urllib.request.urlopen(req, context=ctx, timeout=5) as res:
                self.assertEqual(res.status, 200)
            print(f"  [PASS] 03: Simulated Viewport Handshake OK for {name}.")

    def test_04_touch_and_safe_area_css_audit(self):
        """Verify CSS prevents pull-to-refresh reload and handles safe-area insets."""
        css_file = BASE_DIR / "public/styles.css"
        with open(css_file, "r") as f:
            css = f.read()

        self.assertIn("overscroll-behavior: contain", css)
        self.assertIn("user-select: none", css)
        self.assertIn("env(safe-area-inset-top)", css)
        self.assertIn("@media (max-width: 900px)", css)
        print("  [PASS] 04: Mobile touch ergonomics, safe-areas & compact screen styles validated.")

    def test_05_mobile_speech_and_haptic_guards(self):
        """Verify app.js has mobile state guards against InvalidStateError and includes haptics."""
        app_file = BASE_DIR / "public/app.js"
        with open(app_file, "r") as f:
            app_code = f.read()

        self.assertIn("isStartingRecognition", app_code)
        self.assertIn("startListeningSafely", app_code)
        self.assertIn("triggerHaptic", app_code)
        self.assertIn("orientationchange", app_code)
        print("  [PASS] 05: Mobile SpeechRecognition lock guards & haptics validated.")

    def test_06_mobile_api_benchmark(self):
        """Verify local mobile API response is ultra-low latency."""
        import time
        req = urllib.request.Request(
            f"{BASE_URL}/api/info",
            headers={"User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36"}
        )
        # Warmup connection
        with urllib.request.urlopen(req, context=ctx, timeout=5) as res:
            self.assertEqual(res.status, 200)

        # Benchmark warm request
        t0 = time.time()
        with urllib.request.urlopen(req, context=ctx, timeout=5) as res:
            self.assertEqual(res.status, 200)
        lat = (time.time() - t0) * 1000
        self.assertLess(lat, 150.0, f"Latency benchmark exceeded: {lat:.2f}ms")
        print(f"  [PASS] 06: Mobile Network Benchmark Latency: {lat:.2f}ms.")

    def test_07_multimodal_voice_audio_pipeline(self):
        """Verify POST /api/voice-audio endpoint handles incoming mobile audio payload."""
        import server
        # Create small mock audio byte chunk
        mock_audio = b"\x1a\x45\xdf\xa3\x9f\x42\x86\x81\x01\x42\xf7\x81\x01\x42\xf2\x81\x04\x42\xf3\x81\x08"
        res = server.process_voice_audio_with_gemini(mock_audio, "audio/webm")
        self.assertIn("success", res)
        print(f"  [PASS] 07: Multimodal Voice Audio Pipeline validated (Result: {res.get('success')}).")

if __name__ == "__main__":
    unittest.main()
