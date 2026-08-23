import sqlite3

def fix_pricing():
    conn = sqlite3.connect("globetrotter.db")
    cur = conn.cursor()

    # Query all transit options
    cur.execute("SELECT id, mode, provider, total_estimated_cost, cost_per_person, duration_hours FROM transit_options")
    rows = cur.fetchall()
    print(f"Total transit options to review: {len(rows)}")

    for opt_id, mode, provider, total_cost, per_person, duration in rows:
        mode_l = (mode or "").lower()
        new_per_person = per_person
        new_duration = duration

        if "flight" in mode_l:
            new_per_person = min(6500.0, max(3400.0, per_person if per_person and per_person < 10000 else 4200.0))
            new_duration = min(3.5, max(1.0, duration if duration and duration < 8 else 1.8))
        elif "vande" in (provider or "").lower() or "cc" in (provider or "").lower() or "2a" in (provider or "").lower():
            new_per_person = min(2600.0, max(950.0, per_person if per_person and per_person < 5000 else 1450.0))
            new_duration = min(14.0, max(1.5, duration if duration and duration < 24 else 5.5))
        elif "3a" in (provider or "").lower():
            new_per_person = min(1750.0, max(550.0, per_person if per_person and per_person < 3500 else 980.0))
            new_duration = min(16.0, max(2.0, duration if duration and duration < 24 else 6.5))
        elif "sl" in (provider or "").lower() or "sleeper" in (provider or "").lower():
            new_per_person = min(650.0, max(180.0, per_person if per_person and per_person < 1500 else 360.0))
            new_duration = min(18.0, max(2.5, duration if duration and duration < 30 else 7.5))
        elif "bus" in mode_l:
            new_per_person = min(1600.0, max(350.0, per_person if per_person and per_person < 3000 else 850.0))
            new_duration = min(14.0, max(2.0, duration if duration and duration < 24 else 7.0))
        elif "cab" in mode_l:
            new_per_person = min(3500.0, max(750.0, per_person if per_person and per_person < 8000 else 1800.0))
            new_duration = min(10.0, max(1.5, duration if duration and duration < 20 else 5.0))

        # Recompute total estimated cost based on ratio or realistic multiplier
        ratio = total_cost / per_person if per_person and per_person > 0 else 1.0
        ratio = max(1.0, min(10.0, ratio))
        new_total = round(new_per_person * ratio, 2)

        cur.execute("""
            UPDATE transit_options SET
                cost_per_person = ?,
                total_estimated_cost = ?,
                duration_hours = ?
            WHERE id = ?
        """, (new_per_person, new_total, new_duration, opt_id))

    # Also fix any trips with inflated total_budget or budget_target
    cur.execute("SELECT id, total_budget, budget_target, num_travelers FROM trips")
    trips = cur.fetchall()
    for tid, tb, bt, n_trav in trips:
        travelers = max(1, int(n_trav or 1))
        # Cap inflated budgets (e.g. if > 2,00,000 for domestic trips)
        if tb and tb > 120000.0:
            new_tb = min(65000.0, 18000.0 * travelers)
            cur.execute("UPDATE trips SET total_budget = ? WHERE id = ?", (new_tb, tid))
        if bt and bt > 150000.0:
            new_bt = min(75000.0, 22000.0 * travelers)
            cur.execute("UPDATE trips SET budget_target = ? WHERE id = ?", (new_bt, tid))

    conn.commit()
    conn.close()
    print("Database transit and trip budget pricing successfully recalibrated!")

if __name__ == "__main__":
    fix_pricing()
