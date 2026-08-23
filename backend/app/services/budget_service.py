import math
from datetime import timedelta, date
from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.models.trip import Trip
from app.models.stay import TripStay
from app.models.stop import TripStop
from app.models.transit import TransitLeg, TransitOption
from app.models.itinerary_item import ItineraryItem
from app.models.expense import Expense

DEFAULT_MEAL_RATE_PER_PERSON_PER_DAY = 750.0


class BudgetService:
    @classmethod
    async def calculate_authoritative_budget(
        cls, db: AsyncSession, trip_id: str, meal_rate_per_person_per_day: float = DEFAULT_MEAL_RATE_PER_PERSON_PER_DAY
    ) -> Dict[str, Any]:
        """
        The absolute single source of truth for budget computation.
        Reads selected TransitLegs, TripStays, ItineraryItems, and Expenses.
        Builds Day-by-Day Financial Forecasts and AI Optimization Intelligence.
        """
        # Load trip and all required relationships
        result = await db.execute(
            select(Trip)
            .options(
                selectinload(Trip.transit_legs).selectinload(TransitLeg.selected_option),
                selectinload(Trip.stops).selectinload(TripStop.stay_info),
                selectinload(Trip.stops).selectinload(TripStop.itinerary_items).selectinload(ItineraryItem.activity),
                selectinload(Trip.stops).selectinload(TripStop.city),
                selectinload(Trip.expenses),
            )
            .where(Trip.id == trip_id)
        )
        trip = result.scalar_one_or_none()
        if not trip:
            return {}

        num_travelers = max(1, int(getattr(trip, "num_travelers", 1) or 1))
        
        # 1. TRANSPORT = sum(selected transit option total_estimated_cost)
        transport_cost = 0.0
        for leg in trip.transit_legs:
            if leg.selected_option:
                transport_cost += float(leg.selected_option.total_estimated_cost or 0.0)

        # 2. STAY = sum(trip_stays.total_cost)
        stay_cost = 0.0
        for stop in trip.stops:
            for ts in getattr(stop, "stay_info", []):
                stay_cost += float(ts.cost or 0.0)

        # 3. ACTIVITIES = sum(trip_activity estimated/selected cost)
        activities_cost = 0.0
        for stop in trip.stops:
            for item in getattr(stop, "itinerary_items", []):
                effective = float(item.effective_cost or 0.0)
                activities_cost += effective * num_travelers

        # 4. FOOD = explicit meal policy
        days_diff = (trip.end_date - trip.start_date).days
        total_trip_days = max(1, days_diff if days_diff > 0 else 1)
        meals_cost = float(total_trip_days * num_travelers * meal_rate_per_person_per_day)

        # 5. EXPENSES = Logged expenses
        other_cost = 0.0
        total_actual_cost = 0.0
        expenses_by_date: Dict[str, float] = {}
        
        for exp in trip.expenses:
            amt = float(exp.actual_amount if exp.actual_amount is not None else exp.estimated_amount or 0.0)
            other_cost += amt
            if exp.actual_amount is not None:
                total_actual_cost += float(exp.actual_amount)
            
            # Map expenses to dates if available
            exp_date_str = exp.created_at.strftime("%Y-%m-%d") if exp.created_at else None
            if exp_date_str:
                expenses_by_date[exp_date_str] = expenses_by_date.get(exp_date_str, 0.0) + amt

        total_estimated_cost = transport_cost + stay_cost + activities_cost + meals_cost + other_cost
        cost_per_person = total_estimated_cost / num_travelers if num_travelers > 0 else 0.0

        # Room Math Rule: 1-2 -> 1 room, 3-4 -> 2 rooms, 5-6 -> 3 rooms
        rooms_allocated = math.ceil(num_travelers / 2.0)
        
        # -------------------------------------------------------------
        # 6. DAY-BY-DAY DAILY BUDGET MATRIX
        # -------------------------------------------------------------
        daily_plan = []
        cur_date = trip.start_date
        ordered_stops = sorted(trip.stops, key=lambda s: s.stop_order)

        for day_idx in range(total_trip_days):
            d_str = cur_date.strftime("%Y-%m-%d")
            day_name = cur_date.strftime("%A")
            
            # Identify active stop for this day
            active_stop = None
            for s in ordered_stops:
                if s.arrival_date <= cur_date <= s.departure_date:
                    active_stop = s
                    break
            if not active_stop and ordered_stops:
                active_stop = ordered_stops[min(day_idx, len(ordered_stops) - 1)]

            city_name = active_stop.city.name if (active_stop and active_stop.city) else (trip.origin_city or "En Route")

            # Day's stay cost
            day_stay = 0.0
            if active_stop and getattr(active_stop, "stay_info", []):
                for st in active_stop.stay_info:
                    day_stay += float(st.nightly_cost or 0.0) * rooms_allocated

            # Day's food allowance
            day_food = float(num_travelers * meal_rate_per_person_per_day)

            # Day's scheduled activities
            day_activities = 0.0
            if active_stop and getattr(active_stop, "itinerary_items", []):
                for itm in active_stop.itinerary_items:
                    if itm.scheduled_date == cur_date or (not itm.scheduled_date and day_idx == 0):
                        day_activities += float(itm.effective_cost or 0.0) * num_travelers

            # Day's transit cost (attributed on leg sequence days)
            day_transit = 0.0
            if day_idx < len(trip.transit_legs):
                leg = trip.transit_legs[day_idx]
                if leg.selected_option:
                    day_transit = float(leg.selected_option.total_estimated_cost or 0.0)

            # Day's logged expenses
            day_actual_expenses = expenses_by_date.get(d_str, 0.0)

            day_planned_total = day_stay + day_food + day_activities + day_transit
            
            daily_plan.append({
                "day_index": day_idx + 1,
                "date": d_str,
                "day_name": day_name,
                "city": city_name,
                "breakdown": {
                    "stay": round(day_stay, 2),
                    "food": round(day_food, 2),
                    "activities": round(day_activities, 2),
                    "transit": round(day_transit, 2),
                },
                "planned_total": round(day_planned_total, 2),
                "actual_spent": round(day_actual_expenses, 2),
                "per_person_day": round(day_planned_total / num_travelers, 2),
            })
            cur_date += timedelta(days=1)

        # -------------------------------------------------------------
        # 7. AI BUDGET INTELLIGENCE & OPTIMIZATION FORECAST
        # -------------------------------------------------------------
        avg_per_day_person = (total_estimated_cost / (total_trip_days * num_travelers)) if (total_trip_days * num_travelers) > 0 else 0.0
        
        if avg_per_day_person < 2500:
            ai_tier = "Backpacker & Value Saver"
            tier_desc = "Highly economical plan focusing on budget stays and local experiences."
        elif avg_per_day_person < 7000:
            ai_tier = "Balanced Explorer"
            tier_desc = "Optimal balance of comfortable hotels, fast transit, and curated activities."
        else:
            ai_tier = "Luxury & Premium Connoisseur"
            tier_desc = "High-end experience with luxury suites, private cabs, and fine dining."

        contingency_buffer = round(total_estimated_cost * 0.12, 2)

        # Dynamic AI Suggestions
        ai_recommendations = []
        if transport_cost > total_estimated_cost * 0.40:
            ai_recommendations.append("Transportation accounts for >40% of trip cost. Consider Vande Bharat Express or AC Sleepers instead of flights on short hops to save ~₹4,000-8,000.")
        if stay_cost > total_estimated_cost * 0.50:
            ai_recommendations.append("Accommodation is the largest expense. Booking boutique heritage stays directly or 3 weeks in advance typically saves 15-20%.")
        if not trip.budget_target:
            ai_recommendations.append(f"Set a target budget limit of ₹{round(total_estimated_cost * 1.10):,} to enable automated overage alerts.")
        if total_actual_cost > 0 and total_actual_cost > total_estimated_cost:
            ai_recommendations.append("Actual logged expenses have exceeded initial estimates. Review high-spend categories in the Expense Ledger.")
        if len(ai_recommendations) == 0:
            ai_recommendations.append("Your budget allocation across Transit, Stays, and Dining is optimal and well-balanced.")

        # Determine budget status & warnings
        budget_target_num = trip.total_budget if (trip.total_budget and trip.total_budget > 0) else getattr(trip, "budget_target", None)
        warnings = []
        is_over_budget = False
        overage = 0.0
        remaining = 0.0

        if budget_target_num and budget_target_num > 0:
            if total_estimated_cost > budget_target_num:
                is_over_budget = True
                overage = total_estimated_cost - budget_target_num
                warnings.append(f"Estimated cost (₹{total_estimated_cost:,.2f}) exceeds target limit (₹{budget_target_num:,.2f}) by ₹{overage:,.2f}")
            else:
                remaining = budget_target_num - total_estimated_cost

        # Synchronize total_budget on trip
        trip.total_budget = total_estimated_cost

        return {
            "trip_id": trip.id,
            "travelers": num_travelers,
            "num_travelers": num_travelers,
            "rooms": rooms_allocated,
            "rooms_allocated": rooms_allocated,
            "total_trip_days": total_trip_days,
            "total_cost": total_estimated_cost,
            "total_estimated_cost": total_estimated_cost,
            "total_actual_cost": total_actual_cost,
            "cost_per_person": cost_per_person,
            "currency": trip.currency or "INR",
            "meal_policy": {
                "rate_per_person_per_day": meal_rate_per_person_per_day,
                "label": "Estimated Food Allowance",
                "days": total_trip_days,
                "calculated_food": meals_cost,
            },
            "breakdown": {
                "transport": transport_cost,
                "stay": stay_cost,
                "activities": activities_cost,
                "food": meals_cost,
                "other": other_cost
            },
            "cost_breakdown": {
                "total_cost": total_estimated_cost,
                "transport_cost": transport_cost,
                "stay_cost": stay_cost,
                "activities_cost": activities_cost,
                "meals_cost": meals_cost,
                "misc_cost": other_cost
            },
            "budget_status": {
                "total_budget_limit": budget_target_num,
                "is_over_budget": is_over_budget,
                "budget_overage": overage,
                "budget_remaining": remaining,
            },
            "daily_plan": daily_plan,
            "ai_insights": {
                "tier": ai_tier,
                "tier_description": tier_desc,
                "avg_per_day_person": round(avg_per_day_person, 2),
                "contingency_buffer": contingency_buffer,
                "recommendations": ai_recommendations,
            },
            "warnings": warnings,
            "is_over_budget": is_over_budget,
            "budget_target": budget_target_num,
        }
