# BigQuery Release Notes Explorer & Tweet Composer

This is a modern, responsive Flask web application that aggregates, parses, and formats the official Google BigQuery Release Notes feed. It presents updates in a premium, glassmorphic dark-themed user interface, allowing you to filter updates, search for terms, and draft/share updates to Twitter (X) directly.

## 📁 File Structure

The project has been initialized in your workspace at `/home/daniel/agentic/projects/my-first-project/code_exp`. The files are:

* [app.py](file:///home/daniel/agentic/projects/my-first-project/code_exp/app.py): The Flask backend that handles caching (5-minute TTL), fetching the Google feed XML, parsing elements, splitting multi-heading updates, converting HTML to clean plain text, and exposing REST endpoints.
* [templates/index.html](file:///home/daniel/agentic/projects/my-first-project/code_exp/templates/index.html): The main web page structure. Features semantic HTML5 elements, unique IDs for testing, inline SVG icons, dashboard stats, search bars, category tags, skeleton loaders, and the modal structure for the Tweet Composer.
* [static/css/styles.css](file:///home/daniel/agentic/projects/my-first-project/code_exp/static/css/styles.css): Custom CSS styles creating a premium, modern user interface. Uses responsive grid systems, vibrant HSL gradients, glassmorphism panel blur effects, animated loaders, and custom modal scale-up transitions.
* [static/js/app.js](file:///home/daniel/agentic/projects/my-first-project/code_exp/static/js/app.js): Client-side application script managing state, search filters, category chip generation, chronologic sorting, rendering, character limits, copy-to-clipboard utilities, and launching Twitter's Web Intent.

---

## 🚀 Key Features

### 1. Granular Update Parsing
Unlike basic feed parsers that display a single day's updates as a single block of text, this application parses the HTML payload of each RSS entry. If a single day contains multiple releases (e.g., Features, Announcements, and Issues listed together), it splits them into **separate interactive cards**.

### 2. Category Filter & Keyword Search
* **Dynamic Tag Counts:** Automatically counts and classifies the total count of Features, Announcements, and Issues from the feed.
* **Instant Keyword Filter:** Filters feed content instantly as you type in the search bar.
* **Interactive Filtering:** Allows filtering by clicking on dynamic category chips or sorting by date (newest or oldest first).

### 3. Integrated Tweet Composer
* **Drafting Engine:** Clicking the "Tweet" button on any release note extracts its metadata and formats a clean tweet. HTML links in the release are preserved as clean inline URL citations, e.g., `text (URL)`.
* **Visual Character Counter:** An interactive circular SVG progress ring changes color dynamically (Blue ➔ Yellow ➔ Red) to guide you through Twitter's 280-character post limit. It disables the "Share on X" action if you exceed the limit.
* **Copy & Share Actions:** Offers a single-click "Copy Draft" button with toast confirmations, alongside a "Share on X" button that launches Twitter's official Web Intent editor populated with your customized text.

### 4. Utility & Data Tools
* **Card Clipboard Utility:** Each individual update card contains a quick "Copy" button in its footer that immediately copies the parsed plain-text description to your clipboard for quick sharing or documentation elsewhere.
* **Smart CSV Export:** The application has a top-level "Export CSV" tool. Clicking this exports the **currently active filtered and sorted view** of release notes as a downloadable CSV file (`bigquery_release_notes_YYYY-MM-DD.csv`), capturing columns for Date, UTC Timestamp, Release Type, and Plain Text description.

---

## 🛠️ How to Run the App

The web application is currently running as a background task. You can access it locally:

> [!NOTE]
> The dev server is active at **http://127.0.0.1:5000**. Open this address in your web browser to interact with the application.

### Managing the Server
If you ever need to manually stop or restart the server, run these terminal commands in `/home/daniel/agentic/projects/my-first-project/code_exp`:

**Activate the Environment & Run Server:**
```bash
# Activate python virtual environment
source venv/bin/activate

# Launch the Flask server
python3 app.py
```

**Port Customization:**
By default, the server runs on port `5000`. You can change this by modifying the `app.run` call at the bottom of [app.py](file:///home/daniel/agentic/projects/my-first-project/code_exp/app.py#L112-L113):
```python
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```
