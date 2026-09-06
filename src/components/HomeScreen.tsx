import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FaCalculator, FaUniversity, FaBirthdayCake, FaWeight,
  FaFire, FaReceipt, FaChartLine, FaTshirt, FaRuler,
  FaExchangeAlt, FaGlobe, FaRulerCombined, FaMapMarkedAlt, FaBalanceScale,
  FaSun, FaMoon, FaPiggyBank, FaMosque,
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

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=Space+Mono:wght@700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{width:100%;height:100%;overflow:hidden;background:#07080d}
@keyframes _floatUp{from{opacity:0;transform:translateY(14px) scale(0.92)}to{opacity:1;transform:none}}
.hsc-theme-btn{transition:background 0.2s,color 0.2s;}
@keyframes _bob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-5px) rotate(2deg)}}
.hsc-card{
  position:relative;cursor:pointer;border:none;
  background:var(--surface);
  box-shadow:inset 0 0 0 1px var(--border);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  overflow:hidden;outline:none;
  transition:transform .16s cubic-bezier(.22,1,.36,1),background .16s,box-shadow .16s;
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
  position:absolute;background:var(--ac);color:#fff;
  border-radius:5px;font-weight:900;
  display:flex;align-items:center;justify-content:center;
  font-family:'Space Mono',monospace;z-index:2;
}
.hsc-pod{
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  background:var(--surface2);
  border:1.5px solid var(--border2,var(--border));
  transition:transform .16s,box-shadow .16s;
}
.hsc-card:hover .hsc-pod{transform:scale(1.1);box-shadow:0 0 10px var(--ac)3a}
.hsc-lm{font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;width:100%;text-align:center}
.hsc-ls{font-weight:400;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;width:100%;text-align:center}
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
  FaRulerCombined, FaMapMarkedAlt, FaBalanceScale, FaPiggyBank, FaMosque,
};

function numCols(w: number): number {
  if (w >= 1024) return 6;
  if (w >= 768)  return 4;
  return 3;
}

interface Layout {
  cols: number; rows: number;
  cell: number; gap: number; pad: number;
  podSz: number; podR: number; iconSz: number;
  fMain: number; fSub: number; cardR: number;
  mb: number; padCard: number;
  badgeSz: number; badgeFs: number;
  lastRowCount: number;
}

function calcLayout(cw: number, ch: number, hdrH: number): Layout {
  const cols   = numCols(cw);
  const total  = APPS.length;
  const rows   = Math.ceil(total / cols);
  const gap    = Math.max(6, Math.round(cw * 0.016));
  const pad    = Math.max(8, Math.round(cw * 0.022));
  const labelH = 26; // section label height + margin

  // Available space — tab bar is a SIBLING in App.tsx, not inside here
  const availW = cw - pad * 2;
  const availH = ch - hdrH - labelH - pad * 2;

  const cellW  = Math.floor((availW - gap * (cols - 1)) / cols);
  const cellH  = Math.floor((availH - gap * (rows - 1)) / rows);
  const cell   = Math.max(44, Math.min(cellW, cellH)); // square: smaller wins

  const podSz   = Math.floor(cell * 0.36);
  const podR    = Math.max(6,  Math.floor(podSz  * 0.28));
  const iconSz  = Math.max(13, Math.floor(podSz  * 0.52));
  const fMain   = Math.max(9,  Math.min(14, Math.floor(cell * 0.115)));
  const fSub    = Math.max(8,  Math.min(12, Math.floor(cell * 0.095)));
  const cardR   = Math.max(8,  Math.floor(cell   * 0.14));
  const mb      = Math.max(4,  Math.floor(cell   * 0.06));
  const padCard = Math.max(4,  Math.floor(cell   * 0.07));
  const badgeSz = Math.max(13, Math.floor(cell   * 0.13));
  const badgeFs = Math.max(7,  Math.floor(badgeSz * 0.6));
  const lastRowCount = total - (rows - 1) * cols;

  return { cols, rows, cell, gap, pad, podSz, podR, iconSz,
           fMain, fSub, cardR, mb, padCard, badgeSz, badgeFs, lastRowCount };
}

interface Props {
  onOpen:   (id: string) => void;
  history:  Record<string, string[]>;
  // tabBarHeight no longer needed — BottomNav is a sibling in App.tsx
}

export default function HomeScreen({ onOpen, history }: Props) {
  const { t, lang, toggle } = useLang();
  const { isDark, toggleTheme } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const hdrRef  = useRef<HTMLElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    const id = 'hsc-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id; el.textContent = STYLES;
      document.head.appendChild(el);
    }
  }, []);

  const recompute = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    // Measure our actual container — not window — so it works in any shell
    const { width: cw, height: ch } = root.getBoundingClientRect();
    const hdrH = hdrRef.current?.offsetHeight ?? 56;
    if (cw > 0 && ch > 0) setLayout(calcLayout(cw, ch, hdrH));
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(root);
    recompute();
    return () => ro.disconnect();
  }, [recompute]);

  const pad = layout
    ? Math.max(8, Math.round((rootRef.current?.getBoundingClientRect().width ?? 375) * 0.022))
    : 10;

  return (
    <div
      ref={rootRef}
      style={{
        // Fill whatever the parent flex item gives us (content area in App.tsx)
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
      <header ref={hdrRef} style={{
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
      </header>

      {/* MAIN GRID */}
      {layout && (() => {
        const {
          cols, rows, cell, gap, pad: lpad, lastRowCount,
          podSz, podR, iconSz, fMain, fSub,
          cardR, mb, padCard, badgeSz, badgeFs,
        } = layout;

        return (
          <main style={{
            flex: 1, minHeight: 0, zIndex: 1, position: 'relative',
            display: 'flex', flexDirection: 'column',
            padding: `10px ${lpad}px`,
            overflow: 'hidden',
          }}>
            {/* Section label */}
            <p style={{
              fontFamily: T.fontMono, fontSize: 9, fontWeight: 700,
              color: T.textMuted, letterSpacing: '2px', textTransform: 'uppercase',
              marginBottom: 8, flexShrink: 0,
            }}>{t.selectCalc}</p>

            {/* Grid column — fills remaining height evenly across rows */}
            <div style={{
              flex: 1, minHeight: 0,
              display: 'flex', flexDirection: 'column',
              gap,
            }}>
              {Array.from({ length: rows }, (_, r) => {
                const isLast    = r === rows - 1;
                const appsInRow = isLast ? lastRowCount : cols;
                const startIdx  = r * cols;

                return (
                  <div key={r} style={{
                    display: 'flex', gap,
                    flex: 1, minHeight: 0,
                  }}>
                    {Array.from({ length: appsInRow }, (_, ci) => {
                      const appIdx = startIdx + ci;
                      const app    = APPS[appIdx];
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
                            flex: 1, minWidth: 0,
                            height: '100%',
                            borderRadius: cardR,
                            padding: padCard,
                            animationName: '_floatUp',
                            animationDuration: '0.32s',
                            animationTimingFunction: 'cubic-bezier(.16,1,.3,1)',
                            animationDelay: `${appIdx * 0.02}s`,
                            animationFillMode: 'both',
                          } as React.CSSProperties}
                        >
                          {count > 0 && (
                            <span className="hsc-badge" style={{
                              top: 5, right: 5,
                              width: badgeSz, height: badgeSz,
                              fontSize: badgeFs,
                              borderRadius: Math.floor(badgeSz * 0.4),
                            }}>{count}</span>
                          )}
                          <div className="hsc-pod" style={{
                            width: podSz, height: podSz,
                            borderRadius: podR, marginBottom: mb,
                          }}>
                            {Icon && <Icon size={iconSz} color={accent} />}
                          </div>
                          <div style={{ width: '100%', minWidth: 0 }}>
                            <span className="hsc-lm" style={{
                              fontSize: fMain, fontFamily: T.font, lineHeight: 1.2,
                            }}>{label}</span>
                            {sub && (
                              <span className="hsc-ls" style={{
                                fontSize: fSub, fontFamily: T.font,
                                lineHeight: 1.15, display: 'block', marginTop: 2,
                              }}>{sub}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </main>
        );
      })()}
    </div>
  );
}