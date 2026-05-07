async function apiGet(url) {
  const response = await fetch(url);

  let data = {};
  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid JSON response");
  }

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}