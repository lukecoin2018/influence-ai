/**
 * Minimal region normalization — additive enrichment only, never a filter.
 * Scoped to the actual values observed live (queried directly): 40 distinct
 * `brand_brackets.regions` entries and 99 distinct `creators.country` values.
 * No general ISO-3166 library — this is a hand-maintained map of exactly
 * what's in the data today, not a general-purpose solution. If a country or
 * region string isn't in these maps, the safe degrade is simply "no region
 * tag" — never an incorrect match, never a filter.
 *
 * LATAM / "LA" / "Latin America" and "EU" are deliberately left unexpanded to
 * member-country lists here. The original spec flagged LATAM member-country
 * expansion vs. wildcard match as an explicit open founder decision (not
 * mine to make silently) — most brands already list individual countries
 * alongside these supranational tags (e.g. Shein lists BR/CO/MX/... directly),
 * so this only affects brands whose ONLY region tag is one of these.
 */

// creators.country (full name) -> ISO 3166-1 alpha-2. Covers every distinct
// value seen live; the 3 rows whose country is a stringified multi-country
// array (e.g. `["Peru","Spain"]`) intentionally have no entry — they fail to
// match, which is the correct safe degrade, not a bug.
const COUNTRY_TO_ISO2: Record<string, string> = {
  'United States': 'US', Colombia: 'CO', Spain: 'ES', Brazil: 'BR', Mexico: 'MX',
  'United Kingdom': 'GB', France: 'FR', Germany: 'DE', Italy: 'IT', Portugal: 'PT',
  Peru: 'PE', Australia: 'AU', Canada: 'CA', Argentina: 'AR', Venezuela: 'VE',
  Chile: 'CL', India: 'IN', Ecuador: 'EC', Indonesia: 'ID', Russia: 'RU',
  Japan: 'JP', Sweden: 'SE', UAE: 'AE', 'United Arab Emirates': 'AE', Greece: 'GR',
  Philippines: 'PH', Poland: 'PL', Switzerland: 'CH', Pakistan: 'PK', Thailand: 'TH',
  'Dominican Republic': 'DO', Netherlands: 'NL', Hungary: 'HU', Vietnam: 'VN',
  'South Africa': 'ZA', Bolivia: 'BO', Nigeria: 'NG', Denmark: 'DK', Honduras: 'HN',
  'South Korea': 'KR', Turkey: 'TR', Austria: 'AT', Guatemala: 'GT', Panama: 'PA',
  Romania: 'RO', Ukraine: 'UA', China: 'CN', 'Costa Rica': 'CR', Kenya: 'KE',
  'Saudi Arabia': 'SA', Bangladesh: 'BD', Belgium: 'BE', 'Czech Republic': 'CZ',
  Egypt: 'EG', 'El Salvador': 'SV', Finland: 'FI', Ghana: 'GH', Ireland: 'IE',
  Lebanon: 'LB', Paraguay: 'PY', Tunisia: 'TN', Cuba: 'CU', Haiti: 'HT',
  Nepal: 'NP', Slovakia: 'SK', Azerbaijan: 'AZ', Bulgaria: 'BG', Croatia: 'HR',
  Jamaica: 'JM', Malaysia: 'MY', Nicaragua: 'NI', Singapore: 'SG', Uganda: 'UG',
  Albania: 'AL', Algeria: 'DZ', Barbados: 'BB', Belarus: 'BY', 'Cape Verde': 'CV',
  "Côte d'Ivoire": 'CI', Cyprus: 'CY', Estonia: 'EE', Guadeloupe: 'GP', Guyana: 'GY',
  Jordan: 'JO', Kazakhstan: 'KZ', Lithuania: 'LT', Monaco: 'MC', Montenegro: 'ME',
  Myanmar: 'MM', Norway: 'NO', Palestine: 'PS', 'Puerto Rico': 'PR', Senegal: 'SN',
  Serbia: 'RS', Tanzania: 'TZ', Uruguay: 'UY',
};

// brand_brackets.regions raw value -> ISO 3166-1 alpha-2, for the entries that
// aren't already a valid code. Everything already ISO2 (AE, AR, AU, BR, CA,
// CH, CL, CO, CZ, DE, EE, ES, FR, GB, GR, IE, IN, IT, JP, KR, LT, MX, PE, PL,
// RO, SV, US, ZA) needs no entry — it's used as-is.
const REGION_ALIAS_TO_ISO2: Record<string, string> = {
  Brazil: 'BR',
  Chile: 'CL',
  Colombia: 'CO',
  Italy: 'IT',
  Mexico: 'MX',
  Peru: 'PE',
  Spain: 'ES',
  UK: 'GB',
};

function normalizeRegion(raw: string): string {
  return REGION_ALIAS_TO_ISO2[raw] ?? raw;
}

export type RegionMatch = { label: string } | null;

/**
 * Region is additive only — a null/no-match result means "no tag", never a
 * filter and never a penalty. `country` is the creator's raw `creators.country`
 * value; `label` in the result is that same raw value (human-readable, e.g.
 * "United Kingdom"), left for the component layer to shorten for display if desired.
 */
export function matchRegion(country: string | null, brandRegions: string[]): RegionMatch {
  if (!country) return null;
  const countryCode = COUNTRY_TO_ISO2[country];
  if (!countryCode) return null;

  const brandCodes = brandRegions.map(normalizeRegion);
  if (!brandCodes.includes(countryCode)) return null;

  return { label: country };
}
