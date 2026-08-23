import React, { useState, useEffect } from 'react';
import { tripService } from '../../services/tripService';
import { useToast } from '../common/Toast';
import { Train, Plane, Bus, Car, Clock, Compass, ArrowRight, CheckCircle2, Navigation, RotateCcw, Calendar, ShieldCheck, Tag, Check } from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';

export default function TransitOptimizer({ trip, selectedLegId, onSelectLeg, onRefresh, onSelectOption }) {
  const { addToast } = useToast();
  const [selectedMode, setSelectedMode] = useState('all');
  const [loadingLeg, setLoadingLeg] = useState(null);
  const [viewMode, setViewMode] = useState('single'); // 'single' (focused leg) or 'all' (all legs)

  const legs = trip?.transit_legs || [];

  // Active leg resolution
  const activeLeg = legs.find(l => l.id === selectedLegId) || legs[0] || null;

  useEffect(() => {
    setSelectedMode('all');
  }, [selectedLegId]);

  const getModeDetails = (mode) => {
    switch (mode?.toLowerCase()) {
      case 'train': 
        return { icon: Train, label: 'Train', color: '#f59e0b', bg: '#fef3c7', emoji: '🚆', badgeBg: 'rgba(245, 158, 11, 0.12)', badgeText: '#b45309' };
      case 'flight': 
        return { icon: Plane, label: 'Flight', color: '#38bdf8', bg: '#e0f2fe', emoji: '✈️', badgeBg: 'rgba(56, 189, 248, 0.15)', badgeText: '#0284c7' };
      case 'bus': 
        return { icon: Bus, label: 'Bus', color: '#06b6d4', bg: '#cffafe', emoji: '🚌', badgeBg: 'rgba(6, 182, 212, 0.15)', badgeText: '#0e7490' };
      case 'cab': 
      case 'road':
      case 'car':
        return { icon: Car, label: 'Cab / Road', color: '#10b981', bg: '#d1fae5', emoji: '🚗', badgeBg: 'rgba(16, 185, 129, 0.12)', badgeText: '#047857' };
      default: 
        return { icon: Compass, label: 'Transit', color: 'var(--ink-soft)', bg: 'var(--surface)', emoji: '⚡', badgeBg: 'rgba(100, 116, 139, 0.12)', badgeText: '#475569' };
    }
  };

  const handleSelectOption = async (legId, optionId, optMode) => {
    setLoadingLeg(legId);
    
    // Instant live optimistic update
    if (onSelectOption) {
      onSelectOption(legId, optionId, optMode);
    }
    
    try {
      await tripService.selectTransitOption(trip.id, legId, optionId);
      addToast({ 
        message: optionId 
          ? `Switched to ${optMode?.toUpperCase() || 'MODE'} & updated map vector!` 
          : "Transport mode unselected for this leg." 
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      addToast({ message: err.message || "Failed to update option", type: "error" });
    } finally {
      setLoadingLeg(null);
    }
  };

  if (legs.length === 0) {
    return (
      <div className="card fade-in" style={{ padding: "48px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Navigation size={28} color="var(--ink-soft)" />
        </div>
        <div>
          <h3 style={{ fontSize: "1.1rem", marginBottom: 6 }}>No transit legs generated yet</h3>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.875rem", maxWidth: 320, margin: "0 auto" }}>
            Add stops to your trip itinerary to automatically generate multi-modal travel options with real pricing.
          </p>
        </div>
      </div>
    );
  }

  // Helper to find city names
  const getCityName = (stopId) => {
    if (!stopId) return trip.origin_city || "Origin City";
    const stop = trip.stops?.find(s => s.id === stopId);
    return stop?.city?.name || stop?.city_name || "Destination";
  };

  const modes = [
    { id: 'all', label: 'All Modes' },
    { id: 'train', label: 'Trains 🚆' },
    { id: 'flight', label: 'Flights ✈️' },
    { id: 'bus', label: 'Buses 🚌' },
    { id: 'cab', label: 'Cabs 🚗' },
  ];

  const renderLegOptions = (leg, legIndex) => {
    const fromName = getCityName(leg.from_stop_id);
    const toName = getCityName(leg.to_stop_id);
    const selectedOption = leg.options?.find(o => o.id === leg.selected_option_id);
    const filteredOptions = (leg.options || []).filter(
      opt => selectedMode === 'all' || opt.mode === selectedMode
    );

    return (
      <div key={leg.id} className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Leg Route Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "linear-gradient(180deg, #ffffff 0%, var(--surface, #f8fafc) 100%)",
          borderRadius: 16,
          border: leg.id === activeLeg?.id ? "1.5px solid var(--ink, #0f172a)" : "1px solid var(--border, #e2e8f0)",
          boxShadow: leg.id === activeLeg?.id ? "0 4px 20px rgba(0, 0, 0, 0.07)" : "none",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem" }}>
              <span style={{ fontWeight: 800, color: "var(--ink, #0f172a)" }}>{fromName}</span>
              <ArrowRight size={18} color="var(--ink-soft, #64748b)" />
              <span style={{ fontWeight: 800, color: "var(--ink, #0f172a)" }}>{toName}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: "0.75rem", color: "var(--ink-soft, #64748b)", fontWeight: 600 }}>
                Leg {legIndex + 1} of {legs.length}
              </span>
              {selectedOption ? (
                <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <Check size={12} strokeWidth={3} /> Active: {selectedOption.provider} (₹{Number(selectedOption.cost_per_person).toLocaleString("en-IN")})
                </span>
              ) : (
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>
                  • No transport selected yet
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {selectedOption ? (
              <button
                onClick={() => handleSelectOption(leg.id, null, null)}
                disabled={loadingLeg === leg.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(239, 68, 68, 0.08)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Unselect transport mode for this leg"
              >
                <RotateCcw size={11} /> Unselect
              </button>
            ) : (
              <span className="pill" style={{ background: "rgba(148, 163, 184, 0.15)", color: "#64748b", fontSize: "0.725rem" }}>
                Not Selected
              </span>
            )}
          </div>
        </div>

        {/* Options Grid */}
        {filteredOptions.length === 0 ? (
          <div className="card" style={{ padding: 28, textAlign: "center", background: "var(--surface, #f8fafc)", borderRadius: 12 }}>
            <p style={{ color: "var(--ink-soft, #64748b)", fontSize: "0.875rem", margin: 0 }}>
              No {selectedMode} options available for this leg distance. Try switching to <strong>All Modes</strong>.
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            gap: 14
          }}>
            {filteredOptions.map((opt) => {
              const isSelected = leg.selected_option_id === opt.id;
              const { icon: ModeIcon, color: iconColor, bg: iconBg, badgeBg, badgeText } = getModeDetails(opt.mode);
              const meta = opt.metadata || {};
              const departureTime = opt.departure_time || meta.departure_time;
              const arrivalTime = opt.arrival_time || meta.arrival_time;
              const serviceNo = opt.service_number || meta.service_number;
              const operatingDays = opt.operating_days || meta.operating_days;
              const classType = opt.class_type || meta.class_type || opt.label;
              const amenities = opt.amenities || meta.amenities || [];
              const baggage = opt.baggage || meta.baggage;

              return (
                <div
                  key={opt.id}
                  className="card card--hover"
                  style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border: isSelected ? "2px solid var(--ink, #0f172a)" : "1px solid var(--border, #e2e8f0)",
                    background: isSelected ? "#ffffff" : "#ffffff",
                    boxShadow: isSelected ? "0 8px 28px rgba(0, 0, 0, 0.09)" : "0 1px 3px rgba(0, 0, 0, 0.04)",
                    borderRadius: 16,
                    position: "relative",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isSelected && (
                    <div style={{
                      position: "absolute",
                      top: -9,
                      right: 14,
                      background: "var(--ink, #0f172a)",
                      color: "var(--accent, #c3f832)",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      padding: "2px 9px",
                      borderRadius: 20,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                    }}>
                      <CheckCircle2 size={12} /> Active Choice
                    </div>
                  )}

                  <div>
                    {/* Header: Mode Icon + Provider + Service Number */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: iconBg,
                        color: iconColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 2,
                      }}>
                        <ModeIcon size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--ink, #0f172a)", lineHeight: 1.3 }}>
                            {opt.provider}
                          </h4>
                          {serviceNo && (
                            <span style={{
                              fontSize: "0.6875rem",
                              fontWeight: 700,
                              background: badgeBg,
                              color: badgeText,
                              padding: "1px 6px",
                              borderRadius: 4,
                            }}>
                              {serviceNo}
                            </span>
                          )}
                        </div>
                        {classType && (
                          <div style={{ fontSize: "0.75rem", color: "var(--ink-soft, #64748b)", marginTop: 2, fontWeight: 500 }}>
                            {classType}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Schedule & Timing Bar */}
                    {(departureTime || arrivalTime || operatingDays) && (
                      <div style={{
                        background: "var(--surface, #f8fafc)",
                        padding: "8px 10px",
                        borderRadius: 8,
                        marginBottom: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        fontSize: "0.75rem",
                      }}>
                        {departureTime && arrivalTime && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--ink, #0f172a)", fontWeight: 700 }}>
                            <span>{departureTime}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--ink-soft, #64748b)", fontWeight: 500, fontSize: "0.7rem" }}>
                              <Clock size={11} /> ~{opt.duration_hours}h
                            </div>
                            <span>{arrivalTime}</span>
                          </div>
                        )}
                        {operatingDays && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--ink-soft, #64748b)", fontSize: "0.7rem" }}>
                            <Calendar size={11} />
                            <span>Runs: <strong>{operatingDays}</strong></span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Amenities & Baggage tags */}
                    {(amenities.length > 0 || baggage) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                        {baggage && (
                          <span style={{ fontSize: "0.6875rem", background: "rgba(99, 102, 241, 0.08)", color: "#4f46e5", padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>
                            🧳 {baggage}
                          </span>
                        )}
                        {amenities.slice(0, 3).map((am, aIdx) => (
                          <span key={aIdx} style={{ fontSize: "0.6875rem", background: "rgba(15, 23, 42, 0.04)", color: "var(--ink-soft, #64748b)", padding: "2px 6px", borderRadius: 4 }}>
                            ✓ {am}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Pricing Box */}
                    <div style={{
                      background: "var(--surface, #f8fafc)",
                      padding: "8px 12px",
                      borderRadius: 10,
                      marginBottom: 14,
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      border: "1px solid var(--border, #f1f5f9)"
                    }}>
                      <div>
                        <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--ink, #0f172a)" }}>
                          ₹{Number(opt.cost_per_person || 0).toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--ink-soft, #64748b)", marginLeft: 4 }}>
                          / person
                        </span>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--ink-soft, #64748b)", fontWeight: 500 }}>
                        Total: ₹{Number(opt.total_estimated_cost || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Action Button: Click to Select / Unselect */}
                  <button
                    disabled={loadingLeg === leg.id}
                    onClick={() => {
                      if (isSelected) {
                        handleSelectOption(leg.id, null, null);
                      } else {
                        handleSelectOption(leg.id, opt.id, opt.mode);
                      }
                    }}
                    className={`btn btn--sm ${isSelected ? 'btn--primary' : 'btn--secondary'}`}
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      fontWeight: 700,
                      borderRadius: 8,
                      background: isSelected ? "var(--ink, #0f172a)" : undefined,
                      color: isSelected ? "var(--accent, #c3f832)" : undefined
                    }}
                    title={isSelected ? "Click to unselect this option" : "Click to choose this option"}
                  >
                    {loadingLeg === leg.id ? (
                      <LoadingSpinner size={14} color={isSelected ? "var(--accent, #c3f832)" : "var(--ink, #0f172a)"} />
                    ) : isSelected ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle2 size={14} /> Selected (Click to Unselect)
                      </span>
                    ) : (
                      "Select Option"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span className="pill" style={{ background: "rgba(195, 248, 50, 0.2)", color: "var(--ink, #0f172a)", border: "1px solid rgba(195, 248, 50, 0.5)" }}>
            ⚡ Multi-Schedule Travel Engine
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setViewMode('single')}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: "0.75rem",
                fontWeight: 600,
                border: "1px solid var(--border, #e2e8f0)",
                background: viewMode === 'single' ? "var(--ink, #0f172a)" : "#ffffff",
                color: viewMode === 'single' ? "#ffffff" : "var(--ink-soft, #64748b)",
                cursor: "pointer",
              }}
            >
              Focused Leg
            </button>
            <button
              onClick={() => setViewMode('all')}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: "0.75rem",
                fontWeight: 600,
                border: "1px solid var(--border, #e2e8f0)",
                background: viewMode === 'all' ? "var(--ink, #0f172a)" : "#ffffff",
                color: viewMode === 'all' ? "#ffffff" : "var(--ink-soft, #64748b)",
                cursor: "pointer",
              }}
            >
              View All ({legs.length})
            </button>
          </div>
        </div>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "6px 0 4px" }}>Multi-Modal Travel Schedules</h2>
        <p style={{ color: "var(--ink-soft, #64748b)", fontSize: "0.85rem", margin: 0 }}>
          Compare real trains, flights, luxury sleeper buses, and outstation cabs with departure times, days of operation, and exact fares.
        </p>
      </div>

      {/* Interactive Leg Selector Carousel / Breadcrumb Bar */}
      <div style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        scrollbarWidth: "none",
        paddingBottom: 4,
      }}>
        {legs.map((leg, idx) => {
          const fromName = getCityName(leg.from_stop_id);
          const toName = getCityName(leg.to_stop_id);
          const isCurrentActive = leg.id === activeLeg?.id;
          const selectedOption = leg.options?.find(o => o.id === leg.selected_option_id);
          const { emoji, color } = getModeDetails(selectedOption?.mode);

          return (
            <button
              key={leg.id}
              onClick={() => {
                if (onSelectLeg) onSelectLeg(leg.id);
                setViewMode('single');
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 12,
                fontSize: "0.8125rem",
                fontWeight: isCurrentActive ? 700 : 500,
                background: isCurrentActive ? "var(--ink, #0f172a)" : "#ffffff",
                color: isCurrentActive ? "#ffffff" : "var(--ink, #0f172a)",
                border: isCurrentActive ? "1.5px solid var(--ink, #0f172a)" : "1px solid var(--border, #e2e8f0)",
                boxShadow: isCurrentActive ? "0 4px 12px rgba(0,0,0,0.12)" : "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{
                background: isCurrentActive ? "rgba(255,255,255,0.2)" : "var(--surface, #f1f5f9)",
                padding: "2px 6px",
                borderRadius: 6,
                fontSize: "0.7rem",
                fontWeight: 700,
              }}>
                Leg {idx + 1}
              </span>
              <span>{fromName} ➔ {toName}</span>
              {selectedOption ? (
                <span style={{ fontSize: "0.75rem", color: isCurrentActive ? "var(--accent, #c3f832)" : color, fontWeight: 700 }}>
                  {emoji} ₹{Number(selectedOption.cost_per_person).toLocaleString("en-IN")}
                </span>
              ) : (
                <span style={{ fontSize: "0.7rem", color: isCurrentActive ? "#94a3b8" : "#94a3b8" }}>
                  (No mode)
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mode Filters Toolbar - Only this line slides horizontally */}
      <div style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
        paddingBottom: 2,
      }}>
        <div style={{
          display: "inline-flex",
          gap: 6,
          background: "var(--surface, #f1f5f9)",
          padding: 4,
          borderRadius: "var(--radius-pill)",
          border: "1px solid var(--border, #e2e8f0)",
          whiteSpace: "nowrap",
        }}>
          {modes.map((m) => {
            const active = selectedMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "0.8125rem",
                  fontWeight: active ? 700 : 500,
                  background: active ? "var(--ink, #0f172a)" : "transparent",
                  color: active ? "var(--accent, #c3f832)" : "var(--ink-soft, #64748b)",
                  transition: "all var(--t-fast)",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Options: Single Focused Leg vs All Legs */}
      {viewMode === 'single' && activeLeg ? (
        renderLegOptions(activeLeg, legs.findIndex(l => l.id === activeLeg.id))
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {legs.map((leg, idx) => renderLegOptions(leg, idx))}
        </div>
      )}
    </div>
  );
}
