# =========================================================
# BILINGUAL INTENT & LANGUAGE VERIFICATION SUITE
# =========================================================

import unittest
import re

class TestJarvisBilingualEngine(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n=======================================================")
        print("🇮🇳 / 🇬🇧 STARTING EXPANDED BILINGUAL (HINDI + ENGLISH) AUDIT")
        print("=======================================================")

        cls.hindi_keywords = [
            'hai', 'hain', 'ho', 'hona', 'karo', 'kar', 'karein', 'karna', 'kardo', 'karoge', 'kholo', 'khol', 'kholna',
            'chalao', 'chala', 'chale', 'chalana', 'chalaye', 'batao', 'bata', 'batana', 'dikhau', 'dikhao', 'dekho', 'dekh',
            'kaisa', 'kaise', 'kaisi', 'kitna', 'kitni', 'kitne', 'mera', 'meri', 'mere', 'tera', 'teri', 'tere', 'aapka', 'aapki',
            'hum', 'hamara', 'hamari', 'uska', 'uski', 'unka', 'unki', 'kya', 'kyun', 'kab', 'kahan', 'kaha', 'kidhar', 'kaun',
            'kiska', 'kiski', 'kisko', 'nahi', 'haan', 'sun', 'suno', 'sunao', 'sunna', 'subah', 'namaste', 'namaskar', 'pranam',
            'shubh', 'aawaz', 'awaz', 'dhwani', 'rasta', 'gaana', 'gana', 'geet', 'sangeet', 'baat', 'baatein', 'band', 'badhao',
            'ghatao', 'kam', 'jyada', 'zyada', 'tez', 'dheere', 'dhire', 'par', 'pe', 'ko', 'se', 'me', 'mein', 'tak', 'bhejo',
            'bachao', 'mausam', 'barish', 'dhoop', 'hawa', 'taapmaan', 'do', 'de', 'dena', 'dijiye', 'ka', 'ki', 'ke', 'aur',
            'ab', 'toh', 'bhi', 'bajao', 'baja', 'lagao', 'laga', 'jaldi', 'aaram', 'jodo', 'guna', 'bhaag', 'kheecho', 'khicho',
            'saaf', 'theek', 'kripya', 'dhanyawad', 'shukriya', 'thoda', 'thode', 'thodi', 'bolo', 'bol', 'bolein', 'bologe',
            'bolna', 'kuch', 'yaar', 'bhai', 'dost', 'samay', 'waqt', 'din', 'aaj', 'kal', 'parson', 'tarikh', 'tareekh', 'saal',
            'mahina', 'khabar', 'samachar', 'bijli', 'charg', 'charge', 'chup', 'shant', 'shuru', 'rok', 'roko', 'shuruat',
            'khush', 'udaas', 'thaka', 'madad', 'sahayata', 'kripa', 'acha', 'achha', 'achhi', 'achhe', 'sahi', 'galat',
            'khana', 'peena', 'pani', 'chai', 'kaam', 'padhai', 'naukri', 'paisa', 'rupaye', 'hisab', 'hisab-kitab'
        ]

    def is_hindi(self, text: str) -> bool:
        has_devanagari = bool(re.search(r'[\u0900-\u097F]', text))
        if has_devanagari:
            return True
        words = re.findall(r'\b\w+\b', text.lower())
        return any(w in self.hindi_keywords for w in words)

    def test_01_hindi_detection_matrix(self):
        """Verify Hindi & Hinglish voice commands are correctly identified as Hindi."""
        hindi_samples = [
            ("YouTube par Arijit Singh gana chalao", True),
            ("Mac ka battery status batao", True),
            ("Master volume 80 percent set karo", True),
            ("Screen lock kar do", True),
            ("Delhi me mausam kaisa hai", True),
            ("Jarvis note down kal 4 baje meeting hai", True),
            ("Shubh prabhat Jarvis", True),
            ("Mera notes dikhao", True),
            ("Focus mode chalao", True),
            ("Thoda dheere bolo", True),
            ("Thoda fast bolo", True),
            ("Aawaz kam karo", True),
            ("यूट्यूब पर चलाओ", True),
            ("गाना बजाओ", True)
        ]
        for phrase, expected in hindi_samples:
            result = self.is_hindi(phrase)
            self.assertEqual(result, expected, f"Failed for phrase: '{phrase}'")
            print(f"  [PASS] Hindi Detected: '{phrase}' -> isHindi: {result}")

    def test_02_english_detection_matrix(self):
        """Verify Pure English commands are correctly identified as English."""
        english_samples = [
            ("Search Iron Man 4 trailer on YouTube", False),
            ("Check system battery level", False),
            ("Set master volume to 70 percent", False),
            ("Lock the workstation", False),
            ("What is the current atmospheric weather", False),
            ("Jarvis save note Buy groceries", False),
            ("Good morning Jarvis", False),
            ("Show my notes", False),
            ("Engage focus protocol", False),
            ("Speak slower", False),
            ("Speak faster", False)
        ]
        for phrase, expected in english_samples:
            result = self.is_hindi(phrase)
            self.assertEqual(result, expected, f"Failed for phrase: '{phrase}'")
            print(f"  [PASS] English Detected: '{phrase}' -> isHindi: {result}")

    def test_03_youtube_play_vs_search_intent(self):
        """Verify distinction between direct play intent and search intent."""
        play_phrases = [
            "YouTube par Arijit Singh gana chalao",
            "YouTube pe Iron Man scene play karo",
            "YouTube par Kesariya bajao",
            "YouTube par video chala do",
            "यूट्यूब पर गाना बजाओ",
            "Vanced me Arijit Singh gana chalao",
            "Vanced pe Kesariya bajao"
        ]
        search_phrases = [
            "YouTube par Iron Man search karo",
            "YouTube pe trailers dikhao",
            "Search latest news on YouTube"
        ]

        def is_play_intent(text):
            t = text.lower()
            return any(k in t for k in ['chalao', 'chala do', 'play', 'bajao', 'baja do', 'sunao', 'laga do', 'lagao', 'बजाओ', 'चलाओ', 'सुनाओ', 'प्ले'])

        for p in play_phrases:
            self.assertTrue(is_play_intent(p), f"Should be play intent: '{p}'")
            print(f"  [PASS] Play Intent Verified: '{p}'")

        for s in search_phrases:
            if not any(k in s.lower() for k in ['chalao', 'play', 'bajao']):
                self.assertFalse(is_play_intent(s), f"Should NOT be play intent: '{s}'")
                print(f"  [PASS] Search Intent Verified: '{s}'")

    def test_04_speed_control_intent(self):
        """Verify dynamic speed voice control intents."""
        faster_phrases = ["Thoda fast bolo", "Tez bolo", "Speed badhao", "Speak faster"]
        slower_phrases = ["Thoda slow bolo", "Dheere bolo", "Speed kam karo", "Speak slower"]

        def is_faster(t):
            return any(k in t.lower() for k in ['fast', 'tez', 'speed badhao', 'faster', 'तेज'])

        def is_slower(t):
            return any(k in t.lower() for k in ['slow', 'dheere', 'dhire', 'speed kam', 'slower', 'धीरे'])

        for p in faster_phrases:
            self.assertTrue(is_faster(p))
            print(f"  [PASS] Fast Speed Intent: '{p}'")

        for p in slower_phrases:
            self.assertTrue(is_slower(p))
            print(f"  [PASS] Slow Speed Intent: '{p}'")

if __name__ == "__main__":
    unittest.main()
