import unittest
from previewer.links import normalize_github_url, parse_input_line, parse_bulk_links


class TestLinks(unittest.TestCase):
    def test_normalize_standard(self):
        owner, repo, err = normalize_github_url("https://github.com/patvikan24-oss/my-profil-013")
        self.assertIsNone(err)
        self.assertEqual(owner, "patvikan24-oss")
        self.assertEqual(repo, "my-profil-013")

    def test_normalize_variations(self):
        cases = [
            ("https://github.com/foo/bar/", ("foo", "bar")),
            ("https://github.com/foo/bar.git", ("foo", "bar")),
            ("http://github.com/foo/bar", ("foo", "bar")),
            ("github.com/foo/bar", ("foo", "bar")),
            ("https://github.com/foo/bar/tree/main", ("foo", "bar")),
            ("https://github.com/foo/bar/blob/dev/src/index.html", ("foo", "bar")),
            ("https://github.com/foo/bar?tab=readme-ov-file#intro", ("foo", "bar")),
            ("  https://github.com/foo/bar.git/  ", ("foo", "bar")),
        ]
        for url, expected in cases:
            with self.subTest(url=url):
                owner, repo, err = normalize_github_url(url)
                self.assertIsNone(err)
                self.assertEqual((owner, repo), expected)

    def test_invalid_urls(self):
        invalid = [
            "",
            "   ",
            "https://google.com/search",
            "https://github.com/foo",
            "https://github.com/../bar",
        ]
        for url in invalid:
            with self.subTest(url=url):
                owner, repo, err = normalize_github_url(url)
                self.assertIsNotNone(err)

    def test_parse_input_line(self):
        # 1. URL only
        item = parse_input_line("https://github.com/patvikan24-oss/my-profil-013")
        self.assertIsNotNone(item)
        self.assertTrue(item.is_valid)
        self.assertEqual(item.student_name, "patvikan24-oss/my-profil-013")

        # 2. Student name with tab
        item = parse_input_line("ภัทวิกาญจน์\thttps://github.com/patvikan24-oss/my-profil-013")
        self.assertIsNotNone(item)
        self.assertTrue(item.is_valid)
        self.assertEqual(item.student_name, "ภัทวิกาญจน์")
        self.assertEqual(item.canonical_url, "https://github.com/patvikan24-oss/my-profil-013")

        # 3. Student name with comma
        item = parse_input_line("กิตติศักดิ์, https://github.com/kittisak/portfolio")
        self.assertIsNotNone(item)
        self.assertTrue(item.is_valid)
        self.assertEqual(item.student_name, "กิตติศักดิ์")

    def test_bulk_parse_and_deduplication(self):
        text = """
        https://github.com/patvikan24-oss/my-profil-013
        ภัทวิกาญจน์\thttps://github.com/patvikan24-oss/my-profil-013/tree/main
        สมชาย\thttps://github.com/somchai/web-project
        https://not-github.com/invalid
        """
        items = parse_bulk_links(text)
        self.assertEqual(len(items), 3)  # 2 valid deduplicated + 1 invalid
        # The deduplicated item should pick up the student name
        first = items[0]
        self.assertEqual(first.student_name, "ภัทวิกาญจน์")
        self.assertTrue(items[0].is_valid)
        self.assertTrue(items[1].is_valid)
        self.assertFalse(items[2].is_valid)


if __name__ == "__main__":
    unittest.main()
