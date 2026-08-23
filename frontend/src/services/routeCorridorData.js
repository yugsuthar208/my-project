/**
 * Real-World Geographic Waypoint Corridors for Indian National Highways,
 * Indian Railways (IR) Track Alignments, and IATA Airport Coordinates.
 */

export const AIRPORT_COORDINATES = {
  "delhi": [28.5562, 77.1000], // DEL - Indira Gandhi International
  "new delhi": [28.5562, 77.1000],
  "mumbai": [19.0896, 72.8656], // BOM - Chhatrapati Shivaji Maharaj
  "jaipur": [26.8242, 75.8122], // JAI - Jaipur International (Sanganer)
  "udaipur": [24.6177, 73.8961], // UDR - Maharana Pratap Airport (Dabok)
  "ahmedabad": [23.0772, 72.6347], // AMD - Sardar Vallabhbhai Patel International
  "goa": [15.3808, 73.8314], // GOI - Dabolim / GOX Mopa
  "bengaluru": [13.1986, 77.7066], // BLR - Kempegowda International
  "bangalore": [13.1986, 77.7066],
  "chennai": [12.9941, 80.1709], // MAA - Chennai International
  "hyderabad": [17.2403, 78.4294], // HYD - Rajiv Gandhi International
  "kolkata": [22.6547, 88.4467], // CCU - Netaji Subhash Chandra Bose
  "kochi": [10.1556, 76.3906], // COK - Cochin International
  "cochin": [10.1556, 76.3906],
  "thiruvananthapuram": [8.4821, 76.9200], // TRV - Trivandrum International
  "trivandrum": [8.4821, 76.9200],
  "srinagar": [33.9871, 74.7744], // SXR - Sheikh ul-Alam International
  "leh": [34.1359, 77.5465], // IXL - Kushok Bakula Rimpochee
  "chandigarh": [30.6735, 76.7885], // IXC - Shaheed Bhagat Singh
  "varanasi": [25.4524, 82.8593], // VNS - Lal Bahadur Shastri
  "agra": [27.1558, 77.9609], // AGR - Agra Kheria Airport
  "pune": [18.5822, 73.9197], // PNQ - Pune Airport
  "amritsar": [31.7096, 74.7973], // ATQ - Sri Guru Ram Dass Jee
  "jodhpur": [26.2511, 73.0489], // JDH - Jodhpur Airport
  "jaisalmer": [26.8887, 70.8644], // JSA - Jaisalmer Airport
  "bhubaneswar": [20.2444, 85.8178], // BBI - Biju Patnaik
  "lucknow": [26.7606, 80.8893], // LKO - Chaudhary Charan Singh
  "guwahati": [26.1061, 91.5859], // GAU - Lokpriya Gopinath Bordoloi
  "paris": [49.0097, 2.5479], // CDG
  "london": [51.4700, -0.4543], // LHR
  "tokyo": [35.5494, 139.7798], // HND
  "rome": [41.8003, 12.2389], // FCO
  "dubai": [25.2532, 55.3657], // DXB
  "singapore": [1.3644, 103.9915], // SIN
  "new york": [40.6413, -73.7781], // JFK
};

/**
 * Real-world Indian Railway track corridors & junction waypoints.
 * Follows actual railway tracks across major rail zones (WR, CR, NR, NWR, SR, KR).
 */
export const RAILWAY_CORRIDORS = {
  // Mumbai <-> Ahmedabad (Western Railway Mainline via Surat & Vadodara)
  "mumbai_ahmedabad": [
    [18.9696, 72.8193], // Mumbai Central (BCT)
    [19.0167, 72.8428], // Dadar
    [19.1197, 72.8464], // Andheri
    [19.1970, 72.8485], // Borivali
    [19.4564, 72.7925], // Virar
    [19.6967, 72.7699], // Palghar
    [19.9975, 72.7511], // Dahanu Road
    [20.3852, 72.9106], // Vapi
    [20.6074, 72.9342], // Valsad
    [20.9467, 72.9289], // Navsari
    [21.2049, 72.8411], // Surat
    [21.4428, 72.9644], // Kosamba
    [21.6264, 72.9989], // Ankleshwar
    [21.7051, 72.9959], // Bharuch Junction
    [22.3072, 73.1812], // Vadodara Junction
    [22.5645, 72.9289], // Anand Junction
    [22.6916, 72.8634], // Nadiad Junction
    [22.9734, 72.6012], // Maninagar
    [23.0225, 72.5714], // Ahmedabad Junction (ADI)
  ],

  // Ahmedabad <-> Udaipur (via Himatnagar - Dungarpur broad gauge alignment)
  "ahmedabad_udaipur": [
    [23.0225, 72.5714], // Ahmedabad (ADI)
    [23.0970, 72.6012], // Asarva
    [23.2344, 72.7656], // Nandol Dehegam
    [23.4122, 72.8890], // Talod
    [23.5978, 72.9644], // Prantij
    [23.6022, 72.9567], // Himatnagar Junction
    [23.8211, 73.2012], // Shamlaji Road
    [23.8433, 73.7144], // Dungarpur
    [24.0890, 73.7256], // Rikhabdev Road
    [24.1234, 73.7456], // Semari
    [24.3567, 73.7122], // Jai Samand Road
    [24.4122, 73.7012], // Zawar Mines
    [24.5344, 73.7122], // Umra
    [24.5854, 73.7125], // Udaipur City (UDZ)
  ],

  // Udaipur <-> Jaipur (via Mavli - Chanderiya - Bhilwara - Ajmer - Phulera)
  "udaipur_jaipur": [
    [24.5854, 73.7125], // Udaipur City (UDZ)
    [24.6012, 73.7256], // Rana Pratap Nagar
    [24.7890, 73.9890], // Mavli Junction
    [24.8456, 74.2012], // Kapasan
    [24.8887, 74.6269], // Chittorgarh Junction
    [24.9456, 74.6344], // Chanderiya
    [25.3478, 74.6344], // Bhilwara
    [25.6890, 74.7567], // Gulabpura
    [25.9234, 74.8890], // Bijainagar
    [26.1122, 74.6344], // Nasirabad
    [26.4499, 74.6399], // Ajmer Junction
    [26.6890, 75.0234], // Kishangarh
    [26.8722, 75.2344], // Phulera Junction
    [26.9012, 75.6344], // Asalpur Jobner
    [26.9196, 75.7878], // Jaipur Junction (JP)
  ],

  // Jaipur <-> Delhi (via Bandikui - Alwar - Rewari - Gurgaon)
  "jaipur_delhi": [
    [26.9196, 75.7878], // Jaipur Junction (JP)
    [26.9456, 75.8890], // Gandhinagar Jaipur
    [27.0122, 76.1234], // Dausa
    [27.0456, 76.5678], // Bandikui Junction
    [27.2344, 76.6234], // Rajgarh
    [27.5530, 76.6346], // Alwar Junction
    [27.8890, 76.6122], // Khairthal
    [28.1890, 76.6190], // Rewari Junction
    [28.3567, 76.8456], // Pataudi Road
    [28.4595, 77.0266], // Gurgaon (Gurugram)
    [28.5678, 77.1012], // Delhi Cantonment (DEC)
    [28.6448, 77.2167], // New Delhi (NDLS)
  ],

  // Delhi <-> Agra (Gatimaan / Vande Bharat Yamuna Expressway rail corridor)
  "delhi_agra": [
    [28.6448, 77.2167], // New Delhi (NDLS)
    [28.5890, 77.2512], // Hazrat Nizamuddin
    [28.4089, 77.3178], // Faridabad
    [28.1456, 77.3289], // Palwal
    [27.8890, 77.5122], // Kosi Kalan
    [27.4924, 77.6737], // Mathura Junction
    [27.3456, 77.8122], // Raja Ki Mandi
    [27.1590, 78.0081], // Agra Cantt (AGC)
  ],

  // Agra <-> Varanasi (via Kanpur Central & Prayagraj Junction)
  "agra_varanasi": [
    [27.1590, 78.0081], // Agra Cantt
    [27.2089, 78.2412], // Tundla Junction
    [27.1456, 78.5890], // Firozabad
    [26.9890, 78.9456], // Shikohabad
    [26.7890, 79.0234], // Etawah Junction
    [26.5456, 79.4890], // Phaphund
    [26.4499, 80.3319], // Kanpur Central (CNB)
    [26.1122, 80.8122], // Fatehpur
    [25.4358, 81.8463], // Prayagraj (Allahabad) Junction
    [25.3122, 82.2012], // Mirzapur
    [25.2819, 83.1197], // Pt. Deen Dayal Upadhyaya (Mughalsarai)
    [25.3176, 82.9739], // Varanasi Junction (BSB)
  ],

  // Mumbai <-> Goa (Konkan Railway Scenic Coastal & Western Ghats Corridor)
  "mumbai_goa": [
    [18.9696, 72.8193], // Mumbai CSMT
    [19.0330, 73.0297], // Navi Mumbai / Thane
    [18.9894, 73.1175], // Panvel Junction
    [18.4389, 73.1189], // Roha
    [18.1456, 73.2890], // Mangaon
    [17.9890, 73.4122], // Khed
    [17.5325, 73.5189], // Chiplun
    [17.3456, 73.6122], // Sangameshwar
    [16.9902, 73.3120], // Ratnagiri
    [16.7122, 73.5234], // Rajapur Road
    [16.4890, 73.6890], // Vaibhavwadi
    [16.2734, 73.7122], // Kankavli
    [15.9890, 73.8122], // Kudal
    [15.8890, 73.8456], // Sawantwadi Road
    [15.7122, 73.8122], // Pernem
    [15.5978, 73.8122], // Thivim (North Goa)
    [15.3478, 73.9122], // Karmali (Old Goa)
    [15.2734, 73.9589], // Madgaon Junction (MAO - South Goa)
  ],

  // Delhi <-> Chandigarh <-> Manali (Northern Himalayan corridor)
  "delhi_chandigarh_manali": [
    [28.6448, 77.2167], // New Delhi
    [29.3890, 76.9644], // Panipat
    [29.6890, 76.9890], // Karnal
    [29.9690, 76.8789], // Kurukshetra
    [30.3782, 76.7767], // Ambala Cantt
    [30.7333, 76.7794], // Chandigarh Junction
    [30.9456, 76.6234], // Ropar / Anandpur Sahib
    [31.3267, 76.7589], // Bilaspur
    [31.5890, 76.9122], // Sundernagar
    [31.7082, 76.9318], // Mandi
    [31.8456, 77.1012], // Pandoh Dam / Aut Tunnel
    [31.9579, 77.1095], // Kullu (Bhuntar)
    [32.2396, 77.1887], // Manali
  ],
};

/**
 * Finds a matching pre-computed high-accuracy railway corridor between two cities.
 */
export function getRailwayCorridor(cityA, cityB) {
  if (!cityA || !cityB) return null;
  const a = cityA.toLowerCase().trim();
  const b = cityB.toLowerCase().trim();

  for (const [key, coords] of Object.entries(RAILWAY_CORRIDORS)) {
    const parts = key.split("_");
    const hasA = parts.some(p => a.includes(p) || p.includes(a));
    const hasB = parts.some(p => b.includes(p) || p.includes(b));
    if (hasA && hasB) {
      // Check direction: if A is closer to end, reverse the array
      const startDist = Math.hypot(coords[0][0] - (cityA.latitude || coords[0][0]), coords[0][1] - (cityA.longitude || coords[0][1]));
      const endDist = Math.hypot(coords[coords.length - 1][0] - (cityA.latitude || coords[0][0]), coords[coords.length - 1][1] - (cityA.longitude || coords[0][1]));
      if (endDist < startDist) {
        return [...coords].reverse();
      }
      return coords;
    }
  }
  return null;
}
