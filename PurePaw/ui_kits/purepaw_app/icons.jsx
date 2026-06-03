/* PurePaw UI Kit — icon system + logo.
   The v2 app uses lucide-react. We load the lucide UMD build and adapt
   each icon node into a React <svg>, so icon fidelity matches 1:1.
   <Icon name="Camera" size={22} strokeWidth={2.5} className="..." /> */

/* Newer lucide UMD renamed some icons; map the v2 code's names to fallbacks. */
const ICON_ALIASES = {
  CheckCircle2: ["CircleCheck", "CircleCheckBig"],
  CheckCircle: ["CircleCheck", "CircleCheckBig"],
  XCircle: ["CircleX"],
  AlertTriangle: ["TriangleAlert"],
  BarChart3: ["ChartColumn", "ChartColumnBig", "ChartNoAxesColumn"],
  PieChart: ["ChartPie"],
};

function Icon({ name, size = 24, strokeWidth = 2, className = "", fill = "none", style }) {
  const lib = (typeof lucide !== "undefined" && lucide.icons) || {};
  const tryNames = [name, name && name[0].toUpperCase() + name.slice(1)].concat(ICON_ALIASES[name] || []);
  let node = null;
  for (const n of tryNames) { if (n && lib[n]) { node = lib[n]; break; } }
  // lucide UMD entries: either an array of [tag, attrs] or an object with .children/[2]
  let kids = [];
  if (Array.isArray(node)) {
    // shape: ["svg", {..}, [ [tag,attrs], ... ]]  OR  [ [tag,attrs], ... ]
    if (node.length === 3 && node[0] === "svg") kids = node[2];
    else kids = node;
  } else if (node && node.children) {
    kids = node.children;
  }
  const children = (kids || []).map((c, i) =>
    React.createElement(c[0], Object.assign({ key: i }, c[1]))
  );
  return React.createElement(
    "svg",
    {
      width: size, height: size, viewBox: "0 0 24 24",
      fill, stroke: "currentColor", strokeWidth,
      strokeLinecap: "round", strokeLinejoin: "round",
      className, style,
    },
    children
  );
}

/* Brand logo — apricot rounded square, hand-drawn pet face, blush + star */
function LogoSVG({ className = "", width = 32, height = 32 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={width} height={height} className={className}>
      <rect width="512" height="512" rx="115" fill="#FFE8D6" />
      <ellipse cx="175" cy="275" rx="25" ry="16" fill="#FCA5A5" opacity="0.6" />
      <ellipse cx="337" cy="275" rx="25" ry="16" fill="#FCA5A5" opacity="0.6" />
      <g transform="translate(100, 110) scale(13)" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M21 14.5a6 6 0 01-6 6H9a6 6 0 01-6-6V9a6 6 0 016-6h6a6 6 0 016 6v5.5z" />
        <path d="M16 3l1 4 M8 3l-1 4" />
        <circle cx="9" cy="11" r="1.5" fill="#111111" stroke="none" />
        <circle cx="15" cy="11" r="1.5" fill="#111111" stroke="none" />
        <path d="M12 15c-1 0-1.5.5-1.5 1s.5 1 1.5 1 1.5-.5 1.5-1-.5-1-1.5-1z" fill="#111111" stroke="none" />
      </g>
      <path d="M380 120 Q390 140 410 150 Q390 160 380 180 Q370 160 350 150 Q370 140 380 120" fill="#FDE047" />
    </svg>
  );
}

/* Custom duotone line icons used on the Home health cards (from v2 Home.tsx) */
function LineFillIcon({ name, size = 26, className = "" }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className };
  if (name === "bone") return (<svg {...p}><path d="M17 10c.7-.7 1.4-1 2-1a3 3 0 010 6c-.6 0-1.3-.3-2-1v0c-.7.7-1.4 1-2 1a3 3 0 010-6c.6 0 1.3.3 2 1z" /><path d="M7 10c-.7-.7-1.4-1-2-1a3 3 0 000 6c.6 0 1.3-.3 2-1v0c.7.7 1.4 1 2 1a3 3 0 000-6c-.6 0-1.3.3-2 1z" /><path d="M7 12h10" /><path d="M17 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor" stroke="none" /></svg>);
  if (name === "medbox") return (<svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 7V4a1 1 0 011-1h6a1 1 0 011 1v3" /><path d="M11 11h2v6h-2z" fill="currentColor" stroke="none" /><path d="M9 13h6v2H9z" fill="currentColor" stroke="none" /></svg>);
  if (name === "pill") return (<svg {...p}><g transform="rotate(-45 12 12)"><rect x="4" y="8" width="16" height="8" rx="4" /><path d="M12 8 h4 a4 4 0 0 1 4 4 v0 a4 4 0 0 1 -4 4 h-4 z" fill="currentColor" stroke="none" /><rect x="4" y="8" width="16" height="8" rx="4" /></g></svg>);
  if (name === "syringe") return (<svg {...p}><path d="M18 2l4 4 M14 6l4 4 M18 8l-8 8-4-4 8-8Z M10 16l-3 3-4-1-1-4 3-3 M14 10l2 2 M12 12l2 2 M10 14l2 2" /><path d="M2.5 21.5 C2 21 2 20 3 19 L4.5 17.5 L6.5 19.5 L5 21 C4 22 3 22 2.5 21.5 Z" fill="currentColor" stroke="none" /></svg>);
  if (name === "parasite") return (<svg {...p}><circle cx="10" cy="10" r="7" /><path d="M15 15l6 6" strokeWidth="2.5" /><circle cx="10" cy="10" r="2.5" fill="currentColor" stroke="none" /><path d="M6 10h8 M8 7l4 6 M8 13l4-6" /></svg>);
  return null;
}

Object.assign(window, { Icon, LogoSVG, LineFillIcon });
