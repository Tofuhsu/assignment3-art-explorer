🎨 Art Explorer

A full-stack web application that allows users to search, explore, and save artworks from The Metropolitan Museum of Art and Harvard Art Museums.

Developed as part of CSCI 571 – Web Technologies (University of Southern California).

🚀 Live Demo

🔗 https://art-explorer-394763791461.us-central1.run.app

✨ Features
🔍 Search & Filters
Search artworks by keyword (e.g., Monet, Van Gogh)
Filter by museum:
Met Museum
Harvard Art Museums
Both
Filter by image availability:
Has Image
No Image
🖼️ Artwork Results
Responsive grid layout (4 columns × 6 rows per page = 24 items)
Each artwork card displays:
Image (or placeholder if unavailable)
Title (truncated to 4 lines)
Artist name
Year
Museum badge (Met / Harvard)
📊 Pagination
Client-side pagination
Displays:
Total number of artworks
Current page (Page X of Y)
Navigation:
Previous / Next buttons
Disabled state for boundary pages
🔎 Detail View

Clicking an artwork opens a detailed page with multiple tabs:

🧾 Overview
Artwork image
Title, artist, date
Medium, dimensions, classification
Museum source label
Link to official museum page
📖 Artist Biography
Retrieved via Wikipedia API
Displays summary and description
🖼️ Related Works
Shows artworks by the same artist
Fully interactive (click to navigate)
🗺️ Museum Location
Displays museum location
Integrated with Leaflet.js map
❤️ Favorites
Add / remove artworks to favorites
Stored in browser localStorage
Dedicated Favorites page
Persistent across page refresh

🧩 System Architecture
Client (Browser)
   ↓
React Frontend
   ↓
Node.js / Express Backend (Proxy)
   ↓
External APIs
   - Met Museum API
   - Harvard Art Museums API
   - Wikipedia API
⚙️ CORS Handling

The Met Museum API does not allow direct browser requests due to CORS restrictions.

To resolve this:

A Node.js backend proxy is implemented
All API requests are routed through Express
The backend fetches data and returns it to the frontend

This ensures seamless integration with both APIs.

🛠️ Tech Stack
Frontend
HTML5 / CSS3
Bootstrap 5
JavaScript (ES6)
Leaflet.js
Backend
Node.js
Express.js
APIs
Met Museum API
Harvard Art Museums API
Wikipedia API
Deployment
Docker
Google Cloud Run
☁️ Deployment

The application is deployed using Google Cloud Run:

Steps:

Dockerize the application
Build using Google Cloud Build
Deploy container to Cloud Run
Configure environment variables
🧪 Run Locally
# Clone repo
git clone https://github.com/你的帳號/assignment3-art-explorer.git
cd assignment3-art-explorer

# Install dependencies
npm install

# Create .env
HARVARD_API_KEY=your_api_key_here

# Run app
npm run dev

Open browser:

http://localhost:3000
🧠 AI Usage

AI tools were used for:

Debugging API integration
Handling CORS issues
Improving UI structure
Deployment guidance

All code was reviewed and tested manually before submission.

👨‍💻 Author

Hsuan-Fu Hsu
CSCI 571 – Web Technologies
University of Southern California
