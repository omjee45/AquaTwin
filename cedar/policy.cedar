// AquaTwin Emergency Alert Policy
// Environmental Hacks (Track 02: Heat and Water)
//
// Rule:
// Only an EmergencyManager can dispatch a public broadcast alert.
// The segment must have Sentinel-1 radar confirmation (validation_source == "Sentinel-1")
// AND the flood probability percentage must exceed 85% (flood_pct > 85).
// All other requests are denied by default.

permit(
  principal in Role::"EmergencyManager",
  action == Action::"SendAlert",
  resource
) when {
  context.flood_pct > 85 &&
  context.validation_source == "Sentinel-1"
};
