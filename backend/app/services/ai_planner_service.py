"""
TRIPORA - Master Gemini AI Trip Planner Engine
Powered by Google Gemini 3.6 Flash / Pro
Generates comprehensive, multi-modal, hour-by-hour scheduled travel blueprints
with regional culinary guides, interactive map coordinates, transit optimization,
and 1-click database trip export.
"""

from datetime import date, datetime, time, timedelta
import json
import logging
from typing import Any, Dict, List, Optional
import uuid
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.activity import Activity
from app.models.budget import Budget
from app.models.city import City
from app.models.itinerary_item import ItineraryItem
from app.models.stay import Stay, TripStay
from app.models.stop import TripStop
from app.models.transit import TransitLeg, TransitOption
from app.models.trip import Trip
from app.models.user import User
from app.services.transit_service import TransitService
from app.services.budget_service import BudgetService

logger = logging.getLogger("TriporaAI")

# Curated regional culinary fallback knowledge base for iconic destinations globally
REGIONAL_FOOD_DATABASE = {
    "Mumbai": [
        {"name": "Authentic Mumbai Vada Pav & Pav Bhaji", "type": "Street Food Icon", "famous_spot": "Sardar / Ashok Vada Pav", "cost_inr": "₹80 - ₹180", "highlight": "Spiced potato fritter in buttered pav with fiery garlic chutney, followed by melting Amul butter pav bhaji."},
        {"name": "Irani Cafe Bun Maska & Irani Chai", "type": "Heritage Cafe", "famous_spot": "Kyani & Co. / Cafe Britannia", "cost_inr": "₹120 - ₹250", "highlight": "Warm crusty buns smothered in fresh white butter dipped in sweet cardamom-infused Irani milk tea."},
        {"name": "Coastal Bombil Fry & Malvani Fish Curry", "type": "Seafood Specialty", "famous_spot": "Gajalee / Trishna", "cost_inr": "₹450 - ₹950", "highlight": "Crispy rava-crusted Bombay Duck and fiery coconut Malvani curry served with steamed rice."},
    ],
    "Gandhinagar": [
        {"name": "Royal Gujarati Kathiyawadi Thali", "type": "Traditional Feast", "famous_spot": "Sasumaa / Gordhan Thal", "cost_inr": "₹280 - ₹450", "highlight": "Unlimited spread of Sev Tameta, Ringna No Oro, Kadhi, Khichdi, sweet Mohanthal, and hot buttered Rotla."},
        {"name": "Fafda Jalebi & Khaman Dhokla", "type": "Breakfast Specialty", "famous_spot": "Das Khaman / Iscon Gathiya", "cost_inr": "₹90 - ₹180", "highlight": "Crispy besan fafda with raw papaya sambharo and hot saffron-soaked coiled jalebis."},
        {"name": "Spiced Kutchi Dabeli", "type": "Evening Street Snack", "famous_spot": "Sector 21 Market Stalls", "cost_inr": "₹50 - ₹100", "highlight": "Toasted bun filled with masala mashed potatoes, sweet tamarind chutney, pomegranate pearls, and roasted peanuts."},
    ],
    "Ahmedabad": [
        {"name": "Manek Chowk Midnight Food Lane", "type": "Night Food Street", "famous_spot": "Manek Chowk Heritage Market", "cost_inr": "₹150 - ₹350", "highlight": "Chocolate cheese pineapple sandwich, pav bhaji, kulfi, and live wood-fired dosas in the historic jewelers market."},
        {"name": "Heritage Gujarati Dining Thali", "type": "Cultural Dining", "famous_spot": "Agashiye / Vishalla", "cost_inr": "₹650 - ₹1,200", "highlight": "Fine rooftop heritage dining served in bronze bell-metal utensils with live traditional folk music."},
    ],
    "Jaipur": [
        {"name": "Dal Baati Churma & Gatte Ki Sabzi", "type": "Rajasthani Royal Thali", "famous_spot": "LMB (Laxmi Mishthan Bhandar) / Chokhi Dhani", "cost_inr": "₹350 - ₹750", "highlight": "Baked wheat baatis crushed in pure desi ghee, served with five-lentil dal and sweet powdered jaggery churma."},
        {"name": "Rawat Pyaaz Kachori & Lassi", "type": "Iconic Street Breakfast", "famous_spot": "Rawat Mishthan Bhandar / Lassiwala MI Road", "cost_inr": "₹70 - ₹160", "highlight": "Flaky hot onion kachori served with tamarind chutney and thick creamy curd lassi served in traditional earthen kulhads."},
    ],
    "Udaipur": [
        {"name": "Mewari Laal Maas & Bajra Roti", "type": "Royal Non-Veg", "famous_spot": "Tribute / Ambrai Waterfront", "cost_inr": "₹550 - ₹1,100", "highlight": "Slow-cooked tender mutton infused with Mathania red chilies, garlic, and yogurt with lake views."},
        {"name": "Lake Pichola Rooftop Dal Mewari & Ker Sangri", "type": "Heritage Cuisine", "famous_spot": "Upre by 1559 AD", "cost_inr": "₹450 - ₹900", "highlight": "Desert wild beans and berries stir-fried with traditional spices overlooking the illuminated City Palace."},
    ],
    "Delhi": [
        {"name": "Old Delhi Chandni Chowk Paranthe & Butter Chicken", "type": "Street & Heritage", "famous_spot": "Paranthe Wali Gali / Karim's", "cost_inr": "₹150 - ₹600", "highlight": "Deep-fried stuffed parathas with pumpkin sabzi, followed by charcoal-roasted Mughlai butter chicken and garlic naan."},
        {"name": "Purani Dilli Jalebi & Daulat Ki Chaat", "type": "Legendary Dessert", "famous_spot": "Old Famous Jalebi Wala / Khemchand Daulat Ki Chaat", "cost_inr": "₹80 - ₹200", "highlight": "Giant golden jalebis fried in desi ghee and delicate frothy winter milk foam sprinkled with pistachios."},
    ],
    "Tokyo": [
        {"name": "Tsukiji Fresh Nigiri Sushi & Omakase", "type": "Culinary Masterpiece", "famous_spot": "Tsukiji Outer Market / Sushi Dai", "cost_inr": "₹1,200 - ₹3,500", "highlight": "Melting fatty tuna (Otoro), fresh sea urchin (Uni), and sweet Tamagoyaki prepared right in front of you."},
        {"name": "Rich Tonkotsu Ramen with Chashu Pork", "type": "Comfort Food", "famous_spot": "Ichiran Shibuya / Ippudo Roppongi", "cost_inr": "₹600 - ₹1,100", "highlight": "24-hour simmered pork bone broth with handmade springy noodles, soft-boiled marinated egg, and nori."},
    ],
}

DEFAULT_FOOD_SUGGESTIONS = [
    {"name": "Iconic Regional Specialties Feast", "type": "Culinary Highlight", "famous_spot": "Central Heritage District", "cost_inr": "₹350 - ₹750", "highlight": "Hand-selected authentic regional specialties, wood-fired delicacies, and local desserts curated by regional food masters."},
    {"name": "Artisan Bakery & Specialty Coffee", "type": "Morning Cafe", "famous_spot": "Old Town Promenade", "cost_inr": "₹200 - ₹450", "highlight": "Freshly brewed single-origin beans, warm artisan pastries, and breakfast delicacies."},
    {"name": "Historic Market Street Food Tasting", "type": "Street Food Walk", "famous_spot": "City Center Food Alley", "cost_inr": "₹150 - ₹350", "highlight": "Guided evening street food stroll tasting four legendary street treats unique to this region."},
]


class AIPlannerService:
    """Master AI Planning Service for GlobeTrotter / Tripora."""

    @staticmethod
    async def call_gemini_ai(
        origin_city: str,
        destination_input: str,
        duration_days: int,
        travelers: int,
        budget_tier: str,
        travel_style: str,
        transit_preference: str,
        dietary_preference: str,
        interests: List[str],
        grounded_poi_context: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Calls Google Gemini 2.5 Flash to generate rich bespoke travel knowledge,
        grounded directly in the 33,148+ Audiala open tourism dataset and regional knowledge base.
        """
        if not settings.GEMINI_API_KEY:
            return None

        prompt = f"""
        You are the Master Travel Architect for Tripora Luxury Travel.
        Generate a comprehensive, high-end travel blueprint for:
        - Origin: {origin_city}
        - Destination(s): {destination_input}
        - Duration: {duration_days} Days
        - Number of Travelers: {travelers}
        - Budget Tier: {budget_tier} (budget, mid, luxury)
        - Travel Style: {travel_style}
        - Transit Mode Preference: {transit_preference}
        - Dietary Preference: {dietary_preference}
        - Passions & Interests: {', '.join(interests)}

        {f"VERIFIED REAL-WORLD TOURISM DATASET & ATTRACTION POOL (SELECT & RANK THE BEST ONES):\n{grounded_poi_context}" if grounded_poi_context else ""}

        You MUST respond ONLY with valid JSON following this exact JSON structure:
        {{
          "trip_title": "String (e.g. 'Royal Heritage Odyssey: Mumbai to Gandhinagar & Udaipur')",
          "tagline": "String (e.g. 'Bespoke 4-Day Journey curated for 2 travelers')",
          "itinerary_days": [
            {{
              "day_number": 1,
              "city_name": "String",
              "theme": "String (e.g. 'Day 1: Arrival & Historic Forts')",
              "schedule": [
                {{
                  "time_slot": "08:30 - 09:30",
                  "slot_name": "Morning Fuel",
                  "title": "Breakfast & Artisan Coffee",
                  "category": "food",
                  "estimated_cost_inr": 250,
                  "description": "Engaging description...",
                  "insider_tip": "Insider secret..."
                }},
                {{
                  "time_slot": "09:45 - 12:30",
                  "slot_name": "Prime Exploration",
                  "title": "Major Landmark or Activity",
                  "category": "sightseeing",
                  "estimated_cost_inr": 400,
                  "description": "Engaging description...",
                  "insider_tip": "Insider secret..."
                }},
                {{
                  "time_slot": "13:00 - 14:15",
                  "slot_name": "Iconic Lunch",
                  "title": "Famous Local Culinary Feast",
                  "category": "food",
                  "estimated_cost_inr": 500,
                  "description": "Engaging description...",
                  "insider_tip": "Insider secret..."
                }},
                {{
                  "time_slot": "14:45 - 17:15",
                  "slot_name": "Afternoon Adventure",
                  "title": "Scenic Walk / Cultural Immersion",
                  "category": "adventure",
                  "estimated_cost_inr": 300,
                  "description": "Engaging description...",
                  "insider_tip": "Insider secret..."
                }},
                {{
                  "time_slot": "17:45 - 19:15",
                  "slot_name": "Golden Hour",
                  "title": "Sunset Point & Bazaars",
                  "category": "sightseeing",
                  "estimated_cost_inr": 200,
                  "description": "Engaging description...",
                  "insider_tip": "Insider secret..."
                }},
                {{
                  "time_slot": "19:45 - 21:30",
                  "slot_name": "Evening Dining",
                  "title": "Waterfront or Rooftop Dinner",
                  "category": "food",
                  "estimated_cost_inr": 800,
                  "description": "Engaging description...",
                  "insider_tip": "Insider secret..."
                }}
              ]
            }}
          ],
          "culinary_guides": [
            {{
              "city_name": "String",
              "delicacies": [
                {{
                  "name": "String (Dish Name)",
                  "type": "String (e.g. Traditional Feast / Street Food Icon)",
                  "famous_spot": "String (Restaurant / Stall Name)",
                  "cost_inr": "String (e.g. '₹150 - ₹350')",
                  "highlight": "String (Flavor profile & why it is famous)"
                }}
              ]
            }}
          ],
          "transit_legs": [
            {{
              "leg_number": 1,
              "from_city": "String",
              "to_city": "String",
              "mode": "{transit_preference}",
              "provider": "String (e.g. Vande Bharat Express / IndiGo)",
              "duration_hours": 6.5,
              "cost_per_person_inr": 1650
            }}
          ]
        }}
        """

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        
        strict_rules = f"""
        CRITICAL RULES FOR ITINERARY QUALITY & ZERO REPETITION:
        1. SORT & SELECT THE BEST DATASET POIs:
           - Use the real landmarks, palaces, national parks, viewpoints, and eateries from the provided dataset.
           - Rank and select the most iconic, top-reviewed places first.
        2. STRICT ZERO REPETITION ACROSS ALL {duration_days} DAYS (EVEN FOR 14-DAY TRIPS):
           - NO tourist place, fort, garden, viewpoint, or restaurant can be repeated in any slot or on any day.
           - Every single day must feature completely new, unvisited attractions.
        3. ACCURATE REAL-WORLD INDIAN PRICING IN INR (PER PERSON):
           - Regular Monument/Park/Museum Entry: ₹50 to ₹350 INR
           - Special Experiences (Jeep Safari, Houseboat, Shikara, Gondola, Forest Trek): ₹400 to ₹950 INR
           - Breakfast/Cafes: ₹120 to ₹250 INR
           - Iconic Regional Lunch/Thali: ₹220 to ₹450 INR
           - Dinner/Fine Dining: ₹350 to ₹750 INR
           - Intercity Transit per person: Train/Bus ₹450 - ₹1,850 INR, Flight ₹3,200 - ₹5,500 INR
           - NEVER output inflated 5-digit numbers (like ₹35,000) for a single meal or entry ticket.
        4. HIGH-VALUE CONTEXTUAL INSIDER TIPS:
           - Each activity MUST have an authentic, specific tip (e.g. queue timings, best viewpoint, signature dish name, dress code).
        """

        full_prompt = f"{prompt}\n\n{strict_rules}"

        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.3,
                "max_output_tokens": 8192,
                "thinkingConfig": {"thinkingBudget": 0},
            }
        }

        try:
            async with httpx.AsyncClient(timeout=80.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(raw_text)
                    return parsed
                else:
                    print(f"[Gemini API Error] Status {res.status_code}: {res.text}")
                    logger.warning(f"Gemini API returned status {res.status_code}: {res.text}")
        except Exception as e:
            import traceback
            print(f"[Gemini API Exception] {e}\n{traceback.format_exc()}")
            logger.error(f"Gemini API invocation error or timeout: {e}")

        return None

    @staticmethod
    async def generate_master_itinerary(
        db: AsyncSession,
        origin_city: str,
        destination_input: str,
        duration_days: int,
        travelers: int,
        budget_tier: str,
        travel_style: str,
        transit_preference: str,
        dietary_preference: str,
        interests: List[str],
        start_date_str: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Synthesizes a complete travel master blueprint:
        - Calls Gemini 3.6 Flash for rich deep travel intelligence
        - Resolves city sequence and geographic coordinates
        - Generates hour-by-hour scheduled timeline
        - Curates regional "Must-Eat" culinary guide
        - Computes multi-modal transit legs and stay recommendations
        - Prepares authoritative budget breakdown
        """
        # Parse start date
        try:
            start_date = date.fromisoformat(start_date_str) if start_date_str else date.today() + timedelta(days=14)
        except Exception:
            start_date = date.today() + timedelta(days=14)
        
        end_date = start_date + timedelta(days=max(1, duration_days))

        # 1. Resolve Cities involved with verified high-precision geocoding
        candidate_city_names = []
        if origin_city:
            candidate_city_names.append(origin_city.strip())
        
        raw_dests = destination_input.replace("&", ",").replace("to", ",").replace("->", ",").split(",")
        for d in raw_dests:
            cleaned = d.strip()
            if cleaned and cleaned.lower() not in [c.lower() for c in candidate_city_names]:
                candidate_city_names.append(cleaned)

        if len(candidate_city_names) == 0:
            candidate_city_names = ["Mumbai", "Gandhinagar"]

        # Fetch matching City models from DB
        db_cities_res = await db.execute(select(City).options(selectinload(City.activities)))
        all_db_cities = list(db_cities_res.scalars().all())

        from app.utils.geo_registry import lookup_accurate_coordinates
        from app.services.live_search_service import LiveSearchService

        resolved_cities = []
        for name in candidate_city_names:
            matched = next((c for c in all_db_cities if c.name.lower() == name.lower() or name.lower() in c.name.lower()), None)
            if matched:
                # Update latitude/longitude if missing or default
                if not matched.latitude or not matched.longitude or matched.latitude == 0.0:
                    lat, lon = lookup_accurate_coordinates(matched.name)
                    matched.latitude = lat
                    matched.longitude = lon
                resolved_cities.append(matched)
            else:
                lat, lon = lookup_accurate_coordinates(name)
                resolved_cities.append(
                    City(
                        id=str(uuid.uuid4()),
                        name=name,
                        country="India" if lat > 8.0 and lat < 37.0 and lon > 68.0 and lon < 97.0 else "Global",
                        latitude=lat,
                        longitude=lon,
                        cost_index=50.0,
                        popularity_score=9.2,
                        image_url="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
                    )
                )

        dest_cities = resolved_cities[1:] if len(resolved_cities) > 1 else resolved_cities

        # 2. Assemble Grounded POI Knowledge Bank directly from Audiala 33K+ dataset & regional catalog (0ms latency)
        from app.services.audiala_places_service import AudialaPlacesService
        from app.services.destination_knowledge import get_curated_destination_pool

        grounded_poi_blocks = []
        for c in dest_cities:
            aud_places = AudialaPlacesService.get_places_for_city(c.name, limit=25)
            cat_pool = get_curated_destination_pool(c.name)
            cat_sightseeing = cat_pool.get("sightseeing", [])
            cat_food = cat_pool.get("food", [])

            city_lines = [f"### City: {c.name}"]
            if aud_places:
                city_lines.append("  [Audiala Verified Global POIs]:")
                for p in aud_places[:12]:
                    city_lines.append(f"    * {p['name']} (Category: {p['category']}) - Guide: {p['guide_url']}")
            
            if cat_sightseeing:
                city_lines.append("  [Curated Sightseeing & Activities]:")
                for s in cat_sightseeing[:15]:
                    city_lines.append(f"    * {s['name']} (Category: {s.get('category', 'sightseeing')}, Approx: ₹{s.get('estimated_cost_inr', 200)}) - {s.get('description', '')[:110]}")

            if cat_food:
                city_lines.append("  [Iconic Dining & Regional Delicacies]:")
                for f in cat_food[:8]:
                    city_lines.append(f"    * {f.get('title', f.get('name', ''))} (Approx: ₹{f.get('estimated_cost_inr', 250)})")

            grounded_poi_blocks.append("\n".join(city_lines))

        grounded_poi_context = "\n\n".join(grounded_poi_blocks)

        # 3. Try Gemini API with grounded dataset POIs
        gemini_result = await AIPlannerService.call_gemini_ai(
            origin_city=origin_city,
            destination_input=destination_input,
            duration_days=duration_days,
            travelers=travelers,
            budget_tier=budget_tier,
            travel_style=travel_style,
            transit_preference=transit_preference,
            dietary_preference=dietary_preference,
            interests=interests,
            grounded_poi_context=grounded_poi_context,
        )

        if gemini_result and "itinerary_days" in gemini_result and len(gemini_result["itinerary_days"]) > 0:
            # Align dates and realistic numbers
            itinerary_days = []
            total_act_cost = 0.0

            cur_dt = start_date
            for d_idx, day_obj in enumerate(gemini_result["itinerary_days"]):
                day_num = d_idx + 1
                matched_city = next((c for c in resolved_cities if c.name.lower() in day_obj.get("city_name", "").lower()), dest_cities[min(d_idx, len(dest_cities)-1)])
                
                day_cost = 0.0
                schedule_items = []
                for s_item in day_obj.get("schedule", []):
                    # Clamp costs to genuine realistic Indian market rates
                    raw_cost = float(s_item.get("estimated_cost_inr", 300))
                    # Sanity bounds: no single attraction should cost > 1500 unless luxury safari
                    cost = min(950.0, max(50.0, raw_cost))
                    day_cost += cost
                    total_act_cost += cost
                    schedule_items.append({
                        "time_slot": s_item.get("time_slot", "09:00 - 11:00"),
                        "slot_name": s_item.get("slot_name", "Activity"),
                        "title": s_item.get("title", "Experience"),
                        "category": s_item.get("category", "sightseeing"),
                        "estimated_cost_inr": round(cost, 0),
                        "description": s_item.get("description", "Curated activity"),
                        "city_name": matched_city.name,
                        "insider_tip": s_item.get("insider_tip", "Recommended local tip."),
                    })

                itinerary_days.append({
                    "day_number": day_num,
                    "date": cur_dt.isoformat(),
                    "city_name": matched_city.name,
                    "city_country": matched_city.country,
                    "theme": day_obj.get("theme", f"Day {day_num}: {matched_city.name} Highlights"),
                    "schedule": schedule_items,
                    "day_total_cost_inr": round(day_cost, 0),
                })
                cur_dt += timedelta(days=1)

            # Apply strict zero repetition deduplication engine
            from app.services.itinerary_deduplicator import enforce_zero_repetition
            itinerary_days = enforce_zero_repetition(itinerary_days)
            total_act_cost = sum(sum(s.get("estimated_cost_inr", 0) for s in d.get("schedule", [])) for d in itinerary_days)

            culinary_guides = gemini_result.get("culinary_guides", [])
            if not culinary_guides:
                for c in dest_cities:
                    ddg_foods = live_city_intel.get(c.name, {}).get("foods", [])
                    matched_foods = ddg_foods if ddg_foods else REGIONAL_FOOD_DATABASE.get(c.name, DEFAULT_FOOD_SUGGESTIONS)
                    culinary_guides.append({
                        "city_name": c.name,
                        "delicacies": matched_foods
                    })

            # Transit legs
            transit_legs = []
            total_transit_cost = 0.0
            raw_transit = gemini_result.get("transit_legs", [])
            
            if raw_transit:
                for idx, leg in enumerate(raw_transit):
                    raw_cost_p = float(leg.get("cost_per_person_inr", 1500.0))
                    cost_p = min(4800.0, max(250.0, raw_cost_p))
                    t_cost = cost_p * travelers
                    total_transit_cost += t_cost
                    transit_legs.append({
                        "leg_number": idx + 1,
                        "from_city": leg.get("from_city", resolved_cities[0].name),
                        "to_city": leg.get("to_city", resolved_cities[-1].name),
                        "mode": leg.get("mode", transit_preference),
                        "provider": leg.get("provider", "Vande Bharat Express"),
                        "duration_hours": float(leg.get("duration_hours", 5.0)),
                        "cost_per_person_inr": cost_p,
                        "total_cost_inr": round(t_cost, 0),
                    })
            else:
                for i in range(len(resolved_cities) - 1):
                    c_from = resolved_cities[i]
                    c_to = resolved_cities[i + 1]
                    cost_p = 1450.0
                    t_cost = cost_p * travelers
                    total_transit_cost += t_cost
                    transit_legs.append({
                        "leg_number": i + 1,
                        "from_city": c_from.name,
                        "to_city": c_to.name,
                        "mode": transit_preference,
                        "provider": "Vande Bharat Express (Executive / CC)",
                        "duration_hours": 5.5,
                        "cost_per_person_inr": cost_p,
                        "total_cost_inr": round(t_cost, 0),
                    })

            # Budget
            stay_multiplier = 1100.0 if budget_tier == "budget" else (3200.0 if budget_tier == "mid" else 8500.0)
            rooms_needed = max(1, (travelers + 1) // 2)
            total_stay_cost = stay_multiplier * duration_days * rooms_needed
            food_est = 650.0 * duration_days * travelers
            total_trip_cost = total_stay_cost + total_transit_cost + (total_act_cost * travelers) + food_est

            budget_summary = {
                "currency": "INR",
                "total_estimated_cost": round(total_trip_cost, 0),
                "cost_per_person": round(total_trip_cost / max(1, travelers), 0),
                "breakdown": {
                    "stays": round(total_stay_cost, 0),
                    "transport": round(total_transit_cost, 0),
                    "activities": round(total_act_cost * travelers, 0),
                    "food": round(food_est, 0),
                },
                "num_travelers": travelers,
                "duration_days": duration_days,
                "budget_tier": budget_tier,
            }

            map_stops = []
            for idx, city in enumerate(resolved_cities):
                map_stops.append({
                    "id": city.id,
                    "stop_order": idx,
                    "city_name": city.name,
                    "country": city.country,
                    "latitude": city.latitude,
                    "longitude": city.longitude,
                    "image_url": city.image_url,
                })

            return {
                "trip_title": gemini_result.get("trip_title", f"{' → '.join([c.name for c in resolved_cities])} AI Master Itinerary"),
                "tagline": gemini_result.get("tagline", f"Bespoke {duration_days}-Day {budget_tier.capitalize()} Journey curated for {travelers} traveler(s)"),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "origin_city": origin_city or resolved_cities[0].name,
                "destinations": [c.name for c in dest_cities],
                "map_stops": map_stops,
                "itinerary_days": itinerary_days,
                "culinary_guides": culinary_guides,
                "transit_legs": transit_legs,
                "budget_summary": budget_summary,
                "travel_style": travel_style,
                "interests": interests,
                "hero_image": dest_cities[0].image_url if dest_cities else "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
            }

        # Deterministic Heuristic Engine Powered by Live DuckDuckGo Intelligence
        days_per_city = max(1, duration_days // max(1, len(dest_cities)))
        itinerary_days = []
        day_counter = 1
        current_day_date = start_date

        daily_slots_info = [
            {"time": "08:30 - 09:30", "slot": "Morning Fuel", "icon": "coffee", "type": "Breakfast & Artisan Brews", "default_cost": 150.0},
            {"time": "09:45 - 12:30", "slot": "Prime Exploration", "icon": "landmark", "type": "Major Sightseeing & Heritage Exploration", "default_cost": 300.0},
            {"time": "13:00 - 14:15", "slot": "Iconic Lunch", "icon": "utensils", "type": "Authentic Regional Thali / Feast", "default_cost": 350.0},
            {"time": "14:45 - 17:15", "slot": "Afternoon Adventure", "icon": "compass", "type": "Scenic Nature Walk & Local Activities", "default_cost": 250.0},
            {"time": "17:45 - 19:15", "slot": "Golden Hour", "icon": "sunset", "type": "Sunset Viewpoint & Artisan Bazaars", "default_cost": 100.0},
            {"time": "19:45 - 21:30", "slot": "Evening Dining", "icon": "moon", "type": "Rooftop / Waterfront Dinner & Night Ambience", "default_cost": 450.0},
        ]

        total_activity_cost_est = 0.0

        for city_idx, city in enumerate(dest_cities):
            city_days = days_per_city if city_idx < len(dest_cities) - 1 else (duration_days - (days_per_city * (len(dest_cities) - 1)))
            city_intel = live_city_intel.get(city.name, {})
            ddg_attractions = city_intel.get("attractions", [])
            ddg_foods = city_intel.get("foods", [])

            for d in range(max(1, city_days)):
                day_items = []
                day_cost = 0.0

                for slot_idx, slot_spec in enumerate(daily_slots_info):
                    # Pick non-repeating attractions and food spots
                    if slot_idx == 0:
                        # Morning breakfast
                        food_pick = ddg_foods[d % len(ddg_foods)] if ddg_foods else None
                        item_title = f"{food_pick['title']} Morning Breakfast" if food_pick else f"Authentic {city.name} Morning Breakfast & Filter Coffee"
                        item_desc = f"Kickstart the morning with freshly prepared {city.name} breakfast specialties and hot artisanal brew."
                        item_cost = 180.0
                        item_cat = "food"
                        tip = "Visit before 9:00 AM for the freshest batch straight from the kitchen."
                    elif slot_idx == 1:
                        # Prime Exploration (Main landmark)
                        attr_pick = ddg_attractions[(d * 2) % len(ddg_attractions)] if ddg_attractions else None
                        item_title = attr_pick["name"] if attr_pick else f"{city.name} Premier Heritage Landmark"
                        item_desc = attr_pick["description"] if attr_pick else f"Discover the iconic history and architectural majesty of {city.name}."
                        item_cost = attr_pick["estimated_cost_inr"] if attr_pick else 250.0
                        item_cat = "sightseeing"
                        tip = "Carry water, wear comfortable walking shoes, and book tickets online to skip entry queues."
                    elif slot_idx == 2:
                        # Lunch Feast
                        food_pick = ddg_foods[(d + 1) % len(ddg_foods)] if ddg_foods else None
                        item_title = food_pick["title"] if food_pick else f"Legendary {city.name} Regional Thali Feast"
                        item_desc = food_pick["highlight"] if food_pick else f"Indulge in an authentic multi-course regional feast served with traditional local accompaniments."
                        item_cost = 320.0
                        item_cat = "food"
                        tip = "Ask for the pure ghee thali and house special dessert of the day."
                    elif slot_idx == 3:
                        # Afternoon Adventure / Nature / Trek
                        attr_pick = ddg_attractions[(d * 2 + 1) % len(ddg_attractions)] if ddg_attractions else None
                        item_title = attr_pick["name"] if attr_pick else f"{city.name} Scenic Valley & Nature Trail"
                        item_desc = attr_pick["description"] if attr_pick else f"Immerse yourself in picturesque landscapes, lush gardens, and local craft centers."
                        item_cost = attr_pick["estimated_cost_inr"] if attr_pick else 200.0
                        item_cat = "adventure"
                        tip = "Best for photography during mild afternoon light; hiring a licensed local guide is recommended."
                    elif slot_idx == 4:
                        # Golden Hour Sunset
                        item_title = f"{city.name} Sunset Point & Heritage Promenade"
                        item_desc = f"Watch the breathtaking sunset hues illuminate {city.name} and explore bustling artisan craft stalls."
                        item_cost = 80.0
                        item_cat = "sightseeing"
                        tip = "Arrive 30 minutes before sunset to secure the premier panoramic viewpoint."
                    else:
                        # Evening Dining
                        food_pick = ddg_foods[(d + 2) % len(ddg_foods)] if ddg_foods else None
                        item_title = f"{food_pick['title']} Evening Dinner" if food_pick else f"Scenic Rooftop Dinner in {city.name}"
                        item_desc = f"Relax with candle-lit evening ambience, local live acoustic melodies, and rich culinary delicacies."
                        item_cost = 450.0
                        item_cat = "food"
                        tip = "Reserve a table in advance for scenic rooftop or waterfront seating."

                    if budget_tier == "luxury":
                        item_cost *= 1.4
                    elif budget_tier == "budget":
                        item_cost *= 0.75

                    item_cost = round(item_cost, 0)
                    day_items.append({
                        "time_slot": slot_spec["time"],
                        "slot_name": slot_spec["slot"],
                        "title": item_title,
                        "category": item_cat,
                        "estimated_cost_inr": item_cost,
                        "description": item_desc,
                        "city_name": city.name,
                        "insider_tip": tip,
                    })

                    day_cost += item_cost
                    total_activity_cost_est += item_cost

                itinerary_days.append({
                    "day_number": day_counter,
                    "date": current_day_date.isoformat(),
                    "city_name": city.name,
                    "city_country": city.country,
                    "theme": f"Day {day_counter}: Highlights & Hidden Gems of {city.name}",
                    "schedule": day_items,
                    "day_total_cost_inr": round(day_cost, 0),
                })
                day_counter += 1
                current_day_date += timedelta(days=1)

        # Apply strict zero repetition deduplication engine
        from app.services.itinerary_deduplicator import enforce_zero_repetition
        itinerary_days = enforce_zero_repetition(itinerary_days)
        total_activity_cost_est = sum(sum(s.get("estimated_cost_inr", 0) for s in d.get("schedule", [])) for d in itinerary_days)

        culinary_guides = []
        for city in dest_cities:
            matched_foods = REGIONAL_FOOD_DATABASE.get(city.name, DEFAULT_FOOD_SUGGESTIONS)
            culinary_guides.append({
                "city_name": city.name,
                "delicacies": matched_foods,
            })

        transit_legs = []
        total_transit_cost = 0.0

        for i in range(len(resolved_cities) - 1):
            c_from = resolved_cities[i]
            c_to = resolved_cities[i + 1]
            pref_mode = transit_preference.lower() if transit_preference else "train"
            if pref_mode == "optimal":
                pref_mode = "flight" if c_from.country != c_to.country else "train"

            mode_details = {
                "train": {"provider": "Vande Bharat Express (Executive / CC)", "duration_hours": 6.5, "cost_per_person": 1650.0},
                "flight": {"provider": "Direct Domestic Flight (Economy)", "duration_hours": 1.5, "cost_per_person": 4200.0},
                "cab": {"provider": "Private AC Sedan Intercity Cab", "duration_hours": 7.0, "cost_per_person": 2800.0},
                "bus": {"provider": "Luxury Multi-Axle Volvo Sleeper", "duration_hours": 8.0, "cost_per_person": 1100.0},
            }
            selected_mode_data = mode_details.get(pref_mode, mode_details["train"])
            leg_cost = selected_mode_data["cost_per_person"] * travelers
            total_transit_cost += leg_cost

            transit_legs.append({
                "leg_number": i + 1,
                "from_city": c_from.name,
                "to_city": c_to.name,
                "mode": pref_mode,
                "provider": selected_mode_data["provider"],
                "duration_hours": selected_mode_data["duration_hours"],
                "cost_per_person_inr": selected_mode_data["cost_per_person"],
                "total_cost_inr": round(leg_cost, 0),
            })

        stay_multiplier = 1100.0 if budget_tier == "budget" else (3200.0 if budget_tier == "mid" else 8500.0)
        rooms_needed = max(1, (travelers + 1) // 2)
        total_stay_cost = stay_multiplier * duration_days * rooms_needed
        food_est = 650.0 * duration_days * travelers
        total_trip_cost = total_stay_cost + total_transit_cost + (total_activity_cost_est * travelers) + food_est

        budget_summary = {
            "currency": "INR",
            "total_estimated_cost": round(total_trip_cost, 0),
            "cost_per_person": round(total_trip_cost / max(1, travelers), 0),
            "breakdown": {
                "stays": round(total_stay_cost, 0),
                "transport": round(total_transit_cost, 0),
                "activities": round(total_activity_cost_est * travelers, 0),
                "food": round(food_est, 0),
            },
            "num_travelers": travelers,
            "duration_days": duration_days,
            "budget_tier": budget_tier,
        }

        map_stops = []
        for idx, city in enumerate(resolved_cities):
            map_stops.append({
                "id": city.id,
                "stop_order": idx,
                "city_name": city.name,
                "country": city.country,
                "latitude": city.latitude,
                "longitude": city.longitude,
                "image_url": city.image_url,
            })

        return {
            "trip_title": f"{' → '.join([c.name for c in resolved_cities])} AI Master Itinerary",
            "tagline": f"Bespoke {duration_days}-Day {budget_tier.capitalize()} Journey curated for {travelers} traveler(s)",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "origin_city": origin_city or resolved_cities[0].name,
            "destinations": [c.name for c in dest_cities],
            "map_stops": map_stops,
            "itinerary_days": itinerary_days,
            "culinary_guides": culinary_guides,
            "transit_legs": transit_legs,
            "budget_summary": budget_summary,
            "travel_style": travel_style,
            "interests": interests,
            "hero_image": dest_cities[0].image_url if dest_cities else "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
        }

    @staticmethod
    async def save_ai_trip_to_database(
        db: AsyncSession,
        current_user: User,
        ai_blueprint: Dict[str, Any],
    ) -> Trip:
        """
        Persists the AI generated blueprint into authoritative database tables:
        - Trip model
        - TripStop models for all cities
        - ItineraryItem models for all scheduled activities
        - TransitLeg & TransitOption models
        - Budget model
        Returns the created Trip entity.
        """
        start_date = date.fromisoformat(ai_blueprint.get("start_date", date.today().isoformat()))
        end_date = date.fromisoformat(ai_blueprint.get("end_date", (date.today() + timedelta(days=7)).isoformat()))
        budget_data = ai_blueprint.get("budget_summary", {})

        # 1. Create Trip
        new_trip = Trip(
            user_id=current_user.id,
            title=ai_blueprint.get("trip_title", "My AI Trip"),
            description=f"Generated by Tripora AI Master Brain for {ai_blueprint.get('travel_style', 'Explorer')} travel style.",
            start_date=start_date,
            end_date=end_date,
            origin_city=ai_blueprint.get("origin_city", "Mumbai"),
            num_travelers=float(budget_data.get("num_travelers", 1)),
            transit_mode=ai_blueprint.get("transit_legs", [{}])[0].get("mode", "train") if ai_blueprint.get("transit_legs") else "train",
            total_budget=float(budget_data.get("total_estimated_cost", 25000.0)),
            budget_target=float(budget_data.get("total_estimated_cost", 25000.0)),
            currency="INR",
            visibility="private",
            status="READY",
            cover_photo=ai_blueprint.get("hero_image", "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800"),
        )
        db.add(new_trip)
        await db.flush()

        # 2. Add Stops
        map_stops = ai_blueprint.get("map_stops", [])
        created_stops = []
        days_per_stop = max(1, (end_date - start_date).days // max(1, len(map_stops)))

        cur_date = start_date
        for idx, s in enumerate(map_stops):
            stop_arr = cur_date
            stop_dep = cur_date + timedelta(days=days_per_stop) if idx < len(map_stops) - 1 else end_date

            city_name = s.get("city_name", "Destination")
            city_id = s.get("id")
            city = await db.get(City, city_id) if city_id else None
            if not city:
                city_res = await db.execute(select(City).where(City.name.ilike(city_name)))
                city = city_res.scalar_one_or_none()

            if not city:
                # Create a persistent city record in DB
                city = City(
                    id=str(uuid.uuid4()),
                    name=city_name,
                    country=s.get("country", "India"),
                    latitude=float(s.get("latitude", 23.22)),
                    longitude=float(s.get("longitude", 72.65)),
                    cost_index=55.0,
                    popularity_score=8.5,
                    image_url=s.get("image_url", "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800"),
                )
                db.add(city)
                await db.flush()

            trip_stop = TripStop(
                trip_id=new_trip.id,
                city_id=city.id,
                arrival_date=stop_arr,
                departure_date=stop_dep,
                stop_order=idx,
                notes=f"Stop {idx + 1} of AI Itinerary in {city_name}",
            )
            db.add(trip_stop)
            await db.flush()
            created_stops.append((trip_stop, city_name))
            cur_date = stop_dep

        # 3. Add Scheduled Activities to ItineraryItems
        itinerary_days = ai_blueprint.get("itinerary_days", [])
        for day in itinerary_days:
            city_name = day.get("city_name")
            matched_pair = next((p for p in created_stops if p[1].lower() == (city_name or "").lower()), created_stops[0] if created_stops else None)
            
            if matched_pair:
                matching_stop = matched_pair[0]
                for act in day.get("schedule", []):
                    time_slot = act.get("time_slot", "09:00 - 11:00")
                    parts = time_slot.split("-")
                    try:
                        st_parts = [int(p.strip()) for p in parts[0].split(":")]
                        et_parts = [int(p.strip()) for p in parts[1].split(":")]
                        s_time = time(st_parts[0], st_parts[1])
                        e_time = time(et_parts[0], et_parts[1])
                    except Exception:
                        s_time = time(9, 0)
                        e_time = time(11, 0)

                    # Check or create Activity
                    act_name = act.get("title", "Experience")
                    act_cost_inr = float(act.get("estimated_cost_inr", 250.0))
                    
                    db_act_res = await db.execute(
                        select(Activity).where(
                            Activity.city_id == matching_stop.city_id,
                            Activity.name.ilike(act_name)
                        )
                    )
                    db_act = db_act_res.scalar_one_or_none()
                    if not db_act:
                        db_act = Activity(
                            id=str(uuid.uuid4()),
                            city_id=matching_stop.city_id,
                            name=act_name,
                            category=act.get("category", "sightseeing"),
                            description=act.get("description", "Curated AI activity experience"),
                            estimated_cost=round(act_cost_inr / 80.0, 2),
                            duration_hours=2.0,
                            tags=["ai_generated", str(act.get("slot_name", "activity")).lower()],
                        )
                        db.add(db_act)
                        await db.flush()

                    item = ItineraryItem(
                        trip_stop_id=matching_stop.id,
                        activity_id=db_act.id,
                        scheduled_date=date.fromisoformat(day.get("date", start_date.isoformat())),
                        start_time=s_time,
                        end_time=e_time,
                        custom_cost=act_cost_inr,
                        notes=f"{act.get('title')}: {act.get('description')} ({act.get('insider_tip', '')})",
                        status="planned",
                    )
                    db.add(item)

        await db.flush()

        # 4. Build Transit Legs
        await TransitService.rebuild_transit_legs(db, new_trip)

        # 5. Initialize Authoritative Budget
        budget = Budget(
            trip_id=new_trip.id,
            transport_cost=budget_data.get("breakdown", {}).get("transport", 0.0),
            stay_cost=budget_data.get("breakdown", {}).get("stays", 0.0),
            meals_cost=budget_data.get("breakdown", {}).get("food", 0.0),
            misc_cost=budget_data.get("breakdown", {}).get("activities", 0.0),
            total_budget_limit=float(budget_data.get("total_estimated_cost", 25000.0)),
        )
        db.add(budget)
        await db.flush()
        await db.commit()

        return new_trip
