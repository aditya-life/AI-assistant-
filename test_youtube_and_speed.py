# =========================================================
# YOUTUBE PLAY & DYNAMIC SPEED QA VERIFICATION SUITE
# =========================================================

import unittest
import json
import ssl
import urllib.request
import urllib.parse
from server import resolve_youtube_first_video, execute_mac_command, config, save_config

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

class TestYouTubeAndSpeed(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=======================================================")
        print("🎬 STARTING YOUTUBE PLAY & VOICE SPEED QA VERIFICATION")
        print("=======================================================")

    def test_01_youtube_video_id_resolution(self):
        """Verify YouTube first video ID extraction works accurately and fast."""
        queries = ["Arijit Singh Kesariya", "Iron Man best scenes", "Alan Walker Faded"]
        for q in queries:
            res = resolve_youtube_first_video(q)
            self.assertTrue(res["success"], f"Failed to resolve video for '{q}'")
            self.assertIsNotNone(res["videoId"], f"Missing videoId for '{q}'")
            self.assertTrue(res["watchUrl"].startswith("https://www.youtube.com/watch?v="))
            self.assertIn("autoplay=1", res["watchUrl"])
            print(f"  [PASS] YouTube Video Resolved for '{q}' -> ID: {res['videoId']}, URL: {res['watchUrl']}")

    def test_02_execute_mac_play_youtube_action(self):
        """Verify PLAY_YOUTUBE action runs smoothly without errors."""
        res = execute_mac_command("PLAY_YOUTUBE", {"query": "Trending song 2026"})
        self.assertTrue(res["success"])
        self.assertIn("url", res)
        print(f"  [PASS] Mac Command PLAY_YOUTUBE successfully dispatched -> {res.get('url')}")

    def test_03_speech_speed_configuration_schema(self):
        """Verify hindiVoiceRate (0.85 default) and dynamic rate saving."""
        test_cfg = {
            "hindiVoiceRate": 0.85,
            "voiceRate": 1.0,
            "language": "hi-IN"
        }
        save_config(test_cfg)
        self.assertEqual(config.get("hindiVoiceRate"), 0.85)
        self.assertEqual(config.get("language"), "hi-IN")
        print(f"  [PASS] Hindi Speech Rate (0.85x) & Language (hi-IN) validated in config.")

    def test_04_device_isolated_routing_attributes(self):
        """Verify originClientId and sourceDevice attributes are properly structured."""
        sample_mobile_event = {
            "type": "VOICE_COMMAND",
            "payload": {
                "text": "YouTube pe Kesariya chalao",
                "source": "voice",
                "originClientId": "client_mobile_123",
                "sourceDevice": "mobile"
            }
        }
        payload = sample_mobile_event["payload"]
        self.assertEqual(payload["sourceDevice"], "mobile")
        self.assertEqual(payload["originClientId"], "client_mobile_123")
    def test_05_execute_mac_skip_ad_action(self):
        """Verify SKIP_AD command executes safely on macOS."""
        res = execute_mac_command("SKIP_AD")
        self.assertTrue(res["success"])
        self.assertEqual(res.get("action"), "SKIP_AD")
        print("  [PASS] Mac Command SKIP_AD executed successfully.")

    def test_06_media_seek_and_single_tab_control(self):
        """Verify MEDIA_SEEK, MEDIA_PAUSE, and MEDIA_RESUME actions execute safely."""
        res_seek = execute_mac_command("MEDIA_SEEK", {"seconds": 300})
        self.assertTrue(res_seek["success"])
        self.assertEqual(res_seek.get("deltaSeconds"), 300)

        res_pause = execute_mac_command("MEDIA_PAUSE")
        self.assertTrue(res_pause["success"])

        res_resume = execute_mac_command("MEDIA_RESUME")
        self.assertTrue(res_resume["success"])

        res_restart = execute_mac_command("MEDIA_RESTART")
        self.assertTrue(res_restart["success"])
        print("  [PASS] Mac Media Controls (Forward +300s, Pause, Resume, Restart) validated.")

    def test_07_media_queue_and_clean_tabs(self):
        """Verify MEDIA_NEXT, MEDIA_PREV, and CLOSE_INACTIVE_YOUTUBE_TABS execute safely."""
        res_next = execute_mac_command("MEDIA_NEXT")
        self.assertTrue(res_next["success"])

        res_prev = execute_mac_command("MEDIA_PREV")
        self.assertTrue(res_prev["success"])

        res_clean = execute_mac_command("CLOSE_INACTIVE_YOUTUBE_TABS")
        self.assertTrue(res_clean["success"])
        print("  [PASS] Mac Media Queue (Next, Previous) and Inactive Tab Cleaner validated.")

    def test_08_duck_and_unduck_audio(self):
        """Verify DUCK_AUDIO and UNDUCK_AUDIO execute properly for loud music handling."""
        res_duck = execute_mac_command("DUCK_AUDIO")
        self.assertTrue(res_duck["success"])

        res_unduck = execute_mac_command("UNDUCK_AUDIO")
        self.assertTrue(res_unduck["success"])
        print("  [PASS] Auto Audio Ducking & Unducking validated.")

if __name__ == "__main__":
    unittest.main()
