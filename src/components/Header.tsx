import { useState, useRef, useEffect } from 'react';
import { FaArrowLeft, FaGlobe, FaInfoCircle, FaTimes, FaSun, FaMoon } from 'react-icons/fa';
import { useLang } from '../context/LangContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';

interface Props {
  onBack:  () => void;
  title:   string;
  accent:  string;
  icon?:   React.ComponentType<{ size?: number; color?: string }>;
  info?:   string;
}

export default function Header({ onBack, title, accent, icon: Icon, info }: Props) {
  const { toggle, lang } = useLang();
  const { isDark, toggleTheme } = useTheme();
  const [tooltip, setTooltip] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tooltip) return;
    const fn = (e: MouseEvent | TouchEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node))
        setTooltip(false);
    };
    document.addEventListener('mousedown', fn);
    document.addEventListener('touchstart', fn as EventListener);
    return () => {
      document.removeEventListener('mousedown', fn);
      document.removeEventListener('touchstart', fn as EventListener);
    };
  }, [tooltip]);

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0, transition: 'all 0.18s',
    background: 'var(--surface)', border: '1px solid var(--border)',
  };

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: `1px solid ${accent}25`,
      padding: '0 12px',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
      paddingBottom: 10,
      display: 'flex', alignItems: 'center', gap: 8,
      flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
      minHeight: 56,
      boxShadow: isDark
        ? '0 2px 16px rgba(0,0,0,0.4)'
        : '0 2px 12px rgba(0,0,0,0.08)',
      transition: 'background 0.25s ease, box-shadow 0.25s ease',
    }}>

      {/* Back button */}
      <button
        onClick={onBack}
        style={{ ...btnBase, color: accent, borderRadius: 11, width: 36, height: 36, minWidth: 36 }}
        onTouchStart={e => (e.currentTarget.style.background = 'var(--surface2)')}
        onTouchEnd={e => { e.currentTarget.style.background = 'var(--surface)'; }}
      >
        <FaArrowLeft size={13} />
      </button>

      {/* Calculator icon */}
      {Icon && (
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: `${accent}18`, border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={15} color={accent} />
        </div>
      )}

      {/* Title */}
      <span style={{
        flex: 1, fontSize: 15, fontWeight: 800, color: 'var(--text)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        minWidth: 0, letterSpacing: 0.2,
        transition: 'color 0.25s ease',
      }}>{title}</span>

      {/* Info / tooltip button */}
      {info && (
        <div ref={tipRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setTooltip(t => !t)}
            aria-label="How to use"
            style={{
              ...btnBase,
              width: 34, height: 34, borderRadius: '50%',
              background: tooltip ? accent : 'var(--surface)',
              border: `1px solid ${tooltip ? accent : 'var(--border)'}`,
              color: tooltip ? '#fff' : accent,
            }}
          >
            {tooltip ? <FaTimes size={12} /> : <FaInfoCircle size={15} />}
          </button>

          {tooltip && (
            <div style={{
              position: 'fixed',
              top: (() => {
                const el = tipRef.current;
                if (!el) return 80;
                const r = el.getBoundingClientRect();
                return r.bottom + 8;
              })(),
              left: (() => {
                const el = tipRef.current;
                if (!el) return 16;
                const r = el.getBoundingClientRect();
                const tooltipW = Math.min(290, window.innerWidth * 0.8);
                // Prefer aligning right edge to button right edge
                let left = r.right - tooltipW;
                // Clamp so it never goes off-screen left
                left = Math.max(12, left);
                // Clamp so it never goes off-screen right
                left = Math.min(left, window.innerWidth - tooltipW - 12);
                return left;
              })(),
              width: 'min(290px, calc(100vw - 24px))',
              background: 'var(--surface)',
              border: `2px solid ${accent}40`,
              borderRadius: 14,
              padding: '14px 16px',
              boxShadow: isDark
                ? '0 8px 32px rgba(0,0,0,0.6)'
                : '0 8px 24px rgba(0,0,0,0.12)',
              fontSize: 13, color: 'var(--text)',
              lineHeight: 1.7, fontWeight: 500,
              zIndex: 500,
              whiteSpace: 'pre-line',
              fontFamily: "'Noto Serif Bengali','Outfit',sans-serif",
            }}>
              <div style={{
                position: 'absolute', top: -7, right: 12,
                width: 13, height: 13,
                background: 'var(--surface)',
                border: `2px solid ${accent}40`,
                transform: 'rotate(45deg)',
                borderBottom: 'none', borderRight: 'none',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <FaInfoCircle size={13} color={accent} />
                <span style={{ fontWeight: 800, fontSize: 13, color: accent }}>How to use</span>
              </div>
              {info}
            </div>
          )}
        </div>
      )}

      {/* Theme toggle â€” day/night */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Switch to Day mode' : 'Switch to Night mode'}
        style={{
          ...btnBase,
          width: 34, height: 34, borderRadius: 11,
          color: isDark ? '#f59e0b' : '#7c3aed',
          border: `1px solid ${isDark ? '#f59e0b40' : '#7c3aed40'}`,
          background: isDark ? '#1a1500' : '#f0eeff',
        }}
        onTouchStart={e => (e.currentTarget.style.opacity = '0.7')}
        onTouchEnd={e => { e.currentTarget.style.opacity = '1'; }}
      >
        {isDark ? <FaSun size={14} /> : <FaMoon size={14} />}
      </button>

      {/* Language toggle */}
      <button
        onClick={toggle}
        style={{
          ...btnBase,
          borderRadius: 20, padding: '5px 11px',
          fontSize: 11, fontWeight: 700, color: 'var(--text2)',
          gap: 4,
        }}
        onTouchStart={e => (e.currentTarget.style.background = 'var(--surface2)')}
        onTouchEnd={e => { e.currentTarget.style.background = 'var(--surface)'; }}
      >
        <FaGlobe size={10} />{lang === 'bn' ? 'EN' : 'বাং'}
      </button>
    </div>
  );
}
