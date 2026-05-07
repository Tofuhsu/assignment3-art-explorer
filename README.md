# 🎨 Art Explorer

A full-stack web application that allows users to search, explore, and save artworks from **The Metropolitan Museum of Art** and **Harvard Art Museums**.

This project was developed as part of **CSCI 571 (Web Technologies)** at USC.

---

## 🚀 Live Demo

🔗 Cloud Run URL:  
> https://YOUR_CLOUD_RUN_URL

---

## ✨ Features

### 🔍 Search & Filter
- Search artworks by keyword
- Filter by museum:
  - Met Museum
  - Harvard Art Museums
  - Both
- Filter by image availability:
  - Has Image
  - No Image

---

### 📄 Artwork Results
- Display artworks in responsive grid (4 × 3 layout)
- Each artwork card shows:
  - Image (or placeholder)
  - Title
  - Artist
  - Date
  - Museum badge

---

### 📊 Pagination
- Server-side pagination
- Displays:
  - Total number of artworks
  - Current page number
- Navigation:
  - Previous / Next buttons

---

### 🔎 Detail View
Clicking an artwork opens detailed information with tabs:

#### 🧾 Overview
- Image
- Title
- Artist
- Medium
- Dimensions
- Department
- Museum link

#### 📖 Artist Biography
- Retrieved from Wikipedia API
- Includes description and summary

#### 🖼️ Related Works
- Shows artworks from the same artist
- Clickable → opens another detail view

#### 🗺️ Museum Location
- Interactive map using Leaflet.js
- Displays museum location with marker

---

### ❤️ Favorites
- Add/remove artworks to favorites
- Stored in `localStorage`
- Dedicated Favorites page
- Persistent across page reloads

---

## 🛠️ Tech Stack

### Frontend
- HTML5 / CSS3
- Bootstrap 5 (responsive design)
- Vanilla JavaScript
- Leaflet.js (map)

### Backend
- Node.js
- Express.js

### APIs
- Met Museum API
- Harvard Art Museums API
- Wikipedia API

### Deployment
- Google Cloud Run (Docker container)

---

## 📦 Project Structure
