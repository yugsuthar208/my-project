import React, { useState, useEffect, useMemo } from "react";
import { tripService } from "../../services/tripService";
import { useToast } from "../common/Toast";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  FileText,
  Home,
  Utensils,
  Bus,
  Activity,
  CreditCard,
  Download,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Info,
  Sliders,
  Layers,
} from "lucide-react";
import { LoadingSpinner } from "../common/LoadingSpinner";

const CATEGORY_PALETTE = {
  stay: { color: "#6366f1", bg: "#eef2ff", label: "Accommodation", icon: Home },
  food: { color: "#f59e0b", bg: "#fef3c7", label: "Food & Dining", icon: Utensils },
  transport: { color: "#10b981", bg: "#d1fae5", label: "Transit & Travel", icon: Bus },
  activities: { color: "#ec4899", bg: "#fce7f3", label: "Activities & Sights", icon: Activity },
  other: { color: "#8b5cf6", bg: "#ede9fe", label: "Logged Expenses", icon: CreditCard },
  misc: { color: "#64748b", bg: "#f1f5f9", label: "Miscellaneous", icon: CreditCard },
};

export default function TripBudget({ trip, tripId, budget: initialBudget, onRefresh }) {
  const { addToast } = useToast();
  const [budgetData, setBudgetData] = useState(initialBudget || null);
  const [loading, setLoading] = useState(!initialBudget);
  const [activeSubTab, setActiveSubTab] = useState("overview"); // 'overview', 'daily', 'expenses', 'ai_insights', 'settings'

  // Expense logger form state
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "food",
    description: "",
    actual_amount: "",
    currency: "INR",
  });
  const [savingExpense, setSavingExpense] = useState(false);

  // Budget settings state
  const [targetLimit, setTargetLimit] = useState("");
  const [mealRate, setMealRate] = useState("750");
  const [savingSettings, setSavingSettings] = useState(false);

  // Load authoritative budget from backend
  const loadAuthoritativeBudget = async () => {
    if (!tripId) return;
    try {
      const res = await tripService.getTripBudget(tripId);
      const data = res?.data || res;
      setBudgetData(data);
      if (data?.budget_target || data?.budget_status?.total_budget_limit) {
        setTargetLimit(String(data.budget_target || data.budget_status.total_budget_limit || ""));
      }
      if (data?.meal_policy?.rate_per_person_per_day) {
        setMealRate(String(data.meal_policy.rate_per_person_per_day));
      }
    } catch (err) {
      console.error("Failed to load budget", err);
    } finally {
      setLoading(false);
    }
  };

  const loadExpenses = async () => {
    if (!tripId) return;
    setLoadingExpenses(true);
    try {
      const res = await tripService.getExpenses(tripId);
      const data = res?.data || (Array.isArray(res) ? res : []);
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      setExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  };

  useEffect(() => {
    loadAuthoritativeBudget();
    loadExpenses();
  }, [tripId]);

  // Derived budget calculations
  const breakdown = budgetData?.breakdown || {
    stay: budgetData?.cost_breakdown?.stay_cost || 0,
    food: budgetData?.cost_breakdown?.meals_cost || 0,
    transport: budgetData?.cost_breakdown?.transport_cost || 0,
    activities: budgetData?.cost_breakdown?.activities_cost || 0,
    other: budgetData?.cost_breakdown?.misc_cost || 0,
  };

  const totalCost = Number(budgetData?.total_estimated_cost || budgetData?.total_cost || 
    (breakdown.stay + breakdown.food + breakdown.transport + breakdown.activities + breakdown.other) || 0);

  const numTravelers = budgetData?.num_travelers || trip?.num_travelers || 1;
  const roomsAllocated = budgetData?.rooms || budgetData?.rooms_allocated || Math.ceil(numTravelers / 2);
  const costPerPerson = budgetData?.cost_per_person || (totalCost / numTravelers);
  const totalDays = budgetData?.total_trip_days || budgetData?.meal_policy?.days || 1;

  const budgetLimitNum = parseFloat(targetLimit) || budgetData?.budget_target || budgetData?.budget_status?.total_budget_limit || null;
  const isOverBudget = budgetLimitNum ? totalCost > budgetLimitNum : false;
  const overage = isOverBudget ? totalCost - budgetLimitNum : 0;
  const remaining = budgetLimitNum && !isOverBudget ? budgetLimitNum - totalCost : 0;
  const budgetProgressPct = budgetLimitNum ? Math.min(100, Math.round((totalCost / budgetLimitNum) * 100)) : 0;

  // Chart Data
  const pieChartData = [
    { name: "Accommodation", value: Math.round(breakdown.stay), key: "stay", color: CATEGORY_PALETTE.stay.color },
    { name: "Food & Dining", value: Math.round(breakdown.food), key: "food", color: CATEGORY_PALETTE.food.color },
    { name: "Transit & Travel", value: Math.round(breakdown.transport), key: "transport", color: CATEGORY_PALETTE.transport.color },
    { name: "Activities & Sights", value: Math.round(breakdown.activities), key: "activities", color: CATEGORY_PALETTE.activities.color },
    { name: "Logged Expenses", value: Math.round(breakdown.other), key: "other", color: CATEGORY_PALETTE.other.color },
  ].filter(item => item.value > 0);

  // Daily plan data
  const dailyPlan = budgetData?.daily_plan || [];

  // Handlers
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.actual_amount) return;
    setSavingExpense(true);
    try {
      await tripService.addExpense(tripId, {
        category: expenseForm.category,
        description: expenseForm.description,
        actual_amount: parseFloat(expenseForm.actual_amount),
        estimated_amount: parseFloat(expenseForm.actual_amount),
        currency: "INR",
      });
      addToast({ message: `Expense "₹${expenseForm.actual_amount}" logged successfully!` });
      setExpenseForm({ category: "food", description: "", actual_amount: "", currency: "INR" });
      setShowAddExpense(false);
      loadExpenses();
      loadAuthoritativeBudget();
      if (onRefresh) onRefresh();
    } catch (err) {
      addToast({ message: err.message || "Failed to log expense", type: "error" });
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await tripService.deleteExpense(expenseId);
      addToast({ message: "Expense removed" });
      loadExpenses();
      loadAuthoritativeBudget();
      if (onRefresh) onRefresh();
    } catch (err) {
      addToast({ message: "Failed to delete expense", type: "error" });
    }
  };

  const handleSaveBudgetLimit = async () => {
    setSavingSettings(true);
    try {
      await tripService.updateTripBudget(tripId, {
        total_budget_limit: parseFloat(targetLimit) || null,
        total_budget: parseFloat(targetLimit) || null,
      });
      addToast({ message: "Budget limit settings updated!" });
      loadAuthoritativeBudget();
      if (onRefresh) onRefresh();
    } catch (err) {
      addToast({ message: "Failed to update budget limit", type: "error" });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportCSV = () => {
    if (!dailyPlan.length && !expenses.length) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Category,Description,Amount (INR)\n";
    csvContent += `Accommodation,Stays & Hotels,${breakdown.stay}\n`;
    csvContent += `Transit,Intercity Travel,${breakdown.transport}\n`;
    csvContent += `Food,Meals Allowance,${breakdown.food}\n`;
    csvContent += `Activities,Tours & Tickets,${breakdown.activities}\n`;
    csvContent += `Custom Expenses,Logged Entries,${breakdown.other}\n\n`;
    csvContent += "Day,Date,City,Planned (INR),Actual Spent (INR)\n";
    dailyPlan.forEach(d => {
      csvContent += `${d.day_index},${d.date},${d.city},${d.planned_total},${d.actual_spent}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Trip_Budget_${trip?.title || 'Report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast({ message: "Budget CSV report downloaded!" });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80, gap: 16 }}>
        <LoadingSpinner size={40} />
        <p style={{ color: "var(--ink-soft, #64748b)", fontSize: "0.925rem" }}>Calculating authoritative multi-day budget...</p>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40, width: "100%", maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
      {/* 1. Header & Quick Actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className="pill" style={{ background: "rgba(195, 248, 50, 0.2)", color: "var(--ink, #0f172a)", border: "1px solid rgba(195, 248, 50, 0.5)" }}>
              ⚡ Real-Time Financial Engine
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--ink-soft, #64748b)", fontWeight: 600 }}>
              {totalDays} Days • {numTravelers} {numTravelers === 1 ? 'Traveler' : 'Travelers'} • {roomsAllocated} Rooms
            </span>
          </div>
          <h2 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, color: "var(--ink, #0f172a)" }}>
            Trip Budget & Day-by-Day Forecast
          </h2>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowAddExpense(true)}
            className="btn btn--primary btn--sm"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontWeight: 700 }}
          >
            <Plus size={15} /> Log Expense
          </button>
          <button
            onClick={handleExportCSV}
            className="btn btn--secondary btn--sm"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px" }}
            title="Download CSV Statement"
          >
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* 2. Hero Financial KPI Overview Card */}
      <div
        className="card"
        style={{
          padding: "24px 28px",
          borderRadius: 20,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          boxShadow: "0 20px 40px -15px rgba(15, 23, 42, 0.3)",
          position: "relative",
          overflow: "hidden",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, background: "radial-gradient(circle, rgba(195, 248, 50, 0.15) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, position: "relative", zIndex: 1 }}>
          {/* Total Estimated Cost */}
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.75px", color: "rgba(255, 255, 255, 0.6)" }}>
              Total Estimated Trip Cost
            </span>
            <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "var(--accent, #c3f832)", marginTop: 4, letterSpacing: "-0.5px" }}>
              ₹{Math.round(totalCost).toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "rgba(255, 255, 255, 0.75)", marginTop: 4 }}>
              Includes Stays, Transit, Activities & Dining
            </div>
          </div>

          {/* Per Person & Daily Velocity */}
          <div style={{ borderLeft: "1px solid rgba(255, 255, 255, 0.12)", paddingLeft: 20 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.75px", color: "rgba(255, 255, 255, 0.6)" }}>
              Per Person Breakdown
            </span>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#ffffff", marginTop: 4 }}>
              ₹{Math.round(costPerPerson).toLocaleString("en-IN")}
              <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "rgba(255, 255, 255, 0.6)", marginLeft: 4 }}>/ person</span>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "rgba(255, 255, 255, 0.75)", marginTop: 4 }}>
              Avg ₹{Math.round(costPerPerson / (totalDays || 1)).toLocaleString("en-IN")} / day per person
            </div>
          </div>

          {/* Target Limit Status & AI Tier */}
          <div style={{ borderLeft: "1px solid rgba(255, 255, 255, 0.12)", paddingLeft: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.75px", color: "rgba(255, 255, 255, 0.6)" }}>
                Budget Limit Status
              </span>
              {budgetData?.ai_insights?.tier && (
                <span style={{ fontSize: "0.7rem", fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: "rgba(195, 248, 50, 0.2)", color: "#c3f832" }}>
                  {budgetData.ai_insights.tier}
                </span>
              )}
            </div>

            {budgetLimitNum ? (
              <>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: isOverBudget ? "#f87171" : "#4ade80", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  {isOverBudget ? (
                    <><AlertTriangle size={16} /> Over limit by ₹{Math.round(overage).toLocaleString("en-IN")}</>
                  ) : (
                    <><CheckCircle2 size={16} /> ₹{Math.round(remaining).toLocaleString("en-IN")} under budget</>
                  )}
                </div>
                {/* Progress bar */}
                <div style={{ width: "100%", height: 6, background: "rgba(255, 255, 255, 0.15)", borderRadius: 10, marginTop: 8, overflow: "hidden" }}>
                  <div style={{ width: `${budgetProgressPct}%`, height: "100%", background: isOverBudget ? "#ef4444" : "#10b981", borderRadius: 10, transition: "width 0.3s ease" }} />
                </div>
              </>
            ) : (
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>No limit set. </span>
                <button
                  onClick={() => setActiveSubTab("settings")}
                  style={{ background: "transparent", border: "none", color: "#c3f832", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                >
                  Set target limit ➔
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs - Only this row slides horizontally */}
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
          {[
            { id: "overview", label: "📊 Overview & Splits" },
            { id: "daily", label: `📅 Day-by-Day Plan (${dailyPlan.length} Days)` },
            { id: "expenses", label: `🧾 Logged Expenses (${expenses.length})` },
            { id: "ai_insights", label: "🤖 AI Budget Optimizer" },
            { id: "settings", label: "⚙️ Budget Settings" },
          ].map((tab) => {
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                style={{
                  padding: "7px 16px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "0.8125rem",
                  fontWeight: active ? 700 : 500,
                  background: active ? "var(--ink, #0f172a)" : "transparent",
                  color: active ? "var(--accent, #c3f832)" : "var(--ink-soft, #64748b)",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tab Contents */}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: OVERVIEW & SPLITS */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "start" }}>
          {/* Left: Donut Chart Visualization */}
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 16px", color: "var(--ink, #0f172a)" }}>
              Category Cost Distribution
            </h3>

            {pieChartData.length > 0 ? (
              <div style={{ width: "100%", height: 260, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Estimated Cost"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--ink-soft, #64748b)", fontWeight: 700, textTransform: "uppercase" }}>Total</span>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--ink, #0f172a)" }}>
                    ₹{Math.round(totalCost).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "var(--ink-soft, #64748b)" }}>
                No category cost data available.
              </div>
            )}
          </div>

          {/* Right: Detailed Category Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { key: "stay", value: breakdown.stay, ...CATEGORY_PALETTE.stay },
              { key: "food", value: breakdown.food, ...CATEGORY_PALETTE.food },
              { key: "transport", value: breakdown.transport, ...CATEGORY_PALETTE.transport },
              { key: "activities", value: breakdown.activities, ...CATEGORY_PALETTE.activities },
              { key: "other", value: breakdown.other, ...CATEGORY_PALETTE.other },
            ].map((cat) => {
              const CatIcon = cat.icon;
              const pct = totalCost > 0 ? Math.round((cat.value / totalCost) * 100) : 0;

              return (
                <div
                  key={cat.key}
                  className="card card--hover"
                  style={{
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderRadius: 14,
                    border: "1px solid var(--border, #e2e8f0)",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: cat.bg, color: cat.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CatIcon size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.925rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
                        {cat.label}
                      </h4>
                      <span style={{ fontSize: "0.75rem", color: "var(--ink-soft, #64748b)" }}>
                        {pct}% of overall trip budget
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--ink, #0f172a)" }}>
                      ₹{Math.round(cat.value).toLocaleString("en-IN")}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--ink-soft, #64748b)" }}>
                      ₹{Math.round(cat.value / numTravelers).toLocaleString("en-IN")} / person
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DAY-BY-DAY DAILY BUDGET MATRIX */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === "daily" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--ink, #0f172a)" }}>
                Day-by-Day Daily Budget Matrix
              </h3>
              <p style={{ fontSize: "0.825rem", color: "var(--ink-soft, #64748b)", margin: "2px 0 0" }}>
                Exact planned spend per day across Stays, Food, Activities, and Transit.
              </p>
            </div>
          </div>

          {dailyPlan.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--ink-soft, #64748b)" }}>
              No daily itinerary dates generated yet. Add stops with arrival dates to see daily matrix.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {dailyPlan.map((day) => (
                <div
                  key={day.day_index}
                  className="card card--hover"
                  style={{
                    padding: "16px 20px",
                    borderRadius: 14,
                    border: "1px solid var(--border, #e2e8f0)",
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        background: "var(--ink, #0f172a)",
                        color: "var(--accent, #c3f832)",
                        padding: "3px 9px",
                        borderRadius: 8,
                        fontSize: "0.75rem",
                        fontWeight: 800,
                      }}>
                        Day {day.day_index}
                      </span>
                      <div>
                        <strong style={{ fontSize: "0.95rem", color: "var(--ink, #0f172a)" }}>
                          {day.city}
                        </strong>
                        <span style={{ fontSize: "0.785rem", color: "var(--ink-soft, #64748b)", marginLeft: 8 }}>
                          {day.date} ({day.day_name})
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--ink, #0f172a)" }}>
                        ₹{Math.round(day.planned_total).toLocaleString("en-IN")}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--ink-soft, #64748b)", marginLeft: 6 }}>
                        (₹{Math.round(day.per_person_day).toLocaleString("en-IN")} / person)
                      </span>
                    </div>
                  </div>

                  {/* Day Category Badges */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: 8,
                    background: "var(--surface, #f8fafc)",
                    padding: "10px 14px",
                    borderRadius: 10,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
                      <Home size={14} color="#6366f1" />
                      <span style={{ color: "var(--ink-soft, #64748b)" }}>Stay:</span>
                      <strong style={{ color: "var(--ink, #0f172a)" }}>₹{Math.round(day.breakdown.stay).toLocaleString("en-IN")}</strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
                      <Utensils size={14} color="#f59e0b" />
                      <span style={{ color: "var(--ink-soft, #64748b)" }}>Food:</span>
                      <strong style={{ color: "var(--ink, #0f172a)" }}>₹{Math.round(day.breakdown.food).toLocaleString("en-IN")}</strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
                      <Activity size={14} color="#ec4899" />
                      <span style={{ color: "var(--ink-soft, #64748b)" }}>Activities:</span>
                      <strong style={{ color: "var(--ink, #0f172a)" }}>₹{Math.round(day.breakdown.activities).toLocaleString("en-IN")}</strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
                      <Bus size={14} color="#10b981" />
                      <span style={{ color: "var(--ink-soft, #64748b)" }}>Transit:</span>
                      <strong style={{ color: "var(--ink, #0f172a)" }}>₹{Math.round(day.breakdown.transit).toLocaleString("en-IN")}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: LOGGED EXPENSES LEDGER */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === "expenses" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--ink, #0f172a)" }}>
                Live Daily Expenses Ledger
              </h3>
              <p style={{ fontSize: "0.825rem", color: "var(--ink-soft, #64748b)", margin: "2px 0 0" }}>
                Log ad-hoc costs, dining bills, local autos, and shopping during your trip.
              </p>
            </div>
            <button
              onClick={() => setShowAddExpense(true)}
              className="btn btn--primary btn--sm"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={14} /> Log New Expense
            </button>
          </div>

          {/* Quick Expense Form Modal / Card */}
          {showAddExpense && (
            <div
              className="card animate-fadeUp"
              style={{
                padding: 20,
                borderRadius: 14,
                border: "1.5px solid var(--ink, #0f172a)",
                background: "#ffffff",
                boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Log a Daily Expense</h4>
                <button
                  onClick={() => setShowAddExpense(false)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAddExpense} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, alignItems: "flex-end" }}>
                <div>
                  <label className="label" style={{ fontSize: "0.75rem", fontWeight: 700 }}>Category</label>
                  <select
                    className="input"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    style={{ height: 40, borderRadius: 8 }}
                  >
                    <option value="food">🍱 Food & Dining</option>
                    <option value="transport">🚗 Local Transport / Cab</option>
                    <option value="stay">🏨 Hotel / Accommodation</option>
                    <option value="activity">🎟️ Sightseeing / Tickets</option>
                    <option value="shopping">🛍️ Shopping & Souvenirs</option>
                    <option value="misc">💳 Miscellaneous</option>
                  </select>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label className="label" style={{ fontSize: "0.75rem", fontWeight: 700 }}>Description</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Dinner at Lake Pichola, Tuk-Tuk ride..."
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    required
                    style={{ height: 40, borderRadius: 8 }}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontSize: "0.75rem", fontWeight: 700 }}>Amount (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className="input"
                    placeholder="e.g. 1850"
                    value={expenseForm.actual_amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, actual_amount: e.target.value })}
                    required
                    style={{ height: 40, borderRadius: 8 }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="submit"
                    disabled={savingExpense}
                    className="btn btn--primary"
                    style={{ flex: 1, height: 40, borderRadius: 8, fontWeight: 700 }}
                  >
                    {savingExpense ? <LoadingSpinner size={14} color="#fff" /> : "Save Expense"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="btn btn--secondary"
                    style={{ height: 40, borderRadius: 8 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Expenses Table */}
          {loadingExpenses ? (
            <div style={{ padding: 40, textAlign: "center" }}><LoadingSpinner size={24} /></div>
          ) : expenses.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--ink-soft, #64748b)", borderRadius: 14 }}>
              <CreditCard size={32} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
              <p style={{ fontWeight: 600, margin: 0 }}>No custom expenses logged yet.</p>
              <p style={{ fontSize: "0.8125rem", margin: "4px 0 0", color: "#94a3b8" }}>
                Click "Log New Expense" to record daily receipts and out-of-pocket costs.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, borderRadius: 14, overflow: "hidden", border: "1px solid var(--border, #e2e8f0)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface, #f8fafc)", borderBottom: "1px solid var(--border, #e2e8f0)", color: "var(--ink-soft, #64748b)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <th style={{ padding: "12px 18px" }}>Category</th>
                    <th style={{ padding: "12px 18px" }}>Description</th>
                    <th style={{ padding: "12px 18px" }}>Date</th>
                    <th style={{ padding: "12px 18px", textAlign: "right" }}>Amount</th>
                    <th style={{ padding: "12px 18px", textAlign: "center", width: 50 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => {
                    const catInfo = CATEGORY_PALETTE[exp.category] || CATEGORY_PALETTE.misc;
                    const CatIcon = catInfo.icon;
                    const amount = exp.actual_amount != null ? exp.actual_amount : exp.estimated_amount;

                    return (
                      <tr key={exp.id} style={{ borderBottom: "1px solid var(--border, #f1f5f9)" }}>
                        <td style={{ padding: "12px 18px" }}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: catInfo.bg,
                            color: catInfo.color,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            textTransform: "capitalize",
                          }}>
                            <CatIcon size={12} /> {exp.category}
                          </span>
                        </td>
                        <td style={{ padding: "12px 18px", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
                          {exp.description}
                        </td>
                        <td style={{ padding: "12px 18px", color: "var(--ink-soft, #64748b)", fontSize: "0.8125rem" }}>
                          {exp.created_at ? new Date(exp.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Today"}
                        </td>
                        <td style={{ padding: "12px 18px", textAlign: "right", fontWeight: 800, color: "var(--ink, #0f172a)" }}>
                          ₹{Number(amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding: "12px 18px", textAlign: "center" }}>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}
                            title="Delete expense"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: AI BUDGET OPTIMIZER & PROOFING */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === "ai_insights" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* AI Advisor Hero Banner */}
          <div
            className="card"
            style={{
              padding: "20px 24px",
              borderRadius: 16,
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(195, 248, 50, 0.08) 100%)",
              border: "1.5px solid rgba(99, 102, 241, 0.2)",
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--ink, #0f172a)", color: "var(--accent, #c3f832)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--ink, #0f172a)" }}>
                AI Budget Intelligence & Optimizer
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--ink-soft, #64748b)" }}>
                {budgetData?.ai_insights?.tier_description || "Automated financial risk checks, savings suggestions, and contingency reserves."}
              </p>
            </div>
          </div>

          {/* AI Suggestions Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
            {/* Safety Contingency Buffer */}
            <div className="card" style={{ padding: 20, borderRadius: 14, border: "1px solid var(--border, #e2e8f0)", background: "#ffffff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#10b981", fontWeight: 700, fontSize: "0.9rem" }}>
                <ShieldCheck size={18} />
                Recommended Safety Buffer (12%)
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--ink, #0f172a)", margin: "8px 0 4px" }}>
                ₹{Math.round(budgetData?.ai_insights?.contingency_buffer || totalCost * 0.12).toLocaleString("en-IN")}
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--ink-soft, #64748b)", margin: 0 }}>
                Set aside for emergency local transit, medical kit, delays, or unexpected entrance fees.
              </p>
            </div>

            {/* Daily Velocity Indicator */}
            <div className="card" style={{ padding: 20, borderRadius: 14, border: "1px solid var(--border, #e2e8f0)", background: "#ffffff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6366f1", fontWeight: 700, fontSize: "0.9rem" }}>
                <Zap size={18} />
                Average Daily Spend Velocity
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--ink, #0f172a)", margin: "8px 0 4px" }}>
                ₹{Math.round(costPerPerson / (totalDays || 1)).toLocaleString("en-IN")}
                <span style={{ fontSize: "0.75rem", color: "var(--ink-soft, #64748b)", fontWeight: 500 }}> / day</span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--ink-soft, #64748b)", margin: 0 }}>
                Projected burn rate across {totalDays} itinerary days for {numTravelers} travelers.
              </p>
            </div>
          </div>

          {/* AI Recommendations List */}
          <div className="card" style={{ padding: 22, borderRadius: 16, border: "1px solid var(--border, #e2e8f0)", background: "#ffffff" }}>
            <h4 style={{ margin: "0 0 14px", fontSize: "0.95rem", fontWeight: 700, color: "var(--ink, #0f172a)", display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={16} color="#6366f1" /> Actionable Cost-Saving Tips
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(budgetData?.ai_insights?.recommendations || [
                "Your budget allocation across Transit, Stays, and Dining is optimal and well-balanced."
              ]).map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "var(--surface, #f8fafc)",
                    borderLeft: "3px solid #6366f1",
                    fontSize: "0.85rem",
                    color: "var(--ink, #0f172a)",
                    lineHeight: 1.45,
                  }}
                >
                  {rec}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: BUDGET SETTINGS */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600 }}>
          <div className="card" style={{ padding: 24, borderRadius: 16, border: "1px solid var(--border, #e2e8f0)", background: "#ffffff" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 16px", color: "var(--ink, #0f172a)" }}>
              Budget Target & Policies
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Max Budget Limit */}
              <div>
                <label className="label" style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 4 }}>
                  Maximum Trip Budget Limit (₹ INR)
                </label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  className="input"
                  placeholder="e.g. 50000"
                  value={targetLimit}
                  onChange={(e) => setTargetLimit(e.target.value)}
                  style={{ height: 42, borderRadius: 8 }}
                />
                <p style={{ fontSize: "0.75rem", color: "var(--ink-soft, #64748b)", margin: "4px 0 0" }}>
                  Set an upper ceiling. You will receive live warnings if your selections exceed this limit.
                </p>
              </div>

              {/* Food Allowance Rate */}
              <div>
                <label className="label" style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 4 }}>
                  Standard Meal Policy Allowance (₹ / person / day)
                </label>
                <input
                  type="number"
                  step="50"
                  min="200"
                  className="input"
                  placeholder="750"
                  value={mealRate}
                  onChange={(e) => setMealRate(e.target.value)}
                  style={{ height: 42, borderRadius: 8 }}
                />
                <p style={{ fontSize: "0.75rem", color: "var(--ink-soft, #64748b)", margin: "4px 0 0" }}>
                  Recommended: ₹400 (Budget), ₹750 (Comfort), ₹1,800+ (Fine Dining).
                </p>
              </div>

              <button
                onClick={handleSaveBudgetLimit}
                disabled={savingSettings}
                className="btn btn--primary"
                style={{ padding: "10px 20px", fontWeight: 700, borderRadius: 8, alignSelf: "flex-start" }}
              >
                {savingSettings ? <LoadingSpinner size={14} color="#fff" /> : "Save Budget Settings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
