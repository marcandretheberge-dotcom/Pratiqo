import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import "tsx/cjs";
import React from "react";
const loadComponent = createRequire(import.meta.url);
global.React = React;
global.IS_REACT_ACT_ENVIRONMENT = true;
const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", { configurable: true, value: dom.window.navigator });
const { createRoot } = await import("react-dom/client");
const { act } = React;
const maps = [], clusters = [];
let geoRequests = 0, failLoader = false;
navigator.geolocation = { getCurrentPosition: () => { geoRequests++; } };
class MapMock {
  constructor(element, options) { this.options = options; this.fitCalls = []; this.listeners = {}; maps.push(this); }
  addListener(event, fn) { this.listeners[event] = fn; }
  getBounds() { return { getNorthEast: () => ({ lat: () => 47, lng: () => -70 }), getSouthWest: () => ({ lat: () => 46, lng: () => -71 }) }; }
  fitBounds(bounds, padding) { this.fitCalls.push({ bounds, padding }); }
  getZoom() { return this.options.zoom; }
  setZoom(zoom) { this.options.zoom = zoom; }
  panTo(coords) { this.center = coords; }
}
class MarkerMock {
  constructor(options) { this.options = options; this.listeners = {}; }
  addListener(event, fn) { this.listeners[event] = fn; }
  setMap() {}
}
class ClusterMock {
  constructor() { clusters.push(this); this.markers = []; }
  clearMarkers() { this.markers = []; }
  addMarkers(markers) { this.markers = markers; }
  setMap() {}
}
global.google = { maps: {
  Map: MapMock, Marker: MarkerMock, SymbolPath: { CIRCLE: "circle" },
  LatLngBounds: class { constructor() { this.points = []; } extend(point) { this.points.push(point); } },
  event: { addListenerOnce: () => {} },
} };
const dict = JSON.parse(readFileSync(new URL("../../lib/i18n/locales/fr.json", import.meta.url), "utf8"));
const locale = { t: key => dict[key], formatDisplayPrice: amount => ({ primary: `${amount} CAD` }) };
const originalLoad = Module._load;
Module._load = function(id, ...rest) {
  if (id.endsWith("lib/locale-context")) return { useLocale: () => locale };
  if (id === "@googlemaps/js-api-loader") return {
    setOptions: () => {}, importLibrary: async () => { if (failLoader) throw new Error("loader-test-only"); },
  };
  if (id === "@googlemaps/markerclusterer") return { MarkerClusterer: ClusterMock };
  return originalLoad.call(this, id, ...rest);
};
const { SearchMapView } = loadComponent(resolve("components/SearchMapView.tsx"));
Module._load = originalLoad;
const teachers = [0, 1].map(i => ({ id: `fixture-${i}`, name: `Fixture ${i}`, pricePerLesson: 40,
  location: { lat: 46.1 + i, lng: -70.6 }, teachingZones: [] }));
let selected = null, searched = null;
const props = {
  teachers: [], userLat: null, userLng: null, selectedTeacher: null,
  onTeacherSelect: teacher => { selected = teacher; }, onViewProfile: () => {}, onCloseSelected: () => {},
  onBoundsSearch: bounds => { searched = bounds; }, requestLocationOnMount: false, fitTeachersOnLoad: true,
};
let root;
async function render(extra = {}) { await act(async () => { root.render(React.createElement(SearchMapView, { ...props, ...extra })); }); }
async function unmount() { await act(async () => root.unmount()); }
(async () => {
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "test-only-not-a-real-key";
  root = createRoot(document.getElementById("root"));
  await render();
  assert.equal(geoRequests, 0, "Automatic homepage map never prompts for location");
  assert.equal(maps.length, 1);
  assert.equal(maps[0].fitCalls.length, 0);
  await render({ teachers });
  assert.equal(clusters[0].markers.length, 2);
  assert.equal(maps[0].fitCalls.length, 1, "Frame late-arriving public teachers once");
  assert.deepEqual(maps[0].fitCalls[0].bounds.points, teachers.map(t => ({ lat: t.location.lat, lng: t.location.lng })));
  clusters[0].markers[1].listeners.click();
  assert.equal(selected.id, teachers[1].id);
  await render({ teachers, highlightedTeacherId: teachers[1].id });
  assert.equal(clusters[0].markers[1].options.icon.scale, 23);
  assert.equal(maps.length, 1, "Hover does not recreate the map");
  await render({ teachers: teachers.slice(0, 1) });
  assert.equal(clusters[0].markers.length, 1);
  assert.equal(maps[0].fitCalls.length, 1, "Filtering does not undo manual map framing");
  await act(async () => { maps[0].listeners.idle(); maps[0].listeners.idle(); });
  await act(async () => document.querySelector("button").click());
  assert.deepEqual(searched, { ne: { lat: 47, lng: -70 }, sw: { lat: 46, lng: -71 } });
  await act(async () => window.gm_authFailure());
  assert.equal(document.querySelector('[role="status"]').textContent, dict.landingMapUnavailable);
  assert.ok(!document.body.textContent.includes("test-only-not-a-real-key"));
  await unmount();
  assert.equal(window.gm_authFailure, undefined);

  root = createRoot(document.getElementById("root"));
  await render({ teachers, userLat: 0, userLng: 5 });
  assert.deepEqual(maps[1].options.center, { lat: 0, lng: 5 }, "Zero latitude is valid");
  assert.equal(maps[1].fitCalls.length, 0, "Explicit location takes precedence");
  await unmount();
  failLoader = true;
  root = createRoot(document.getElementById("root"));
  await render();
  assert.equal(document.querySelector('[role="status"]').textContent, dict.landingMapUnavailable);
  await unmount();
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  root = createRoot(document.getElementById("root"));
  await render();
  assert.equal(document.querySelector('[role="status"]').textContent, dict.landingMapUnavailable);
  await unmount();
  console.log("PASS homepage map: late data, framing, no implicit geolocation, selection, hover, filtering, bounds, zero latitude, loader/auth failures and cleanup");
})().catch(error => { console.error(error); process.exitCode = 1; });
