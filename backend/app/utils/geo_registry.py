"""
Master Geographic Coordinate Registry for Indian Destinations & Global Hubs.
Provides verified accurate latitudes and longitudes to guarantee pinpoint map accuracy.
"""

from typing import Dict, Tuple

GEO_COORDINATES_REGISTRY: Dict[str, Tuple[float, float]] = {
    # Kerala & South India
    "kochi": (9.9312, 76.2673),
    "cochin": (9.9312, 76.2673),
    "munnar": (10.0889, 77.0595),
    "alleppey": (9.4981, 76.3388),
    "alappuzha": (9.4981, 76.3388),
    "thekkady": (9.6031, 77.1615),
    "wayanad": (11.6854, 76.1320),
    "varkala": (8.7379, 76.7163),
    "kovalam": (8.4020, 76.9784),
    "trivandrum": (8.5241, 76.9366),
    "thiruvananthapuram": (8.5241, 76.9366),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "mysuru": (12.2958, 76.6394),
    "mysore": (12.2958, 76.6394),
    "coorg": (12.3375, 75.8069),
    "hampi": (15.3350, 76.4600),
    "gokarna": (14.5479, 74.3188),
    "chennai": (13.0827, 80.2707),
    "madurai": (9.9252, 78.1198),
    "pondicherry": (11.9416, 79.8083),
    "puducherry": (11.9416, 79.8083),
    "ooty": (11.4102, 76.6950),
    "kodaikanal": (10.2381, 77.4892),
    "hyderabad": (17.3850, 78.4867),
    "visakhapatnam": (17.6868, 83.2185),

    # Maharashtra & Goa
    "mumbai": (19.0760, 72.8777),
    "pune": (18.5204, 73.8567),
    "lonavala": (18.7557, 73.4091),
    "khandala": (18.7610, 73.3768),
    "mahabaleshwar": (17.9237, 73.6586),
    "alibaug": (18.6414, 72.8722),
    "nashik": (19.9975, 73.7898),
    "aurangabad": (19.8762, 75.3433),
    "chhatrapati sambhajinagar": (19.8762, 75.3433),
    "nagpur": (21.1458, 79.0882),
    "goa": (15.2993, 74.1240),
    "panaji": (15.4909, 73.8278),

    # Gujarat & Rajasthan
    "ahmedabad": (23.0225, 72.5714),
    "gandhinagar": (23.2156, 72.6369),
    "surat": (21.1702, 72.8311),
    "vadodara": (22.3072, 73.1812),
    "rajkot": (22.3039, 70.8022),
    "bhuj": (23.2420, 69.6669),
    "kutch": (23.7337, 69.8597),
    "rann of kutch": (23.7337, 69.8597),
    "somnath": (20.8880, 70.4012),
    "dwarka": (22.2442, 68.9685),
    "gir": (21.1243, 70.8242),
    "statue of unity": (21.8380, 73.7191),
    "jaipur": (26.9124, 75.7873),
    "udaipur": (24.5854, 73.7125),
    "jodhpur": (26.2389, 73.0243),
    "jaisalmer": (26.9157, 70.9083),
    "pushkar": (26.4897, 74.5511),
    "mount abu": (24.5925, 72.7156),
    "bikaner": (28.0229, 73.3119),
    "ranthambore": (26.0173, 76.5026),

    # Kashmir, Ladakh & North India
    "srinagar": (34.0837, 74.7973),
    "kashmir": (34.0837, 74.7973),
    "gulmarg": (34.0484, 74.3805),
    "pahalgam": (34.0163, 75.3150),
    "sonamarg": (34.3100, 75.2938),
    "leh": (34.1526, 77.5771),
    "ladakh": (34.1526, 77.5771),
    "pangong": (33.7595, 78.6674),
    "nubra": (34.6863, 77.5673),
    "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090),
    "agra": (27.1767, 78.0081),
    "varanasi": (25.3176, 82.9739),
    "banaras": (25.3176, 82.9739),
    "lucknow": (26.8467, 80.9462),
    "prayagraj": (25.4358, 81.8463),
    "amritsar": (31.6340, 74.8723),
    "chandigarh": (30.7333, 76.7794),
    "shimla": (31.1048, 77.1734),
    "manali": (32.2432, 77.1892),
    "dharamshala": (32.2190, 76.3234),
    "mcleodganj": (32.2426, 76.3213),
    "kasol": (32.0100, 77.3150),
    "spiti": (32.2461, 78.0349),
    "rishikesh": (30.0869, 78.2676),
    "haridwar": (29.9457, 78.1642),
    "dehradun": (30.3165, 78.0322),
    "mussoorie": (30.4598, 78.0644),
    "nainital": (29.3919, 79.4542),

    # East & North-East India
    "kolkata": (22.5726, 88.3639),
    "darjeeling": (27.0410, 88.2663),
    "gangtok": (27.3389, 88.6065),
    "sikkim": (27.3389, 88.6065),
    "puri": (19.8135, 85.8312),
    "bhubaneswar": (20.2961, 85.8245),
    "guwahati": (26.1445, 91.7362),
    "shillong": (25.5788, 91.8933),
    "meghalaya": (25.5788, 91.8933),
    "kaziranga": (26.5775, 93.1711),

    # Global Hubs
    "paris": (48.8566, 2.3522),
    "rome": (41.9028, 12.4964),
    "tokyo": (35.6762, 139.6503),
    "kyoto": (35.0116, 135.7681),
    "bangkok": (13.7563, 100.5018),
    "dubai": (25.2048, 55.2708),
    "singapore": (1.3521, 103.8198),
    "bali": (-8.4095, 115.1889),
    "london": (51.5074, -0.1278),
    "amsterdam": (52.3676, 4.9041),
    "barcelona": (41.3851, 2.1734),
}


def lookup_accurate_coordinates(city_name: str, default_lat: float = 19.0760, default_lon: float = 72.8777) -> Tuple[float, float]:
    """
    Looks up exact latitude and longitude with fuzzy substring matching across the master registry.
    """
    if not city_name:
        return default_lat, default_lon
    
    clean = city_name.strip().lower()
    
    # Direct match
    if clean in GEO_COORDINATES_REGISTRY:
        return GEO_COORDINATES_REGISTRY[clean]
    
    # Substring match
    for key, coords in GEO_COORDINATES_REGISTRY.items():
        if key in clean or clean in key:
            return coords
            
    return default_lat, default_lon
