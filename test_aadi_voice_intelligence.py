# =========================================================
# AADI CHATGPT-GRADE VOICE & INTELLIGENCE VERIFICATION SUITE
# =========================================================

import unittest
import json
import time
import re
from server import (
    query_aadi_intelligence,
    fetch_wikipedia_summary,
    fetch_duckduckgo_answer,
    solve_spoken_math,
    solve_datetime_query,
    solve_weather_query,
    detect_computer_action,
    generate_chatgpt_conversational_response,
    is_conversational_query
)

class TestAadiVoiceIntelligence(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=======================================================")
        print("🧠 STARTING AADI CHATGPT-GRADE VOICE & INTELLIGENCE AUDIT")
        print("=======================================================")

    def test_01_conversational_persona(self):
        """Verify conversational dialogue matches ChatGPT Voice warm persona."""
        self.assertTrue(is_conversational_query("kaise ho aadi"))
        self.assertTrue(is_conversational_query("tell me a joke"))
        self.assertTrue(is_conversational_query("tum kaun ho"))
        self.assertTrue(is_conversational_query("can you hear me"))
        self.assertFalse(is_conversational_query("virat kohli kaun hai"))
        self.assertFalse(is_conversational_query("what is quantum computing"))

        res = query_aadi_intelligence("kaise ho aadi", is_hindi=True, user_title="Aditya")
        self.assertTrue(res["success"])
        self.assertEqual(res["model"], "aadi-dialogue-engine")
        self.assertIn("Aditya", res["reply"])
        print(f"  [PASS] Conversational Greeting: '{res['reply'][:65]}...'")

        res_joke = query_aadi_intelligence("tell me a joke", is_hindi=False, user_title="Aditya")
        self.assertTrue(res_joke["success"])
        self.assertEqual(res_joke["model"], "aadi-dialogue-engine")
        print(f"  [PASS] Conversational Joke: '{res_joke['reply'][:65]}...'")

    def test_02_spoken_math_engine(self):
        """Verify math evaluation in natural Hindi and English."""
        math_1 = solve_spoken_math("5000 ka 18 percent kitna hoga", is_hindi=True, user_title="Aditya")
        self.assertIsNotNone(math_1)
        self.assertIn("900", math_1)
        print(f"  [PASS] Spoken Percentage: '{math_1}'")

        math_2 = solve_spoken_math("square root of 144", is_hindi=False, user_title="Aditya")
        self.assertIsNotNone(math_2)
        self.assertIn("12", math_2)
        print(f"  [PASS] Spoken Square Root: '{math_2}'")

        math_3 = solve_spoken_math("calculate 250 plus 750", is_hindi=False, user_title="Aditya")
        self.assertIsNotNone(math_3)
        self.assertIn("1000", math_3)
        print(f"  [PASS] Spoken Arithmetic: '{math_3}'")

    def test_03_datetime_and_weather(self):
        """Verify real-time date/time and weather queries."""
        dt = solve_datetime_query("kitne baje hain", is_hindi=True, user_title="Aditya")
        self.assertIsNotNone(dt)
        self.assertIn("Aditya", dt)
        print(f"  [PASS] Real-time Time Query: '{dt}'")

        w = solve_weather_query("aaj ka mausam kaisa hai", is_hindi=True, user_title="Aditya")
        self.assertIsNotNone(w)
        self.assertIn("degree Celsius", w)
        print(f"  [PASS] Live Weather Query: '{w}'")

    def test_04_computer_actions_detection(self):
        """Verify voice commands for computer automations."""
        act_1 = detect_computer_action("vs code kholo")
        self.assertIsNotNone(act_1)
        self.assertEqual(act_1["action"], "OPEN_APP")
        self.assertEqual(act_1["params"]["appName"], "Visual Studio Code")
        print(f"  [PASS] Action Detection OPEN_APP: '{act_1['action']}' ({act_1['params']})")

        act_2 = detect_computer_action("video download karo 1080p me")
        self.assertIsNotNone(act_2)
        self.assertEqual(act_2["action"], "DOWNLOAD_YOUTUBE")
        self.assertEqual(act_2["params"]["quality"], "1080p")
        print(f"  [PASS] Action Detection DOWNLOAD_YOUTUBE: '{act_2['action']}' ({act_2['params']})")

        act_3 = detect_computer_action("volume badhao")
        self.assertIsNotNone(act_3)
        self.assertEqual(act_3["action"], "VOLUME_UP")
        print(f"  [PASS] Action Detection VOLUME_UP: '{act_3['action']}'")

    def test_05_wikipedia_autonomous_knowledge(self):
        """Verify zero-config factual knowledge retrieval."""
        wiki_res = query_aadi_intelligence("virat kohli kaun hai", is_hindi=True, user_title="Aditya")
        self.assertTrue(wiki_res["success"])
        self.assertEqual(wiki_res["model"], "aadi-wiki-engine")
        self.assertIn("cricketer", wiki_res["reply"].lower())
        print(f"  [PASS] Wikipedia Knowledge Search (Hindi): '{wiki_res['reply'][:70]}...'")

        wiki_en = query_aadi_intelligence("what is quantum computing", is_hindi=False, user_title="Aditya")
        self.assertTrue(wiki_en["success"])
        self.assertEqual(wiki_en["model"], "aadi-wiki-engine")
        self.assertIn("quantum", wiki_en["reply"].lower())
        print(f"  [PASS] Wikipedia Knowledge Search (English): '{wiki_en['reply'][:70]}...'")

if __name__ == "__main__":
    unittest.main()
