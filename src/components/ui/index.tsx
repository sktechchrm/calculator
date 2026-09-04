/**
 * ui/index.tsx
 * All primitives used by calculators.
 * ActionRow, InfoBanner, HistoryPanel → no-ops (CalcShell handles them).
 */
import { useState, useEffect } from 'react';
import { FaCheckCircle } from 'react-icons/fa';

const D = {
  surface: 'var(--surface)',
  border:  'var(--border)',
  textPri: 'var(--text)',
  textSec: 'var(--text2)',
  textDim: 'var(--text3)',
  font:    "'Noto Serif Bengali','Outfit','Noto Sans Bengali',sans-serif",
};

// ── FloatInput ────────────────────────────────────────────────────────────────
export function FloatInput({ label, hint, accent='#d4a017', value, onChange, type='text', placeholder, ...props }:any) {
  const [focused, setFocused] = useState(false);
  const hasValue = value!==''&&value!==undefined&&value!==null;
  const active = focused||hasValue;
  return (
    <div style={{ position:'relative', marginBottom:'clamp(12px,2.5vh,20px)', width:'100%', boxSizing:'border-box' }}>
      <div style={{ position:'relative', border:`2px solid ${focused?accent:D.border}`, borderRadius:13, background:D.surface, transition:'border-color 0.2s,box-shadow 0.2s', boxShadow:focused?`0 0 0 3px ${accent}18`:'none', width:'100%', boxSizing:'border-box' }}>
        <label style={{ position:'absolute', top:active?-10:'50%', left:13, transform:active?'none':'translateY(-50%)', fontSize:active?11:'clamp(13px,1.8vw,15px)', fontWeight:active?700:500, color:focused?accent:active?D.textSec:D.textDim, background:active?D.surface:'transparent', padding:active?'0 5px':'0', transition:'all 0.18s cubic-bezier(0.4,0,0.2,1)', pointerEvents:'none', zIndex:2, lineHeight:1, whiteSpace:'nowrap', maxWidth:'calc(100% - 26px)', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</label>
        <input type={type} value={value} onChange={onChange} placeholder={focused?(placeholder||''):''} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} {...props}
          style={{ width:'100%', display:'block', padding:'clamp(13px,2vh,17px) 15px clamp(11px,1.8vh,15px)', border:'none', borderRadius:13, fontSize:'clamp(15px,2vw,18px)', fontWeight:600, color:D.textPri, background:'transparent', outline:'none', fontFamily:D.font, minWidth:0, boxSizing:'border-box' }}/>
      </div>
      {hint&&<div style={{ fontSize:11, color:D.textDim, marginTop:4, paddingLeft:5, lineHeight:1.4 }}>{hint}</div>}
    </div>
  );
}

// ── FloatSelect ───────────────────────────────────────────────────────────────
export function FloatSelect({ label, accent='#d4a017', value, onChange, children, ...props }:any) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position:'relative', marginBottom:'clamp(12px,2.5vh,20px)', width:'100%', boxSizing:'border-box' }}>
      <div style={{ position:'relative', border:`2px solid ${focused?accent:D.border}`, borderRadius:13, background:D.surface, transition:'border-color 0.2s', boxShadow:focused?`0 0 0 3px ${accent}18`:'none', width:'100%', boxSizing:'border-box' }}>
        <label style={{ position:'absolute', top:-10, left:13, fontSize:11, fontWeight:700, color:focused?accent:D.textSec, background:D.surface, padding:'0 5px', pointerEvents:'none', zIndex:2, lineHeight:1 }}>{label}</label>
        <select value={value} onChange={onChange} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} {...props}
          style={{ width:'100%', display:'block', padding:'clamp(13px,2vh,17px) 40px clamp(11px,1.8vh,15px) 15px', border:'none', borderRadius:13, fontSize:'clamp(14px,2vw,16px)', fontWeight:600, color:D.textPri, background:'transparent', outline:'none', fontFamily:D.font, cursor:'pointer', minWidth:0, appearance:'none', WebkitAppearance:'none', boxSizing:'border-box' }}>{children}</select>
        <div style={{ position:'absolute', right:15, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:D.textSec, fontSize:14 }}>▾</div>
      </div>
    </div>
  );
}

// ── DateThreeInput ────────────────────────────────────────────────────────────
export function DateThreeInput({ labels=['Day','Month','Year'], values=['','',''], onChanges=[], accent='#c41e3a', hint }:any) {
  return (
    <div style={{ width:'100%', marginBottom:4, boxSizing:'border-box' }}>
      <div style={{ display:'flex', gap:8, alignItems:'flex-start', width:'100%' }}>
        {[0,1,2].map(i=>(
          <div key={i} style={{ flex:i===2?1.6:1, minWidth:0 }}>
            <FloatInput label={labels[i]} type="number" value={values[i]} onChange={onChanges[i]} accent={accent} placeholder={i===0?'15':i===1?'06':'1990'}/>
          </div>
        ))}
      </div>
      {hint&&<div style={{ fontSize:11, color:D.textDim, marginTop:-8, marginBottom:12, paddingLeft:5 }}>{hint}</div>}
    </div>
  );
}

// ── ToggleGroup ───────────────────────────────────────────────────────────────
export function ToggleGroup({ options, value, onChange, accent='#d4a017' }:any) {
  return (
    <div style={{ display:'flex', gap:6, marginBottom:'clamp(12px,2.5vh,18px)', background:'#111113', borderRadius:13, padding:4, width:'100%', boxSizing:'border-box' }}>
      {options.map(([val,label]:[string,string])=>{
        const active=value===val;
        return (
          <button key={val} onClick={()=>onChange(val)} style={{ flex:1, padding:'clamp(9px,1.8vh,13px) 6px', background:active?D.surface:'transparent', color:active?accent:D.textDim, border:'none', borderRadius:10, fontSize:'clamp(12px,1.8vw,15px)', fontWeight:700, fontFamily:D.font, cursor:'pointer', boxShadow:active?'0 1px 6px rgba(0,0,0,0.3)':'none', transition:'all 0.18s', display:'flex', alignItems:'center', justifyContent:'center', gap:5, minWidth:0, boxSizing:'border-box' }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── ResultCard ────────────────────────────────────────────────────────────────
export function ResultCard({ children, accent='#d4a017' }:any) {
  return (
    <div style={{ background:`${accent}0a`, border:`2px solid ${accent}25`, borderRadius:16, padding:'clamp(14px,2.5vh,20px)', marginTop:'clamp(12px,2vh,18px)', animation:'popIn 0.28s ease', boxShadow:`0 4px 24px ${accent}10`, width:'100%', overflow:'hidden', boxSizing:'border-box' }}>
      {children}
    </div>
  );
}

// ── StatGrid ──────────────────────────────────────────────────────────────────
export function StatGrid({ items, cols=2 }:any) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`, gap:'clamp(7px,1.5vw,12px)', width:'100%', boxSizing:'border-box' }}>
      {items.map(([label,value,accent,span]:any,i:number)=>(
        <div key={i} style={{ background:D.surface, border:`1.5px solid ${D.border}`, borderRadius:12, padding:'clamp(10px,2vh,14px) clamp(8px,1.5vw,12px)', textAlign:'center', boxShadow:'0 1px 6px rgba(0,0,0,0.2)', gridColumn:span==='full'?'1 / -1':undefined, overflow:'hidden', boxSizing:'border-box' }}>
          <div style={{ fontSize:'clamp(10px,1.5vw,12px)', color:D.textSec, fontWeight:600, marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{label}</div>
          <div style={{ fontSize:'clamp(14px,2.2vw,18px)', fontWeight:800, color:accent||D.textPri, wordBreak:'break-word', lineHeight:1.3 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── PresetPills ───────────────────────────────────────────────────────────────
export function PresetPills({ options, active, onSelect, accent }:any) {
  return (
    <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:'clamp(10px,2vh,16px)', width:'100%', boxSizing:'border-box' }}>
      {options.map(([val,label]:[string,string])=>(
        <button key={val} onClick={()=>onSelect(val)} style={{ padding:'clamp(6px,1.2vh,9px) clamp(10px,2vw,14px)', borderRadius:22, background:active===val?accent:D.surface, color:active===val?'#fff':D.textSec, border:`2px solid ${active===val?accent:D.border}`, fontSize:'clamp(11px,1.6vw,13px)', fontWeight:700, fontFamily:D.font, cursor:'pointer', transition:'all 0.15s', flexShrink:0, boxSizing:'border-box' }}>{label}</button>
      ))}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export function Toast({ msg, onDone }:any) {
  useEffect(()=>{const t=setTimeout(onDone,2400);return()=>clearTimeout(t);},[onDone]);
  return (
    <div style={{ position:'fixed', bottom:'calc(80px + env(safe-area-inset-bottom, 0px))', left:'50%', transform:'translateX(-50%)', background:D.surface, color:D.textPri, padding:'13px 24px', borderRadius:32, fontSize:15, fontFamily:D.font, fontWeight:600, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', zIndex:9999, whiteSpace:'nowrap', animation:'toastUp 0.25s ease', display:'flex', alignItems:'center', gap:9, border:`1.5px solid ${D.border}`, boxSizing:'border-box' }}>
      <FaCheckCircle color="#27ae60" size={17}/>{msg}
    </div>
  );
}

// ── Backwards-compat no-ops ───────────────────────────────────────────────────
export function InfoBanner() { return null; }
export function ActionRow()  { return null; }
export function HistoryPanel(){ return null; }
export function SectionLabel({ children }:any) {
  return <div style={{ fontSize:12, fontWeight:700, color:D.textSec, textTransform:'uppercase', letterSpacing:0.8, marginBottom:12, marginTop:6 }}>{children}</div>;
}