/**
 * getCommentaryBucket
 *
 * Returns a stable string identifier for the current commentary section.
 * Used by the play loop to detect transitions (triggering a pause) and
 * by the waypoint pre-computation to place markers on the arc.
 *
 * Keyed on geographic azimuth + altitude only (no northBearing, no season).
 * The bucket changes when the face changes or when the sun crosses the
 * near-horizon threshold — matching every meaningful commentary card change.
 *
 * @param {number} azimuth   Geographic azimuth (0=N 90=E 180=S 270=W)
 * @param {number} altitude  Degrees above horizon
 * @returns {string}
 */
export function getCommentaryBucket(azimuth, altitude) {
  if (altitude < -1) return "night";
  if (altitude < 5)  return azimuth < 180 ? "horizon-rise" : "horizon-set";
  const FACE_NAMES = ["north","northeast","east","southeast","south","southwest","west","northwest"];
  return FACE_NAMES[Math.round(azimuth / 45) % 8];
}

/**
 * BUCKET_LABELS — human-readable labels for waypoint tooltips
 */
export const BUCKET_LABELS = {
  "horizon-rise": "Sunrise",
  "east":         "Morning sun",
  "northeast":    "Late morning (NE)",
  "north":        "Solar noon",
  "northwest":    "Early afternoon (NW)",
  "west":         "Afternoon sun",
  "southwest":    "Late afternoon (SW)",
  "south":        "Southern sun",
  "southeast":    "Early morning (SE)",
  "horizon-set":  "Sunset",
};

/**
 * generateSunCommentary
 *
 * The ring places compass labels using azToRad(deg, northBearing) = (deg + northBearing - 90)°.
 * This means the ring's "N/E/S/W" labels are GEOGRAPHIC directions, rotated so that geographic
 * north appears where the plan's north is. The sun's position on the ring is also geographic.
 *
 * Therefore the commentary must also use GEOGRAPHIC azimuth to name the face being lit.
 * Using relativeAzimuth = (az - northBearing) would rotate the opposite direction from the ring,
 * causing "west" on the ring to map to "east" in commentary — which is the bug we fix here.
 *
 * Face determination: face = geographic azimuth → 8-way compass name.
 *   azimuth 270° → "west" → matches the ring's "W" label. Always consistent.
 *
 * NOT used: clock time (decHour), floor plan image data, room positions, relativeAzimuth.
 *
 * @param {{ azimuth, altitude, climateZone, northBearing, season }} params
 * @returns {{ icon, severity, headline, detail, tip }}
 *   severity: "warning" | "caution" | "good" | "info" | "neutral"
 */
export function generateSunCommentary(params) {
  const result = _innerCommentary(params);
  result.otherFaces = generateOtherFaces(
    params.azimuth, params.altitude,
    params.climateZone ?? 5, params.season ?? "summer"
  );
  return result;
}

function _innerCommentary({
  azimuth,
  altitude,
  climateZone = 5,
  northBearing = 0,
  season = "summer",
}) {
  // ── Below the horizon ─────────────────────────────────────────────────────
  if (altitude < -1) {
    const isDawn = azimuth < 180;
    return note(isDawn ? "🌅" : "🌆", "neutral",
      isDawn ? "Before sunrise" : "Sun has set",
      isDawn
        ? "No direct solar radiation yet. Study how rooms will orient to the morning sun. East-facing bedrooms and kitchens receive gentle wake-up light that sets a pleasant tone for the day."
        : "Solar day is over. A well-designed home with adequate thermal mass slowly releases absorbed daytime heat into the evening, reducing the need for artificial heating.",
      null);
  }

  // ── Which face is the sun hitting? ────────────────────────────────────────
  //
  // Use GEOGRAPHIC azimuth — this matches the ring's compass labels exactly.
  // When the ring shows the sun near "W", geographic azimuth ≈ 270° → face = "west".
  const FACE_NAMES = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  const face  = FACE_NAMES[Math.round(azimuth / 45) % 8];
  const faceT = titleCase(face);

  const isWest  = face === "west"  || face === "southwest" || face === "northwest";
  const isEast  = face === "east"  || face === "northeast" || face === "southeast";
  const isNorth = face === "north" || face === "northeast" || face === "northwest";
  const isSouth = face === "south" || face === "southeast" || face === "southwest";

  // ── Climate zone ──────────────────────────────────────────────────────────
  const isHot       = climateZone <= 3;
  const isWarmTemp  = climateZone === 4 || climateZone === 5;
  const isTemperate = climateZone === 6;
  const isCool      = climateZone >= 6;
  const zoneName    = { 1:"tropical", 2:"subtropical", 3:"hot dry", 4:"mixed",
                        5:"warm temperate", 6:"mild temperate", 7:"cool temperate", 8:"alpine" }[climateZone] ?? "temperate";

  // ── Near horizon ──────────────────────────────────────────────────────────
  if (altitude < 5) {
    const label = isEast ? "Sunrise" : "Sunset";
    return note(isEast ? "🌅" : "🌇", "neutral",
      `${label}: low-angle ${faceT.toLowerCase()} light`,
      `The sun is only ${altitude.toFixed(0)}° above the horizon, casting very long low-angle rays across ${faceT.toLowerCase()}-facing surfaces. This light travels nearly horizontally and horizontal eaves alone cannot block it.`,
      `At ${label.toLowerCase()}, vertical shading fins, deep verandahs, or deciduous plantings on the ${faceT.toLowerCase()} side are the most effective controls.`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WESTERN SUN  (geographic west / afternoon — highest heat-load scenario)
  // azimuth ≈ 225–315°  →  face is "west", "southwest", or "northwest"
  // ═══════════════════════════════════════════════════════════════════════════

  if (isWest) {
    if (isHot) {
      return note("🌡️", "warning",
        `${faceT}-facing rooms: hot afternoon sun`,
        `The sun is in the western sky at ${altitude.toFixed(0)}° altitude, directly hitting ${faceT.toLowerCase()}-facing rooms. In Zone ${climateZone} (${zoneName}), afternoon air temperatures already peak and direct western sun through unshaded glazing compounds heat gain dramatically. This is one of the most uncomfortable outcomes in ${zoneName} home design.`,
        `Minimise glazing on ${faceT.toLowerCase()}-facing walls (under 10% of wall area), use external roller blinds or vertical fins, and consider masonry or rammed earth on this wall to absorb rather than transmit heat.`);
    }
    if (season === "winter") {
      if (isCool) {
        return note("✅", "good",
          `${faceT}-facing rooms: winter afternoon warmth`,
          `The sun is in the western sky at ${altitude.toFixed(0)}°, reaching ${faceT.toLowerCase()}-facing rooms in the afternoon. In Zone ${climateZone} (${zoneName}), this is genuinely valuable. West afternoon sun warms living areas as outdoor temperatures drop toward evening, extending comfortable hours without mechanical heating.`,
          `In cool climates, west-facing glazing is a net annual benefit when paired with adjustable external shading. Open in winter to capture this warmth, close it in summer when the same face becomes a heat load.`);
      }
      return note("☀️", "info",
        `${faceT}-facing rooms: useful winter afternoon sun`,
        `The sun is in the western sky at ${altitude.toFixed(0)}°, hitting ${faceT.toLowerCase()}-facing rooms. In Zone ${climateZone} (${zoneName}), winter afternoons are mild and this western sun provides useful passive heating as the home cools toward evening. This is the opposite of the summer problem.`,
        `Adjustable external shading on this face earns its cost in Zone ${climateZone}: open in winter to capture afternoon warmth, closed from October to April when the same sun becomes the leading cause of overheating.`);
    }
    if (isWarmTemp) {
      return note("⚠️", "warning",
        `${faceT}-facing rooms: hot afternoon sun`,
        `The sun is in the western sky at ${altitude.toFixed(0)}°, directly striking ${faceT.toLowerCase()}-facing rooms. In Zone ${climateZone} (${zoneName}), afternoon air temperatures peak while this face absorbs direct radiation, creating a compounding heat load that is the leading cause of overheating in Australian homes. ${faceT}-facing rooms become the hottest in the house without active management.`,
        `External shading is essential on this face: roller blinds, brise-soleil, or pergola with battens. Keep ${faceT.toLowerCase()}-facing glazing below 15% of wall area and consider high thermal mass on this wall to dampen peak heat.`);
    }
    if (isTemperate) {
      return note("⚠️", "caution",
        `${faceT}-facing rooms: afternoon sun`,
        `The sun is in the western sky at ${altitude.toFixed(0)}°, hitting ${faceT.toLowerCase()}-facing rooms. In Zone ${climateZone} (${zoneName}), afternoon sun drives significant heat gain through glazing, especially in lightweight construction.`,
        `External shading on ${faceT.toLowerCase()}-facing glazing is worthwhile. Adjustable external blinds allow winter warmth while blocking summer afternoon sun.`);
    }
    return note("☀️", "info",
      `${faceT}-facing rooms: afternoon sun`,
      `The sun is in the western sky at ${altitude.toFixed(0)}°, striking ${faceT.toLowerCase()}-facing rooms. In Zone ${climateZone} (${zoneName}), afternoon sun provides useful warmth. It is less problematic than in warmer zones, but summer afternoon overheating is still worth managing with adjustable shading.`,
      `In cool zones, use adjustable shading to control this face seasonally. Let winter and autumn sun in, and block it in summer.`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORTHERN SUN  (geographic north / midday — SH solar transit)
  // azimuth ≈ 315–45°  →  face is "north", "northeast", or "northwest"
  // ═══════════════════════════════════════════════════════════════════════════

  if (isNorth) {
    if (isHot) {
      return note("🌡️", "caution",
        `${faceT}-facing rooms: overhead midday sun`,
        `The sun is near its highest point (${altitude.toFixed(0)}°), hitting ${faceT.toLowerCase()}-facing rooms. In Zone ${climateZone} (${zoneName}), overhead midday sun generates significant heat load year-round. Unlike southern Australia, shading is required in all seasons.`,
        `In tropical and hot dry climates, wrap-around verandahs, roof overhangs of 900-1200 mm, and high-level louvres for stack ventilation are more important than orientation alone.`);
    }
    if (season === "winter") {
      return note("✅", "good",
        `${faceT}-facing rooms: winter solar noon`,
        `The sun is near its lowest winter point (${altitude.toFixed(0)}°), striking ${faceT.toLowerCase()}-facing rooms. This is the condition passive solar design is built around. Low winter sun penetrates deeply into glazing, warming thermal mass that slowly radiates heat through the day and night.`,
        `Optimal passive solar: exposed thermal mass floors (polished concrete, slate, terracotta tile), 10-15% glazing-to-floor-area on this face, and eaves sized to block summer sun while admitting winter sun at this lower angle.`);
    }
    if (season === "summer") {
      if (altitude > 55) {
        return note("☀️", "info",
          `${faceT}-facing rooms: high summer sun`,
          `The summer sun is high in the sky (${altitude.toFixed(0)}°). Well-designed eaves on this face should be blocking direct radiation from entering glazing. If your eave depth is correct, passive solar is working as intended.`,
          `Check your eave depth: overhang ÷ window height ≈ tan(${altitude.toFixed(0)}°) fully shades summer sun while admitting lower winter sun.`);
      }
      return note("⚠️", "caution",
        `${faceT}-facing rooms: summer midday sun`,
        `Direct sun is hitting ${faceT.toLowerCase()}-facing rooms at ${altitude.toFixed(0)}° in summer. If this light is entering glazing, eaves may be too shallow or this face needs external shading.`,
        `For zones 4-6, peak summer sun altitude at noon ranges 60-78°. Eave depth should approximately equal window height to block direct summer sun while admitting lower winter sun.`);
    }
    return note("☀️", "info",
      `${faceT}-facing rooms: equinox midday sun at ${altitude.toFixed(0)}°`,
      `The equinox sun is near its midday peak hitting ${faceT.toLowerCase()}-facing rooms. This is the seasonal transition between summer shading and winter solar access, making it a useful benchmark for checking eave performance.`,
      `At equinox, well-designed eaves should be just beginning to admit sun to the back of this face. Check whether your overhang transitions correctly between full summer shading and full winter penetration.`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EASTERN SUN  (geographic east / morning — lowest heat load)
  // azimuth ≈ 45–135°  →  face is "east", "northeast", or "southeast"
  // ═══════════════════════════════════════════════════════════════════════════

  if (isEast) {
    if (isHot) {
      return note("🌡️", "caution",
        `${faceT}-facing rooms: morning sun in Zone ${climateZone}`,
        `The sun is in the eastern sky at ${altitude.toFixed(0)}°, hitting ${faceT.toLowerCase()}-facing rooms. In Zone ${climateZone} (${zoneName}), even morning sun generates significant heat load. Rooms on this face become uncomfortable by mid-morning, especially bedrooms in tropical or hot dry climates.`,
        `Use horizontal shading or adjustable louvres on this face that block low morning sun while allowing airflow. Bedrooms here should have block-out curtains and at least 600 mm of eave projection.`);
    }
    return note("☀️", "good",
      `${faceT}-facing rooms: gentle morning sun`,
      `The sun is in the eastern sky at ${altitude.toFixed(0)}°, striking ${faceT.toLowerCase()}-facing rooms. Morning sun is one of the most liveable orientations. It provides a natural, energising start to the day without the heat load of afternoon western sun. In ${zoneName} climates (Zone ${climateZone}), morning sun on this face is pleasant and largely manageable.`,
      `Morning sun is ideal for: master bedroom, kids' bedrooms, kitchen and breakfast nook. The sun tracks away from this face by mid-morning, leaving these rooms naturally cooler in the afternoon.`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOUTHERN SUN  (geographic south — least sun in Australian conditions)
  // azimuth ≈ 135–225°  →  face is "south", "southeast", or "southwest"
  // ═══════════════════════════════════════════════════════════════════════════

  if (isSouth) {
    if (isHot) {
      return note("ℹ️", "info",
        `${faceT}-facing rooms: southern light`,
        `In Zone ${climateZone} (${zoneName}), the sun can appear south of zenith near the wet season. ${faceT}-facing glazing may receive direct sun in these conditions. South-facing walls are still the coolest elevation in hot Australian climates.`,
        `Use south-facing walls as a thermal buffer zone: garages, laundries, bathrooms, and storage create a barrier between outdoor heat and living spaces.`);
    }
    return note("🌥️", "neutral",
      `${faceT}-facing rooms: cool diffuse light`,
      `The sun is on the ${faceT.toLowerCase()} side at ${altitude.toFixed(0)}°. South-facing surfaces receive the least direct sun in Australian climates and stay the coolest. This is excellent for spaces that benefit from stable, glare-free lighting.`,
      `South-adjacent faces work well for: art studios (consistent glare-free light), bathrooms, laundry, home offices, and secondary bedrooms that don't need afternoon warmth.`);
  }

  // Fallback
  return note("☀️", "neutral",
    `Sun from the ${faceT} at ${altitude.toFixed(0)}°`,
    `Direct sun is hitting the ${faceT.toLowerCase()}-facing side of the plan at ${altitude.toFixed(0)}° altitude. Move the time slider to see how the sun tracks across the plan throughout the day.`,
    null);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function note(icon, severity, headline, detail, tip, otherFaces) {
  return { icon, severity, headline, detail, tip, otherFaces: otherFaces ?? [] };
}

function titleCase(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL-FACES SUMMARY
// Generates a compact status + design guide for each cardinal face.
// Data sourced from: Your Home Design Guide (CSIRO / Australian Government),
// NCC Section J, NatHERS climate zone guidance, and AIRAH passive design
// recommendations. All glazing % figures reference "Your Home" orientation
// chapter unless otherwise noted.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns how directly a face is hit by the sun.
 * faceAz: the face's outward-normal azimuth (0=N, 90=E, 180=S, 270=W)
 */
function faceIllumination(faceAz, sunAz, sunAlt) {
  if (sunAlt < 0)  return "night";
  if (sunAlt < 4)  return "horizon";
  const diff    = ((sunAz - faceAz + 360) % 360);
  const minDiff = Math.min(diff, 360 - diff);
  if (minDiff <= 40)  return "direct";
  if (minDiff <= 85)  return "partial";
  return "shaded";
}

/**
 * Per-face design data by climate zone and illumination state.
 * Returns { icon, statusLabel, rooms, glazingGuide, nccNote }
 */
export function getFaceDesignData(faceDir, illum, climateZone, season) {
  const isHot       = climateZone <= 3;
  const isMild      = climateZone === 4 || climateZone === 5;
  const isTemperate = climateZone === 6;
  const isCool      = climateZone >= 7;
  const zoneName    = { 1:"tropical", 2:"subtropical", 3:"hot dry", 4:"mixed", 5:"warm temperate", 6:"mild temperate", 7:"cool temperate", 8:"alpine" }[climateZone] ?? "temperate";

  if (illum === "night") {
    return { icon: "🌑", statusLabel: "Night", rooms: null, glazingGuide: null, nccNote: null };
  }
  if (illum === "horizon") {
    const rising = faceDir === "east";
    return { icon: rising ? "🌅" : "🌇", statusLabel: rising ? "Sunrise grazing" : "Sunset grazing", rooms: null, glazingGuide: null, nccNote: null };
  }

  // ── NORTH ──────────────────────────────────────────────────────────────────
  if (faceDir === "north") {
    if (illum === "direct") {
      if (isHot) return {
        icon: "☀️", statusLabel: "Overhead midday sun",
        rooms: "Best suited to living and dining. Full-depth eaves or operable louvres are needed on this face year-round.",
        glazingGuide: "Zone 1-3: keep north glazing modest at 10-20% of wall area with fixed or operable shading.",
        nccNote: "NCC J1: In tropical and hot zones, all glazing requires shading or high-performance glass with SHGC of 0.4 or less to limit cooling loads.",
      };
      if (season === "winter") return {
        icon: "✅", statusLabel: "Winter solar noon",
        rooms: "Ideal for living, dining and kitchen. Passive solar capture on this face is at its best right now.",
        glazingGuide: "Zone 4-8: aim for 10-15% of floor area in north glazing. A thermal mass floor such as polished concrete or tile absorbs heat during the day and re-radiates it overnight.",
        nccNote: "Your Home guide: north-facing glazing delivers 3 to 5 times the energy of east or west glazing in winter. Size your eave depth so that it shades summer sun while admitting this lower winter angle.",
      };
      return {
        icon: "☀️", statusLabel: "Midday sun",
        rooms: "Best suited to living, dining and kitchen. Check your eave depth to confirm summer sun is being blocked at this angle.",
        glazingGuide: "Zone 4-6: north glazing at 10-15% of floor area. Eaves should shade summer noon sun (around 60-75° altitude) while admitting lower winter sun (around 25-45°).",
        nccNote: "Your Home guide: correct eave depth is the single most cost-effective passive design decision on the north face. Overhang divided by window height approximates the tangent of the summer noon altitude.",
      };
    }
    if (illum === "partial") {
      if (season === "summer") return {
        icon: "🌤️", statusLabel: "Low raking north light",
        rooms: "The summer sun is low and at the outer edge of your north eave's shading range. As it climbs higher it should be blocked by correctly sized eaves.",
        glazingGuide: "In summer, this low-angle north light is less critical than the high noon sun. If your eaves are correctly sized, direct radiation will be cut off before it enters glazing.",
        nccNote: "Your Home: a correct eave depth blocks all direct north sun from December solstice altitude down to around 50°. Check whether your eave fully shades the glazing sill at peak summer altitude.",
      };
      return {
        icon: "🌤️", statusLabel: "Low raking light",
        rooms: "Best suited to living and dining. Low-angle light here marks the morning or afternoon edge of the passive solar window.",
        glazingGuide: "Low-angle north light enters deep into rooms. Maximise sill height to floor for thermal mass contact.",
        nccNote: "Your Home: low winter north sun angles between 25 and 45 degrees can penetrate 3 to 5 metres into a room. Size your thermal mass floor to intercept this zone.",
      };
    }
    if (season === "summer") return {
      icon: "✅", statusLabel: "North face shaded",
      rooms: "The north face is out of the solar window right now. Your eaves and building geometry are doing their job. No action needed.",
      glazingGuide: "A shaded north face in the morning or evening is expected and correct. The sun will arc overhead during the day, and eave depth determines how much direct sun enters at peak altitude.",
      nccNote: "Your Home: the north face is shaded before mid-morning and after mid-afternoon at all latitudes. Eave sizing only controls the noon solar window, not the early or late sun.",
    };
    return {
      icon: "⭕", statusLabel: "In shade",
      rooms: isCool
        ? "Best suited to living and dining. Thermal mass is re-radiating stored solar heat. Avoid draughts across the north face after sunset."
        : "Best suited to living and dining. The north face is your passive solar engine. In shade now but primed for tomorrow.",
      glazingGuide: isCool
        ? "Thermal mass is re-radiating stored solar heat. Avoid draughts across the north face after sunset."
        : "The north face is your passive solar engine. It is in shade now but set up for tomorrow.",
      nccNote: isCool
        ? "Zone 7-8: heavy thermal mass such as a 200-300mm concrete slab or masonry stores north solar gain and releases heat for 8-12 hours after sunset."
        : "Zone 4-6: a 100-150mm exposed concrete slab or dark tile on the north face captures solar gain effectively.",
    };
  }

  // ── EAST ───────────────────────────────────────────────────────────────────
  if (faceDir === "east") {
    if (illum === "direct") {
      if (isHot) return {
        icon: "🌡️", statusLabel: "Morning sun, heat load",
        rooms: "Bedrooms and home offices suit this face but get hot by 8am. Operable louvres or block-out curtains are needed to manage morning sun.",
        glazingGuide: "Zone 1-3: east glazing at 10% of wall area or less. Use horizontal louvres or deep awnings to manage morning sun penetration.",
        nccNote: "AIRAH: in tropical climates morning sun heats east rooms faster than west rooms due to overnight air cooling. Rooms can be uncomfortable by 9am without shading.",
      };
      if (season === "winter") return {
        icon: "🌅", statusLabel: "Gentle morning sun",
        rooms: "Ideal for master bedroom, kids rooms and kitchen. Morning sun warms these rooms early in the day. Connect east rooms to north-facing living areas so passive solar heat can circulate through the afternoon.",
        glazingGuide: "Zone 4-8: east glazing at 25-30% of your north glazing area. Winter morning sun on east glazing provides useful early warmth while the north face gathers heat through the day.",
        nccNote: "Your Home guide: east-facing bedrooms receive pleasant morning warmth in winter. Connecting east rooms to north-facing living areas via internal doors or air circulation maximises passive solar distribution.",
      };
      return {
        icon: "🌅", statusLabel: "Gentle morning sun",
        rooms: "Ideal for master bedroom, kids rooms, kitchen and home office. Morning sun tracks away by mid-morning so rooms stay comfortable all afternoon.",
        glazingGuide: "Zone 4-6: east glazing at around 25-30% of your north glazing area. Morning sun tracks away by mid-morning so rooms stay comfortable in the afternoon.",
        nccNote: "Your Home guide: east-facing bedrooms receive pleasant wake-up light without the heat load of west afternoon sun. East glazing is the second best orientation after north for energy performance.",
      };
    }
    if (illum === "partial") {
      if (season === "winter" && !isHot) return {
        icon: "🌤️", statusLabel: "Early morning light arriving",
        rooms: "East rooms are catching the first sun of the day. In winter this low-angle morning light penetrates deeply into rooms, warming floors and any exposed thermal mass early.",
        glazingGuide: "In winter, low-angle east morning sun can reach 3-4 metres into a room and warm thermal mass floors before the north face comes fully online. No shading is needed or wanted.",
        nccNote: "Your Home: in winter, east morning sun at low angles can actively warm exposed thermal mass. This early gain complements north solar capture and extends warmth through the day.",
      };
      return {
        icon: "🌤️", statusLabel: "Early morning or transition",
        rooms: "Bedrooms and kitchen suit this face. The morning sun window is just opening or closing right now.",
        glazingGuide: "The east face transitions to shade by late morning. No shading action is needed at this angle.",
        nccNote: "Your Home: east morning sun in summer and equinox sits below 30° altitude until around 9am. Horizontal shading with a 1:3 projection ratio prevents deep penetration during warmer months.",
      };
    }
    if (season === "winter" && !isHot) return {
      icon: "✅", statusLabel: "In afternoon shade",
      rooms: "East rooms have finished their morning solar window and are now in afternoon shade. In winter this means they will cool through the afternoon. Use ceiling fans on low speed or open internal doors to draw warm air from north-facing rooms.",
      glazingGuide: "East rooms lose direct sun by late morning in winter. Connecting to north-facing living spaces via internal doors or vents allows passive solar warmth to distribute through the home.",
      nccNote: "Your Home: in winter, ceiling fans on low speed circulate warm air from north-facing rooms to east-facing ones without creating a wind-chill effect. This extends the benefit of north solar gain through the afternoon.",
    };
    return {
      icon: "✅", statusLabel: "In afternoon shade",
      rooms: "Bedrooms and kitchen suit this face. Rooms here cool naturally in the afternoon for comfortable evenings.",
      glazingGuide: "East rooms carry no afternoon solar load. This is a significant advantage over west-facing equivalents and no shading action is needed right now.",
      nccNote: "Your Home guide: east rooms in afternoon shade use 20-30% less cooling energy than west-facing equivalents across climate zones 2 to 6.",
    };
  }

  // ── SOUTH ──────────────────────────────────────────────────────────────────
  if (faceDir === "south") {
    if (illum === "direct") {
      return {
        icon: "⚠️", statusLabel: "Direct south sun (tropical)",
        rooms: "South-facing rooms are receiving direct sun right now. This occurs in Zone 1 and 2 near the wet season. Check your shading on south-facing glazing.",
        glazingGuide: "Zone 1-2: south glazing can receive direct sun near the wet season. Add horizontal overhangs or louvres to this face as well.",
        nccNote: "In Darwin (Zone 1), the sun crosses south of the zenith near the summer solstice. South-facing glazing can receive direct radiation, which is a common oversight in tropical buildings.",
      };
    }
    if (illum === "partial") return {
      icon: "🌥️", statusLabel: "Diffuse light",
      rooms: "Best suited to bathrooms, laundry, art studio and storage. Consistent cool diffuse light makes these spaces comfortable here.",
      glazingGuide: "South glazing at 5-10% of your north glazing area (Your Home). South windows provide glare-free, stable light ideal for studios and workrooms.",
      nccNote: "Your Home guide: south-facing glazing adds minimal heating load in winter and minimal cooling load in summer. It is the low-penalty face for getting light without thermal cost.",
    };
    return {
      icon: "🌥️", statusLabel: "Cool diffuse light",
      rooms: isHot
        ? "Best suited to bathrooms, laundry, WC and storage. In hot climates the south face is also valuable for drawing cool night breezes through the home."
        : "Best suited to bathrooms, laundry, WC, storage, studio and guest room. The south face is the natural service zone in Australian home design.",
      glazingGuide: isHot
        ? "Zone 1-3: the south face is valuable for cross-ventilation. Place operable louvres or windows here to draw cool night air through the home."
        : "Zone 4-8: limit south glazing to 5-10% of your north glazing area. South rooms stay the coolest and most temperature-stable year-round.",
      nccNote: isHot
        ? "AIRAH: in hot climates the south face is the primary inlet for prevailing cool night breezes. Position south openings at low level to induce floor-level cooling airflow."
        : "Your Home: place utility rooms, garages, bathrooms and laundry on the south face as a thermal buffer. These rooms stay comfortable without any solar gain.",
    };
  }

  // ── WEST ───────────────────────────────────────────────────────────────────
  if (faceDir === "west") {
    if (illum === "direct") {
      if (isHot) return {
        icon: "🌡️", statusLabel: "Peak afternoon heat load",
        rooms: "Avoid living areas and main bedrooms on this face. Garage, laundry and bathrooms are suitable here with adequate ventilation.",
        glazingGuide: "Zone 1-3: west glazing should be zero or minimal at under 5% of wall area. Any glazing needs external roller blinds or fixed vertical fins.",
        nccNote: "NCC J2 and NatHERS: west-facing glazing in Zone 1-3 carries the highest energy penalty of any orientation. Air temperature peaks between 2 and 4pm while the west wall is already absorbing radiation, creating a compounding heat load.",
      };
      if (season === "winter") {
        if (isTemperate || isCool) return {
          icon: "✅", statusLabel: "Winter afternoon warmth",
          rooms: "Living areas and dining suit this face right now. West sun in the afternoon actively warms the home as outdoor temperatures drop toward evening.",
          glazingGuide: "Zone 6-8: west glazing with adjustable external blinds earns its cost. It captures valuable winter afternoon sun while allowing summer shading. 15-20% of wall area is achievable.",
          nccNote: "Your Home guide: in cool climates, west-facing glazing with adjustable external blinds is a net annual benefit. Winter afternoon sun contributes meaningful passive heating gain.",
        };
        return {
          icon: "☀️", statusLabel: "Useful winter afternoon sun",
          rooms: "Living areas suit this face in winter. West afternoon sun provides useful passive heating in Zone 4-5 as the home cools toward evening.",
          glazingGuide: "Zone 4-5: adjustable external shading on the west face is the right solution. Open in winter to capture afternoon warmth, and close from October to April when the same sun causes overheating.",
          nccNote: "Your Home guide: in warm temperate climates, west glazing with adjustable external shading balances winter heating gain against summer overheating risk.",
        };
      }
      if (isMild || isTemperate) return {
        icon: "⚠️", statusLabel: "Afternoon sun, high heat load",
        rooms: "Avoid living areas, main bedroom and home office on this face. Garage, laundry, bathroom and hallway are all suitable here.",
        glazingGuide: "Zone 4-6: west glazing at 10-15% of wall area or less (Your Home). External shading is essential. Internal blinds block light but not the heat already transferred through the glass.",
        nccNote: "Your Home guide: west-facing glazing without external shading is the leading cause of summer overheating in Australian homes. External roller shutters reduce heat gain by 90% compared to 30% for internal blinds.",
      };
      return {
        icon: season === "summer" ? "⚠️" : "☀️",
        statusLabel: "West afternoon sun",
        rooms: season === "summer"
          ? "West rooms can warm noticeably on summer afternoons even in cool climates. Adjustable external shading lets you block summer heat while still capturing winter afternoon warmth."
          : "West afternoon sun in Zone 7-8 provides useful passive warmth, especially valuable in the shoulder seasons. Adjustable external shading gives you control across seasons.",
        glazingGuide: "Zone 7-8: west glazing can reach 15-20% of wall area if adjustable external blinds are fitted. Close in summer afternoons, open in winter and shoulder seasons to capture passive warmth.",
        nccNote: "Your Home guide: in cool climates, west-facing glazing with adjustable external blinds is a net annual benefit. Winter and shoulder season afternoon sun contributes meaningful passive heating gain.",
      };
    }
    if (illum === "partial") {
      if (season === "winter" && !isHot) {
        if (isTemperate || isCool) return {
          icon: "✅", statusLabel: "Winter afternoon warmth arriving",
          rooms: "West rooms are about to receive afternoon sun. Open up to capture passive warmth as outdoor temperatures drop toward evening.",
          glazingGuide: "Zone 6-8: adjustable external blinds on west glazing earn their cost here. Open in winter afternoons, close in summer when the same low-angle sun becomes a heat load.",
          nccNote: "Your Home guide: in cool climates, west-facing glazing with adjustable external blinds is a net annual benefit. Winter afternoon sun contributes meaningful passive heating gain.",
        };
        return {
          icon: "☀️", statusLabel: "Useful winter afternoon sun arriving",
          rooms: "West rooms will receive afternoon sun shortly. This is beneficial passive warmth in winter. Open up to capture it as the home cools toward evening.",
          glazingGuide: "Zone 4-5: adjustable external shading on the west face is the right solution. Open in winter to capture afternoon warmth, and close from October to April when the same sun causes overheating.",
          nccNote: "Your Home guide: in warm temperate climates, west glazing with adjustable external shading balances winter heating gain against summer overheating risk.",
        };
      }
      return {
        icon: "🌤️", statusLabel: "Low raking afternoon light",
        rooms: "West rooms are approaching the afternoon heat peak. Close windows now to hold any remaining coolness before the sun arrives.",
        glazingGuide: "Low-angle west sun at this angle cannot be blocked by horizontal eaves. Vertical fins or adjustable external blinds are required.",
        nccNote: "Your Home: at altitudes below 30°, horizontal eaves cannot block west sun. West face shading requires vertical or adjustable elements rather than fixed horizontal overhangs.",
      };
    }
    if (season === "winter" && !isHot) return {
      icon: "✅", statusLabel: "In morning shade",
      rooms: "West rooms are shaded now but will receive useful afternoon warmth later in the day. No action needed in winter.",
      glazingGuide: "In winter, west-facing rooms benefit from afternoon sun arriving later. Keep west glazing unobstructed so the passive warmth can enter when the sun swings west.",
      nccNote: "Your Home guide: in cool and temperate climates, west-facing glazing with adjustable external shading captures winter afternoon warmth that actively heats the home as outdoor temperatures drop toward evening.",
    };
    return {
      icon: "✅", statusLabel: "In morning shade",
      rooms: "West rooms are at their coolest right now. Pre-ventilate with cool morning air before the afternoon sun arrives.",
      glazingGuide: "Morning is the best time to flush west-facing rooms with cool outdoor air before the afternoon heat load begins.",
      nccNote: "Your Home: overnight ventilation through west-facing openings can pre-cool thermal mass and reduce afternoon peak temperatures. Open west windows at night and close them before 10am.",
    };
  }

  // Fallback
  return {
    icon: "☀️", statusLabel: illum === "shaded" ? "In shade" : "Sun present",
    rooms: null, glazingGuide: null, nccNote: null,
  };
}

/**
 * generateOtherFaces
 * Returns an array of 4 face summaries (N, E, S, W) with current solar status
 * and NCC-backed design guidance for each.
 */
function generateOtherFaces(azimuth, altitude, climateZone, season) {
  const FACES = [
    { dir: "north", az: 0,   label: "North" },
    { dir: "east",  az: 90,  label: "East"  },
    { dir: "south", az: 180, label: "South" },
    { dir: "west",  az: 270, label: "West"  },
  ];
  return FACES.map(({ dir, az, label }) => {
    const illum = faceIllumination(az, azimuth, altitude);
    const data  = getFaceDesignData(dir, illum, climateZone, season);
    return { dir, label, illum, ...data };
  });
}

/**
 * getSunLightStyle
 * Returns a CSS gradient string for the directional light overlay.
 * Uses only azimuth, altitude, and northBearing — no clock time.
 * @returns {{ gradient: string, opacity: number } | null}
 */
export function getSunLightStyle({ azimuth, altitude, northBearing }) {
  if (altitude <= 0) return null;
  const relativeAzimuth = ((azimuth - northBearing) + 360) % 360;
  const gradAngle       = (relativeAzimuth + 180) % 360;
  const altFactor       = Math.min(1, altitude / 25);

  let warmRGB, warmAlpha, shadowAlpha;
  if (altitude < 7)       { warmRGB = "255,100,25";  warmAlpha = 0.38; shadowAlpha = 0.10; }
  else if (altitude < 20) { warmRGB = "255,165,45";  warmAlpha = 0.28; shadowAlpha = 0.08; }
  else if (altitude > 55) { warmRGB = "255,235,110"; warmAlpha = 0.20; shadowAlpha = 0.05; }
  else                    { warmRGB = "255,200,70";  warmAlpha = 0.24; shadowAlpha = 0.06; }

  const a       = (warmAlpha * altFactor).toFixed(3);
  const aFaded  = (warmAlpha * altFactor * 0.3).toFixed(3);
  const aShadow = shadowAlpha.toFixed(3);
  return {
    gradient: `linear-gradient(${gradAngle}deg,rgba(${warmRGB},${a}) 0%,rgba(${warmRGB},${aFaded}) 35%,transparent 58%,transparent 68%,rgba(10,20,70,${aShadow}) 100%)`,
    opacity: 1,
  };
}
