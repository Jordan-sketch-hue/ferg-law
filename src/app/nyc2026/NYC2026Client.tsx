"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Lock, MessageCircle, Shield, Receipt, Smartphone } from "lucide-react";

type Segment = "hot" | "warm" | "cold";
interface QuizAnswer { q0?:number;q1?:number;q2?:number;q3?:number;q4?:number;q5?:number; }

const GOLD = "#C8A65C";
const GOLD_DEEP = "#A8853E";
const GOLD_LIGHT = "#DFC07A";
const INK = "#0E0C08";
const INK2 = "#141208";
const INK_CARD = "#0C1510";
const GREEN = "#102A1E";
const GREEN_MID = "#17402D";
const PAPER = "#F6F2EA";
const MUTED = "#8A8A82";

const STAGE_LABELS = ["Client onboarding completed","Agreement reviewed & signed","Title investigation completed","Completion arrangements underway","Registration & closing report"];

const QUIZ_QUESTIONS = [
  { q: "When are you looking to purchase property in Jamaica?", opts: ["Within 6 months","6–18 months","2–5 years","Just exploring"], pts: [40,20,5,0] },
  { q: "Have you identified a specific property or area?", opts: ["Yes — specific property","Yes — specific area","Researching options","Not yet"], pts: [20,15,8,0] },
  { q: "How is your financing currently structured?", opts: ["Cash ready / mortgage approved","Working on financing","Need to arrange it","Unsure"], pts: [20,12,5,0] },
  { q: "What is your primary purpose for purchasing?", opts: ["Primary home","Vacation / rental income","Retirement planning","Investment portfolio"], pts: [10,10,5,10] },
  { q: "Have you worked with a Jamaican attorney before?", opts: ["Yes — previous transaction","No — but ready to start","No — want to learn first","No — first time buyer"], pts: [10,8,4,2] },
  { q: "What is driving your decision right now?", opts: ["Found the right property","Financial opportunity / rates","Family / life milestone","Long-term wealth building"], pts: [10,8,6,4] },
];

function computeScore(a:QuizAnswer):number {
  return Object.entries(a).reduce((s,[k,v])=>{const qi=parseInt(k.replace("q",""));return s+(QUIZ_QUESTIONS[qi]?.pts[v as number]??0);},0);
}
function getSegment(score:number):Segment { return score>=65?"hot":score>=35?"warm":"cold"; }

const SEG:Record<Segment,{label:string;headline:string;sub:string;cta:string;href:string;color:string}> = {
  hot:  { label:"Priority Buyer",  headline:"You are ready to move.",              sub:"Your profile matches our most active Diaspora buyers. Let's lock in a priority consultation before Nov 14.",              cta:"Book Priority Consultation",   href:"/booking?utm_source=qr&utm_campaign=nyc2026&segment=hot",  color:GOLD   },
  warm: { label:"Active Prospect", headline:"You are on the right path.",          sub:"Let's map your 90-day action plan and answer your biggest questions about Jamaican property law.",                               cta:"Schedule a Consultation",      href:"/booking?utm_source=qr&utm_campaign=nyc2026&segment=warm", color:"#7cb8e0" },
  cold: { label:"Future Buyer",    headline:"You are building toward something real.", sub:"Start with our free Buyer's Guide — it covers every step of a Jamaican property transaction end to end.", cta:"Get the Free Buyer's Guide", href:"/buyers-guide?utm_source=qr&utm_campaign=nyc2026&segment=cold", color:"#9eab8e" },
};

const HERO_SLIDES = [
  {type:"image" as const, src:"/nyc/hero-property.webp", alt:"Luxury property in Jamaica"},
  {type:"image" as const, src:"/img/home-kingston.webp", alt:"Home in Kingston Jamaica"},
  {type:"image" as const, src:"/nyc/ja-apartment.webp", alt:"Kingston apartment complex"},
  {type:"image" as const, src:"/img/jamaica-coast.webp", alt:"Jamaica coastline"},
];

const GALLERY_SLIDES = [
  {type:"image" as const, src:"/nyc/title-card.webp", alt:"Own a piece of Jamaica — Ferguson Law"},
  {type:"image" as const, src:"/nyc/from-deed-to-key.webp", alt:"From Deed to Key — Ferguson Law NYC Event"},
];

const goldPill: React.CSSProperties = {
  background: "rgba(200,166,92,0.08)",
  border: `1px solid ${GOLD}`,
  borderRadius: 20,
  padding: "4px 11px",
  fontSize: 10,
  color: GOLD,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
};

function PortalDemoStrip() {
  const [active,setActive]=useState(0);
  const iv = useRef<ReturnType<typeof setInterval>|null>(null);
  const videoRef = useRef<HTMLVideoElement|null>(null);
  const stripRef = useRef<HTMLDivElement|null>(null);
  const adv = useCallback(()=>setActive(p=>p<STAGE_LABELS.length-1?p+1:0),[]);
  useEffect(()=>{ iv.current=setInterval(adv,2800); return()=>{ if(iv.current)clearInterval(iv.current); }; },[adv]);

  useEffect(()=>{
    const vid = videoRef.current;
    if(!vid) return;
    const obs = new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting && entry.intersectionRatio >= 0.5){
        vid.play().catch(()=>{});
      } else {
        vid.pause();
      }
    },{threshold:0.5});
    obs.observe(vid);
    return ()=>obs.disconnect();
  },[]);

  const pct=Math.round(((active+1)/STAGE_LABELS.length)*100);
  // Removed "AI legal brief preview" — not a live feature
  const FEATS=[
    {Icon:Lock,l:"Encrypted document vault"},
    {Icon:MessageCircle,l:"Secure client-attorney messaging"},
    {Icon:Shield,l:"KYC & compliance tracking"},
    {Icon:Receipt,l:"Payment receipts & invoicing"},
    {Icon:Smartphone,l:"WhatsApp milestone alerts"},
  ];
  return (
    <div ref={stripRef} style={{background:`linear-gradient(145deg,${GREEN},#0a1810)`,border:"1px solid rgba(200,166,92,0.3)",borderRadius:20,overflow:"hidden",maxWidth:680,margin:"0 auto"}}>
      <div style={{background:`linear-gradient(135deg,${GREEN},${GREEN_MID})`,padding:"20px 24px",borderBottom:"1px solid rgba(200,166,92,0.12)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:11,color:GOLD,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Sample client matter</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.75)"}}>Residential property purchase &middot; Jamaica</div>
          </div>
          <span style={goldPill}>Live demo</span>
        </div>
      </div>
      <div style={{padding:"20px 24px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:600}}>Transaction progress</span>
          <span style={{fontSize:12,color:GOLD,fontWeight:700}}>{active+1} of {STAGE_LABELS.length} stages</span>
        </div>
        <div style={{height:4,background:"rgba(255,255,255,0.08)",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:99,background:`linear-gradient(90deg,${GOLD_DEEP},${GOLD})`,width:`${pct}%`,transition:"width 0.6s cubic-bezier(.4,0,.2,1)"}}/>
        </div>
      </div>
      <div style={{padding:"16px 24px 20px"}}>
        {STAGE_LABELS.map((label,i)=>{
          const done=i<active,cur=i===active;
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:i<STAGE_LABELS.length-1?12:0}}>
              <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:done?"#1a5c35":cur?"rgba(200,166,92,0.2)":"rgba(255,255,255,0.06)",border:done?"1.5px solid #2a8a4d":cur?`1.5px solid ${GOLD}`:"1.5px solid rgba(255,255,255,0.12)",color:done?"#4ade80":cur?GOLD:"rgba(255,255,255,0.3)",transition:"all 0.5s"}}>
                {done?"✓":cur?"●":"○"}
              </div>
              <span style={{fontSize:13,fontWeight:cur?600:400,color:done?"rgba(255,255,255,0.4)":cur?"#fff":"rgba(255,255,255,0.65)",textDecoration:done?"line-through":"none",transition:"color 0.5s"}}>{label}</span>
              {cur&&<span style={{marginLeft:"auto",fontSize:9,...goldPill,flexShrink:0}}>Active</span>}
            </div>
          );
        })}
      </div>
      <div style={{padding:"14px 24px 18px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {FEATS.map((f,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(200,166,92,0.06)",border:`1px solid ${GOLD}22`,borderRadius:12,padding:"10px 12px"}}>
            <f.Icon size={15} strokeWidth={1.8} color={GOLD_LIGHT} style={{flexShrink:0}}/>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.75)",lineHeight:1.3}}>{f.l}</span>
          </div>
        ))}
      </div>
      <div style={{padding:"14px 24px 20px",borderTop:"1px solid rgba(255,255,255,0.06)",textAlign:"center"}}>
        <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,0.35)",fontStyle:"italic",lineHeight:1.6}}>&ldquo;The distance between New York and Jamaica shouldn&apos;t mean you&apos;re in the dark about your property transaction.&rdquo;</p>
      </div>
    </div>
  );
}

function ReadinessQuiz({onDone}:{onDone:(seg:Segment,score:number)=>void}) {
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState<QuizAnswer>({});
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [phone,setPhone]=useState("");
  const [busy,setBusy]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [err,setErr]=useState("");
  const totalQ=QUIZ_QUESTIONS.length;
  function pick(optIdx:number) {
    const key=`q${step}` as keyof QuizAnswer;
    const next={...answers,[key]:optIdx};
    setAnswers(next);
    if(step<totalQ-1){setTimeout(()=>setStep(s=>s+1),220);}else{setStep(totalQ);}
  }
  async function submit() {
    if(!name.trim()||!email.trim()){setErr("Name and email are required.");return;}
    if(submitted||busy)return;
    setBusy(true);setErr("");
    const score=computeScore(answers);
    const seg=getSegment(score);
    try {
      const res=await fetch("/api/nyc/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({first_name:name.trim(),email:email.trim(),phone:phone.trim(),answers,score,segment:seg,source:"nyc2026-quiz"})});
      if(!res.ok){const d=await res.json() as {error?:string};throw new Error(d.error??"Submit failed");}
      setSubmitted(true);
      onDone(seg,score);
    } catch(e){setErr(e instanceof Error?e.message:"Something went wrong. Please try again.");}
    finally{setBusy(false);}
  }
  const pct=Math.round((step/totalQ)*100);
  const q=QUIZ_QUESTIONS[step];
  if(step<totalQ&&q) return (
    <div>
      <div style={{marginBottom:24}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:8,letterSpacing:1,textTransform:"uppercase"}}>
          <span>Question {step+1} of {totalQ}</span><span>{pct}% complete</span>
        </div>
        <div style={{height:2,background:"rgba(255,255,255,0.08)",borderRadius:99}}>
          <div style={{height:"100%",background:GOLD,borderRadius:99,width:`${pct}%`,transition:"width .4s"}}/>
        </div>
      </div>
      <h3 style={{fontSize:"clamp(16px,4vw,20px)",fontWeight:700,color:"#fff",margin:"0 0 20px",lineHeight:1.4}}>{q.q}</h3>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {q.opts.map((opt,i)=>(
          <button key={i} onClick={()=>pick(i)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(200,166,92,0.2)",borderRadius:12,padding:"14px 18px",textAlign:"left",color:"rgba(255,255,255,0.85)",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>{opt}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div>
      <div style={{marginBottom:24}}><div style={{height:2,background:GOLD,borderRadius:99}}/></div>
      <h3 style={{fontSize:"clamp(16px,4vw,20px)",fontWeight:700,color:"#fff",margin:"0 0 6px"}}>Where should we send your results?</h3>
      <p style={{color:"rgba(255,255,255,0.45)",fontSize:13,margin:"0 0 20px"}}>No spam. Your readiness score + next steps, that&apos;s it.</p>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {([["First name *",name,setName,"text","Jordan"],["Email address *",email,setEmail,"email","you@example.com"],["WhatsApp / phone (optional)",phone,setPhone,"tel","+1 212 555 0100"]] as [string,string,typeof setName,string,string][]).map(([label,val,set,type,ph])=>(
          <div key={label}>
            <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:5,letterSpacing:1,textTransform:"uppercase"}}>{label}</label>
            <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(200,166,92,0.2)",borderRadius:10,padding:"12px 14px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
        ))}
        {err&&<p style={{color:"#f87171",fontSize:13,margin:0}}>{err}</p>}
        <button onClick={()=>void submit()} disabled={busy} style={{background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,border:"none",borderRadius:12,padding:"15px 24px",color:INK,fontWeight:800,fontSize:15,cursor:busy?"not-allowed":"pointer",opacity:busy?0.7:1,fontFamily:"inherit"}}>
          {busy?"Submitting...":"Get My Readiness Score"}
        </button>
      </div>
    </div>
  );
}

function CostSlider() {
  const [price,setPrice]=useState(25000000);
  const [mode,setMode]=useState<"buyer"|"seller">("buyer");
  const [currency,setCurrency]=useState<"JMD"|"USD">("JMD");
  const USD_RATE=157;
  function fmt(n:number){
    if(currency==="USD"){const v=Math.round(n/USD_RATE);return"US$"+v.toLocaleString();}
    return"J$"+n.toLocaleString();
  }
  const buyerStampDuty=2500,buyerReg=price*0.0025,buyerAtty=price*0.0275,buyerSurv=price*0.0025,buyerVal=price*0.0025;
  const buyerTotal=buyerStampDuty+buyerReg+buyerAtty+buyerSurv+buyerVal;
  const sellerTax=price*0.02,sellerStampDuty=2500,sellerReg=price*0.0025,sellerAtty=price*0.0275;
  const sellerTotal=sellerTax+sellerStampDuty+sellerReg+sellerAtty;
  // [label, value, optional sub-note]
  type FeeRow=[string,number|string,string?];
  const STAMP_NOTE="half of J$5,000 (fixed statutory fee) · each party pays their share";
  const REG_NOTE="0.25% each (0.5% split equally) · each party pays their share";
  const ATTY_NOTE="~2.5–3% of selling price · each party pays their own Attorney’s fees";
  const SURV_NOTE="~0.2–0.3% of selling price";
  const SHARE_NOTE="Set by Seller’s Attorney · split equally · each party pays their share";
  const buyerRows:FeeRow[]=[
    ["Stamp Duty",buyerStampDuty,STAMP_NOTE],
    ["Registration Fee",buyerReg,REG_NOTE],
    ["Attorney’s Fees",buyerAtty,ATTY_NOTE],
    ["Surveyor’s Fee",buyerSurv,SURV_NOTE],
    ["Valuator’s Fee",buyerVal,SURV_NOTE],
    ["Agreement for Sale (Drafting)","—",SHARE_NOTE],
    ["Letter of Possession & Letters of Introduction","—",SHARE_NOTE],
    ["Sundries (correspondence, bearer etc.)","—",SHARE_NOTE],
  ];
  const sellerRows:FeeRow[]=[
    ["Transfer Tax",sellerTax,"2% of selling price"],
    ["Stamp Duty",sellerStampDuty,STAMP_NOTE],
    ["Registration Fee",sellerReg,REG_NOTE],
    ["Attorney’s Fees",sellerAtty,ATTY_NOTE],
    ["Agreement for Sale (Drafting)","—",SHARE_NOTE],
    ["Letter of Possession & Letters of Introduction","—",SHARE_NOTE],
    ["Sundries (correspondence, bearer etc.)","—",SHARE_NOTE],
  ];
  const rows=mode==="buyer"?buyerRows:sellerRows;
  const total=mode==="buyer"?buyerTotal:sellerTotal;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <div style={{display:"flex",background:"rgba(255,255,255,0.06)",borderRadius:10,padding:4,gap:4,flex:1}}>
          <button onClick={()=>setMode("buyer")} style={{flex:1,background:mode==="buyer"?GOLD_DEEP:"transparent",border:"none",borderRadius:7,padding:"10px",color:mode==="buyer"?"#fff":GOLD_DEEP,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}>Buyer</button>
          <button onClick={()=>setMode("seller")} style={{flex:1,background:mode==="seller"?GOLD_DEEP:"transparent",border:"none",borderRadius:7,padding:"10px",color:mode==="seller"?"#fff":GOLD_DEEP,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}>Seller</button>
        </div>
        <div style={{display:"flex",background:"rgba(255,255,255,0.06)",borderRadius:10,padding:4,gap:4}}>
          <button onClick={()=>setCurrency("JMD")} style={{background:currency==="JMD"?GOLD_DEEP:"transparent",border:"none",borderRadius:7,padding:"10px 14px",color:currency==="JMD"?"#fff":GOLD_DEEP,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}>JMD</button>
          <button onClick={()=>setCurrency("USD")} style={{background:currency==="USD"?GOLD_DEEP:"transparent",border:"none",borderRadius:7,padding:"10px 14px",color:currency==="USD"?"#fff":GOLD_DEEP,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}>USD</button>
        </div>
      </div>
      <div>
        <label style={{fontSize:11,color:GOLD_LIGHT,fontWeight:700,letterSpacing:2,textTransform:"uppercase",display:"block",marginBottom:10}}>Property value: {fmt(price)}</label>
        <input type="range" min={5000000} max={150000000} step={500000} value={price} onChange={e=>setPrice(Number(e.target.value))} style={{width:"100%",accentColor:GOLD_DEEP,cursor:"pointer"}}/>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:MUTED,marginTop:4}}><span>{currency==="USD"?"US$32k":"J$5M"}</span><span>{currency==="USD"?"US$955k":"J$150M"}</span></div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {rows.map(([label,val,sub])=>(
          <div key={label as string} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"10px 14px",background:"rgba(255,255,255,0.04)",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.65)"}}>{label as string}</div>
              {sub&&<div style={{fontSize:10,color:GOLD_LIGHT,marginTop:3,lineHeight:1.4,opacity:0.85}}>{sub}</div>}
            </div>
            <span style={{fontSize:13,fontWeight:700,color:typeof val==="string"?MUTED:"#fff",fontStyle:typeof val==="string"?"italic":"normal",flexShrink:0}}>{typeof val==="number"?fmt(Math.round(val as number)):val as string}</span>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 14px",background:"rgba(168,133,62,0.1)",borderRadius:8,border:"1px solid rgba(168,133,62,0.3)"}}>
          <span style={{fontSize:14,fontWeight:700,color:GOLD_DEEP}}>Estimated total (calculable fees)</span>
          <span style={{fontSize:16,fontWeight:800,color:GOLD_DEEP}}>{fmt(Math.round(total))}</span>
        </div>
        <p style={{fontSize:11,color:MUTED,margin:"4px 0 0",lineHeight:1.6}}>* Figures are estimates in {currency}. Agreement drafting and sundries vary. Confirm with your attorney. {currency==="USD"?"Rate: ~J$157 per US$1.":""}</p>
      </div>
      <a href="/cost-estimator" style={{display:"block",textAlign:"center",background:"transparent",border:"1px solid rgba(168,133,62,0.5)",borderRadius:10,padding:"12px 20px",color:GOLD_DEEP,fontWeight:700,fontSize:13,textDecoration:"none"}}>Get detailed breakdown with Excel export &#x2192;</a>
    </div>
  );
}

export default function NYC2026Client() {
  const [quizOpen,setQuizOpen]=useState(false);
  const [quizDone,setQuizDone]=useState(false);
  const [segment,setSegment]=useState<Segment|null>(null);
  const [score,setScore]=useState(0);
  const [heroIdx,setHeroIdx]=useState(0);
  const [galleryIdx,setGalleryIdx]=useState(0);
  const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
  const quizRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{const t=setInterval(()=>setHeroIdx(i=>(i+1)%HERO_SLIDES.length),4500);return()=>clearInterval(t);},[]);
  useEffect(()=>{const t=setInterval(()=>setGalleryIdx(i=>(i+1)%GALLERY_SLIDES.length),6000);return()=>clearInterval(t);},[]);
  useEffect(()=>{document.body.classList.add('has-sticky-cta');return()=>document.body.classList.remove('has-sticky-cta');},[]);

  function handleQuizDone(seg:Segment,s:number){setSegment(seg);setScore(s);setQuizDone(true);setTimeout(()=>quizRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),100);}
  const seg=segment?SEG[segment]:null;

  const CARDS=[
    {label:"Property Readiness Check",sub:"6 questions, 2 minutes. Know exactly where you stand - and get a personalised next-step plan.",img:"/nyc/card-readiness.webp",badge:"2 min quiz",cta:"Start the Check",action:()=>{setQuizOpen(true);setTimeout(()=>quizRef.current?.scrollIntoView({behavior:"smooth"}),50);}},
    {label:"Transaction Cost Estimator",sub:"Instant Buyer & Seller breakdown of transfer tax, stamp duty, registration, and attorney fees.",img:"/nyc/card-estimator.webp",badge:"Instant calc",cta:"Estimate My Costs",href:"#estimator"},
    {label:"Book a Consultation",sub:"20 minutes with a Ferguson Law attorney. No obligation, just clarity on your property goals.",img:"/nyc/card-consultation-ai.png",badge:"Free 20 min",cta:"Book Now",href:"/booking?utm_source=qr&utm_campaign=nyc2026"},
  ];

  const NAV_LINKS=[
    {label:"Services",href:"#services"},
    {label:"Cost Estimator",href:"#estimator"},
    {label:"Client Portal",href:"#portal"},
    {label:"Readiness Check",href:"#quiz"},
  ];

  return (
    <div style={{background:INK,minHeight:"100vh",color:"#fff",fontFamily:"'Inter',sans-serif",overflowX:"hidden"}}>

      {/* NAVBAR */}
      <div style={{position:"sticky",top:0,zIndex:200,background:`linear-gradient(90deg,${INK} 0%,${GREEN} 50%,${INK} 100%)`,borderBottom:"1px solid rgba(200,166,92,0.22)"}}>
        <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
          {/* Logo */}
          <a href="/nyc2026" style={{display:"flex",alignItems:"center",textDecoration:"none",background:"linear-gradient(150deg,#0E0C08,#141208)",padding:"7px 15px",borderRadius:13,border:"1px solid rgba(194,160,91,0.38)",boxShadow:"0 3px 14px rgba(21,19,14,0.14),inset 0 0 0 1px rgba(194,160,91,0.12)"}}>
            <Image src="/img/logo-ferguson.webp" alt="Ferguson Law" width={40} height={40} className="nyc-logo-img" style={{display:"block",height:40,width:"auto"}}/>
          </a>
          {/* Desktop nav */}
          <nav className="nyc-desktop-nav" style={{display:"flex",gap:24,alignItems:"center"}}>
            {NAV_LINKS.map(({label,href})=>(
              <a key={href} href={href} style={{fontSize:13,color:"rgba(255,255,255,0.72)",textDecoration:"none",fontWeight:500,letterSpacing:"0.01em"}}>{label}</a>
            ))}
            <a href="/booking?utm_source=qr&utm_campaign=nyc2026" style={{fontSize:13,background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,color:INK,fontWeight:800,borderRadius:50,padding:"9px 20px",textDecoration:"none",letterSpacing:"-0.01em"}}>Book Now</a>
          </nav>
          {/* Hamburger */}
          <button onClick={()=>setMobileMenuOpen(o=>!o)} className="nyc-hamburger" aria-label="Menu" style={{background:"none",border:"none",cursor:"pointer",padding:"6px",display:"none",flexDirection:"column",gap:5,alignItems:"center",justifyContent:"center"}}>
            <span style={{display:"block",width:22,height:2,background:PAPER,borderRadius:2,transition:"all .2s",transform:mobileMenuOpen?"rotate(45deg) translate(5px,5px)":"none"}}/>
            <span style={{display:"block",width:22,height:2,background:PAPER,borderRadius:2,transition:"all .2s",opacity:mobileMenuOpen?0:1}}/>
            <span style={{display:"block",width:22,height:2,background:PAPER,borderRadius:2,transition:"all .2s",transform:mobileMenuOpen?"rotate(-45deg) translate(5px,-5px)":"none"}}/>
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen&&(
          <div style={{background:`${INK}F8`,borderTop:"1px solid rgba(200,166,92,0.15)",padding:"12px 20px 20px"}}>
            {NAV_LINKS.map(({label,href})=>(
              <a key={href} href={href} onClick={()=>setMobileMenuOpen(false)} style={{display:"block",fontSize:15,color:PAPER,textDecoration:"none",padding:"13px 0",borderBottom:"1px solid rgba(255,255,255,0.07)",fontWeight:500}}>{label}</a>
            ))}
            <a href="/booking?utm_source=qr&utm_campaign=nyc2026" onClick={()=>setMobileMenuOpen(false)} style={{display:"block",textAlign:"center",background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,borderRadius:50,padding:"14px",color:INK,fontWeight:800,fontSize:14,textDecoration:"none",marginTop:16}}>Book a Consultation</a>
          </div>
        )}
      </div>

      {/* HERO */}
      <section style={{position:"relative",height:"100svh",minHeight:580,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
        {HERO_SLIDES.map((slide,i)=>(
          <div key={i} style={{position:"absolute",inset:0,opacity:i===heroIdx?1:0,transition:"opacity 1.6s cubic-bezier(.4,0,.2,1)",zIndex:0}}>
            {(slide.type as string)==="video"
              ? <video autoPlay muted loop playsInline poster={((slide as unknown) as {poster:string}).poster} style={{width:"100%",height:"100%",objectFit:"cover"}}><source src={slide.src} type="video/mp4"/></video>
              : <Image src={slide.src} alt={((slide as unknown) as {alt:string}).alt} fill style={{objectFit:"cover"}} priority={i===0}/>
            }
          </div>
        ))}
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 60% at 50% 50%,rgba(0,0,0,0.28) 0%,rgba(0,0,0,0.0) 70%),linear-gradient(to bottom,rgba(14,12,8,0.0) 0%,rgba(14,12,8,0.0) 50%,rgba(14,12,8,0.5) 80%,rgba(16,42,30,0.75) 100%)",zIndex:1}}/>
        <div style={{position:"relative",zIndex:2,textAlign:"center",padding:"0 20px",maxWidth:780,margin:"0 auto"}}>
          <h1 style={{fontSize:"clamp(34px,9vw,76px)",fontWeight:900,lineHeight:1.0,margin:"0 0 20px",letterSpacing:"-0.03em",color:"#FFFFFF",textShadow:"0 0 40px rgba(0,0,0,0.95),0 0 12px rgba(0,0,0,0.9),0 2px 4px rgba(0,0,0,0.9),0 4px 20px rgba(0,0,0,0.8)"}}>Own a Piece of<br/><span style={{color:GOLD,textShadow:"0 0 30px rgba(0,0,0,0.95),0 2px 4px rgba(0,0,0,0.9)"}}>Jamaica.</span></h1>
          <p style={{fontSize:"clamp(14px,3vw,18px)",color:"rgba(255,255,255,0.95)",lineHeight:1.75,margin:"0 auto 36px",maxWidth:520,textShadow:"0 0 20px rgba(0,0,0,0.9),0 1px 3px rgba(0,0,0,0.9)"}}>Expert conveyancing for Diaspora buyers. We handle the legal complexity so you can focus on the moment the keys are yours.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>{setQuizOpen(true);setTimeout(()=>quizRef.current?.scrollIntoView({behavior:"smooth"}),50);}} style={{background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,border:"none",borderRadius:50,padding:"16px 32px",color:INK,fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Check My Readiness</button>
            <a href="/booking?utm_source=qr&utm_campaign=nyc2026" style={{background:"rgba(16,42,30,0.5)",border:"1px solid rgba(42,138,77,0.5)",borderRadius:50,padding:"16px 32px",color:PAPER,fontWeight:600,fontSize:15,textDecoration:"none"}}>Book Consultation</a>
          </div>
        </div>
        <div style={{position:"absolute",bottom:28,left:"50%",transform:"translateX(-50%)",display:"flex",gap:6,zIndex:3}}>
          {HERO_SLIDES.map((_,i)=>(<button key={i} aria-label={`Slide ${i+1}`} onClick={()=>setHeroIdx(i)} style={{width:i===heroIdx?22:6,height:6,borderRadius:3,background:i===heroIdx?GOLD:"rgba(255,255,255,0.3)",border:"none",cursor:"pointer",transition:"width .3s,background .3s",padding:0}}/>))}
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{background:`linear-gradient(180deg,${GREEN} 0%,rgba(14,12,8,0.0) 100%)`,borderTop:"1px solid rgba(200,166,92,0.2)",borderBottom:"1px solid rgba(16,42,30,0.6)",padding:"18px 20px"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"center",gap:"clamp(24px,6vw,64px)",flexWrap:"wrap",alignItems:"center"}}>
          {[["25+","Years of practice"],["400+","Diaspora clients"],["$2B+","Transactions handled"],["100%","Licensed · Jamaica"]].map(([num,label])=>(
            <div key={label} style={{textAlign:"center"}}>
              <div style={{fontSize:"clamp(22px,4vw,30px)",fontWeight:800,color:GOLD_LIGHT,lineHeight:1,letterSpacing:"-0.02em"}}>{num}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:1.5,marginTop:4,textTransform:"uppercase"}}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICE CARDS */}
      <section id="services" style={{padding:"clamp(52px,8vw,96px) 20px",background:PAPER}}>
        <div style={{maxWidth:1040,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}}>
            <div style={{fontSize:10,color:GOLD_DEEP,fontWeight:700,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>Three steps. One session.</div>
            <h2 style={{fontSize:"clamp(24px,5vw,44px)",fontWeight:800,margin:0,lineHeight:1.15,color:INK}}>What would you like to do first?</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:20}}>
            {CARDS.map((card,i)=>(
              <div key={i} style={{background:"#fff",border:`1px solid ${i===0?"rgba(200,166,92,0.5)":"rgba(0,0,0,0.08)"}`,borderRadius:20,overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:i===0?"0 4px 24px rgba(200,166,92,0.15)":"0 2px 12px rgba(0,0,0,0.06)"}}>
                <div style={{height:185,overflow:"hidden",position:"relative",flexShrink:0}}>
                  <Image src={card.img} alt={card.label} fill style={{objectFit:"cover"}}/>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 40%,rgba(15,15,15,0.85) 100%)"}}/>
                  <div style={{position:"absolute",top:12,left:12,background:"rgba(0,0,0,0.72)",border:`1px solid ${GOLD}`,borderRadius:20,padding:"4px 11px",fontSize:10,color:GOLD,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>{card.badge}</div>
                </div>
                <div style={{padding:"22px 22px 26px",flex:1,display:"flex",flexDirection:"column"}}>
                  <h3 style={{fontSize:18,fontWeight:700,margin:"0 0 9px",color:INK,lineHeight:1.3}}>{card.label}</h3>
                  <p style={{fontSize:13,color:"#555",margin:"0 0 22px",lineHeight:1.65,flex:1}}>{card.sub}</p>
                  {"action" in card && card.action
                    ? <button onClick={card.action} style={{background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,border:"none",borderRadius:50,padding:"14px 20px",color:INK,fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>{card.cta}</button>
                    : <a href={(card as {href:string}).href} style={{display:"block",textAlign:"center",background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,border:"none",borderRadius:50,padding:"13px 20px",color:INK,fontWeight:800,fontSize:14,textDecoration:"none"}}>{card.cta}</a>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* READINESS QUIZ */}
      <section id="quiz" ref={quizRef} style={{padding:"clamp(52px,8vw,96px) 20px",background:INK2}}>
        <div style={{maxWidth:640,margin:"0 auto"}}>
          {!quizOpen&&!quizDone&&(<div style={{background:"linear-gradient(135deg,rgba(200,166,92,0.07),rgba(200,166,92,0.02))",border:"1px solid rgba(200,166,92,0.35)",borderRadius:20,padding:"36px 32px",textAlign:"center"}}>
            <div style={{fontSize:10,color:GOLD,fontWeight:700,letterSpacing:3,textTransform:"uppercase",marginBottom:14}}>Property Readiness Check</div>
            <h2 style={{fontSize:"clamp(20px,4vw,30px)",fontWeight:800,margin:"0 0 12px",color:"#fff"}}>Are you ready to buy in Jamaica?</h2>
            <p style={{color:"rgba(255,255,255,0.75)",fontSize:14,margin:"0 0 28px",lineHeight:1.75}}>6 questions. 2 minutes. Know your readiness score and get a personalised next-step plan.</p>
            <button onClick={()=>setQuizOpen(true)} style={{background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,border:"none",borderRadius:50,padding:"15px 36px",color:INK,fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Start the Check</button>
          </div>)}
          {quizOpen&&!quizDone&&(<div style={{background:`linear-gradient(145deg,${INK_CARD},${GREEN})`,border:"1px solid rgba(200,166,92,0.25)",borderRadius:20,padding:"32px clamp(20px,5vw,36px)"}}>
            <div style={{fontSize:10,color:GOLD,fontWeight:700,letterSpacing:3,textTransform:"uppercase",marginBottom:20}}>Property Readiness Check</div>
            <ReadinessQuiz onDone={handleQuizDone}/>
          </div>)}
          {quizDone&&seg&&(<div style={{background:"#0f0f0f",border:`1px solid ${seg.color}33`,borderRadius:20,padding:"36px clamp(20px,5vw,40px)",textAlign:"center"}}>
            <div style={{display:"inline-block",background:`${seg.color}18`,border:`1px solid ${seg.color}44`,borderRadius:20,padding:"5px 16px",fontSize:10,color:seg.color,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:20}}>{seg.label} &middot; Score {score}/110</div>
            <h2 style={{fontSize:"clamp(22px,5vw,32px)",fontWeight:800,margin:"0 0 12px"}}>{seg.headline}</h2>
            <p style={{color:"rgba(255,255,255,0.75)",fontSize:15,margin:"0 auto 28px",lineHeight:1.75,maxWidth:480}}>{seg.sub}</p>
            <a href={seg.href} style={{display:"inline-block",background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,borderRadius:50,padding:"15px 36px",color:INK,fontWeight:800,fontSize:15,textDecoration:"none"}}>{seg.cta}</a>
          </div>)}
        </div>
      </section>

      {/* COST ESTIMATOR */}
      <section id="estimator" style={{padding:"clamp(52px,8vw,96px) 20px",background:PAPER}}>
        <div style={{maxWidth:640,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontSize:10,color:GOLD_DEEP,fontWeight:700,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>Transaction Cost Estimator</div>
            <h2 style={{fontSize:"clamp(22px,5vw,34px)",fontWeight:800,margin:"0 0 10px",color:INK}}>What will it actually cost?</h2>
            <p style={{color:"#666",fontSize:14,margin:0,lineHeight:1.75}}>Select Buyer or Seller, toggle JMD/USD, slide to your property value.</p>
          </div>
          <div style={{background:`linear-gradient(145deg,${INK_CARD},${GREEN})`,border:"1px solid rgba(200,166,92,0.2)",borderRadius:20,padding:"28px clamp(20px,5vw,32px)",boxShadow:"0 8px 48px rgba(0,0,0,0.6)"}}><CostSlider/></div>
        </div>
      </section>

      {/* CLIENT PORTAL */}
      <section id="portal" style={{padding:"clamp(52px,8vw,96px) 20px",background:GREEN}}>
        <div style={{maxWidth:760,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:36}}>
            <div style={{fontSize:10,color:GOLD_LIGHT,fontWeight:700,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>Client Portal</div>
            <h2 style={{fontSize:"clamp(26px,5vw,42px)",fontWeight:900,margin:"0 0 16px",lineHeight:1.1,color:"#FFFFFF",textShadow:"0 2px 12px rgba(0,0,0,0.5)"}}>You are never in the dark.</h2>
            <p style={{color:"rgba(255,255,255,0.90)",fontSize:15,margin:"0 auto",lineHeight:1.75,maxWidth:480}}>Every client gets a secure portal showing real-time matter progress, encrypted messaging, and document access — from New York or anywhere in the world.</p>
          </div>
          <PortalDemoStrip/>
          <div style={{textAlign:"center",marginTop:24}}>
            <a href="/directory/client" style={{display:"inline-flex",alignItems:"center",gap:8,background:`rgba(16,42,30,0.6)`,border:"1px solid rgba(200,166,92,0.35)",borderRadius:50,padding:"11px 24px",color:GOLD_LIGHT,fontWeight:700,fontSize:13,textDecoration:"none"}}>View Client Portal &#x2192;</a>
          </div>
        </div>
      </section>

      {/* GALLERY STRIP */}
      <section style={{padding:"0 20px clamp(52px,8vw,80px)",background:INK}}>
        <div style={{maxWidth:920,margin:"0 auto"}}>
          <div style={{position:"relative",borderRadius:20,overflow:"hidden",aspectRatio:"16/9",background:"#111"}}>
            {GALLERY_SLIDES.map((item,i)=>(
              <div key={i} style={{position:"absolute",inset:0,opacity:i===galleryIdx?1:0,transition:"opacity 1.4s cubic-bezier(.4,0,.2,1)",pointerEvents:i===galleryIdx?"auto":"none"}}>
                {(item.type as string)==="video"
                  ? <video muted loop playsInline poster={((item as unknown) as {poster:string}).poster} style={{width:"100%",height:"100%",objectFit:"cover"}}><source src={item.src} type="video/mp4"/></video>
                  : <Image src={item.src} alt={((item as unknown) as {alt:string}).alt} fill style={{objectFit:"contain",objectPosition:"center"}}/>
                }
              </div>
            ))}

            <div style={{position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",display:"flex",gap:6,zIndex:3}}>
              {GALLERY_SLIDES.map((_,i)=>(<button key={i} aria-label={`Gallery slide ${i+1}`} onClick={()=>setGalleryIdx(i)} style={{width:i===galleryIdx?22:6,height:6,borderRadius:3,background:i===galleryIdx?GOLD:"rgba(255,255,255,0.28)",border:"none",cursor:"pointer",transition:"width .3s,background .3s",padding:0}}/>))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{padding:"clamp(52px,8vw,96px) 20px",background:PAPER}}>
        <div style={{maxWidth:920,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}}>
            <div style={{fontSize:10,color:GOLD_DEEP,fontWeight:700,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>How it works</div>
            <h2 style={{fontSize:"clamp(24px,5vw,40px)",fontWeight:800,margin:0,color:INK}}>From this room to your registry.</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:18}}>
            {[{n:"01",t:"Consultation",b:"We assess your situation, budget, and timeline. You leave with a clear action plan."},{n:"02",t:"Title investigation",b:"We verify ownership history, check for encumbrances, and ensure the property is clean before you commit."},{n:"03",t:"Agreement & transfer",b:"We draft and execute the sale agreement, manage stamp duty and registration, and hand you the title."}].map(({n,t,b})=>(
              <div key={n} style={{background:"#fff",border:"1px solid rgba(200,166,92,0.25)",borderRadius:16,padding:"28px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                <div style={{fontSize:11,color:GOLD_DEEP,fontWeight:700,letterSpacing:3,marginBottom:14}}>{n}</div>
                <h3 style={{fontSize:18,fontWeight:700,margin:"0 0 10px",lineHeight:1.3,color:INK}}>{t}</h3>
                <p style={{fontSize:13,color:"#666",margin:0,lineHeight:1.7}}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MEET THE FOUNDER — full-bleed editorial, centered */}
      <section style={{position:"relative",overflow:"hidden",background:"#0A1510"}}>
        <div style={{position:"relative",width:"100%",minHeight:"clamp(480px,70vw,760px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end"}}>
          <Image
            src="/img/owen-nyc2026.jpg"
            alt="Owen K. Ferguson, JP — Founder & Principal Attorney-at-Law, Ferguson Law"
            fill
            sizes="100vw"
            style={{objectFit:"cover",objectPosition:"center top",zIndex:0}}
            priority
          />
          {/* Gradient overlay — bottom fade */}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top, rgba(10,21,16,1) 0%, rgba(10,21,16,0.75) 35%, rgba(10,21,16,0.1) 65%, transparent 100%)",zIndex:1}}/>
          {/* Eyebrow — top center */}
          <div style={{position:"absolute",top:"clamp(24px,4vw,44px)",left:"50%",transform:"translateX(-50%)",zIndex:2,textAlign:"center",whiteSpace:"nowrap"}}>
            <div style={{fontSize:"clamp(9px,1.1vw,12px)",color:GOLD_DEEP,fontWeight:700,letterSpacing:"clamp(3px,0.5vw,6px)",textTransform:"uppercase"}}>Meet the Founder</div>
          </div>
          {/* Bottom center — name + title */}
          <div style={{position:"relative",zIndex:2,width:"100%",textAlign:"center",padding:"0 20px clamp(28px,5vw,52px)"}}>
            <h2 className="nyc-founder-name" style={{fontWeight:900,margin:"0 0 8px",lineHeight:0.95,letterSpacing:"-0.03em",color:"#F6F2EA"}}>Owen K. Ferguson<span style={{color:GOLD}}>, JP</span></h2>
            <p style={{fontSize:"clamp(13px,1.8vw,17px)",color:GOLD,fontWeight:600,margin:0,letterSpacing:0.5}}>Founder &amp; Principal Attorney-at-Law · Ferguson Law</p>
          </div>
        </div>
        <style>{`
          .nyc-founder-name { font-size: clamp(32px, 7vw, 88px); }
          @media (min-width: 768px) {
            .nyc-founder-name { font-size: clamp(52px, 8vw, 96px); }
          }
        `}</style>
      </section>
      {/* CTA */}
      <section style={{padding:"60px 20px 80px",position:"relative",overflow:"hidden",background:INK}}>
        <div style={{position:"relative",maxWidth:580,margin:"0 auto",textAlign:"center"}}>
          <Image src="/img/logo-ferguson.webp" alt="Ferguson Law" width={52} height={52} style={{borderRadius:10,marginBottom:22,opacity:0.92}}/>
          <h2 style={{fontSize:"clamp(28px,6vw,50px)",fontWeight:900,margin:"0 0 16px",lineHeight:1.08,letterSpacing:"-0.02em"}}>
            <span style={{color:GOLD,fontWeight:900,opacity:1}}>Your name on a</span><br/>
            <span style={{color:GOLD}}>Jamaican title deed.</span>
          </h2>
          <p style={{color:"rgba(246,242,234,0.82)",fontSize:15,margin:"0 0 32px",lineHeight:1.75}}>Ferguson Law has guided hundreds of Diaspora buyers through every step — from first enquiry to final keys.</p>
          <a href="/booking?utm_source=qr&utm_campaign=nyc2026" style={{display:"inline-block",background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,borderRadius:50,padding:"18px 46px",color:INK,fontWeight:800,fontSize:16,textDecoration:"none"}}>Book a Free Consultation</a>
        </div>
      </section>

      <footer style={{borderTop:"1px solid rgba(200,166,92,0.15)",padding:"28px 20px 36px",textAlign:"center",background:INK}}>
        <p style={{margin:0,fontSize:12,color:"rgba(255,255,255,0.35)",letterSpacing:0.5}}>Ferguson Law &middot; fergusonlawja.com &middot; Licensed attorneys &middot; Jamaica</p>
      </footer>

      {/* STICKY BAR */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:"rgba(14,12,8,0.98)",backdropFilter:"blur(20px) saturate(1.4)",borderTop:"1px solid rgba(200,166,92,0.25)",padding:"12px 16px",paddingBottom:"calc(12px + env(safe-area-inset-bottom))",display:"flex",gap:10,alignItems:"center"}}>
        <button onClick={()=>{setQuizOpen(true);setTimeout(()=>quizRef.current?.scrollIntoView({behavior:"smooth"}),50);}} style={{flex:1,background:"rgba(255,255,255,0.05)",border:`1px solid ${GOLD}44`,borderRadius:10,padding:"11px",color:PAPER,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Readiness Check</button>
        <a href="/booking?utm_source=qr&utm_campaign=nyc2026" style={{flex:1,display:"block",textAlign:"center",background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,borderRadius:10,padding:"12px",color:INK,fontWeight:800,fontSize:13,textDecoration:"none"}}>Book Consultation</a>
      </div>
      <div style={{height:"calc(72px + env(safe-area-inset-bottom))"}}/>

      <style>{`
        /* Responsive nav */
        .nyc-logo-img{height:40px !important;width:auto !important;display:block !important;}
  @media (max-width:560px){.nyc-logo-img{height:44px !important;}}
  @media (max-width:420px){.nyc-logo-img{height:36px !important;}}
  @media (max-width:360px){.nyc-logo-img{height:32px !important;}}
  @media (min-width: 768px) {
          .nyc-hamburger { display: none !important; }
          .nyc-desktop-nav { display: flex !important; }
        }
        @media (max-width: 767px) {
          .nyc-desktop-nav { display: none !important; }
          .nyc-hamburger { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
