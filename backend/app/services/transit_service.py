import math
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.transit import TransitLeg, TransitOption
from app.models.trip import Trip

INDIAN_ORIGIN_COORDINATES: Dict[str, Dict[str, float]] = {
    "Mumbai": {"lat": 19.0760, "lon": 72.8777},
    "Delhi": {"lat": 28.6139, "lon": 77.2090},
    "Bengaluru": {"lat": 12.9716, "lon": 77.5946},
    "Ahmedabad": {"lat": 23.0225, "lon": 72.5714},
    "Gandhinagar": {"lat": 23.2156, "lon": 72.6369},
    "Pune": {"lat": 18.5204, "lon": 73.8567},
    "Jaipur": {"lat": 26.9124, "lon": 75.7873},
    "Udaipur": {"lat": 24.5854, "lon": 73.7125},
    "Jodhpur": {"lat": 26.2389, "lon": 73.0243},
    "Jaisalmer": {"lat": 26.9157, "lon": 70.9083},
    "Srinagar": {"lat": 34.0837, "lon": 74.7973},
    "Kashmir": {"lat": 34.0837, "lon": 74.7973},
    "Gulmarg": {"lat": 34.0484, "lon": 74.3805},
    "Pahalgam": {"lat": 34.0163, "lon": 75.3150},
    "Sonamarg": {"lat": 34.3100, "lon": 75.2938},
    "Manali": {"lat": 32.2432, "lon": 77.1892},
    "Shimla": {"lat": 31.1048, "lon": 77.1734},
    "Rishikesh": {"lat": 30.0869, "lon": 78.2676},
    "Amritsar": {"lat": 31.6340, "lon": 74.8723},
    "Agra": {"lat": 27.1767, "lon": 78.0081},
    "Varanasi": {"lat": 25.3176, "lon": 82.9739},
    "Kolkata": {"lat": 22.5726, "lon": 88.3639},
    "Chennai": {"lat": 13.0827, "lon": 80.2707},
    "Hyderabad": {"lat": 17.3850, "lon": 78.4867},
    "Surat": {"lat": 21.1702, "lon": 72.8311},
    "Chandigarh": {"lat": 30.7333, "lon": 76.7794},
    "Lucknow": {"lat": 26.8467, "lon": 80.9462},
    "Kanpur": {"lat": 26.4499, "lon": 80.3319},
    "Indore": {"lat": 22.7196, "lon": 75.8577},
    "Kochi": {"lat": 9.9312, "lon": 76.2673},
    "Munnar": {"lat": 10.0889, "lon": 77.0595},
    "Goa": {"lat": 15.2993, "lon": 74.1240},
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    if lat1 == 0.0 or lon1 == 0.0 or lat2 == 0.0 or lon2 == 0.0:
        return 450.0
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    dist = round(R * c, 1)
    return min(2500.0, max(30.0, dist))


class TransitService:

    @classmethod
    def generate_options_for_distance(
        cls,
        road_distance_km: float,
        num_travelers: int,
        leg_id: str,
        from_name: str = "Origin",
        to_name: str = "Destination",
    ) -> List[TransitOption]:
        """Generates comprehensive, realistic multi-schedule transit options for a journey leg."""
        options = []
        num_travelers = max(1, num_travelers)
        effective_km = min(2500.0, max(25.0, road_distance_km))

        # Base durations
        train_speed_fast = 90.0 if effective_km > 300 else 75.0
        train_speed_reg = 65.0 if effective_km > 300 else 55.0
        fast_train_duration = round(min(30.0, max(1.1, effective_km / train_speed_fast)), 1)
        reg_train_duration = round(min(36.0, max(1.4, effective_km / train_speed_reg)), 1)

        # -------------------------------------------------------------
        # 1. TRAINS (Multiple Scheduled Services, Classes & Real Fares)
        # -------------------------------------------------------------
        if effective_km > 0:
            # 1A. Vande Bharat Express (Chair Car)
            vb_cc_fare = min(2850, max(650, round(450 + effective_km * 1.15)))
            options.append(TransitOption(
                transit_leg_id=leg_id,
                mode="train",
                provider="Vande Bharat Express (CC)",
                label="Semi-High Speed Chair Car",
                duration_hours=fast_train_duration,
                total_estimated_cost=vb_cc_fare * num_travelers,
                cost_per_person=vb_cc_fare,
                metadata_json={
                    "service_number": "20979 / 20980",
                    "departure_time": "06:00 AM",
                    "arrival_time": f"{int(6 + fast_train_duration):02d}:{int((fast_train_duration % 1) * 60):02d} AM" if fast_train_duration < 6 else "11:45 AM",
                    "operating_days": "Except Wednesday",
                    "class_type": "AC Chair Car (CC)",
                    "amenities": ["Breakfast Included", "High-Speed WiFi", "Charging Socket", "CCTV Security"],
                    "route_via": f"{from_name} Junction ➔ {to_name} Direct",
                },
            ))

            # 1B. Vande Bharat Express (Executive Class)
            vb_ec_fare = min(4200, max(1250, round(850 + effective_km * 2.10)))
            options.append(TransitOption(
                transit_leg_id=leg_id,
                mode="train",
                provider="Vande Bharat (Executive EC)",
                label="180° Rotating Luxury Seats",
                duration_hours=fast_train_duration,
                total_estimated_cost=vb_ec_fare * num_travelers,
                cost_per_person=vb_ec_fare,
                metadata_json={
                    "service_number": "20979 / 20980",
                    "departure_time": "06:00 AM",
                    "arrival_time": "11:45 AM",
                    "operating_days": "Except Wednesday",
                    "class_type": "Executive Class (EC)",
                    "amenities": ["180° Swivel Seats", "Gourmet Hot Meal", "Priority Boarding", "Individual Reading Light"],
                    "route_via": f"{from_name} Junction ➔ {to_name} Direct",
                },
            ))

            # 1C. Superfast / Rajdhani Express (AC 3-Tier)
            ac3_fare = min(1850, max(520, round(320 + effective_km * 0.72)))
            options.append(TransitOption(
                transit_leg_id=leg_id,
                mode="train",
                provider="Superfast Express (3A)",
                label="AC 3-Tier Sleeper",
                duration_hours=reg_train_duration,
                total_estimated_cost=ac3_fare * num_travelers,
                cost_per_person=ac3_fare,
                metadata_json={
                    "service_number": "12981 / 12982",
                    "departure_time": "03:30 PM",
                    "arrival_time": "09:45 PM",
                    "operating_days": "Daily (All 7 Days)",
                    "class_type": "AC 3-Tier (3A)",
                    "amenities": ["Fresh Linen & Bedding", "Charging Ports", "Pantry On-Board"],
                    "route_via": f"{from_name} ➔ Key Junctions ➔ {to_name}",
                },
            ))

            # 1D. Superfast / Rajdhani Express (AC 2-Tier)
            ac2_fare = min(2650, max(850, round(540 + effective_km * 1.18)))
            options.append(TransitOption(
                transit_leg_id=leg_id,
                mode="train",
                provider="Superfast Express (2A)",
                label="AC 2-Tier Premium Sleeper",
                duration_hours=reg_train_duration,
                total_estimated_cost=ac2_fare * num_travelers,
                cost_per_person=ac2_fare,
                metadata_json={
                    "service_number": "12981 / 12982",
                    "departure_time": "03:30 PM",
                    "arrival_time": "09:45 PM",
                    "operating_days": "Daily (All 7 Days)",
                    "class_type": "AC 2-Tier (2A)",
                    "amenities": ["Curtained Privacy Berths", "Full Bedding Kit", "Individual Reading Lamps"],
                    "route_via": f"{from_name} ➔ Key Junctions ➔ {to_name}",
                },
            ))

            # 1E. Overnight Mail / Express (Sleeper Class)
            sleeper_fare = min(680, max(180, round(100 + effective_km * 0.28)))
            options.append(TransitOption(
                transit_leg_id=leg_id,
                mode="train",
                provider="Overnight Express (SL)",
                label="Budget Sleeper",
                duration_hours=round(reg_train_duration * 1.15, 1),
                total_estimated_cost=sleeper_fare * num_travelers,
                cost_per_person=sleeper_fare,
                metadata_json={
                    "service_number": "19610 / 19611",
                    "departure_time": "10:15 PM",
                    "arrival_time": "06:30 AM (Next Day)",
                    "operating_days": "Daily",
                    "class_type": "Sleeper Class (SL)",
                    "amenities": ["Reserved Sleeping Berth", "Budget Travel Choice"],
                    "route_via": f"{from_name} ➔ Night Transit ➔ {to_name}",
                },
            ))

        # -------------------------------------------------------------
        # 2. FLIGHTS (Multiple Scheduled Domestic Airline Flights)
        # -------------------------------------------------------------
        if effective_km >= 280:
            flight_duration_hrs = round(min(4.5, max(1.0, 0.75 + (effective_km / 800.0))), 1)

            # 2A. IndiGo Morning Non-Stop
            indigo_fare = min(6800, max(2950, round(2600 + (effective_km * 1.55))))
            options.append(TransitOption(
                transit_leg_id=leg_id,
                mode="flight",
                provider="IndiGo (Morning Direct)",
                label="Direct Flight • 6E 521",
                duration_hours=flight_duration_hrs,
                total_estimated_cost=indigo_fare * num_travelers,
                cost_per_person=indigo_fare,
                metadata_json={
                    "service_number": "6E 521",
                    "departure_time": "07:15 AM",
                    "arrival_time": f"{int(7 + flight_duration_hrs):02d}:{int((flight_duration_hrs % 1) * 60 + 15):02d} AM",
                    "operating_days": "Daily Non-Stop",
                    "class_type": "Economy (Direct)",
                    "baggage": "15 kg Check-in + 7 kg Cabin",
                    "amenities": ["Fastest Non-stop Transit", "15kg Baggage", "Auto Web Check-In"],
                    "route_via": f"{from_name} Airport ➔ {to_name} Airport",
                },
            ))

            # 2B. Air India Full-Service Flight
            ai_fare = min(8200, max(3800, round(3400 + (effective_km * 1.80))))
            options.append(TransitOption(
                transit_leg_id=leg_id,
                mode="flight",
                provider="Air India (Full Service)",
                label="Prime Afternoon • AI 472",
                duration_hours=round(flight_duration_hrs + 0.2, 1),
                total_estimated_cost=ai_fare * num_travelers,
                cost_per_person=ai_fare,
                metadata_json={
                    "service_number": "AI 472",
                    "departure_time": "01:30 PM",
                    "arrival_time": "03:00 PM",
                    "operating_days": "Daily",
                    "class_type": "Full Service Economy",
                    "baggage": "25 kg Check-in + 7 kg Cabin",
                    "amenities": ["Free Hot Meal Included", "25kg Generous Baggage", "Extra Legroom"],
                    "route_via": f"{from_name} Airport ➔ {to_name} Airport",
                },
            ))

            # 2C. Akasa Air / SpiceJet Evening Saver
            saver_fare = min(5900, max(2650, round(2350 + (effective_km * 1.40))))
            options.append(TransitOption(
                transit_leg_id=leg_id,
                mode="flight",
                provider="Akasa Air (Evening Saver)",
                label="Evening Direct • QP 1352",
                duration_hours=flight_duration_hrs,
                total_estimated_cost=saver_fare * num_travelers,
                cost_per_person=saver_fare,
                metadata_json={
                    "service_number": "QP 1352",
                    "departure_time": "07:45 PM",
                    "arrival_time": "09:05 PM",
                    "operating_days": "Daily",
                    "class_type": "Saver Economy",
                    "baggage": "15 kg Check-in + 7 kg Cabin",
                    "amenities": ["USB Fast Charging", "Modern Boeing 737 MAX", "Cafe Menu"],
                    "route_via": f"{from_name} Airport ➔ {to_name} Airport",
                },
            ))

        # -------------------------------------------------------------
        # 3. BUSES (Multiple Luxury Sleeper, Electric & Volvo Operators)
        # -------------------------------------------------------------
        if effective_km <= 1100:
            bus_duration_hrs = round(min(22.0, max(1.5, effective_km / 55.0)), 1)

            # 3A. IntrCity SmartBus (Luxury AC Sleeper 2+1)
            intrcity_fare = min(1850, max(550, round(350 + effective_km * 1.15)))
            options.append(TransitOption(
                transit_leg_id=leg_id,
                mode="bus",
                provider="IntrCity SmartBus AC Sleeper",
                label="Premium AC Sleeper (2+1)",
                duration_hours=bus_duration_hrs,
                total_estimated_cost=intrcity_fare * num_travelers,
                cost_per_person=intrcity_fare,
                metadata_json={
                    "service_number": "IC-Smart88",
                    "departure_time": "09:30 PM",
                    "arrival_time": "06:00 AM (Next Day)",
                    "operating_days": "Daily Overnight",
                    "class_type": "Luxury AC Sleeper (2+1)",
                    "amenities": ["Live Bus Tracking", "Clean Bedding & Blanket", "Mineral Water Bottle", "Charging Point"],
                    "route_via": f"{from_name} Highway Hub ➔ {to_name}",
                },
            ))

            # 3B. Zingbus Premium Multi-Axle Volvo
            zing_fare = min(1650, max(480, round(300 + effective_km * 1.05)))
            options.append(TransitOption(
                transit_leg_id=leg_id,
                mode="bus",
                provider="Zingbus Volvo Multi-Axle",
                label="Volvo Multi-Axle AC Sleeper",
                duration_hours=bus_duration_hrs,
                total_estimated_cost=zing_fare * num_travelers,
                cost_per_person=zing_fare,
                metadata_json={
                    "service_number": "ZB-VIP09",
                    "departure_time": "10:30 PM",
                    "arrival_time": "07:15 AM (Next Day)",
                    "operating_days": "Daily",
                    "class_type": "Volvo AC Sleeper",
                    "amenities": ["Zingbus Lounge Access", "Emergency SOS", "USB Ports", "Luggage Assistance"],
                    "route_via": f"{from_name} ➔ National Highway ➔ {to_name}",
                },
            ))

            # 3C. NueGo 100% Electric Eco Express (Daytime)
            if effective_km <= 500:
                nuego_fare = min(1250, max(380, round(220 + effective_km * 0.95)))
                options.append(TransitOption(
                    transit_leg_id=leg_id,
                    mode="bus",
                    provider="NueGo Electric AC Express",
                    label="100% Electric Day Express",
                    duration_hours=round(effective_km / 60.0, 1),
                    total_estimated_cost=nuego_fare * num_travelers,
                    cost_per_person=nuego_fare,
                    metadata_json={
                        "service_number": "NG-Green01",
                        "departure_time": "08:15 AM",
                        "arrival_time": "02:30 PM",
                        "operating_days": "Daily Daytime",
                        "class_type": "Electric Recliner AC",
                        "amenities": ["Silent Electric Ride", "Zero Carbon Footprint", "CCTV & Breathalyzer", "Snack Stop"],
                        "route_via": f"{from_name} ➔ Expressway ➔ {to_name}",
                    },
                ))

        # -------------------------------------------------------------
        # 4. CABS / PRIVATE ROAD OUTSTATION (Sedans, SUVs, Tempo)
        # -------------------------------------------------------------
        if effective_km <= 750:
            cab_duration_hrs = round(min(14.0, max(1.0, effective_km / 62.0)), 1)

            # 4A. Prime Sedan (Dzire / Etios AC)
            sedan_total = round(min(10500, (effective_km * 12.0) + min(1200, effective_km * 1.1)))
            sedan_per_person = round(sedan_total / num_travelers)
            options.append(TransitOption(
                transit_leg_id=leg_id,
                mode="cab",
                provider="Outstation Sedan (Dzire / Etios)",
                label="4-Seater Dedicated Sedan",
                duration_hours=cab_duration_hrs,
                total_estimated_cost=sedan_total,
                cost_per_person=sedan_per_person,
                metadata_json={
                    "service_number": "Sedan AC (1-4 Pax)",
                    "departure_time": "Flexible (Doorstep Pickup)",
                    "arrival_time": f"~{cab_duration_hrs}h after departure",
                    "operating_days": "Available 24x7",
                    "class_type": "AC Sedan (Dzire / Etios)",
                    "amenities": ["Doorstep Pickup & Drop", "Dedicated Chauffeur", "Tolls & Fuel Included", "Flexible Rest Stops"],
                    "route_via": f"Direct Highway via NE1 / National Highway",
                },
            ))

            # 4B. Prime SUV (Toyota Innova Crysta / Ertiga)
            suv_rate = 17.5
            suv_total = round(min(16000, (effective_km * suv_rate) + min(1500, effective_km * 1.2)))
            suv_per_person = round(suv_total / num_travelers)
            options.append(TransitOption(
                transit_leg_id=leg_id,
                mode="cab",
                provider="Outstation SUV (Innova Crysta)",
                label="6-7 Seater Luxury SUV",
                duration_hours=cab_duration_hrs,
                total_estimated_cost=suv_total,
                cost_per_person=suv_per_person,
                metadata_json={
                    "service_number": "Innova Crysta AC (6-7 Pax)",
                    "departure_time": "Flexible (Doorstep Pickup)",
                    "arrival_time": f"~{cab_duration_hrs}h after departure",
                    "operating_days": "Available 24x7",
                    "class_type": "Captain Seats Luxury SUV",
                    "amenities": ["Captain Recliner Seats", "Dual AC Zones", "Extra Boot Luggage Space", "Highway Specialist Driver"],
                    "route_via": f"Fast Expressway to {to_name}",
                },
            ))

        return options

    @classmethod
    async def rebuild_transit_legs(cls, db: AsyncSession, trip: Trip) -> None:
        """
        Rebuilds transit legs for a trip based on its ordered stops.
        Preserves selected choices if the from/to stops match an existing leg.
        """
        num_travelers = max(1, int(getattr(trip, "num_travelers", 1) or 1))
        
        from app.models.stop import TripStop
        from sqlalchemy.orm import selectinload
        
        stops_res = await db.execute(
            select(TripStop)
            .options(selectinload(TripStop.city))
            .where(TripStop.trip_id == trip.id)
            .order_by(TripStop.stop_order.asc())
        )
        ordered_stops = list(stops_res.scalars().all())
        
        legs_res = await db.execute(
            select(TransitLeg)
            .options(selectinload(TransitLeg.options))
            .where(TransitLeg.trip_id == trip.id)
        )
        existing_legs_list = list(legs_res.scalars().all())
        
        if not ordered_stops:
            for leg in existing_legs_list:
                await db.delete(leg)
            await db.flush()
            return
            
        intended_pairs = []
        intended_pairs.append((None, ordered_stops[0].id))
        
        for i in range(len(ordered_stops) - 1):
            intended_pairs.append((ordered_stops[i].id, ordered_stops[i+1].id))
            
        existing_legs = { (leg.from_stop_id, leg.to_stop_id): leg for leg in existing_legs_list }
        
        for pair, leg in list(existing_legs.items()):
            if pair not in intended_pairs:
                await db.delete(leg)
                del existing_legs[pair]
        await db.flush()
                
        for temp_idx, leg in enumerate(existing_legs.values()):
            leg.sequence = -1000 - temp_idx
            db.add(leg)
        await db.flush()

        def resolve_city_coords(c_name: str, fallback_lat: float, fallback_lon: float):
            if fallback_lat and fallback_lon and fallback_lat != 0.0 and fallback_lon != 0.0:
                return fallback_lat, fallback_lon
            for k, coords in INDIAN_ORIGIN_COORDINATES.items():
                if k.lower() in c_name.lower():
                    return coords["lat"], coords["lon"]
            return 19.0760, 72.8777

        # Generate legs and populated options
        for seq, (from_id, to_id) in enumerate(intended_pairs):
            from_name = (trip.origin_city or "Origin City").strip().title() if from_id is None else "Stop"
            to_name = "Destination"

            orig_lat, orig_lon = 19.0760, 72.8777
            if from_id is None:
                orig_clean = (trip.origin_city or "Mumbai").strip().title()
                orig_lat, orig_lon = resolve_city_coords(orig_clean, 0.0, 0.0)
                from_name = orig_clean
            else:
                from_stop = next((s for s in ordered_stops if s.id == from_id), None)
                if from_stop and from_stop.city:
                    from_name = from_stop.city.name
                    orig_lat, orig_lon = resolve_city_coords(
                        from_stop.city.name, from_stop.city.latitude or 0.0, from_stop.city.longitude or 0.0
                    )
                    
            to_stop = next((s for s in ordered_stops if s.id == to_id), None)
            dest_lat, dest_lon = 23.0225, 72.5714
            if to_stop and to_stop.city:
                to_name = to_stop.city.name
                dest_lat, dest_lon = resolve_city_coords(
                    to_stop.city.name, to_stop.city.latitude or 0.0, to_stop.city.longitude or 0.0
                )
                
            dist = haversine_km(orig_lat, orig_lon, dest_lat, dest_lon)
            road_dist = round(max(30.0, dist * 1.22), 1)

            if (from_id, to_id) in existing_legs:
                leg = existing_legs[(from_id, to_id)]
                leg.sequence = seq
                db.add(leg)
                
                # If existing leg has 0 or old minimal options, regenerate rich options
                if not leg.options or len(leg.options) <= 5:
                    for old_opt in list(leg.options):
                        await db.delete(old_opt)
                    await db.flush()
                    new_options = cls.generate_options_for_distance(road_dist, num_travelers, leg.id, from_name, to_name)
                    for opt in new_options:
                        db.add(opt)
            else:
                new_leg = TransitLeg(
                    trip_id=trip.id,
                    from_stop_id=from_id,
                    to_stop_id=to_id,
                    sequence=seq
                )
                db.add(new_leg)
                await db.flush()
                
                options = cls.generate_options_for_distance(road_dist, num_travelers, new_leg.id, from_name, to_name)
                for opt in options:
                    db.add(opt)
        
        await db.flush()
