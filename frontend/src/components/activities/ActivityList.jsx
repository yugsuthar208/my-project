import { GripVertical, Clock, X } from "lucide-react";

export function ActivityList({ items = [], onRemove }) {
  if (!items || items.length === 0) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", border: "1px dashed var(--border, #e2e8f0)", borderRadius: 12 }}>
        <p style={{ color: "var(--ink-soft, #64748b)", fontSize: "0.875rem", margin: 0, fontStyle: "italic" }}>
          No activities planned for this stop yet. Click "+" to add activities.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, idx) => {
        const act = item.activity || item;
        const name = act?.name || item?.name || act?.title || item?.title || "Activity";
        const category = (act?.category || item?.category || "sightseeing").toLowerCase();
        const duration = act?.duration_hours || item?.duration_hours || 1.5;
        const cost = item?.custom_cost ?? act?.estimated_cost ?? item?.estimated_cost ?? 0;
        const imageUrl = act?.image_url || item?.image_url;

        return (
          <div
            key={item.id || `act-${idx}`}
            className="card card--hover"
            style={{
              padding: "10px 14px",
              display: "flex",
              gap: 12,
              alignItems: "center",
              borderRadius: 12,
              border: "1px solid var(--border, #e2e8f0)",
              background: "#ffffff",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ color: "var(--border, #cbd5e1)", cursor: "grab", display: "flex", alignItems: "center" }}>
              <GripVertical size={16} />
            </div>

            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: "var(--surface, #f1f5f9)",
                overflow: "hidden",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "1.2rem" }}>📍</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <h4 style={{ margin: 0, fontSize: "0.9125rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--ink, #0f172a)" }}>
                  {name}
                </h4>
                <span className={`pill pill--${category}`} style={{ fontSize: "0.65rem", padding: "1px 7px", textTransform: "capitalize", flexShrink: 0 }}>
                  {category}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, color: "var(--ink-soft, #64748b)", fontSize: "0.75rem", fontWeight: 500 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Clock size={12} /> {duration}h
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 2, fontWeight: 700, color: "var(--accent, #059669)" }}>
                  ₹{Number(cost).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {onRemove && (
              <button
                className="btn btn--icon btn--ghost"
                onClick={() => onRemove(item.id)}
                style={{ color: "#ef4444", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Remove from itinerary"
              >
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
