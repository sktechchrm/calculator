import { FaWhatsapp, FaCode, FaCalculator, FaShieldAlt, FaMobileAlt, FaGlobe, FaEnvelope } from 'react-icons/fa';
import { useLang } from '../context/LangContext.tsx';

const WHATSAPP = '8801732484884';

const OBJECTIVES = {
  bn: [
    { icon:'🧮', title:'সাধারণ ও বৈজ্ঞানিক ক্যালকুলেটর', desc:'ত্রিকোণমিতি, লগারিদম, বর্গমূল সহ সম্পূর্ণ বৈজ্ঞানিক গণনা।' },
    { icon:'💰', title:'আর্থিক হিসাব', desc:'ব্যাংক ঋণের কিস্তি (EMI), VAT/মূসক, শেয়ার বাজারের লাভ-ক্ষতি।' },
    { icon:'⚕️', title:'স্বাস্থ্য হিসাব', desc:'BMI, দৈনিক ক্যালরি, বয়স নির্ণয় — সুস্থ জীবনযাপনে সহায়ক।' },
    { icon:'👔', title:'গার্মেন্টস সমাধান', desc:'পোশাকের মাপ, প্যাটার্ন তৈরি, সাইজ চার্ট — বাংলাদেশের গার্মেন্টস শিল্পের জন্য।' },
    { icon:'🏞️', title:'বাংলাদেশ ভূমি মাপ', desc:'কাঠা, বিঘা, কানি, ছটাক, আনা সহ সব সরকারি ভূমি একক।' },
    { icon:'⚖️', title:'বাংলাদেশ ওজন মাপ', desc:'মণ, সের, পোয়া, ছটাক — ঐতিহ্যবাহী ও আধুনিক ওজনের মূল্য হিসাব।' },
    { icon:'📐', title:'একক রূপান্তর', desc:'দৈর্ঘ্য, ওজন, তাপমাত্রা, ক্ষেত্রফল, আয়তন, গতি — সব এককে রূপান্তর।' },
    { icon:'🌐', title:'দ্বিভাষিক সমর্থন', desc:'বাংলা ও ইংরেজি — দুটি ভাষায় সম্পূর্ণ অ্যাপ ব্যবহার করুন।' },
  ],
  en: [
    { icon:'🧮', title:'General & Scientific Calculator', desc:'Full scientific computation including trigonometry, logarithms, roots, and more.' },
    { icon:'💰', title:'Financial Calculators', desc:'Bank loan EMI, VAT/tax, and share market profit/loss calculations.' },
    { icon:'⚕️', title:'Health Calculators', desc:'BMI, daily calorie needs, and age calculator for a healthy lifestyle.' },
    { icon:'👔', title:'Garments Industry Tools', desc:'Clothing measurements, pattern generation, and size charts for Bangladesh garments industry.' },
    { icon:'🏞️', title:'Bangladesh Land Measurement', desc:'All official BD land units: Katha, Bigha, Kani, Chattak, Aana, Ganda, Acre.' },
    { icon:'⚖️', title:'Bangladesh Weight & Price', desc:'Traditional BD weights (Maund, Seer, Powa) with price calculation per kg.' },
    { icon:'📐', title:'Unit Converter', desc:'Convert between length, weight, temperature, area, volume, and speed units.' },
    { icon:'🌐', title:'Bilingual Support', desc:'Full app available in both Bangla (বাংলা) and English — switch anytime.' },
  ],
};

export default function SupportScreen() {
  const { lang, toggle } = useLang();
  const bn = lang === 'bn';
  const objs = OBJECTIVES[lang];

  const openWhatsApp = () => {
    const msg = encodeURIComponent(bn
      ? 'আসসালামু আলাইকুম, Mario Smart Calculator থেকে সাপোর্টের জন্য যোগাযোগ করছি।'
      : 'Hello, I am contacting for support regarding Mario Smart Calculator.');
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) window.location.href = `whatsapp://send?phone=${WHATSAPP}&text=${msg}`;
    else window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank');
  };

  return (
    <div style={{
      background: '#111113', minHeight: '100%',
      paddingBottom: 80,
    }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a0a0f 0%, #2d0f1a 50%, #1a0a0f 100%)',
        padding: '24px 20px 20px',
        borderBottom: '1px solid #c41e3a30',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:-30, right:-20, width:120, height:120, background:'#c41e3a08', borderRadius:'50%' }}/>
        <div style={{ position:'absolute', bottom:-20, left:-10, width:80, height:80, background:'#d4a01708', borderRadius:'50%' }}/>

        <div style={{ fontSize:36, marginBottom:10 }}>🍄</div>
        <div style={{ fontFamily:"'Press Start 2P', monospace", color:'#e8e8e8', fontSize:11, letterSpacing:2, marginBottom:4 }}>
          MARIO SMART CALCULATOR
        </div>
        <div style={{ fontSize:13, color:'#a8a4b8', fontWeight:500, marginBottom:16, lineHeight:1.5 }}>
          {bn ? '১৩টি স্মার্ট ক্যালকুলেটর — একটি অ্যাপে' : '13 Smart Calculators in One App'}
        </div>

        {/* Developer badge */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8,
          background:'#c41e3a18', border:'1px solid #c41e3a40',
          borderRadius:20, padding:'8px 14px',
        }}>
          <FaCode size={14} color="#c41e3a"/>
          <div>
            <div style={{ fontSize:9, color:'#6b6780', fontWeight:600, letterSpacing:0.5 }}>
              {bn?'ডেভেলপড বাই':'DEVELOPED BY'}
            </div>
            <div style={{ fontSize:13, color:'#e8e8e8', fontWeight:800 }}>SK BD TECHNOLOGY</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'16px 16px 0' }}>
        {/* WhatsApp Support button */}
        <button onClick={openWhatsApp} style={{
          width:'100%', padding:'16px 20px',
          background:'linear-gradient(135deg, #25d366, #128c7e)',
          color:'#fff', border:'none', borderRadius:16,
          fontSize:15, fontWeight:800, fontFamily:'inherit', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:10,
          boxShadow:'0 6px 24px rgba(37,211,102,0.3)',
          marginBottom:20,
          letterSpacing:0.3,
        }}>
          <FaWhatsapp size={22}/>
          {bn ? 'WhatsApp-এ সাপোর্ট নিন' : 'Get WhatsApp Support'}
        </button>

        {/* Contact info cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
          {[
            { icon:<FaWhatsapp size={16} color="#25d366"/>, label:bn?'WhatsApp':'WhatsApp', val:'01732 484884', action:openWhatsApp },
            { icon:<FaMobileAlt size={16} color="#d4a017"/>, label:bn?'ফোন':'Phone', val:'01732 484884', action:()=>{ window.location.href='tel:+8801732484884'; } },
            { icon:<FaGlobe size={16} color="#8e44ad"/>, label:bn?'ডেভেলপার':'Developer', val:'Saiful Islam', action:undefined },
            { icon:<FaShieldAlt size={16} color="#27ae60"/>, label:bn?'সংস্করণ':'Version', val:'v2.0.0', action:undefined },
          ].map((item,i) => (
            <div key={i} onClick={item.action}
              style={{
                background:'#1a1a1e', border:'1px solid #2e2e38',
                borderRadius:12, padding:'12px 10px',
                cursor: item.action ? 'pointer' : 'default',
                display:'flex', flexDirection:'column', gap:6,
                transition:'border-color 0.15s',
              }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {item.icon}
                <span style={{ fontSize:10, color:'#6b6780', fontWeight:600 }}>{item.label}</span>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:'#e8e8e8' }}>{item.val}</div>
            </div>
          ))}
        </div>

        {/* App objectives */}
        <div style={{ fontSize:11, fontWeight:800, color:'#a8a4b8', letterSpacing:0.8, textTransform:'uppercase', marginBottom:12 }}>
          {bn ? 'অ্যাপের উদ্দেশ্য' : 'App Objectives'}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
          {objs.map((obj,i) => (
            <div key={i} style={{
              background:'#1a1a1e', border:'1px solid #2e2e38',
              borderRadius:12, padding:'12px 14px',
              display:'flex', gap:12, alignItems:'flex-start',
              animation:`slideUp 0.3s ease ${i*0.05}s both`,
            }}>
              <span style={{ fontSize:20, flexShrink:0, lineHeight:1.2 }}>{obj.icon}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:800, color:'#e8e8e8', marginBottom:3 }}>{obj.title}</div>
                <div style={{ fontSize:11, color:'#6b6780', lineHeight:1.55 }}>{obj.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* App features */}
        <div style={{ fontSize:11, fontWeight:800, color:'#a8a4b8', letterSpacing:0.8, textTransform:'uppercase', marginBottom:12 }}>
          {bn ? 'বৈশিষ্ট্যসমূহ' : 'Key Features'}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:24 }}>
          {([
            ['💾', bn?'ইতিহাস সংরক্ষণ':'History Saved'],
            ['📤', bn?'WhatsApp শেয়ার':'WhatsApp Share'],
            ['🌐', bn?'বাংলা ও ইংরেজি':'Bangla & English'],
            ['📱', bn?'মোবাইল বান্ধব':'Mobile Friendly'],
            ['🔢', bn?'১৩টি ক্যালকুলেটর':'13 Calculators'],
            ['🇧🇩', bn?'বাংলাদেশ স্ট্যান্ডার্ড':'BD Standards'],
          ] as [string,string][]).map(([icon,label])=>(
            <div key={label} style={{
              background:'#1a1a1e', border:'1px solid #2e2e38',
              borderRadius:10, padding:'10px 12px',
              display:'flex', alignItems:'center', gap:8,
              fontSize:12, color:'#a8a4b8', fontWeight:600,
            }}>
              <span style={{ fontSize:16 }}>{icon}</span>{label}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', padding:'0 0 12px' }}>
          <div style={{ fontSize:11, color:'#6b6780', marginBottom:6 }}>
            <span style={{ color:'#c41e3a', fontWeight:700 }}>SK BD TECHNOLOGY</span>
          </div>
          <div style={{ fontSize:10, color:'#3a3a48' }}>
            {bn?'সর্বস্বত্ব সংরক্ষিত © ২০২৬':'All Rights Reserved © 2026'}
          </div>
        </div>
      </div>
    </div>
  );
}
