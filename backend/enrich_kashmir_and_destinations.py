import sqlite3
import uuid

KASHMIR_CITIES = [
    {
        "name": "Kashmir (Srinagar)",
        "country": "India",
        "region": "North India (Himalayas)",
        "cost_index": 55.0,
        "popularity_score": 9.8,
        "latitude": 34.0837,
        "longitude": 74.7973,
        "tags": '["dal_lake", "shikara", "houseboats", "paradise", "mughal_gardens"]',
        "vibe_tags": '["paradise", "romantic", "peaceful"]',
        "climate_type": "temperate",
        "best_months": '["March", "April", "May", "June", "September", "October", "December", "January"]',
        "safety_index": 82.0,
        "budget_tier": "mid-range",
        "rent_index": 20.0,
        "restaurant_price_index": 35.0,
        "description": "Known as Paradise on Earth, Kashmir enchants with scenic Shikara rides on Dal Lake, snow-capped Pir Panjal ranges, and blooming Mughal gardens.",
        "image_url": "https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=1200&auto=format&fit=crop&q=80",
    },
    {
        "name": "Gulmarg",
        "country": "India",
        "region": "North India (Himalayas)",
        "cost_index": 65.0,
        "popularity_score": 9.7,
        "latitude": 34.0484,
        "longitude": 74.3805,
        "tags": '["gondola", "snow", "skiing", "pine_forests", "himalayas"]',
        "vibe_tags": '["alpine", "majestic", "thrilling"]',
        "climate_type": "alpine",
        "best_months": '["December", "January", "February", "March", "May", "June"]',
        "safety_index": 85.0,
        "budget_tier": "mid-range",
        "rent_index": 25.0,
        "restaurant_price_index": 38.0,
        "description": "Meadow of Flowers and Asia's premier ski resort, featuring the world-famous Gulmarg Gondola rising up to Apharwat Peak at 13,780 ft.",
        "image_url": "https://images.unsplash.com/photo-1566833925766-31a89c898c6d?w=1200&auto=format&fit=crop&q=80",
    },
    {
        "name": "Pahalgam",
        "country": "India",
        "region": "North India (Himalayas)",
        "cost_index": 52.0,
        "popularity_score": 9.6,
        "latitude": 34.0163,
        "longitude": 75.3150,
        "tags": '["betaab_valley", "lidder_river", "trekking", "pine_woods", "valleys"]',
        "vibe_tags": '["serene", "emerald", "breathtaking"]',
        "climate_type": "temperate",
        "best_months": '["April", "May", "June", "July", "August", "September", "October"]',
        "safety_index": 88.0,
        "budget_tier": "mid-range",
        "rent_index": 22.0,
        "restaurant_price_index": 32.0,
        "description": "Valley of Shepherds surrounded by lush pine forests, Betaab Valley, Aru Valley, and the sparkling trout-filled Lidder River.",
        "image_url": "https://images.unsplash.com/photo-1627916607164-7b20241db935?w=1200&auto=format&fit=crop&q=80",
    },
    {
        "name": "Sonamarg",
        "country": "India",
        "region": "North India (Himalayas)",
        "cost_index": 50.0,
        "popularity_score": 9.5,
        "latitude": 34.3100,
        "longitude": 75.2938,
        "tags": '["meadow_of_gold", "thajiwas_glacier", "sindh_river", "pony_trek", "himalayas"]',
        "vibe_tags": '["golden", "pristine", "epic"]',
        "climate_type": "alpine",
        "best_months": '["May", "June", "July", "August", "September", "October"]',
        "safety_index": 85.0,
        "budget_tier": "mid-range",
        "rent_index": 20.0,
        "restaurant_price_index": 30.0,
        "description": "The Meadow of Gold, gateway to Ladakh featuring the Thajiwas Glacier, snow bridges, and alpine flower meadows along the Sindh River.",
        "image_url": "https://images.unsplash.com/photo-1588661799401-4410b0376d8b?w=1200&auto=format&fit=crop&q=80",
    }
]

def enrich():
    conn = sqlite3.connect("globetrotter.db")
    cur = conn.cursor()

    for k in KASHMIR_CITIES:
        cur.execute("SELECT id FROM cities WHERE name = ?", (k["name"],))
        row = cur.fetchone()
        if row:
            cur.execute("""
                UPDATE cities SET 
                    image_url = ?,
                    description = ?,
                    cost_index = ?,
                    popularity_score = ?
                WHERE id = ?
            """, (k["image_url"], k["description"], k["cost_index"], k["popularity_score"], row[0]))
            print(f"Updated city: {k['name']}")
        else:
            cid = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO cities (
                    id, name, country, region, cost_index, popularity_score,
                    latitude, longitude, tags, vibe_tags, climate_type,
                    best_months, safety_index, budget_tier, rent_index,
                    restaurant_price_index, description, image_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cid, k["name"], k["country"], k["region"], k["cost_index"], k["popularity_score"],
                k["latitude"], k["longitude"], k["tags"], k["vibe_tags"], k["climate_type"],
                k["best_months"], k["safety_index"], k["budget_tier"], k["rent_index"],
                k["restaurant_price_index"], k["description"], k["image_url"]
            ))
            print(f"Inserted new city: {k['name']}")

    # Make sure all cities without image_url get a valid high-res image
    cur.execute("""
        UPDATE cities 
        SET image_url = 'https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=1200&auto=format&fit=crop&q=80'
        WHERE image_url IS NULL OR image_url = ''
    """)

    conn.commit()
    conn.close()
    print("Enrichment complete!")

if __name__ == "__main__":
    enrich()
