let artExplorerMap = null;

function renderMap(latitude, longitude, museumName, address) {
  const mapContainer = document.getElementById("mapContainer");
  if (!mapContainer) return;

  if (artExplorerMap) {
    artExplorerMap.remove();
    artExplorerMap = null;
  }

  artExplorerMap = L.map("mapContainer").setView([latitude, longitude], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(artExplorerMap);

  L.marker([latitude, longitude])
    .addTo(artExplorerMap)
    .bindPopup(`<strong>${museumName}</strong><br>${address}`)
    .openPopup();
}