export interface CountryCoords {
  lat: number
  lng: number
}

export const COUNTRY_COORDS: Record<string, CountryCoords> = {
  // ── Europe ────────────────────────────────────────────────────────────────
  'France':           { lat:  46.2276, lng:   2.2137 },
  'French':           { lat:  46.2276, lng:   2.2137 },

  'England':          { lat:  52.3555, lng:  -1.1743 },
  'United Kingdom':   { lat:  52.3555, lng:  -1.1743 },
  'Britain':          { lat:  52.3555, lng:  -1.1743 },
  'British':          { lat:  52.3555, lng:  -1.1743 },

  'Scotland':         { lat:  56.4907, lng:  -4.2026 },
  'Scottish':         { lat:  56.4907, lng:  -4.2026 },

  'Wales':            { lat:  52.1307, lng:  -3.7837 },
  'Welsh':            { lat:  52.1307, lng:  -3.7837 },

  'Spain':            { lat:  40.4637, lng:  -3.7492 },
  'Spanish':          { lat:  40.4637, lng:  -3.7492 },

  'Germany':          { lat:  51.1657, lng:  10.4515 },
  'German':           { lat:  51.1657, lng:  10.4515 },

  'Italy':            { lat:  41.8719, lng:  12.5674 },
  'Italian':          { lat:  41.8719, lng:  12.5674 },

  'Portugal':         { lat:  39.3999, lng:  -8.2245 },
  'Portuguese':       { lat:  39.3999, lng:  -8.2245 },

  'Netherlands':      { lat:  52.1326, lng:   5.2913 },
  'Dutch':            { lat:  52.1326, lng:   5.2913 },
  'Holland':          { lat:  52.1326, lng:   5.2913 },

  'Belgium':          { lat:  50.5039, lng:   4.4699 },
  'Belgian':          { lat:  50.5039, lng:   4.4699 },

  'Croatia':          { lat:  45.1000, lng:  15.2000 },
  'Croatian':         { lat:  45.1000, lng:  15.2000 },

  'Serbia':           { lat:  44.0165, lng:  21.0059 },
  'Serbian':          { lat:  44.0165, lng:  21.0059 },

  'Poland':           { lat:  51.9194, lng:  19.1451 },
  'Polish':           { lat:  51.9194, lng:  19.1451 },

  'Austria':          { lat:  47.5162, lng:  14.5501 },
  'Austrian':         { lat:  47.5162, lng:  14.5501 },

  'Switzerland':      { lat:  46.8182, lng:   8.2275 },
  'Swiss':            { lat:  46.8182, lng:   8.2275 },

  'Denmark':          { lat:  56.2639, lng:   9.5018 },
  'Danish':           { lat:  56.2639, lng:   9.5018 },

  'Sweden':           { lat:  60.1282, lng:  18.6435 },
  'Swedish':          { lat:  60.1282, lng:  18.6435 },

  'Norway':           { lat:  60.4720, lng:   8.4689 },
  'Norwegian':        { lat:  60.4720, lng:   8.4689 },

  'Czech Republic':   { lat:  49.8175, lng:  15.4730 },
  'Czech':            { lat:  49.8175, lng:  15.4730 },
  'Czechia':          { lat:  49.8175, lng:  15.4730 },

  'Ukraine':          { lat:  48.3794, lng:  31.1656 },
  'Ukrainian':        { lat:  48.3794, lng:  31.1656 },

  'Turkey':           { lat:  38.9637, lng:  35.2433 },
  'Turkish':          { lat:  38.9637, lng:  35.2433 },

  'Greece':           { lat:  39.0742, lng:  21.8243 },
  'Greek':            { lat:  39.0742, lng:  21.8243 },

  'Romania':          { lat:  45.9432, lng:  24.9668 },
  'Romanian':         { lat:  45.9432, lng:  24.9668 },

  'Hungary':          { lat:  47.1625, lng:  19.5033 },
  'Hungarian':        { lat:  47.1625, lng:  19.5033 },

  'Slovakia':         { lat:  48.6690, lng:  19.6990 },
  'Slovak':           { lat:  48.6690, lng:  19.6990 },

  'Slovenia':         { lat:  46.1512, lng:  14.9955 },
  'Slovenian':        { lat:  46.1512, lng:  14.9955 },

  'Russia':           { lat:  61.5240, lng: 105.3188 },
  'Russian':          { lat:  61.5240, lng: 105.3188 },

  'Finland':          { lat:  61.9241, lng:  25.7482 },
  'Finnish':          { lat:  61.9241, lng:  25.7482 },

  'Ireland':          { lat:  53.4129, lng:  -8.2439 },
  'Irish':            { lat:  53.4129, lng:  -8.2439 },

  'Bosnia':           { lat:  43.9159, lng:  17.6791 },
  'Bosnian':          { lat:  43.9159, lng:  17.6791 },
  'Bosnia and Herzegovina': { lat: 43.9159, lng: 17.6791 },

  'North Macedonia':  { lat:  41.6086, lng:  21.7453 },
  'Macedonian':       { lat:  41.6086, lng:  21.7453 },

  'Albania':          { lat:  41.1533, lng:  20.1683 },
  'Albanian':         { lat:  41.1533, lng:  20.1683 },

  'Montenegro':       { lat:  42.7087, lng:  19.3744 },
  'Montenegrin':      { lat:  42.7087, lng:  19.3744 },

  'Kosovo':           { lat:  42.6026, lng:  20.9030 },

  // ── South America ─────────────────────────────────────────────────────────
  'Brazil':           { lat: -14.2350, lng: -51.9253 },
  'Brazilian':        { lat: -14.2350, lng: -51.9253 },

  'Argentina':        { lat: -38.4161, lng: -63.6167 },
  'Argentine':        { lat: -38.4161, lng: -63.6167 },
  'Argentinian':      { lat: -38.4161, lng: -63.6167 },
  'Argentinean':      { lat: -38.4161, lng: -63.6167 },

  'Colombia':         { lat:   4.5709, lng: -74.2973 },
  'Colombian':        { lat:   4.5709, lng: -74.2973 },

  'Uruguay':          { lat: -32.5228, lng: -55.7658 },
  'Uruguayan':        { lat: -32.5228, lng: -55.7658 },

  'Chile':            { lat: -35.6751, lng: -71.5430 },
  'Chilean':          { lat: -35.6751, lng: -71.5430 },

  'Ecuador':          { lat:  -1.8312, lng: -78.1834 },
  'Ecuadorian':       { lat:  -1.8312, lng: -78.1834 },

  'Paraguay':         { lat: -23.4425, lng: -58.4438 },
  'Paraguayan':       { lat: -23.4425, lng: -58.4438 },

  'Peru':             { lat:  -9.1900, lng: -75.0152 },
  'Peruvian':         { lat:  -9.1900, lng: -75.0152 },

  'Venezuela':        { lat:   6.4238, lng: -66.5897 },
  'Venezuelan':       { lat:   6.4238, lng: -66.5897 },

  'Bolivia':          { lat: -16.2902, lng: -63.5887 },
  'Bolivian':         { lat: -16.2902, lng: -63.5887 },

  // ── Africa ────────────────────────────────────────────────────────────────
  'Senegal':          { lat:  14.4974, lng: -14.4524 },
  'Senegalese':       { lat:  14.4974, lng: -14.4524 },

  'Morocco':          { lat:  31.7917, lng:  -7.0926 },
  'Moroccan':         { lat:  31.7917, lng:  -7.0926 },

  'Nigeria':          { lat:   9.0820, lng:   8.6753 },
  'Nigerian':         { lat:   9.0820, lng:   8.6753 },

  'Ivory Coast':      { lat:   7.5400, lng:  -5.5471 },
  "Côte d'Ivoire":    { lat:   7.5400, lng:  -5.5471 },
  'Ivorian':          { lat:   7.5400, lng:  -5.5471 },
  'Ivoirian':         { lat:   7.5400, lng:  -5.5471 },

  'Cameroon':         { lat:   7.3697, lng:  12.3547 },
  'Cameroonian':      { lat:   7.3697, lng:  12.3547 },

  'Ghana':            { lat:   7.9465, lng:  -1.0232 },
  'Ghanaian':         { lat:   7.9465, lng:  -1.0232 },

  'Algeria':          { lat:  28.0339, lng:   1.6596 },
  'Algerian':         { lat:  28.0339, lng:   1.6596 },

  'Egypt':            { lat:  26.8206, lng:  30.8025 },
  'Egyptian':         { lat:  26.8206, lng:  30.8025 },

  'Mali':             { lat:  17.5707, lng:  -3.9962 },
  'Malian':           { lat:  17.5707, lng:  -3.9962 },

  'Guinea':           { lat:  11.7400, lng: -15.3100 },
  'Guinean':          { lat:  11.7400, lng: -15.3100 },

  'DR Congo':         { lat:  -4.0383, lng:  21.7587 },
  'Congo':            { lat:  -4.0383, lng:  21.7587 },
  'Congolese':        { lat:  -4.0383, lng:  21.7587 },
  'Democratic Republic of Congo': { lat: -4.0383, lng: 21.7587 },
  'Democratic Republic of the Congo': { lat: -4.0383, lng: 21.7587 },

  'South Africa':     { lat: -30.5595, lng:  22.9375 },
  'South African':    { lat: -30.5595, lng:  22.9375 },

  'Tunisia':          { lat:  33.8869, lng:   9.5375 },
  'Tunisian':         { lat:  33.8869, lng:   9.5375 },

  'Gabon':            { lat:  -0.8037, lng:  11.6094 },
  'Gabonese':         { lat:  -0.8037, lng:  11.6094 },

  'Guinea-Bissau':    { lat:  11.8037, lng: -15.1804 },
  'Burundi':          { lat:  -3.3731, lng:  29.9189 },
  'Burkina Faso':     { lat:  12.3642, lng:  -1.5275 },
  'Cape Verde':       { lat:  16.5388, lng: -23.0418 },
  'Mozambique':       { lat: -18.6657, lng:  35.5296 },
  'Angola':           { lat: -11.2027, lng:  17.8739 },
  'Tanzania':         { lat:  -6.3690, lng:  34.8888 },
  'Kenya':            { lat:  -0.0236, lng:  37.9062 },
  'Zambia':           { lat: -13.1339, lng:  27.8493 },
  'Zimbabwe':         { lat: -19.0154, lng:  29.1549 },
  'Rwanda':           { lat:  -1.9403, lng:  29.8739 },
  'Sierra Leone':     { lat:   8.4606, lng: -11.7799 },
  'Liberia':          { lat:   6.4281, lng:  -9.4295 },
  'Togo':             { lat:   8.6195, lng:   0.8248 },
  'Benin':            { lat:   9.3077, lng:   2.3158 },
  'Niger':            { lat:  17.6078, lng:   8.0817 },
  'Chad':             { lat:  15.4542, lng:  18.7322 },
  'Sudan':            { lat:  12.8628, lng:  30.2176 },
  'Ethiopia':         { lat:   9.1450, lng:  40.4897 },

  // ── North & Central America ───────────────────────────────────────────────
  'Mexico':           { lat:  23.6345, lng: -102.5528 },
  'Mexican':          { lat:  23.6345, lng: -102.5528 },

  'United States':    { lat:  37.0902, lng:  -95.7129 },
  'American':         { lat:  37.0902, lng:  -95.7129 },
  'USA':              { lat:  37.0902, lng:  -95.7129 },

  'Canada':           { lat:  56.1304, lng: -106.3468 },
  'Canadian':         { lat:  56.1304, lng: -106.3468 },

  'Jamaica':          { lat:  18.1096, lng:  -77.2975 },
  'Jamaican':         { lat:  18.1096, lng:  -77.2975 },

  'Costa Rica':       { lat:   9.7489, lng:  -83.7534 },
  'Panama':           { lat:   8.5380, lng:  -80.7821 },
  'Honduras':         { lat:  15.2000, lng:  -86.2419 },
  'Guatemala':        { lat:  15.7835, lng:  -90.2308 },
  'El Salvador':      { lat:  13.7942, lng:  -88.8965 },
  'Cuba':             { lat:  21.5218, lng:  -77.7812 },
  'Haiti':            { lat:  18.9712, lng:  -72.2852 },
  'Trinidad and Tobago': { lat: 10.6918, lng: -61.2225 },

  // ── Asia ──────────────────────────────────────────────────────────────────
  'Japan':            { lat:  36.2048, lng: 138.2529 },
  'Japanese':         { lat:  36.2048, lng: 138.2529 },

  'South Korea':      { lat:  35.9078, lng: 127.7669 },
  'Korean':           { lat:  35.9078, lng: 127.7669 },
  'North Korea':      { lat:  40.3399, lng: 127.5101 },

  'China':            { lat:  35.8617, lng: 104.1954 },
  'Chinese':          { lat:  35.8617, lng: 104.1954 },

  'Iran':             { lat:  32.4279, lng:  53.6880 },
  'Iranian':          { lat:  32.4279, lng:  53.6880 },

  'Saudi Arabia':     { lat:  23.8859, lng:  45.0792 },
  'Saudi':            { lat:  23.8859, lng:  45.0792 },

  'Qatar':            { lat:  25.3548, lng:  51.1839 },
  'Qatari':           { lat:  25.3548, lng:  51.1839 },

  'Australia':        { lat: -25.2744, lng: 133.7751 },
  'Australian':       { lat: -25.2744, lng: 133.7751 },

  'India':            { lat:  20.5937, lng:  78.9629 },
  'Indian':           { lat:  20.5937, lng:  78.9629 },

  'Indonesia':        { lat:  -0.7893, lng: 113.9213 },
  'Philippines':      { lat:  12.8797, lng: 121.7740 },
  'Thailand':         { lat:  15.8700, lng: 100.9925 },
  'Vietnam':          { lat:  14.0583, lng: 108.2772 },
  'Iraq':             { lat:  33.2232, lng:  43.6793 },
  'Syria':            { lat:  34.8021, lng:  38.9968 },
  'Jordan':           { lat:  30.5852, lng:  36.2384 },
  'Lebanon':          { lat:  33.8547, lng:  35.8623 },
  'United Arab Emirates': { lat: 23.4241, lng: 53.8478 },
  'UAE':              { lat:  23.4241, lng:  53.8478 },
  'Kuwait':           { lat:  29.3117, lng:  47.4818 },
  'Bahrain':          { lat:  25.9304, lng:  50.6378 },
  'Oman':             { lat:  21.4735, lng:  55.9754 },

  'New Zealand':      { lat: -40.9006, lng: 174.8860 },
}
