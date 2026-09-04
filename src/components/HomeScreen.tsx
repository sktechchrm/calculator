import React, { useEffect } from 'react';
import {
  FaCalculator, FaUniversity, FaBirthdayCake, FaWeight,
  FaFire, FaReceipt, FaChartLine, FaTshirt, FaRuler,
  FaExchangeAlt, FaGlobe, FaRulerCombined, FaMapMarkedAlt, FaBalanceScale,
  FaSun, FaMoon,
} from 'react-icons/fa';
import { useLang } from '../context/LangContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { APPS } from '../utils/constants.ts';

const T = {
  bgBody:   'var(--bg)',
  bgHeader: 'var(--surface)',
  textPri:  'var(--text)',
  textSec:  'var(--text2)',
  textMuted:'var(--text3)',
  border:   'var(--border)',
  font:     "'Noto Serif Bengali','Outfit','Noto Sans Bengali',sans-serif",
  fontMono: "'Space Mono',monospace",
};

/**
 * PERMANENT RESPONSIVE GRID
 * ---------------------------------------------------------------
 * Design goals (mobile / tablet / desktop):
 *  - Pure CSS Grid — no JS pixel math, no ResizeObserver, no
 *    per-device magic numbers. Scales correctly on every screen.
 *  - Cards are always perfectly square (CSS aspect-ratio), so
 *    icon/label proportions never look "stretched" or "tiny".
 *  - Column count adapts via standard, well-tested breakpoints:
 *      < 480px   (phones)              -> 3 columns
 *      480–767px (large phones)        -> 4 columns
 *      768–1023px (tablets, portrait)  -> 5 columns
 *      >= 1024px (tablets landscape /
 *                 desktop / laptop)    -> 6 columns
 *  - Leftover vertical space (when there are fewer rows than fit
 *    the screen) is distributed EVENLY above/below the whole grid
 *    via `align-content: center` on the grid container — this is
 *    what permanently eliminates "dead space at the bottom": the
 *    space is never dumped in one place, it's balanced as margin.
 *  - Typography scales with `clamp()` tied to viewport width, so
 *    text stays readable from small phones up to desktop monitors
 *    without ever becoming illegibly small or comically large.
 * ---------------------------------------------------------------
 */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Space+Mono:wght@700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{width:100%;height:100%;overflow:hidden;background:#07080d}
@keyframes _floatUp{from{opacity:0;transform:translateY(14px) scale(0.92)}to{opacity:1;transform:none}}
@keyframes _bob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-5px) rotate(2deg)}}

.hsc-theme-btn{transition:background 0.2s,color 0.2s;}

/* ---- Responsive grid container ------------------------------- */
.hsc-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:clamp(6px,1.8vw,16px);
  align-content:center;     /* <-- balances leftover space, no dead zone */
  justify-items:stretch;
  width:100%;height:100%;
  overflow:hidden;
}
@media (min-width:480px){  .hsc-grid{grid-template-columns:repeat(4,1fr);} }
@media (min-width:768px){  .hsc-grid{grid-template-columns:repeat(5,1fr);} }
@media (min-width:1024px){ .hsc-grid{grid-template-columns:repeat(6,1fr);} }
@media (min-width:1440px){ .hsc-grid{grid-template-columns:repeat(7,1fr);} }

/* ---- Card ------------------------------------------------------ */
.hsc-card{
  position:relative;cursor:pointer;border:none;
  aspect-ratio:1/1;width:100%;
  background:var(--surface);
  box-shadow:inset 0 0 0 1px var(--border);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  overflow:hidden;outline:none;
  border-radius:clamp(10px,2vw,18px);
  padding:clamp(6px,2.2%,16px);
  transition:transform .16s cubic-bezier(.22,1,.36,1),background .16s,box-shadow .16s;
  animation:_floatUp .32s cubic-bezier(.16,1,.3,1) both;
}
.hsc-card::before{
  content:'';position:absolute;inset:0;border-radius:inherit;
  background:radial-gradient(ellipse at 50% -5%,var(--ac)1a 0%,transparent 68%);
  opacity:0;transition:opacity .2s;pointer-events:none;
}
.hsc-card:hover::before,.hsc-card:focus-visible::before{opacity:1}
.hsc-card:hover{
  transform:translateY(-3px) scale(1.03);
  background:var(--surface2);
  box-shadow:inset 0 0 0 1.5px var(--ac)88,0 0 18px var(--ac)2a;
}
.hsc-card:active{transform:scale(0.93)!important;transition-duration:.06s}
.hsc-card:focus-visible{box-shadow:0 0 0 2px var(--ac)}

.hsc-badge{
  position:absolute;top:5%;right:5%;
  width:clamp(13px,7%,22px);height:clamp(13px,7%,22px);
  background:var(--ac);color:#fff;
  border-radius:5px;font-weight:900;
  display:flex;align-items:center;justify-content:center;
  font-size:clamp(7px,3.2%,11px);
  font-family:'Space Mono',monospace;z-index:2;
}
.hsc-pod{
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  width:clamp(28px,34%,56px);height:clamp(28px,34%,56px);
  border-radius:clamp(6px,10%,14px);
  margin-bottom:clamp(4px,6%,10px);
  background:var(--surface2);
  border:1.5px solid var(--border2,var(--border));
  transition:transform .16s,box-shadow .16s;
}
.hsc-card:hover .hsc-pod{transform:scale(1.1);box-shadow:0 0 10px var(--ac)3a}
.hsc-pod svg{width:55%;height:55%}

.hsc-lm{
  font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;display:block;width:100%;text-align:center;
  font-size:clamp(10px,2.3vw,15px);
}
.hsc-ls{
  font-weight:400;color:var(--text3);overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;display:block;width:100%;text-align:center;
  font-size:clamp(8px,1.9vw,12px);margin-top:2px;
}

.hsc-langbtn{
  background:var(--surface);border:1px solid var(--border);
  color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:6px;
  font-family:'Outfit',sans-serif;font-weight:700;
  transition:background .2s,color .2s;flex-shrink:0;
  border-radius:10px;height:32px;padding:0 14px;font-size:11px;
}
.hsc-langbtn:hover{background:var(--surface2);color:var(--text)}
`;

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  FaCalculator, FaUniversity, FaBirthdayCake, FaWeight,
  FaFire, FaReceipt, FaChartLine, FaTshirt, FaRuler, FaExchangeAlt,
  FaRulerCombined, FaMapMarkedAlt, FaBalanceScale,
};

interface Props {
  onOpen:   (id: string) => void;
  history:  Record<string, string[]>;
}

export default function HomeScreen({ onOpen, history }: Props) {
  const { t, lang, toggle } = useLang();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const id = 'hsc-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id; el.textContent = STYLES;
      document.head.appendChild(el);
    }
  }, []);

  return (
    <div
      style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: T.bgBody, color: T.textPri,
        fontFamily: T.font, overflow: 'hidden', position: 'relative',
      }}
    >
      {/* Ambient mesh */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 70% 55% at 15% 18%,rgba(99,102,241,.07) 0%,transparent 60%),
          radial-gradient(ellipse 55% 45% at 85% 82%,rgba(236,72,153,.05) 0%,transparent 60%)`,
      }} />

      {/* HEADER */}
      <header style={{
        flexShrink: 0, zIndex: 10, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        paddingTop:    'max(env(safe-area-inset-top,0px),12px)',
        paddingBottom: '12px',
        paddingInline: 'clamp(12px,3vw,24px)',
        background:    T.bgHeader,
        borderBottom:  `1px solid ${T.border}`,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 'clamp(18px,3vw,26px)', lineHeight: 1, flexShrink: 0,
            display: 'inline-block', animation: '_bob 3s ease-in-out infinite',
          }}>🍄</span>
          <div>
            <h1 style={{
              fontFamily: T.fontMono, margin: 0,
              fontSize: 'clamp(10px,1.8vw,14px)', fontWeight: 700,
              letterSpacing: 'clamp(1px,.3vw,2.5px)', color: T.textPri, lineHeight: 1.25,
            }}>MARIO SMART CALCULATOR</h1>
            <p style={{
              fontSize: 'clamp(9px,1.2vw,11px)', color: T.textSec,
              marginTop: 3, lineHeight: 1, fontFamily: T.font,
            }}>{t.tagline}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            className="hsc-theme-btn"
            onClick={toggleTheme}
            title={isDark ? 'Day mode' : 'Night mode'}
            style={{
              background: isDark ? '#1a1500' : '#f0eeff',
              border: `1px solid ${isDark ? '#f59e0b40' : '#7c3aed40'}`,
              color: isDark ? '#f59e0b' : '#7c3aed',
              borderRadius: 20, padding: '5px 12px',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'inherit',
            }}
          >
            {isDark ? <FaSun size={11} /> : <FaMoon size={11} />}
            <span>{isDark ? (lang === 'bn' ? 'দিন' : 'Day') : (lang === 'bn' ? 'রাত' : 'Night')}</span>
          </button>
          <button className="hsc-langbtn" onClick={toggle}>
            <FaGlobe size={11} color="#6366f1" />
            <span>{lang === 'bn' ? 'EN' : 'বাং'}</span>
          </button>
        </div>
      </header>

      {/* MAIN — CSS Grid fills all remaining space, self-balances leftover height */}
      <main style={{
        flex: 1, minHeight: 0, zIndex: 1, position: 'relative',
        display: 'flex', flexDirection: 'column',
        padding: 'clamp(8px,2.2vw,20px)',
        overflow: 'hidden',
      }}>
        <p style={{
          fontFamily: T.fontMono, fontSize: 9, fontWeight: 700,
          color: T.textMuted, letterSpacing: '2px', textTransform: 'uppercase',
          marginBottom: 8, flexShrink: 0,
        }}>{t.selectCalc}</p>

        <div className="hsc-grid" style={{ flex: 1, minHeight: 0 }}>
          {APPS.map((app, appIdx) => {
            const Icon   = ICON_MAP[app.icon];
            const count  = (history[app.id] || []).length;
            const appT   = t.apps[app.id as keyof typeof t.apps];
            const accent = app.color || '#6366f1';
            const label  = appT?.label || app.id;
            const sub    = lang === 'bn' ? (appT?.desc || '') : '';

            return (
              <button
                key={app.id}
                className="hsc-card"
                onClick={() => onOpen(app.id)}
                aria-label={label}
                style={{
                  '--ac': accent,
                  animationDelay: `${appIdx * 0.02}s`,
                } as React.CSSProperties}
              >
                {count > 0 && <span className="hsc-badge">{count}</span>}
                <div className="hsc-pod">
                  {Icon && <Icon color={accent} />}
                </div>
                <div style={{ width: '100%', minWidth: 0 }}>
                  <span className="hsc-lm">{label}</span>
                  {sub && <span className="hsc-ls">{sub}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}