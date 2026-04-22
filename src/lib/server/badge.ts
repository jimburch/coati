const COATI_MARK = `<g transform="translate(6,6) scale(0.2)" fill="white" aria-hidden="true">
    <path d="M 72,14 C 90,14 96,30 96,50 C 96,72 80,90 58,92 C 36,94 16,80 10,60 C 4,40 14,18 32,10 L 35,20 C 22,26 15,40 19,55 C 23,70 37,80 53,79 C 69,78 82,66 82,50 C 82,35 76,23 65,20 Z"/>
    <path d="M 28,12 C 34,9 40,8 40,8 L 37,18 C 37,18 31,19 26,22 Z" fill-opacity="0.45"/>
    <path d="M 14,30 C 12,36 10,44 11,50 L 21,48 C 20,44 21,38 22,33 Z" fill-opacity="0.45"/>
    <path d="M 14,62 C 17,70 23,77 30,82 L 34,73 C 29,69 25,64 23,58 Z" fill-opacity="0.45"/>
    <path d="M 44,88 C 50,91 57,92 63,91 L 60,81 C 55,82 50,82 45,79 Z" fill-opacity="0.45"/>
    <circle cx="70" cy="18" r="14"/>
    <circle cx="60" cy="7" r="5"/>
    <path d="M 80,15 L 96,19 L 80,25 Z"/>
  </g>`;

export const BADGE_AVAILABLE = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="32" role="img" aria-label="Clone on Coati">
  <title>Clone on Coati</title>
  <rect width="160" height="32" rx="4" fill="#1a9e72"/>
  ${COATI_MARK}
  <rect x="31" y="6" width="1" height="20" fill="white" fill-opacity="0.3"/>
  <text x="40" y="21" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="12" fill="white">Clone on Coati</text>
</svg>`;

export const BADGE_UNAVAILABLE = `<svg xmlns="http://www.w3.org/2000/svg" width="184" height="32" role="img" aria-label="Setup unavailable">
  <title>Setup unavailable</title>
  <rect width="184" height="32" rx="4" fill="#6b7280"/>
  ${COATI_MARK}
  <rect x="31" y="6" width="1" height="20" fill="white" fill-opacity="0.3"/>
  <text x="40" y="21" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="12" fill="white">Setup unavailable</text>
</svg>`;
