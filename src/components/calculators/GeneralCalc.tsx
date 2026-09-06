import { useState, useRef, useEffect } from 'react';
import { FaShareAlt, FaHistory, FaTrash, FaChevronDown } from 'react-icons/fa';
import { useLang } from '../../context/LangContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { shareWA, buildShare } from '../../utils/share.ts';

const CALC_BG_DARK  = '#1c1c24';
const CALC_BG_LIGHT = '#f5f4ff';
const DISP_BG_DARK  = '#0d0d14';
const DISP_BG_LIGHT = '#1e1040';

const BTN_EQ  = '#7c3aed';
const TEXT_OP = '#f97316';

function getPalette() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  return {
    CALC_BG:    isLight ? CALC_BG_LIGHT  : CALC_BG_DARK,
    DISP_BG:    isLight ? DISP_BG_LIGHT  : DISP_BG_DARK,
    BTN_SCI:    isLight ? '#ede9ff'      : '#2a2038',
    BTN_NUM:    isLight ? '#e8e8f0'      : '#252530',
    BTN_DEL:    isLight ? '#fde8e8'      : '#2a1010',
    BTN_FN:     isLight ? '#ede9ff'      : '#1e1e2a',
    BORDER_SCI: isLight ? '#d8d0ff'      : '#3d2d6a',
    BORDER_NUM: isLight ? '#d8d8e8'      : '#32323e',
    TEXT_SCI:   isLight ? '#6d28d9'      : '#a78bfa',
    TEXT_NUM:   isLight ? '#1e1b2e'      : '#e8e7f0',
    TEXT_DIM:   isLight ? '#5a5a7a'      : '#6b6780',
    TEXT_ANS:   isLight ? '#1a0050'      : '#f0eeff',  // (unused — overridden below)
    DIVIDER:    isLight ? '#d0cce8'      : '#2e2e40',
  };
}

const TAB_COLORS: Record<string,string> = {
  Algebra:'#7c3aed', Trigonometry:'#16a34a', Calculus:'#64748b', Hyperbolic:'#e11d48',
};

type SciKey = { label:string; token:string; color?:string; unsupported?:boolean };
type NumKey = { label:string; type:'num'|'op'|'fn'|'eq'|'zero'|'del' };
type Row    = { sci:SciKey[]; num:NumKey[] };

const TAB_ROWS: Record<string,Row[]> = {
  Algebra:[
    {sci:[{label:'x²',token:'**2'},{label:'√□',token:'√('},{label:'<',token:'<'}],num:[{label:'(',type:'fn'},{label:')',type:'fn'},{label:'⌫',type:'del'},{label:'AC',type:'fn'}]},
    {sci:[{label:'□/□',token:'/'},{label:'□|□',token:'|('},{label:'≤',token:'≤'}],num:[{label:'7',type:'num'},{label:'8',type:'num'},{label:'9',type:'num'},{label:'÷',type:'op'}]},
    {sci:[{label:'log□',token:'log('},{label:'□!',token:'!'},{label:'>',token:'>'}],num:[{label:'4',type:'num'},{label:'5',type:'num'},{label:'6',type:'num'},{label:'×',type:'op'}]},
    {sci:[{label:'i',token:'i',color:'#2563eb'},{label:'%',token:'%'},{label:'≥',token:'≥'}],num:[{label:'1',type:'num'},{label:'2',type:'num'},{label:'3',type:'num'},{label:'−',type:'op'}]},
    {sci:[{label:'x',token:'x'},{label:'y',token:'y'},{label:'=',token:'=='}],num:[{label:'0',type:'zero'},{label:'.',type:'num'},{label:'=',type:'eq'},{label:'+',type:'op'}]},
  ],
  Trigonometry:[
    {sci:[{label:'sin',token:'sin('},{label:'cos',token:'cos('},{label:'tan',token:'tan('}],num:[{label:'(',type:'fn'},{label:')',type:'fn'},{label:'⌫',type:'del'},{label:'AC',type:'fn'}]},
    {sci:[{label:'sin⁻¹',token:'sin⁻¹('},{label:'cos⁻¹',token:'cos⁻¹('},{label:'tan⁻¹',token:'tan⁻¹('}],num:[{label:'7',type:'num'},{label:'8',type:'num'},{label:'9',type:'num'},{label:'÷',type:'op'}]},
    {sci:[{label:'cot',token:'cot('},{label:'sec',token:'sec('},{label:'csc',token:'csc('}],num:[{label:'4',type:'num'},{label:'5',type:'num'},{label:'6',type:'num'},{label:'×',type:'op'}]},
    {sci:[{label:'π',token:'π',color:'#b45309'},{label:'e',token:'e',color:'#b45309'},{label:'φ',token:'φ',color:'#b45309'}],num:[{label:'1',type:'num'},{label:'2',type:'num'},{label:'3',type:'num'},{label:'−',type:'op'}]},
    {sci:[{label:'DEG',token:'__DEG'},{label:'RAD',token:'__RAD'},{label:'°→r',token:'*(π/180)'}],num:[{label:'0',type:'zero'},{label:'.',type:'num'},{label:'=',type:'eq'},{label:'+',type:'op'}]},
  ],
  Calculus:[
    {sci:[{label:'d/dx',token:'d/dx(',unsupported:true},{label:'∫dx',token:'∫(',unsupported:true},{label:'Σ',token:'Σ(',unsupported:true}],num:[{label:'(',type:'fn'},{label:')',type:'fn'},{label:'⌫',type:'del'},{label:'AC',type:'fn'}]},
    {sci:[{label:'nPr',token:'nPr('},{label:'nCr',token:'nCr('},{label:'n!',token:'!'}],num:[{label:'7',type:'num'},{label:'8',type:'num'},{label:'9',type:'num'},{label:'÷',type:'op'}]},
    {sci:[{label:'log',token:'log('},{label:'ln',token:'ln('},{label:'log₂',token:'log₂('}],num:[{label:'4',type:'num'},{label:'5',type:'num'},{label:'6',type:'num'},{label:'×',type:'op'}]},
    {sci:[{label:'√',token:'√('},{label:'∛',token:'∛('},{label:'xʸ',token:'**'}],num:[{label:'1',type:'num'},{label:'2',type:'num'},{label:'3',type:'num'},{label:'−',type:'op'}]},
    {sci:[{label:'GCD',token:'gcd('},{label:'LCM',token:'lcm('},{label:'x²',token:'**2'}],num:[{label:'0',type:'zero'},{label:'.',type:'num'},{label:'=',type:'eq'},{label:'+',type:'op'}]},
  ],
  Hyperbolic:[
    {sci:[{label:'sinh',token:'sinh('},{label:'cosh',token:'cosh('},{label:'tanh',token:'tanh('}],num:[{label:'(',type:'fn'},{label:')',type:'fn'},{label:'⌫',type:'del'},{label:'AC',type:'fn'}]},
    {sci:[{label:'coth',token:'coth('},{label:'sech',token:'sech('},{label:'csch',token:'csch('}],num:[{label:'7',type:'num'},{label:'8',type:'num'},{label:'9',type:'num'},{label:'÷',type:'op'}]},
    {sci:[{label:'10ˣ',token:'10ˣ('},{label:'eˣ',token:'eˣ('},{label:'2ˣ',token:'2ˣ('}],num:[{label:'4',type:'num'},{label:'5',type:'num'},{label:'6',type:'num'},{label:'×',type:'op'}]},
    {sci:[{label:'⌊x⌋',token:'⌊'},{label:'⌈x⌉',token:'⌈'},{label:'|x|',token:'|x|('}],num:[{label:'1',type:'num'},{label:'2',type:'num'},{label:'3',type:'num'},{label:'−',type:'op'}]},
    {sci:[{label:'∞',token:'Infinity',color:'#b45309'},{label:'π',token:'π',color:'#b45309'},{label:'e',token:'e',color:'#b45309'}],num:[{label:'0',type:'zero'},{label:'.',type:'num'},{label:'=',type:'eq'},{label:'+',type:'op'}]},
  ],
};

const BASIC_ROWS: NumKey[][] = [
  [{label:'AC',type:'fn'},{label:'+/−',type:'fn'},{label:'%',type:'fn'},{label:'÷',type:'op'}],
  [{label:'7',type:'num'},{label:'8',type:'num'},{label:'9',type:'num'},{label:'×',type:'op'}],
  [{label:'4',type:'num'},{label:'5',type:'num'},{label:'6',type:'num'},{label:'−',type:'op'}],
  [{label:'1',type:'num'},{label:'2',type:'num'},{label:'3',type:'num'},{label:'+',type:'op'}],
  [{label:'0',type:'zero'},{label:'.',type:'num'},{label:'⌫',type:'del'},{label:'=',type:'eq'}],
];

function fact(n:number):number{n=Math.floor(Math.abs(n));if(n>170)return Infinity;if(n<=1)return 1;let r=1;for(let i=2;i<=n;i++)r*=i;return r;}
function perm(n:number,r:number){return fact(n)/fact(n-r);}
function comb(n:number,r:number){return fact(n)/(fact(r)*fact(n-r));}
function gcdFn(a:number,b:number){a=Math.abs(a);b=Math.abs(b);while(b){const t=b;b=a%b;a=t;}return a;}
function lcmFn(a:number,b:number){return Math.abs(a*b)/gcdFn(a,b);}

function evaluate(expr:string,deg:boolean):string|number{
  try{
    let e=expr.replace(/÷/g,'/').replace(/×/g,'*').replace(/−/g,'-').replace(/π/g,String(Math.PI)).replace(/φ/g,'1.6180339887498948482').replace(/∞|Infinity/g,'Infinity').replace(/\be\b(?![+\-\d])/g,String(Math.E));
    const toR=(x:number)=>deg?x*Math.PI/180:x;
    const frR=(x:number)=>deg?x*180/Math.PI:x;
    e=e.replace(/sin⁻¹\(([^)]+)\)/g,(_,a)=>String(frR(Math.asin(+a))));
    e=e.replace(/cos⁻¹\(([^)]+)\)/g,(_,a)=>String(frR(Math.acos(+a))));
    e=e.replace(/tan⁻¹\(([^)]+)\)/g,(_,a)=>String(frR(Math.atan(+a))));
    e=e.replace(/sin\(([^)]+)\)/g,(_,a)=>String(Math.sin(toR(+a))));
    e=e.replace(/cos\(([^)]+)\)/g,(_,a)=>String(Math.cos(toR(+a))));
    e=e.replace(/tan\(([^)]+)\)/g,(_,a)=>String(Math.tan(toR(+a))));
    e=e.replace(/cot\(([^)]+)\)/g,(_,a)=>String(1/Math.tan(toR(+a))));
    e=e.replace(/sec\(([^)]+)\)/g,(_,a)=>String(1/Math.cos(toR(+a))));
    e=e.replace(/csc\(([^)]+)\)/g,(_,a)=>String(1/Math.sin(toR(+a))));
    e=e.replace(/sinh\(([^)]+)\)/g,(_,a)=>String(Math.sinh(+a)));
    e=e.replace(/cosh\(([^)]+)\)/g,(_,a)=>String(Math.cosh(+a)));
    e=e.replace(/tanh\(([^)]+)\)/g,(_,a)=>String(Math.tanh(+a)));
    e=e.replace(/coth\(([^)]+)\)/g,(_,a)=>String(1/Math.tanh(+a)));
    e=e.replace(/sech\(([^)]+)\)/g,(_,a)=>String(1/Math.cosh(+a)));
    e=e.replace(/csch\(([^)]+)\)/g,(_,a)=>String(1/Math.sinh(+a)));
    e=e.replace(/log₂\(([^)]+)\)/g,(_,a)=>String(Math.log2(+a)));
    e=e.replace(/log\(([^)]+)\)/g,(_,a)=>String(Math.log10(+a)));
    e=e.replace(/ln\(([^)]+)\)/g,(_,a)=>String(Math.log(+a)));
    e=e.replace(/10ˣ\(([^)]+)\)/g,(_,a)=>String(Math.pow(10,+a)));
    e=e.replace(/eˣ\(([^)]+)\)/g,(_,a)=>String(Math.exp(+a)));
    e=e.replace(/2ˣ\(([^)]+)\)/g,(_,a)=>String(Math.pow(2,+a)));
    e=e.replace(/∛\(([^)]+)\)/g,(_,a)=>String(Math.cbrt(+a)));
    e=e.replace(/√\(([^)]+)\)/g,(_,a)=>String(Math.sqrt(+a)));
    e=e.replace(/\|x\|\(([^)]+)\)/g,(_,a)=>String(Math.abs(+a)));
    e=e.replace(/\|([^|]+)\|/g,(_,a)=>String(Math.abs(+a)));
    e=e.replace(/nCr\(([^,)]+),([^)]+)\)/g,(_,n,r)=>String(comb(+n,+r)));
    e=e.replace(/nPr\(([^,)]+),([^)]+)\)/g,(_,n,r)=>String(perm(+n,+r)));
    e=e.replace(/gcd\(([^,)]+),([^)]+)\)/g,(_,a,b)=>String(gcdFn(+a,+b)));
    e=e.replace(/lcm\(([^,)]+),([^)]+)\)/g,(_,a,b)=>String(lcmFn(+a,+b)));
    e=e.replace(/(\d+(?:\.\d+)?)!/g,(_,p)=>String(fact(+p)));
    e=e.replace(/(\d+(?:\.\d+)?)%of(\d+(?:\.\d+)?)/g,(_,a,b)=>String(+a/100*+b));
    e=e.replace(/(\d+(?:\.\d+)?)%/g,'($1/100)');
    e=e.replace(/⌊([^⌋]+)⌋/g,(_,a)=>String(Math.floor(+a)));
    e=e.replace(/⌈([^⌉]+)⌉/g,(_,a)=>String(Math.ceil(+a)));
    e=e.replace(/(\d+(?:\.\d+)?)\^(\d+(?:\.\d+)?)/g,'($1**$2)');
    const r=(0,eval)(e);
    if(typeof r!=='number')return String(r);
    if(!isFinite(r))return r===Infinity?'∞':r===-Infinity?'-∞':'Error';
    if(isNaN(r))return 'Error';
    return Number.isInteger(r)?r:parseFloat(r.toFixed(10));
  }catch{return 'Error';}
}

function resFontSize(s:string){const l=s.length;if(l>15)return 28;if(l>11)return 36;if(l>8)return 46;return 56;}
function exprFontSize(s:string){const l=s.length;if(l>32)return 11;if(l>22)return 13;return 15;}

interface Props{history:string[];onAdd:(id:string,entry:string)=>void;onClear?:(id:string)=>void;}

export default function GeneralCalc({history,onAdd,onClear}:Props){
  const{t,lang}=useLang();
  const{isDark}=useTheme();

  // ── KEY FIX: Display is always dark (like a real calculator screen).
  // TEXT_ANS must always be bright — never dark text on dark background.
  // Dark mode: near-white lavender. Light mode: pure white (was #1a0050 — invisible!).
  const{CALC_BG,DISP_BG,BTN_SCI,BTN_NUM,BTN_DEL,BTN_FN,BORDER_SCI,BORDER_NUM,TEXT_SCI,TEXT_NUM,TEXT_DIM,TEXT_ANS,DIVIDER}=isDark
    ?{CALC_BG:CALC_BG_DARK,DISP_BG:DISP_BG_DARK,BTN_SCI:'#2a2038',BTN_NUM:'#252530',BTN_DEL:'#2a1010',BTN_FN:'#1e1e2a',BORDER_SCI:'#3d2d6a',BORDER_NUM:'#32323e',TEXT_SCI:'#a78bfa',TEXT_NUM:'#e8e7f0',TEXT_DIM:'#6b6780',TEXT_ANS:'#f0eeff',DIVIDER:'#2e2e40'}
    :{CALC_BG:CALC_BG_LIGHT,DISP_BG:DISP_BG_LIGHT,BTN_SCI:'#ede9ff',BTN_NUM:'#e8e8f0',BTN_DEL:'#fde8e8',BTN_FN:'#ede9ff',BORDER_SCI:'#d8d0ff',BORDER_NUM:'#d8d8e8',TEXT_SCI:'#6d28d9',TEXT_NUM:'#1e1b2e',TEXT_DIM:'#c4b5fd',TEXT_ANS:'#ffffff',DIVIDER:'#d0cce8'};

  const bn=lang==='bn';
  const[expr,setExpr]=useState('');
  const[result,setResult]=useState<string|number|null>(null);
  const[sci,setSci]=useState(false);
  const[deg,setDeg]=useState(true);
  const[tab,setTab]=useState('Algebra');
  const[activeOp,setActiveOp]=useState<string|null>(null);
  const[histOpen,setHistOpen]=useState(false);
  const dispRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(dispRef.current)dispRef.current.scrollLeft=dispRef.current.scrollWidth;},[expr]);

  const ap=(v:string)=>{setExpr(e=>e+v);setActiveOp(null);};
  const del=()=>{setExpr(e=>e.slice(0,-1));setResult(null);};
  const clr=()=>{setExpr('');setResult(null);setActiveOp(null);};
  const calc=()=>{
    if(!expr.trim())return;
    const r=evaluate(expr,deg);
    setResult(r);
    onAdd('general',`${expr} = ${r}`);
  };
  const handleSci=(key:SciKey)=>{if(key.unsupported){return;}if(key.token==='__DEG'){setDeg(true);return;}if(key.token==='__RAD'){setDeg(false);return;}ap(key.token);};
  const handleNum=(key:NumKey)=>{if(key.type==='eq'||key.label==='='){calc();return;}if(key.label==='AC'){clr();return;}if(key.label==='⌫'){del();return;}if(key.label==='+/−'){setExpr(e=>e.startsWith('-')?e.slice(1):'-'+e);return;}if(key.type==='op')setActiveOp(key.label);ap(key.label);};
  const bp=(e:any)=>{e.currentTarget.style.transform='scale(0.91)';e.currentTarget.style.opacity='0.75';};
  const br=(e:any)=>{e.currentTarget.style.transform='';e.currentTarget.style.opacity='1';};

  const displayVal=result!==null?String(result):(expr||'0');
  const showExpr=result!==null&&!!expr;
  const tabs=Object.keys(TAB_ROWS);
  const rows=sci?TAB_ROWS[tab]:null;
  // Responsive button height based on screen size
  const btnH=sci?Math.max(40,Math.min(56,window.innerHeight*0.065)):Math.max(54,Math.min(72,window.innerHeight*0.085));
  const numFs=sci?20:26;
  const opFs=sci?22:28;
  const fnFs=sci?16:19;
  const sciFs=(label:string)=>{if(label.length>=5)return 11;if(label.length===4)return 13;return 15;};
  const histCount=history.length;

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:sci?CALC_BG:DISP_BG}}>

      {/* ── Display area — always dark background ── */}
      <div style={{background:DISP_BG,flexShrink:0,minHeight:sci?72:110,maxHeight:sci?'20vh':'28vh',display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:'10px 16px 8px',overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <button onClick={()=>setSci(s=>!s)} style={{background:sci?'#2d1a4a':'#2c2c3a',border:`1.5px solid ${sci?'#7c3aed':'#3a3a4a'}`,color:sci?'#c4b5fd':'#8888aa',borderRadius:22,padding:'6px 14px',fontSize:12,fontWeight:800,fontFamily:'inherit',cursor:'pointer'}}>
            {sci?(bn?'সাধারণ':'Basic'):(bn?'বৈজ্ঞানিক':'Scientific')}
          </button>
          {sci&&(
            <button onClick={()=>setDeg(d=>!d)} style={{background:deg?'#0a2520':'#2c2c3a',border:`1.5px solid ${deg?'#16a34a':'#3a3a4a'}`,color:deg?'#4ade80':'#8888aa',borderRadius:22,padding:'6px 14px',fontSize:12,fontWeight:800,fontFamily:'inherit',cursor:'pointer'}}>
              {deg?'DEG':'RAD'}
            </button>
          )}
        </div>
        {/* Expression (previous input) — soft lavender, always visible on dark bg */}
        {showExpr&&<div style={{color:'#b0a0e8',fontSize:exprFontSize(expr),textAlign:'right',fontFamily:"'Inter',monospace",lineHeight:1.4,wordBreak:'break-all',marginBottom:4}}>{expr}</div>}
        {/* Main number — fontWeight 400 (typing) / 300 (result), with glow */}
        <div ref={dispRef} style={{color:result!==null&&String(result)==='Error'?'#ff453a':TEXT_ANS,fontSize:resFontSize(displayVal),fontWeight:result!==null?300:400,textAlign:'right',lineHeight:1.05,letterSpacing:-1,overflow:'hidden',whiteSpace:'nowrap',fontFamily:"'Inter',sans-serif",transition:'font-size 0.12s',textShadow:`0 0 18px ${TEXT_ANS}44`}}>{displayVal}</div>
      </div>

      {/* ── Calculator body ── */}
      <div style={{flex:1,background:CALC_BG,display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0}}>
        {sci&&(
          <div style={{display:'flex',borderBottom:`1.5px solid #d8d0ff`,background:CALC_BG,flexShrink:0}}>
            {tabs.map(t2=>{
              const active=tab===t2,col=TAB_COLORS[t2]||'#7c3aed';
              return(
                <button key={t2} onClick={()=>setTab(t2)} style={{flex:1,padding:'11px 4px',background:'transparent',color:active?col:'#9090b0',border:'none',borderBottom:`2.5px solid ${active?col:'transparent'}`,marginBottom:'-1.5px',fontSize:12,fontWeight:active?800:600,fontFamily:'inherit',cursor:'pointer',transition:'all 0.15s'}}>
                  {t2}
                </button>
              );
            })}
          </div>
        )}

        <div style={{flex:1,padding:'8px 10px 4px',display:'flex',flexDirection:'column',gap:6,overflow:'hidden',minHeight:0}}>
          {sci&&rows?(
            rows.map((row,ri)=>(
              <div key={ri} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 3px 1fr 1fr 1fr 1fr',gap:6,flex:1,minHeight:0}}>
                {row.sci.map((key,ki)=>{
                  const col=key.color||TEXT_SCI,isSpecial=key.label==='AC'||key.label==='⌫',isUnsupported=!!key.unsupported;
                  return(<button key={ki} title={isUnsupported?'Not yet supported':undefined} onClick={()=>handleSci(key)} onMouseDown={isUnsupported?undefined:bp} onMouseUp={isUnsupported?undefined:br} onTouchStart={isUnsupported?undefined:bp} onTouchEnd={isUnsupported?undefined:br} style={{background:isSpecial?BTN_DEL:BTN_SCI,color:isSpecial?'#dc2626':isUnsupported?TEXT_DIM:col,border:`1.5px solid ${isSpecial?'#fca5a5':BORDER_SCI}`,borderRadius:14,height:btnH,fontSize:sciFs(key.label),fontWeight:700,fontFamily:"'Inter','Noto Serif Bengali',sans-serif",cursor:isUnsupported?'not-allowed':'pointer',opacity:isUnsupported?0.4:1,transition:'transform 0.08s,opacity 0.08s',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',boxShadow:'0 1px 3px rgba(100,80,180,0.1)'}}>{key.label}</button>);
                })}
                <div style={{background:DIVIDER,borderRadius:2,margin:'6px 0'}}/>
                {row.num.map((key,ki)=>{
                  const isEq=key.type==='eq',isOp=key.type==='op',isFn=key.type==='fn',isDel=key.type==='del',isAct=activeOp===key.label;
                  const bg=isEq?BTN_EQ:isDel?BTN_DEL:isFn?BTN_FN:BTN_NUM;
                  const fc=isEq?'#fff':isDel?'#dc2626':isFn?'#6d28d9':isOp?(isAct?'#fff':TEXT_OP):TEXT_NUM;
                  const brd=isEq?'none':isDel?`1.5px solid #fca5a5`:isFn?`1.5px solid ${BORDER_SCI}`:`1.5px solid ${BORDER_NUM}`;
                  const fs=isEq?22:isOp?opFs:isFn?fnFs:numFs,fw=isEq?800:isOp?600:isFn?700:400;
                  return(<button key={ki} onClick={()=>handleNum(key)} onMouseDown={bp} onMouseUp={br} onTouchStart={bp} onTouchEnd={br} style={{background:bg,color:fc,border:brd,borderRadius:14,height:btnH,fontSize:fs,fontWeight:fw,fontFamily:"'Inter',sans-serif",cursor:'pointer',transition:'transform 0.08s,opacity 0.08s',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:isEq?'0 4px 18px #7c3aed55':'0 1px 3px rgba(0,0,0,0.08)',overflow:'hidden',minWidth:0}}>{key.label}</button>);
                })}
              </div>
            ))
          ):(
            BASIC_ROWS.map((row,ri)=>(
              <div key={ri} style={{display:'flex',gap:10,flex:1,minHeight:0}}>
                {row.map((key,ki)=>{
                  const isEq=key.type==='eq',isOp=key.type==='op',isFn=key.type==='fn',isDel=key.type==='del',isZero=key.type==='zero',isAct=activeOp===key.label;
                  const bg=isEq?BTN_EQ:isOp?(isAct?TEXT_OP:BTN_FN):isFn?BTN_FN:BTN_NUM;
                  const fc=isEq?'#fff':isOp?(isAct?'#fff':TEXT_OP):isFn?TEXT_SCI:TEXT_NUM;
                  const fs=isEq?28:isOp?opFs:isFn?fnFs:numFs,fw=isEq?800:isOp?600:isFn?600:400;
                  return(<button key={ki} onClick={()=>handleNum(key)} onMouseDown={bp} onMouseUp={br} onTouchStart={bp} onTouchEnd={br} style={{flex:isZero?2.18:1,height:btnH,background:bg,color:fc,border:`1.5px solid ${isEq?'transparent':isOp?`${TEXT_OP}30`:BORDER_NUM}`,borderRadius:btnH/2,fontSize:fs,fontWeight:fw,fontFamily:"'Inter',sans-serif",cursor:'pointer',display:'flex',alignItems:'center',justifyContent:isZero?'flex-start':'center',paddingLeft:isZero?Math.floor(btnH*0.38):0,boxShadow:isEq?'0 4px 20px #7c3aed55':'0 1px 4px rgba(0,0,0,0.08)',transition:'transform 0.08s,opacity 0.08s,background 0.1s',minWidth:0,overflow:'hidden'}}>{key.label}</button>);
                })}
              </div>
            ))
          )}
        </div>

        {sci&&(
          <div style={{padding:'2px 14px 4px',fontSize:10,color:'#9090b0',lineHeight:1.5,flexShrink:0}}>
            {tab==='Calculus'   &&'d/dx(x*x,x,3) | integral(x*x,x,0,1) | sum(x,x,1,10)'}
            {tab==='Trigonometry'&&`${deg?'Degrees':'Radians'} mode | sin(30)${deg?' = 0.5':''}`}
            {tab==='Algebra'   &&'x,y variables | nCr(10,3) | log(100) = 2'}
            {tab==='Hyperbolic'&&'sinh(1) | cosh(0) = 1 | tanh(inf) = 1'}
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div style={{flexShrink:0,background:'var(--surface)',borderTop:'1px solid var(--border)',padding:'10px 12px',paddingBottom:'max(env(safe-area-inset-bottom,0px),10px)',display:'flex',gap:8}}>
        <button
          onClick={()=>result!==null&&result!=='Error'&&shareWA(buildShare('Calc',[`${expr} = ${result}`]))}
          disabled={result===null||result==='Error'}
          style={{flex:1,padding:'14px 0',background:result!==null&&result!=='Error'?'#0d2e18':'var(--surface)',color:result!==null&&result!=='Error'?'#25d366':'var(--text4)',border:`2px solid ${result!==null&&result!=='Error'?'#25d36640':'var(--border)'}`,borderRadius:13,fontSize:15,fontWeight:800,fontFamily:'inherit',cursor:result!==null&&result!=='Error'?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',gap:7,opacity:result!==null&&result!=='Error'?1:0.4,transition:'all 0.18s'}}>
          <FaShareAlt size={14}/> {bn?'শেয়ার':'Share'}
        </button>
        <button onClick={()=>setHistOpen(o=>!o)} style={{width:52,flexShrink:0,padding:'14px 0',background:histOpen?'#2d1a4a':'var(--surface)',color:histCount>0?'#7c3aed':'var(--text3)',border:`2px solid ${histCount>0?'#7c3aed55':'var(--border)'}`,borderRadius:13,cursor:'pointer',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.18s'}}>
          <FaHistory size={17}/>
          {histCount>0&&<span style={{position:'absolute',top:4,right:4,background:'#7c3aed',color:'#fff',borderRadius:6,fontSize:8,fontWeight:900,padding:'1px 4px',minWidth:14,height:14,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace'}}>{histCount>99?'99+':histCount}</span>}
        </button>
      </div>

      {histOpen&&<div onClick={()=>setHistOpen(false)} style={{position:'absolute',inset:0,zIndex:299,background:'rgba(0,0,0,0.45)'}}/>}

      {histOpen&&(
        <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:300,background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:'18px 18px 0 0',padding:'16px 16px 24px',maxHeight:'55%',display:'flex',flexDirection:'column',boxShadow:'0 -8px 40px rgba(0,0,0,0.6)'}}>
          <div style={{width:36,height:4,borderRadius:2,background:'var(--border)',margin:'0 auto 14px'}}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <FaHistory size={13} color="#7c3aed"/>
              <span style={{fontWeight:800,fontSize:14,color:'var(--text)'}}>{t.history} ({histCount})</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              {histCount>0&&<button onClick={()=>onClear?.('general')} style={{background:'#2a0a0a',color:'#e74c3c',border:'none',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:700,fontFamily:'inherit',cursor:'pointer',display:'flex',alignItems:'center',gap:5}}><FaTrash size={11}/>{t.clearHistory}</button>}
              <button onClick={()=>setHistOpen(false)} style={{background:'var(--bg)',border:'1.5px solid var(--border)',borderRadius:8,padding:'6px 10px',color:'var(--text3)',cursor:'pointer',fontSize:12,fontFamily:'inherit',fontWeight:700,display:'flex',alignItems:'center',gap:5}}><FaChevronDown size={10}/>Close</button>
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto',scrollbarWidth:'thin',scrollbarColor:'#7c3aed40 transparent'} as React.CSSProperties}>
            {histCount===0?<div style={{textAlign:'center',color:'var(--text3)',padding:'24px 0',fontSize:14}}>No history yet</div>:
              [...history].reverse().map((item,i)=>(
                <div key={i} style={{fontSize:13,padding:'9px 4px',borderBottom:i<histCount-1?'1px solid var(--border)':'none',color:i===0?'var(--text)':'var(--text3)',lineHeight:1.55,wordBreak:'break-word',fontWeight:i===0?600:400}}>
                  {i===0&&<span style={{fontSize:9,fontWeight:800,color:'#7c3aed',background:'#7c3aed18',borderRadius:4,padding:'1px 5px',marginRight:6,letterSpacing:0.5}}>LATEST</span>}
                  {item}
                </div>
              ))
            }
          </div>
        </div>
      )}

      <style>{`@keyframes shellSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}