from flask import Flask, jsonify, render_template, request
import urllib.request
import xml.etree.ElementTree as ET
import re
import html
import time
import os

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    'data': None,
    'last_updated': 0
}
CACHE_DURATION = 300 # 5 minutes

def clean_html_to_text(html_content):
    """
    Converts HTML release note body to clean plain text,
    formatting links as 'text (URL)' and code blocks with backticks/quotes
    so they look great in a draft tweet.
    """
    # Format code tags
    text = re.sub(r'<code>(.*?)</code>', r'"\1"', html_content)
    # Format links to include their destination
    # e.g., <a href="url">text</a> -> text (url)
    text = re.sub(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', r'\2 (\1)', text)
    # Strip remaining HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Unescape HTML entities (e.g. &amp; -> &, &quot; -> ")
    text = html.unescape(text)
    # Collapse multiple whitespaces/newlines into single spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def fetch_and_parse_feed(force_refresh=False):
    now = time.time()
    if not force_refresh and cache['data'] and (now - cache['last_updated'] < CACHE_DURATION):
        return cache['data'], False # Cache hit, not refetched from network
    
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    req = urllib.request.Request(FEED_URL, headers=headers)
    
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('.//atom:entry', ns)
    
    parsed_updates = []
    
    for entry in entries:
        date_str = entry.find('atom:title', ns).text
        updated_str = entry.find('atom:updated', ns).text
        entry_id = entry.find('atom:id', ns).text
        content_html = entry.find('atom:content', ns).text or ""
        
        # Split single day entries into individual updates by H3 tags
        parts = re.split(r'(<h3>.*?</h3>)', content_html)
        
        # If there are no H3 tags, treat the whole body as one Update
        if len(parts) <= 1:
            clean_txt = clean_html_to_text(content_html)
            parsed_updates.append({
                'id': f"{entry_id}_0",
                'date': date_str,
                'updated': updated_str,
                'type': 'Update',
                'html': content_html.strip(),
                'text': clean_txt
            })
            continue
            
        # Parse alternate H3 headers and their bodies
        update_idx = 0
        for idx in range(1, len(parts), 2):
            h3_tag = parts[idx]
            body_html = parts[idx+1] if idx+1 < len(parts) else ""
            
            type_match = re.search(r'<h3>(.*?)</h3>', h3_tag)
            update_type = type_match.group(1) if type_match else "Update"
            
            clean_txt = clean_html_to_text(body_html)
            
            parsed_updates.append({
                'id': f"{entry_id}_{update_idx}",
                'date': date_str,
                'updated': updated_str,
                'type': update_type,
                'html': body_html.strip(),
                'text': clean_txt
            })
            update_idx += 1
            
    cache['data'] = parsed_updates
    cache['last_updated'] = now
    return parsed_updates, True # Refetched from network

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        updates, refetched = fetch_and_parse_feed(force_refresh)
        return jsonify({
            'success': True,
            'refetched': refetched,
            'count': len(updates),
            'updates': updates
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Default port is 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
