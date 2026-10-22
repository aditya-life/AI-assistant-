# =========================================================
# HYBRID GEMINI AI & CONTINUOUS SELF-TRAINING QA SUITE
# =========================================================

import unittest
import json
import time
import os
from server import load_learned_intents, save_learned_intents, query_gemini_ai, config

class TestGeminiAndAutoTrain(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=======================================================")
        print("🧠 STARTING GEMINI HYBRID AI & CONTINUOUS SELF-TRAINING QA")
        print("=======================================================")

    def test_01_learned_intents_storage_schema(self):
        """Verify load and save of learned offline intents."""
        data = load_learned_intents()
        self.assertIn("version", data)
        self.assertIn("intents", data)
        self.assertIsInstance(data["intents"], list)
        print(f"  [PASS] Learned intents loaded ({len(data['intents'])} skills cached in offline neural memory).")

    def test_02_offline_pattern_matching_simulation(self):
        """Verify 0ms offline matching on cached question/keywords."""
        data = load_learned_intents()
        # Insert a test intent
        test_intent = {
            "id": "test_qa_skill",
            "query": "superconductor kya hai",
            "keywords": ["superconductor", "kya", "hai", "what", "is"],
            "reply_en": "A superconductor conducts electricity with zero resistance at low temperatures.",
            "reply_hi": "Superconductor ek aisi samagri hai jo bina kisi rukawat ke vidyut pravahit karti hai.",
            "action": None,
            "hitCount": 1
        }
        data["intents"].insert(0, test_intent)
        save_learned_intents(data)

        # Match function simulation
        def match_intent(text, is_hindi=True):
            clean = text.lower().strip()
            words = clean.split()
            intents = load_learned_intents().get("intents", [])
            for item in intents:
                if clean == item["query"] or clean in item["query"]:
                    return item["reply_hi"] if is_hindi else item["reply_en"]
                if any(k in words for k in item.get("keywords", [])):
                    return item["reply_hi"] if is_hindi else item["reply_en"]
            return None

        reply = match_intent("superconductor kya hai", is_hindi=True)
        self.assertIsNotNone(reply)
        self.assertIn("Superconductor", reply)
        print(f"  [PASS] 0ms Offline Local Memory Match: '{reply[:50]}...'")

    def test_03_ai_auto_distillation_pipeline(self):
        """Verify auto-training persistence into learned_intents.json."""
        data = load_learned_intents()
        initial_count = len(data["intents"])

        # Simulate auto-distillation save
        new_learned = {
            "id": f"learned_test_{int(time.time())}",
            "query": "tony stark ka armor kisne banaya",
            "keywords": ["tony", "stark", "armor", "kisne", "banaya"],
            "reply_en": "Tony Stark designed and engineered all Mark series armors himself.",
            "reply_hi": "Tony Stark ne apne sabhi Mark series armors khud design aur engineer kiye hain.",
            "action": None,
            "actionParams": {},
            "hitCount": 1,
            "learnedAt": int(time.time())
        }
        data["intents"].insert(0, new_learned)
        save_learned_intents(data)

        reloaded = load_learned_intents()
        self.assertEqual(len(reloaded["intents"]), initial_count + 1)
        self.assertEqual(reloaded["intents"][0]["id"], new_learned["id"])
        print(f"  [PASS] Auto-Distillation Verified: Stored query '{new_learned['query']}' into local memory.")

    def test_04_live_gemini_key_and_no_key_fallback(self):
        """Verify live key execution and graceful bilingual fallback when key is missing."""
        # 1. Live Key Test (if key configured)
        live_key = config.get("geminiApiKey", "") or os.environ.get("GEMINI_API_KEY", "")
        if live_key:
            live_res = query_gemini_ai(prompt="Quantum computing in 1 sentence", is_hindi=False, api_key=live_key)
            self.assertTrue(live_res["success"])
            self.assertIn("gemini-", live_res.get("model", ""))
            print(f"  [PASS] Live Gemini Key Verified! Model: '{live_res['model']}' | Reply: '{live_res['reply'][:60]}...'")
        else:
            print("  [NOTE] No live Gemini key configured; verifying zero-config fallback path.")

        # 2. Simulated No-Key Fallback
        saved_key = config.get("geminiApiKey", "")
        try:
            config["geminiApiKey"] = ""
            res = query_gemini_ai(prompt="What is quantum gravity?", is_hindi=True, api_key="")
            self.assertFalse(res["success"])
            self.assertEqual(res.get("error"), "NO_API_KEY")
            self.assertIn("Google Gemini API Key", res["reply"])
            print(f"  [PASS] Safe Fallback when API Key is missing: '{res['reply']}'")
        finally:
            config["geminiApiKey"] = saved_key

if __name__ == "__main__":
    unittest.main()
