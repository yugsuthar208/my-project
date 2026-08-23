import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polyline, LayerGroup, Marker, Tooltip, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, ArrowRight } from "lucide-react";
import { getLegRouteGeometry } from "../../services/routeService";

// Fix default leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/**
 * Creates a unified, luxury dark-themed pinpoint marker.
 */
function createUnifiedCityMarker(label, orderNumber, isSelected) {
  const accentColor = "#c3f832";
  const darkColor = "#191919";

  const html = `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transform: translate3d(0, 0, 0);
    ">
      <!-- Pin Marker Bubble -->
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: ${isSelected ? accentColor : darkColor};
        border: 2.5px solid ${isSelected ? darkColor : accentColor};
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      ">
        <span style="
          transform: rotate(45deg);
          font-family: 'DM Sans', sans-serif;
          font-weight: 800;
          font-size: 13px;
          color: ${isSelected ? darkColor : "#ffffff"};
        ">${orderNumber}</span>
      </div>

      <!-- City Label Pill -->
      <div style="
        margin-top: 6px;
        background: rgba(25, 25, 25, 0.92);
        backdrop-filter: blur(6px);
        color: #ffffff;
        padding: 3px 8px;
        border-radius: 999px;
        font-family: 'DM Sans', sans-serif;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        border: 1px solid rgba(195, 248, 50, 0.35);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      ">${label}</div>
    </div>
  `;

  return L.divIcon({
    className: "custom-city-marker",
    html: html,
    iconSize: [36, 60],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

/**
 * Creates an interactive midpoint transport mode badge on the route line.
 */
function createRouteModeBadge(mode, provider, cost, isLegFocused) {
  let iconEmoji = "🚗";
  let bg = "#10b981";
  let labelText = "Cab / Road";

  const norm = (mode || "").toLowerCase();
  if (norm === "flight" || norm === "plane") {
    iconEmoji = "✈️";
    bg = "#38bdf8";
    labelText = "Flight";
  } else if (norm === "train" || norm === "rail") {
    iconEmoji = "🚆";
    bg = "#f59e0b";
    labelText = "Train";
  } else if (norm === "bus") {
    iconEmoji = "🚌";
    bg = "#06b6d4";
    labelText = "Bus";
  } else if (!mode || norm === "none") {
    iconEmoji = "⚡";
    bg = "#64748b";
    labelText = "Choose Mode";
  }

  const html = `
    <div style="
      background: ${isLegFocused ? "#c3f832" : "#191919"};
      border: 2px solid ${isLegFocused ? "#191919" : bg};
      color: ${isLegFocused ? "#191919" : "#ffffff"};
      padding: 4px 10px;
      border-radius: 999px;
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 5px;
      box-shadow: ${isLegFocused ? "0 0 16px rgba(195, 248, 50, 0.8), 0 4px 12px rgba(0,0,0,0.5)" : "0 4px 14px rgba(0,0,0,0.4)"};
      cursor: pointer;
      white-space: nowrap;
      transform: ${isLegFocused ? "scale(1.1)" : "scale(1)"};
      transition: all 0.2s ease;
    ">
      <span>${iconEmoji}</span>
      <span style="color: ${isLegFocused ? "#191919" : bg}; text-transform: capitalize;">
        ${labelText}${cost ? ` (₹${Number(cost).toLocaleString('en-IN')})` : ''}
      </span>
    </div>
  `;

  return L.divIcon({
    className: "route-mode-badge",
    html: html,
    iconSize: [110, 28],
    iconAnchor: [55, 14],
    popupAnchor: [0, -14],
  });
}

function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length >= 2) {
      map.fitBounds(coords, { padding: [60, 60], maxZoom: 12 });
    } else if (coords.length === 1) {
      map.setView(coords[0], 9);
    }
  }, [coords, map]);
  return null;
}

export function TripMap({
  stops = [],
  selectedStopId = null,
  onStopClick,
  selectedLegId = null,
  onLegClick,
  trip = null,
  onSelectTransitOption,
  onRefresh,
}) {
  const [legRoutes, setLegRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  const validStops = stops
    .filter((s) => s.city?.latitude && s.city?.longitude)
    .sort((a, b) => (a.stop_order ?? 0) - (b.stop_order ?? 0));

  const coords = validStops.map((s) => [s.city.latitude, s.city.longitude]);
  const center = coords.length > 0 ? coords[0] : [20, 77];

  // Helper to find matching transit leg and active mode between stopA and stopB
  const getLegInfo = (stopA, stopB) => {
    if (!trip?.transit_legs || trip.transit_legs.length === 0) {
      return { leg: null, mode: trip?.transit_mode || "road", selectedOption: null, options: [] };
    }

    const leg = trip.transit_legs.find(
      (l) => (l.from_stop_id === stopA.id && l.to_stop_id === stopB.id) || (l.to_stop_id === stopB.id)
    );

    if (leg) {
      const selectedOption = (leg.options || []).find((o) => o.id === leg.selected_option_id);
      const mode = selectedOption?.mode || (leg.selected_option_id ? leg.selected_option?.mode : (leg.options?.[0]?.mode || trip?.transit_mode || "road"));
      return { leg, mode: leg.selected_option_id ? mode : "none", selectedOption, options: leg.options || [] };
    }

    return { leg: null, mode: trip?.transit_mode || "road", selectedOption: null, options: [] };
  };

  // Async Multi-Modal Route Calculation
  useEffect(() => {
    let isMounted = true;

    async function computeRoutes() {
      if (validStops.length < 2) {
        setLegRoutes([]);
        return;
      }

      setLoadingRoutes(true);
      const computed = [];

      for (let i = 0; i < validStops.length - 1; i++) {
        const stopA = validStops[i];
        const stopB = validStops[i + 1];

        const lat1 = stopA.city.latitude;
        const lon1 = stopA.city.longitude;
        const lat2 = stopB.city.latitude;
        const lon2 = stopB.city.longitude;

        const { leg, mode, selectedOption, options } = getLegInfo(stopA, stopB);
        const routeModeToUse = mode === "none" ? "road" : mode;

        try {
          const routeResult = await getLegRouteGeometry(lat1, lon1, lat2, lon2, routeModeToUse, stopA.city.name, stopB.city.name);
          const rawCoords = routeResult.coordinates;
          const midIdx = Math.floor(rawCoords.length / 2);
          const midPoint = rawCoords[midIdx] || [(lat1 + lat2) / 2, (lon1 + lon2) / 2];

          computed.push({
            id: `leg_${stopA.id}_${stopB.id}_${mode}`,
            legId: leg?.id,
            fromName: stopA.city.name,
            toName: stopB.city.name,
            mode: mode,
            displayMode: routeResult.mode,
            coordinates: rawCoords,
            midPoint: midPoint,
            leg: leg,
            selectedOption: selectedOption,
            options: options,
          });
        } catch (err) {
          computed.push({
            id: `leg_${stopA.id}_${stopB.id}_${mode}`,
            legId: leg?.id,
            fromName: stopA.city.name,
            toName: stopB.city.name,
            mode: mode,
            displayMode: mode,
            coordinates: [[lat1, lon1], [lat2, lon2]],
            midPoint: [(lat1 + lat2) / 2, (lon1 + lon2) / 2],
            leg: leg,
            selectedOption: selectedOption,
            options: options,
          });
        }
      }

      if (isMounted) {
        setLegRoutes(computed);
        setLoadingRoutes(false);
      }
    }

    computeRoutes();

    return () => {
      isMounted = false;
    };
  }, [
    stops,
    trip?.transit_legs,
    JSON.stringify(trip?.transit_legs?.map((l) => `${l.id}_${l.selected_option_id}`)),
    trip?.transit_mode,
  ]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContainer
        center={center}
        zoom={5}
        style={{ width: "100%", height: "100%", borderRadius: "var(--radius-card)", background: "#16171d" }}
        zoomControl={true}
      >
        {/* Luxury High-Contrast Dark Map Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Multi-Modal Mode-Aware Polylines */}
        {legRoutes.map((legItem) => {
          const mode = (legItem.mode || "").toLowerCase();
          const isFocused = selectedLegId === legItem.legId;

          const polylineEventHandlers = {
            click: () => {
              if (legItem.legId && onLegClick) {
                onLegClick(legItem.legId);
              }
            },
          };

          return (
            <LayerGroup key={legItem.id}>
              {/* Active Focused Halo Glow */}
              {isFocused && (
                <Polyline
                  positions={legItem.coordinates}
                  pathOptions={{
                    color: "#c3f832",
                    weight: 12,
                    opacity: 0.55,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                  eventHandlers={polylineEventHandlers}
                />
              )}

              {/* 1. FLIGHT: Sky-blue aerodynamic curved arc */}
              {(mode === "flight" || mode === "plane") && (
                <Polyline
                  positions={legItem.coordinates}
                  pathOptions={{
                    color: "#38bdf8",
                    weight: isFocused ? 5 : 4,
                    opacity: 0.95,
                    dashArray: "10 8",
                    lineCap: "round",
                  }}
                  eventHandlers={polylineEventHandlers}
                >
                  <Tooltip sticky>
                    <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 700 }}>
                      ✈️ {legItem.fromName} ➔ {legItem.toName} (Click line to open mode settings)
                    </div>
                  </Tooltip>
                </Polyline>
              )}

              {/* 2. TRAIN: Dual-layer amber & white railway track */}
              {(mode === "train" || mode === "rail") && (
                <>
                  <Polyline
                    positions={legItem.coordinates}
                    pathOptions={{
                      color: "#f59e0b",
                      weight: isFocused ? 6.5 : 5.5,
                      opacity: 0.95,
                      lineCap: "round",
                    }}
                    eventHandlers={polylineEventHandlers}
                  >
                    <Tooltip sticky>
                      <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 700 }}>
                        🚆 {legItem.fromName} ➔ {legItem.toName} (Click line to open mode settings)
                      </div>
                    </Tooltip>
                  </Polyline>
                  <Polyline
                    positions={legItem.coordinates}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 2.2,
                      opacity: 0.9,
                      dashArray: "5 14",
                    }}
                    eventHandlers={polylineEventHandlers}
                  />
                </>
              )}

              {/* 3. BUS: Cyan / Teal dashed highway route */}
              {mode === "bus" && (
                <Polyline
                  positions={legItem.coordinates}
                  pathOptions={{
                    color: "#06b6d4",
                    weight: isFocused ? 5.5 : 4.5,
                    opacity: 0.95,
                    dashArray: "6 6",
                    lineCap: "round",
                  }}
                  eventHandlers={polylineEventHandlers}
                >
                  <Tooltip sticky>
                    <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 700 }}>
                      🚌 {legItem.fromName} ➔ {legItem.toName} (Click line to open mode settings)
                    </div>
                  </Tooltip>
                </Polyline>
              )}

              {/* 4. ROAD / CAB: Solid vibrant emerald green line */}
              {(mode === "cab" || mode === "road" || mode === "car") && (
                <Polyline
                  positions={legItem.coordinates}
                  pathOptions={{
                    color: "#10b981",
                    weight: isFocused ? 5.5 : 4.5,
                    opacity: 0.95,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                  eventHandlers={polylineEventHandlers}
                >
                  <Tooltip sticky>
                    <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 700 }}>
                      🚗 {legItem.fromName} ➔ {legItem.toName} (Click line to open mode settings)
                    </div>
                  </Tooltip>
                </Polyline>
              )}

              {/* 5. UNSELECTED / NEUTRAL: Subtle slate dashed line */}
              {mode === "none" && (
                <Polyline
                  positions={legItem.coordinates}
                  pathOptions={{
                    color: isFocused ? "#c3f832" : "#94a3b8",
                    weight: isFocused ? 4.5 : 3.5,
                    opacity: 0.75,
                    dashArray: "6 6",
                    lineCap: "round",
                  }}
                  eventHandlers={polylineEventHandlers}
                >
                  <Tooltip sticky>
                    <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 700 }}>
                      ⚡ {legItem.fromName} ➔ {legItem.toName} (Click line to select mode on left)
                    </div>
                  </Tooltip>
                </Polyline>
              )}
            </LayerGroup>
          );
        })}

        {/* Mid-Route Interactive Mode Selector Badges on Map Lines */}
        {legRoutes.map((legItem) => {
          const isFocused = selectedLegId === legItem.legId;
          const cost = legItem.selectedOption?.cost_per_person;

          return (
            <Marker
              key={`badge_${legItem.id}`}
              position={legItem.midPoint}
              icon={createRouteModeBadge(legItem.mode, legItem.selectedOption?.provider, cost, isFocused)}
              eventHandlers={{
                click: () => {
                  if (legItem.legId && onLegClick) {
                    onLegClick(legItem.legId);
                  }
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 11, fontWeight: 700 }}>
                  Click to configure {legItem.fromName} ➔ {legItem.toName}
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Unified Luxury City Pin Markers */}
        {validStops.map((stop, idx) => (
          <Marker
            key={stop.id}
            position={[stop.city.latitude, stop.city.longitude]}
            icon={createUnifiedCityMarker(stop.city.name, idx + 1, stop.id === selectedStopId)}
            eventHandlers={{ click: () => onStopClick?.(stop) }}
          >
            <Popup>
              <div style={{ fontFamily: "DM Sans, sans-serif", padding: "4px 2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{
                    background: "#292928",
                    color: "#c3f832",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 999,
                  }}>
                    Stop {idx + 1}
                  </span>
                  <strong style={{ fontSize: 14, color: "#191919" }}>{stop.city.name}</strong>
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#5c5c5b" }}>
                  {stop.arrival_date} → {stop.departure_date}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#888" }}>
                  {stop.city.country}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        <FitBounds coords={coords} />
      </MapContainer>

      {/* Mode Route Legend HUD */}
      {validStops.length >= 2 && (
        <div style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 1000,
          background: "rgba(25, 25, 25, 0.92)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "var(--radius-input)",
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
        }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Live Route Vectors (Click any line to configure)
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "11px", fontWeight: 600, color: "#ffffff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 14, height: 3, background: "#10b981", borderRadius: 2 }} />
              <span>Road / Cab</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 14, height: 3, background: "#f59e0b", borderRadius: 2 }} />
              <span>Train</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 14, height: 3, background: "#38bdf8", borderTop: "1px dashed #38bdf8" }} />
              <span>Flight</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 14, height: 3, background: "#06b6d4", borderTop: "1px dashed #06b6d4" }} />
              <span>Bus</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {coords.length === 0 && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000, pointerEvents: "none" }}>
          <div className="card" style={{ padding: "24px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", boxShadow: "var(--shadow-float)", pointerEvents: "auto" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MapPin size={24} color="var(--ink-soft)" />
            </div>
            <p style={{ fontWeight: 600, color: "var(--ink)", fontSize: "1rem" }}>Add destinations to see realistic live routes on the map</p>
          </div>
        </div>
      )}
    </div>
  );
}
