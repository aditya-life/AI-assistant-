# =========================================================
# PROFESSIONAL QA TEST SUITE FOR J.A.R.V.I.S. v3.0 (8 LEVELS)
# =========================================================

import unittest
import json
import time
import urllib.request
import urllib.error
import ssl
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
has_ssl = (PROJECT_DIR / "cert.pem").exists() and (PROJECT_DIR / "key.pem").exists()
PROTO = "https" if has_ssl else "http"
BASE_URL = f"{PROTO}://127.0.0.1:3000"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

class TestJarvisProfessionalQA(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=======================================================")
        print("🔍 STARTING FULL 8-LEVEL QA TEST SUITE FOR J.A.R.V.I.S.")
        print("=======================================================")

    def test_01_static_files_integrity(self):
        """Level 1 & 2: Static files, assets, service workers and config."""
        required_files = [
            "server.py", "server.js", "config.json", "start.sh", "requirements.txt",
            "android-setup-guide.md", "README.md", "BLUEPRINT.md", "public/index.html", "public/styles.css",
            "public/app.js", "public/audio-fx.js", "public/sw.js", "public/manifest.json",
            "test_bilingual.py", "test_youtube_and_speed.py"
        ]
        for rel_path in required_files:
            file_path = PROJECT_DIR / rel_path
            self.assertTrue(file_path.exists(), f"Missing file: {rel_path}")
            self.assertGreater(file_path.stat().st_size, 0, f"File is empty: {rel_path}")
        print("  [PASS] 01: All static files, assets and service workers verified.")

    def test_02_config_json_validation(self):
        """Level 1: Configuration schema & custom persona settings."""
        cfg_file = PROJECT_DIR / "config.json"
        with open(cfg_file, "r") as f:
            cfg = json.load(f)

        required_keys = ["assistantName", "userTitle", "theme", "language", "voicePitch", "voiceRate"]
        for key in required_keys:
            self.assertIn(key, cfg, f"Config missing key: {key}")
            
        print(f"  [PASS] 02: config.json schema validated (Assistant: '{cfg['assistantName']}').")

    def test_03_api_info_and_weather_endpoint(self):
        """Level 4 & 7: System Telemetry, QR code stream, and Live Weather."""
        req = urllib.request.Request(f"{BASE_URL}/api/info")
        with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
            self.assertEqual(response.status, 200)
            data = json.loads(response.read().decode())
            
            self.assertIn("assistantName", data)
            self.assertIn("localIP", data)
            self.assertIn("qrCodeDataURL", data)
            self.assertTrue(data["qrCodeDataURL"].startswith("data:image/png;base64,"))
            self.assertIn("stats", data)
            self.assertIn("weather", data)
            self.assertIn("temp_C", data["weather"])
        print(f"  [PASS] 03: GET /api/info verified (Weather: {data['weather']['temp_C']}°C, {data['weather']['desc']}).")

    def test_04_api_notes_crud_lifecycle(self):
        """Level 8: Persistent Stark Voice Notes CRUD lifecycle."""
        # 1. Add Note
        new_note_payload = json.dumps({"text": "Test Stark Engine Protocol"}).encode("utf-8")
        req_post = urllib.request.Request(
            f"{BASE_URL}/api/notes",
            data=new_note_payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req_post, context=ctx, timeout=5) as response:
            self.assertEqual(response.status, 200)
            res_post = json.loads(response.read().decode())
            self.assertTrue(res_post["success"])
            note_id = res_post["note"]["id"]

        # 2. Get Notes
        req_get = urllib.request.Request(f"{BASE_URL}/api/notes")
        with urllib.request.urlopen(req_get, context=ctx, timeout=5) as response:
            notes = json.loads(response.read().decode())
            self.assertTrue(any(n["id"] == note_id for n in notes))

        # 3. Delete Note
        req_del = urllib.request.Request(f"{BASE_URL}/api/notes/{note_id}", method="DELETE")
        with urllib.request.urlopen(req_del, context=ctx, timeout=5) as response:
            self.assertEqual(response.status, 200)
            res_del = json.loads(response.read().decode())
            self.assertTrue(res_del["success"])
        print("  [PASS] 04: Stark Persistent Notes CRUD lifecycle verified.")

    def test_05_universal_clipboard_sync(self):
        """Level 8: Universal Mac <-> Phone Clipboard Sync API."""
        clip_payload = json.dumps({"text": "J.A.R.V.I.S. Clipboard Sync Test"}).encode("utf-8")
        req_post = urllib.request.Request(
            f"{BASE_URL}/api/clipboard",
            data=clip_payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req_post, context=ctx, timeout=5) as response:
            self.assertEqual(response.status, 200)
            res = json.loads(response.read().decode())
            self.assertTrue(res["success"])
        print("  [PASS] 05: Universal Clipboard Sync verified.")

    def test_06_webhook_trigger_endpoint(self):
        """Level 6: POST /api/webhook/trigger for phone/Siri remote commands."""
        test_command = {"action": "SET_VOLUME", "level": 60, "command": "Set volume to 60%"}
        req = urllib.request.Request(
            f"{BASE_URL}/api/webhook/trigger",
            data=json.dumps(test_command).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
            self.assertEqual(response.status, 200)
            res_data = json.loads(response.read().decode())
            self.assertEqual(res_data["status"], "acknowledged")
            self.assertTrue(res_data["result"]["success"])
        print("  [PASS] 06: POST /api/webhook/trigger executed successfully.")

    def test_07_html_dom_and_camera_modal(self):
        """Level 2, 7 & 8: Verify DOM elements for Camera Scanner, Notes, Protocols, Clipboard."""
        html_file = PROJECT_DIR / "public/index.html"
        with open(html_file, "r") as f:
            content = f.read()

        essential_dom_elements = [
            'id="arcCanvas"',
            'id="cameraVideo"',
            'id="modalCamera"',
            'id="modalNotes"',
            'id="modalClipboard"',
            'id="btnFocusProto"',
            'id="btnCameraHUD"',
            'id="btnClipboardSync"',
            'audio-fx.js',
            'app.js'
        ]
        for elem in essential_dom_elements:
            self.assertIn(elem, content, f"Missing DOM element: {elem}")
        print("  [PASS] 07: Camera HUD, Notes, Clipboard Sync & Protocols DOM verified.")

if __name__ == "__main__":
    unittest.main()
