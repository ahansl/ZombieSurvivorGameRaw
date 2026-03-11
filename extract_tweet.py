#!/usr/bin/env python3
"""
Extract text from a tweet using Twitter's public oEmbed API
and HTML parsing as a fallback.

Usage:
    python3 extract_tweet.py [tweet_url]

If no URL is provided, defaults to:
    https://x.com/vtrivedy10/status/2031408954517971368
"""

import sys
import json
import re
from urllib.request import urlopen, Request
from urllib.parse import quote
from html.parser import HTMLParser


class TweetTextExtractor(HTMLParser):
    """Parse the HTML returned by the oEmbed API to extract plain text."""

    def __init__(self):
        super().__init__()
        self.texts = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag == "br":
            self.texts.append("\n")

    def handle_data(self, data):
        self.texts.append(data)

    def get_text(self):
        return "".join(self.texts).strip()


def extract_tweet_text(tweet_url: str) -> dict:
    """
    Fetch tweet content via Twitter's public oEmbed endpoint.

    Returns a dict with author_name, author_url, and extracted tweet text.
    """
    # Normalize x.com URLs to twitter.com (oEmbed may require it)
    normalized = tweet_url.replace("https://x.com/", "https://twitter.com/")
    # Strip query params like ?s=46
    normalized = re.sub(r"\?.*$", "", normalized)

    oembed_url = (
        f"https://publish.twitter.com/oembed?url={quote(normalized, safe='/:')}"
    )

    req = Request(oembed_url, headers={"User-Agent": "Mozilla/5.0"})

    try:
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        # Fallback: try with the original x.com URL
        oembed_url_alt = (
            f"https://publish.twitter.com/oembed?url={quote(tweet_url.split('?')[0], safe='/:')}"
        )
        req_alt = Request(oembed_url_alt, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urlopen(req_alt, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e2:
            return {"error": f"Could not fetch tweet. Primary: {e}  Fallback: {e2}"}

    # The 'html' field contains the tweet text wrapped in a <blockquote>
    html_content = data.get("html", "")

    extractor = TweetTextExtractor()
    extractor.feed(html_content)
    full_text = extractor.get_text()

    # The extracted text typically ends with "— Author (@handle) Date"
    # Split out the tweet body from the attribution line
    parts = full_text.rsplit("\u2014", 1)  # split on em-dash
    tweet_body = parts[0].strip() if parts else full_text
    attribution = parts[1].strip() if len(parts) > 1 else ""

    return {
        "author_name": data.get("author_name", ""),
        "author_url": data.get("author_url", ""),
        "tweet_text": tweet_body,
        "attribution": attribution,
        "full_extracted_text": full_text,
        "raw_html": html_content,
    }


def main():
    default_url = "https://x.com/vtrivedy10/status/2031408954517971368?s=46"
    tweet_url = sys.argv[1] if len(sys.argv) > 1 else default_url

    print(f"Extracting text from: {tweet_url}\n")

    result = extract_tweet_text(tweet_url)

    if "error" in result:
        print(f"Error: {result['error']}")
        sys.exit(1)

    print("=" * 60)
    print(f"Author : {result['author_name']}")
    print(f"Profile: {result['author_url']}")
    print("=" * 60)
    print(f"\nTweet Text:\n{result['tweet_text']}")
    if result["attribution"]:
        print(f"\nAttribution: {result['attribution']}")
    print("\n" + "=" * 60)
    print(f"\nFull Extracted Text:\n{result['full_extracted_text']}")


if __name__ == "__main__":
    main()
