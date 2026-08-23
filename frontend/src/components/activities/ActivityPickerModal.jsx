import { useState, useEffect } from "react";
import { X, Search, Clock, Check, Plus, Sparkles, Filter } from "lucide-react";
import { cityService } from "../../services/cityService";
import { LoadingSpinner } from "../common/LoadingSpinner";

export function ActivityPickerModal({
  tripId,
  stopId,
  stopName,
  cityId,
  existingItemIds = [],
  onClose,
  onAdded,
}) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [savingId, setSavingId] = useState(null);
  
  // Track all added activity IDs in this session + pre-existing activities
  const [addedIds, setAddedIds] = useState(() => new Set(existingItemIds.filter(Boolean)));
  const [newlyAddedCount, setNewlyAddedCount] = useState(0);

  useEffect(() => {
    if (!cityId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    cityService.getCityActivities(cityId)
      .then(r => {
        const list = r?.data || (Array.isArray(r) ? r : []);
        setActivities(Array.isArray(list) ? list : []);
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [cityId]);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleAdd = async (activity) => {
    setSavingId(activity.id);
    try {
      await onAdded(activity, stopId);
      setAddedIds(prev => new Set([...prev, activity.id]));
      setNewlyAddedCount(prev => prev + 1);
    } finally {
      setSavingId(null);
    }
  };

  // Derive available categories
  const categories = ["all", ...new Set(activities.map(a => (a.category || "sightseeing").toLowerCase()))];

  const filtered = activities.filter(a => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory =
      activeCategory === "all" || (a.category || "").toLowerCase() === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(6px)",
          animation: "fadeIn 0.2s ease-out",
        }}
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className="card animate-fadeUp"
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(680px, 96vw)",
          height: "85vh",
          maxHeight: "820px",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          background: "var(--white, #ffffff)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px 18px",
            borderBottom: "1px solid var(--border, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "var(--ink, #0f172a)", fontFamily: "var(--font-heading, inherit)" }}>
                Add Activities
              </h2>
              {stopName && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: "rgba(99, 102, 241, 0.1)",
                    color: "var(--primary, #4f46e5)",
                    border: "1px solid rgba(99, 102, 241, 0.2)",
                  }}
                >
                  {stopName}
                </span>
              )}
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.825rem", color: "var(--ink-soft, #64748b)" }}>
              Select multiple activities to build your stop schedule. The window stays open until you're done.
            </p>
          </div>
          <button
            className="btn btn--icon btn--ghost"
            onClick={onClose}
            style={{
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div style={{ padding: "16px 28px 12px", borderBottom: "1px solid var(--border, #f1f5f9)", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Search bar */}
          <div style={{ position: "relative" }}>
            <Search
              size={17}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--ink-soft, #94a3b8)",
              }}
            />
            <input
              className="input"
              placeholder={`Search sights, temples, cafes, adventures in ${stopName || 'city'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: 42,
                borderRadius: 12,
                fontSize: "0.875rem",
                height: 42,
                width: "100%",
                background: "#f8fafc",
                border: "1px solid var(--border, #e2e8f0)",
              }}
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 4,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Pills */}
          {categories.length > 2 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                scrollbarWidth: "none",
                paddingBottom: 2,
              }}
            >
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 100,
                      fontSize: "0.75rem",
                      fontWeight: isActive ? 700 : 500,
                      textTransform: "capitalize",
                      border: isActive ? "1px solid var(--ink, #0f172a)" : "1px solid var(--border, #e2e8f0)",
                      background: isActive ? "var(--ink, #0f172a)" : "#ffffff",
                      color: isActive ? "#ffffff" : "var(--ink-soft, #64748b)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Activities Scrollable List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, gap: 12 }}>
              <LoadingSpinner size={36} />
              <p style={{ color: "var(--ink-soft, #64748b)", fontSize: "0.875rem" }}>Loading curated activities...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--ink-soft, #64748b)", padding: "50px 20px" }}>
              <Sparkles size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <p style={{ fontWeight: 600, margin: 0, fontSize: "0.95rem" }}>No matching activities found</p>
              <p style={{ fontSize: "0.825rem", margin: "6px 0 0", color: "#94a3b8" }}>Try adjusting your search query or category filter.</p>
            </div>
          ) : (
            filtered.map((act) => {
              const isAdded = addedIds.has(act.id);
              const isSaving = savingId === act.id;

              return (
                <div
                  key={act.id}
                  className="card card--hover"
                  style={{
                    padding: 16,
                    display: "flex",
                    gap: 16,
                    borderRadius: 14,
                    border: isAdded ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid var(--border, #e2e8f0)",
                    background: isAdded ? "rgba(16, 185, 129, 0.03)" : "#ffffff",
                    transition: "all 0.2s ease",
                    position: "relative",
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 10,
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "var(--surface, #f1f5f9)",
                      position: "relative",
                    }}
                  >
                    {act.image_url ? (
                      <img
                        src={act.image_url}
                        alt={act.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        loading="lazy"
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#94a3b8",
                          fontSize: "1.5rem",
                        }}
                      >
                        📍
                      </div>
                    )}
                  </div>

                  {/* Content details */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <h4 style={{ margin: 0, fontSize: "0.975rem", fontWeight: 600, color: "var(--ink, #0f172a)", lineHeight: 1.3 }}>
                          {act.name}
                        </h4>
                        <span
                          className={`pill pill--${(act.category || "sightseeing").toLowerCase()}`}
                          style={{ fontSize: "0.7rem", padding: "2px 8px", textTransform: "capitalize", flexShrink: 0 }}
                        >
                          {act.category || "Sightseeing"}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--ink-soft, #64748b)",
                          margin: "5px 0 0",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.45,
                        }}
                      >
                        {act.description || "Curated sightseeing & cultural activity."}
                      </p>
                    </div>

                    {/* Meta info & Action Button */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                      <div style={{ display: "flex", gap: 16, color: "var(--ink-soft, #64748b)", fontSize: "0.8125rem", fontWeight: 500 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 2, fontWeight: 700, color: "var(--accent, #059669)" }}>
                          ₹{Number(act.estimated_cost || 0).toLocaleString("en-IN")}
                        </span>
                        {act.duration_hours && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={13} /> {act.duration_hours}h
                          </span>
                        )}
                      </div>

                      {/* Add / Added Button */}
                      <button
                        onClick={() => handleAdd(act)}
                        disabled={isSaving}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 14px",
                          borderRadius: 8,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          cursor: isSaving ? "wait" : "pointer",
                          transition: "all 0.18s ease",
                          border: isAdded ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--ink, #0f172a)",
                          background: isAdded ? "#10b981" : "var(--ink, #0f172a)",
                          color: "#ffffff",
                        }}
                        title={isAdded ? "Click to add another instance to schedule" : "Add to schedule"}
                      >
                        {isSaving ? (
                          <LoadingSpinner size={14} color="#fff" />
                        ) : isAdded ? (
                          <>
                            <Check size={14} strokeWidth={2.5} />
                            Added ✓
                          </>
                        ) : (
                          <>
                            <Plus size={14} />
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div
          style={{
            padding: "16px 28px",
            borderTop: "1px solid var(--border, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ fontSize: "0.825rem", color: "var(--ink-soft, #64748b)" }}>
            {newlyAddedCount > 0 ? (
              <span style={{ color: "#059669", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={15} /> {newlyAddedCount} {newlyAddedCount === 1 ? "activity" : "activities"} added to itinerary
              </span>
            ) : (
              <span>Click <strong>Add</strong> on any activity to include it in this stop</span>
            )}
          </div>

          <button
            className="btn btn--primary btn--sm"
            onClick={onClose}
            style={{
              padding: "8px 22px",
              fontWeight: 600,
              fontSize: "0.875rem",
              borderRadius: 8,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
