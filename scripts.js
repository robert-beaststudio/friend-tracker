const FRIENDS = {
  paul: { lat: 55.607781, lng: 13.038325 },
  ringo: { lat: 55.610789, lng: 13.041733 },
};

let target = null;
let watchId = null;
let prevDist = null;

const screenPicker = document.getElementById("screen-picker");
const screenTracker = document.getElementById("screen-tracker");
const trackerName = document.getElementById("trackerName");
const trackerStatus = document.getElementById("trackerStatus");
const trackerDist = document.getElementById("trackerDistance");
const backBtn = document.getElementById("backBtn");

function distanceTo(a, b) {
  const R = 6371000;
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function update(pos) {
  const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  const dist = distanceTo(me, target);

  let state, statusText;
  if (dist < 10) {
    state = "good";
    statusText = "YOU'RE HERE!";
  } else if (prevDist !== null && dist < prevDist) {
    state = "good";
    statusText = "GETTING CLOSER";
  } else if (prevDist !== null && dist > prevDist + 2) {
    state = "bad";
    statusText = "WRONG WAY";
  } else {
    state = "neutral";
    statusText = "KEEP MOVING…";
  }

  prevDist = dist;

  trackerDist.textContent =
    dist >= 1000 ? `${(dist / 1000).toFixed(2)} km` : `${Math.round(dist)} m`;

  trackerStatus.textContent = statusText;

  document.body.className = `state-${state}`;
}

document.querySelectorAll(".list-group-item:not(.disabled)").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    const key = el.dataset.friend;
    target = FRIENDS[key];
    trackerName.textContent = el.textContent
      .trim()
      .split("\n")[0]
      .trim()
      .toUpperCase();
    trackerStatus.textContent = "LOCATING…";
    trackerDist.textContent = "– m";
    prevDist = null;
    document.body.className = "";

    screenPicker.classList.remove("active");
    screenTracker.classList.add("active");

    startGPS();
  });
});

backBtn.addEventListener("click", () => {
  stopGPS();
  document.body.className = "";
  screenTracker.classList.remove("active");
  screenPicker.classList.add("active");
});

function startGPS() {
  if (!navigator.geolocation) {
    trackerStatus.textContent = "GPS NOT SUPPORTED";
    return;
  }
  watchId = navigator.geolocation.watchPosition(
    update,
    (err) => {
      trackerStatus.textContent = "GPS DENIED";
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
  );
}

function stopGPS() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}
