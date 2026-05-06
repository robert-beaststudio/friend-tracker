const FRIENDS = {
  paul: { lat: 55.607781, lng: 13.038325 },
  ringo: { lat: 55.610789, lng: 13.041733 },
};

// ── State ───────────────────────────────────────────────────────────────
let target = null;
let watchId = null;
let prevDist = null;
let userPos = null;

// ── DOM ─────────────────────────────────────────────────────────────────
const screenPicker = document.getElementById("screen-picker");
const screenTracker = document.getElementById("screen-tracker");
const trackerName = document.getElementById("trackerName");
const trackerStatus = document.getElementById("trackerStatus");
const trackerDist = document.getElementById("trackerDistance");
const trackerArrow = document.getElementById("trackerArrow");
const backBtn = document.getElementById("backBtn");

// ── Haversine distance (metres) ─────────────────────────────────────────
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

// ── Bearing from a → b (degrees, 0=north, clockwise) ──────────────────
function bearingTo(a, b) {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ── Compass heading ─────────────────────────────────────────────────────
let compassHead = null;

function startCompass() {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission()
      .then((r) => {
        if (r === "granted") listenOrientation();
      })
      .catch(() => {});
  } else {
    listenOrientation();
  }
}

function listenOrientation() {
  window.addEventListener("deviceorientationabsolute", onOrientation, true);
  window.addEventListener("deviceorientation", onOrientation, true);
}

function onOrientation(e) {
  if (e.webkitCompassHeading != null) {
    compassHead = e.webkitCompassHeading;
  } else if (e.absolute && e.alpha != null) {
    compassHead = (360 - e.alpha) % 360;
  }
  updateArrow();
}

// ── Update display ──────────────────────────────────────────────────────
function update(pos) {
  const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  userPos = me;
  const dist = distanceTo(me, target);

  // Determine state
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

  // Distance label
  trackerDist.textContent =
    dist >= 1000 ? `${(dist / 1000).toFixed(2)} km` : `${Math.round(dist)} m`;

  trackerStatus.textContent = statusText;

  // Background colour
  document.body.className = `state-${state}`;

  // Arrow
  updateArrow();
}

function updateArrow() {
  if (!target || !userPos) return;
  const bearing = bearingTo(userPos, target);
  const relAngle =
    compassHead !== null ? (bearing - compassHead + 360) % 360 : bearing;
  trackerArrow.style.transform = `rotate(${relAngle}deg)`;
  trackerArrow.classList.add("visible");
}

// ── Pick a friend ───────────────────────────────────────────────────────
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

// ── Back button ─────────────────────────────────────────────────────────
backBtn.addEventListener("click", () => {
  stopGPS();
  userPos = null;
  prevDist = null;
  trackerArrow.classList.remove("visible");
  document.body.className = "";
  screenTracker.classList.remove("active");
  screenPicker.classList.add("active");
});

// ── GPS ─────────────────────────────────────────────────────────────────
// iOS needs a gesture to start compass; Android works immediately
document.body.addEventListener(
  "click",
  () => {
    if (compassHead === null) startCompass();
  },
  { once: true },
);
startCompass();

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
