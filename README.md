# 🎨 Art Explorer

A full-stack web application that allows users to search, explore, and save artworks from **The Metropolitan Museum of Art** and **Harvard Art Museums**.

This project was developed as part of **CSCI 571 – Web Technologies (USC)**.

---

## 🚀 Live Demo

🔗 Cloud Run URL:  
https://art-explorer-394763791461.us-central1.run.app

---

## ✨ Features

### 🔍 Search & Filters
- Search artworks by keyword (e.g., Monet, Van Gogh)
- Filter by museum:
  - Met Museum
  - Harvard Art Museums
  - Both
- Filter by image availability:
  - Has Image
  - No Image

---

### 🖼️ Artwork Results
- Responsive grid layout (4 columns × 3 rows per page)
- Each artwork card displays:
  - Image (or placeholder if unavailable)
  - Title
  - Artist
  - Year
  - Museum badge (Met / Harvard)

---

### 📊 Pagination
- Server-side pagination
- Displays:
  - Total number of artworks
  - Current page (Page X of Y)
- Navigation:
  - Previous / Next buttons

---

### 🔎 Detail View

Clicking an artwork opens a detailed page with multiple tabs:

#### 🧾 Overview
- Artwork image
- Title, artist, date
- Medium, dimensions, department
- Link to museum website

#### 📖 Artist Biography
- Fetched from Wikipedia API
- Includes summary and description

#### 🖼️ Related Works
- Displays artworks from the same artist
- Fully clickable → opens another detail view

#### 🗺️ Museum Location
- Interactive map using Leaflet.js
- Shows museum location with marker and popup

---

### ❤️ Favorites
- Add / remove artworks to favorites
- Stored in browser `localStorage`
- Dedicated Favorites page
- Persistent after refresh

---

## 🛠️ Tech Stack

### Frontend
- HTML5 / CSS3
- Bootstrap 5 (responsive design)
- Vanilla JavaScript
- Leaflet.js (map integration)

### Backend
- Node.js
- Express.js

### APIs Used
- Met Museum API
- Harvard Art Museums API
- Wikipedia API

### Deployment
- Google Cloud Run (Docker container)

