export function LogoSVG({ className = "", width = 32, height = 32 }: { className?: string, width?: number | string, height?: number | string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={width} height={height} className={className}>
      {/* 圓角矩形底色 (馬卡龍杏色) */}
      <rect width="512" height="512" rx="115" fill="#FFE8D6" />

      {/* 點綴：韓國文創風的粉色小腮紅 */}
      <ellipse cx="175" cy="275" rx="25" ry="16" fill="#FCA5A5" opacity="0.6" />
      <ellipse cx="337" cy="275" rx="25" ry="16" fill="#FCA5A5" opacity="0.6" />

      {/* 主視覺：簡約純黑手繪毛孩 */}
      <g transform="translate(100, 110) scale(13)" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M21 14.5a6 6 0 01-6 6H9a6 6 0 01-6-6V9a6 6 0 016-6h6a6 6 0 016 6v5.5z" />
        <path d="M16 3l1 4 M8 3l-1 4" />
        {/* 眼睛 */}
        <circle cx="9" cy="11" r="1.5" fill="#111111" stroke="none" />
        <circle cx="15" cy="11" r="1.5" fill="#111111" stroke="none" />
        {/* 鼻子與微笑 */}
        <path d="M12 15c-1 0-1.5.5-1.5 1s.5 1 1.5 1 1.5-.5 1.5-1-.5-1-1.5-1z" fill="#111111" stroke="none"/>
      </g>
      
      {/* 點綴：右上角亮黃色手繪星星 */}
      <path d="M380 120 Q390 140 410 150 Q390 160 380 180 Q370 160 350 150 Q370 140 380 120" fill="#FDE047" />
    </svg>
  );
}