"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
type Segment = "hot" | "warm" | "cold";
interface QuizAnswer { q0?:number;q1?:number;q2?:number;q3?:number;q4?:number;q5?:number; }
const GOLD = "#C8A65C";
const GOLD_DEEP = "#A8853E";
const INK = "#0a0a0a";
const STAGE_LABELS = ["Client onboarding completed","Agreement reviewed & signed","Title investigation completed","Completion arrangements underway","Registration & closing report"];
const QUIZ_QUESTIONS = [
  { q: "When are you looking to purchase property in Jamaica?", opts: ["Within 6 months","6–18 months","2–5 years","Just exploring"], pts: [40,20,5,0] },
  { q: "Have you identified a specific property or area?", opts: ["Yes — specific property","Yes — specific area","Researching options","Not yet"], pts: [20,15,8,0] },
  { q: "How is your financing currently structured?", opts: ["Cash ready / mortgage approved","Working on financing","Need to arrange it","Unsure"], pts: [20,12,5,0] },
  { q: "What is your primary purpose for purchasing?", opts: ["Primary home","Vacation / rental income","Retirement planning","Investment portfolio"], pts: [10,10,5,10] },
  { q: "Have you worked with a Jamaican attorney before?", opts: ["Yes — previous transaction","No, but ready to start","No — want to learn first","No — first time buyer"], pts: [10,8,4,2] },
  { q: "What is driving your decision right now?", opts: ["Found the right property","Financial opportunity / rates","Family / life milestone","Long-term wealth building"], pts: [10,8,6,4] },
];
function computeScore(a:QuizAnswer):number {
  return Object.entries(a).reduce((s,[k,v])=>{const qi=parseInt(k.replace("q",""));return s+(QUIZ_QUESTIONS[qi]?.pts[v as number]??0);},0);
}
function getSegment(score:number):Segment { return score>=65?"hot":score>=35?"warm":"cold"; }
const SEG:Record<Segment,{label:string;headline:string;sub:string;cta:string;href:string;color:string}> = {
  hot:  { label:"Priority Buyer",  headline:"You are ready to move.",              sub:"Your profile matches our most active Diaspora buyers. Let’s lock in a priority consultation before Nov 14.",              cta:"Book Priority Consultation",   href:"/booking?utm_source=qr&utm_campaign=nyc2026&segment=hot",  color:GOLD   },
  warm: { label:"Active Prospect", headline:"You are on the right path.",          sub:"Let’s map your 90-day action plan and answer your biggest questions about Jamaican property law.",                               cta:"Schedule a Consultation",      href:"/booking?utm_source=qr&utm_campaign=nyc2026&segment=warm", color:"#7cb8e0" },
  cold: { label:"Future Buyer",    headline:"You are building toward something real.", sub:"Start with our free Buyer’s Guide — it covers every step of a Jamaican property transaction end to end.", cta:"Get the Free Buyer’s Guide", href:"/buyers-guide?utm_source=qr&utm_campaign=nyc2026&segment=cold", color:"#9eab8e" },
};
function PortalDemoStrip() {
  const [active,setActive]=useState(0);
  const iv = useRef<ReturnType<typeof setInterval>|null>(null);
  const adv = useCallback(()=>setActive(p=>p<STAGE_LABELS.length-1?p+1:0),[]);
  useEffect(()=>{ iv.current=setInterval(adv,2800); return()=>{ if(iv.current)clearInterval(iv.current); }; },[adv]);
  const pct=Math.round(((active+1)/STAGE_LABELS.length)*100);
  const FEATS=[{e:"??",l:"Encrypted document vault"},{e:"??",l:"Secure client–attorney messaging"},{e:"??",l:"KYC & compliance tracking"},{e:"??",l:"Payment receipts & invoicing"},{e:"??",l:"AI-generated legal summary"},{e:"??",l:"WhatsApp milestone alerts"}];
  return (
    <div style={{background:"#0d0d0d",border:"1px solid rgba(200,166,92,0.25)",borderRadius:20,overflow:"hidden",maxWidth:680,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,#0e1a0e,#0d0d0d)",padding:"20px 24px",borderBottom:"1px solid rgba(200,166,92,0.12)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:11,color:GOLD,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Sample client matter</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.5)"}}>Residential property purchase · Jamaica</div>
          </div>
          <span style={{background:"rgba(200,166,92,0.15)",border:"1px solid rgba(200,166,92,0.4)",borderRadius:20,padding:"4px 12px",fontSize:10,color:GOLD,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Live demo</span>
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
                {done?"?":cur?"?":"?"}
              </div>
              <span style={{fontSize:13,fontWeight:cur?600:400,color:done?"rgba(255,255,255,0.35)":cur?"#fff":"rgba(255,255,255,0.3)",textDecoration:done?"line-through":"none",transition:"color 0.5s"}}>{label}</span>
              {cur&&<span style={{marginLeft:"auto",fontSize:9,background:"rgba(200,166,92,0.15)",border:"1px solid rgba(200,166,92,0.4)",borderRadius:4,padding:"2px 8px",color:GOLD,fontWeight:700,letterSpacing:1,textTransform:"uppercase",flexShrink:0}}>Active</span>}
            </div>
          );
        })}
      </div>
      <div style={{padding:"14px 24px 18px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",flexWrap:"wrap",gap:7}}>
        {FEATS.map((f,i)=>(<span key={i} style={{display:"inline-flex",alignItems:"center",gap:5,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"5px 12px",fontSize:11,color:"rgba(255,255,255,0.5)"}}><span>{f.e}</span>{f.l}</span>))}
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
        <button onClick={()=>void submit()} disabled={busy} style={{background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,border:"none",borderRadius:12,padding:"15px 24px",color:"#0a0a0a",fontWeight:800,fontSize:15,cursor:busy?"not-allowed":"pointer",opacity:busy?0.7:1,fontFamily:"inherit"}}>
          {busy?"Submitting...":"Get My Readiness Score"}
        </button>
      </div>
    </div>
  );
}
function CostSlider() {
  const [price,setPrice]=useState(25000000);
  const fmt=(n:number)=>"J$"+n.toLocaleString();
  const transferTax=price*0.02,registration=price*0.005,attorney=price*0.03;
  const total=transferTax+5000+registration+attorney;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div>
        <label style={{fontSize:11,color:GOLD,fontWeight:700,letterSpacing:2,textTransform:"uppercase",display:"block",marginBottom:10}}>Property value: {fmt(price)}</label>
        <input type="range" min={5000000} max={150000000} step={500000} value={price} onChange={e=>setPrice(Number(e.target.value))} style={{width:"100%",accentColor:GOLD,cursor:"pointer"}}/>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:4}}><span>J$5M</span><span>J$150M</span></div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {[["Transfer Tax (2%)",transferTax],["Stamp Duty",5000],["Registration Fee (0.5%)",registration],["Attorney Fees (~3%)",attorney]].map(([label,val])=>(
          <div key={label as string} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"rgba(255,255,255,0.03)",borderRadius:8,border:"1px solid rgba(255,255,255,0.05)"}}>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.55)"}}>{label}</span>
            <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>{fmt(Math.round(val as number))}</span>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 14px",background:"rgba(200,166,92,0.08)",borderRadius:8,border:"1px solid rgba(200,166,92,0.3)"}}>
          <span style={{fontSize:14,fontWeight:700,color:GOLD}}>Estimated total</span>
          <span style={{fontSize:16,fontWeight:800,color:GOLD}}>{fmt(Math.round(total))}</span>
        </div>
      </div>
      <a href="/cost-estimator" style={{display:"block",textAlign:"center",background:"transparent",border:"1px solid rgba(200,166,92,0.4)",borderRadius:10,padding:"12px 20px",color:GOLD,fontWeight:700,fontSize:13,textDecoration:"none"}}>Get exact breakdown with Excel export ?</a>
    </div>
  );
}
export default function NYC2026Client() {
  const [quizOpen,setQuizOpen]=useState(false);
  const [quizDone,setQuizDone]=useState(false);
  const [segment,setSegment]=useState<Segment|null>(null);
  const [score,setScore]=useState(0);
  const [carouselIdx,setCarouselIdx]=useState(0);
  const quizRef=useRef<HTMLDivElement>(null);
  const CAROUSEL=[
    {type:"video" as const,src:"/nyc/kgn-waterfront.mp4",poster:"/nyc/hero-property.webp"},
    {type:"image" as const,src:"/nyc/jamaica-coast-aerial.webp",alt:"Jamaica coast aerial"},
    {type:"video" as const,src:"/nyc/keys-gate.mp4",poster:"/nyc/hero-property.webp"},
    {type:"image" as const,src:"/nyc/distance-quote.webp",alt:"Distance quote"},
    {type:"video" as const,src:"/nyc/nyc-to-kingston.mp4",poster:"/nyc/hero-property.webp"},
    {type:"image" as const,src:"/nyc/title-card.webp",alt:"Own a Piece of Jamaica"},
  ];
  useEffect(()=>{const t=setInterval(()=>setCarouselIdx(i=>(i+1)%CAROUSEL.length),5000);return()=>clearInterval(t);},[CAROUSEL.length]);
  function handleQuizDone(seg:Segment,s:number){setSegment(seg);setScore(s);setQuizDone(true);setTimeout(()=>quizRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),100);}
  const seg=segment?SEG[segment]:null;
  const CARDS=[
    {label:"Property Readiness Check",sub:"6 questions, 2 minutes. Know exactly where you stand — and get a personalised next-step plan.",img:"/nyc/card-readiness.webp",badge:"2 min quiz",cta:"Start the Check",primary:true,action:()=>{setQuizOpen(true);setTimeout(()=>quizRef.current?.scrollIntoView({behavior:"smooth"}),50);}},
    {label:"Transaction Cost Estimator",sub:"Instant breakdown of transfer tax, stamp duty, registration, and attorney fees for any property value.",img:"/nyc/card-estimator.webp",badge:"Instant calc",cta:"Estimate My Costs",primary:false,href:"/cost-estimator"},
    {label:"Book a Consultation",sub:"30 minutes with a Ferguson Law attorney. No obligation — just clarity on your property goals.",img:"/nyc/card-consultation.webp",badge:"Free 30 min",cta:"Book Now",primary:false,href:"/booking?utm_source=qr&utm_campaign=nyc2026"},
  ];
  return (
    <div style={{background:INK,minHeight:"100vh",color:"#fff",fontFamily:"'Inter',sans-serif",overflowX:"hidden"}}>
      <section style={{position:"relative",height:"100svh",minHeight:580,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
        <video autoPlay muted loop playsInline poster="/nyc/hero-property.webp" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.42}}>
          <source src="/nyc/kgn-waterfront.mp4" type="video/mp4"/>
        </video>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(10,10,10,0.25) 0%,rgba(10,10,10,0.55) 55%,rgba(10,10,10,1) 100%)"}}/>
        <div style={{position:"relative",zIndex:1,textAlign:"center",padding:"0 20px",maxWidth:780,margin:"0 auto"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(200,166,92,0.12)",border:"1px solid rgba(200,166,92,0.4)",borderRadius:24,padding:"8px 18px",marginBottom:28}}>
            <Image src="/img/logo-ferguson.webp" alt="Ferguson Law" width={18} height={18} style={{borderRadius:3,opacity:0.9}}/>
            <span style={{fontSize:11,color:GOLD,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>From Deed to Key · NYC · Nov 14, 2026</span>
          </div>
          <h1 style={{fontSize:"clamp(34px,9vw,76px)",fontWeight:900,lineHeight:1.0,margin:"0 0 20px",letterSpacing:"-0.03em"}}>Own a Piece of<br/><span style={{color:GOLD}}>Jamaica.</span></h1>
          <p style={{fontSize:"clamp(14px,3vw,18px)",color:"rgba(255,255,255,0.6)",lineHeight:1.75,margin:"0 auto 36px",maxWidth:520}}>Expert conveyancing for Diaspora buyers. We handle the legal complexity so you can focus on the moment the keys are yours.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>{setQuizOpen(true);setTimeout(()=>quizRef.current?.scrollIntoView({behavior:"smooth"}),50);}} style={{background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,border:"none",borderRadius:50,padding:"16px 32px",color:"#0a0a0a",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Check My Readiness</button>
            <a href="/booking?utm_source=qr&utm_campaign=nyc2026" style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.14)",borderRadius:50,padding:"16px 32px",color:"#fff",fontWeight:600,fontSize:15,textDecoration:"none"}}>Book Consultation</a>
          </div>
        </div>
      </section>
      <section style={{background:"rgba(200,166,92,0.06)",borderTop:"1px solid rgba(200,166,92,0.14)",borderBottom:"1px solid rgba(200,166,92,0.14)",padding:"18px 20px"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"center",gap:"clamp(24px,6vw,64px)",flexWrap:"wrap",alignItems:"center"}}>
          {[["25+","Years of practice"],["400+","Diaspora clients"],["$2B+","Transactions handled"],["100%","Licensed · Jamaica"]].map(([num,label])=>(
            <div key={label} style={{textAlign:"center"}}>
              <div style={{fontSize:"clamp(20px,4vw,28px)",fontWeight:800,color:GOLD,lineHeight:1}}>{num}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:1.5,marginTop:4,textTransform:"uppercase"}}>{label}</div>
            </div>
          ))}
        </div>
      </section>
      <section style={{padding:"clamp(52px,8vw,96px) 20px"}}>
        <div style={{maxWidth:1040,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}}>
            <div style={{fontSize:10,color:GOLD,fontWeight:700,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>Three steps. One session.</div>
            <h2 style={{fontSize:"clamp(24px,5vw,44px)",fontWeight:800,margin:0,lineHeight:1.15}}>What would you like to do first?</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:20}}>
            {CARDS.map((card,i)=>(
              <div key={i} style={{background:"#0f0f0f",border:`1px solid ${i===0?"rgba(200,166,92,0.3)":"rgba(255,255,255,0.07)"}`,borderRadius:20,overflow:"hidden",display:"flex",flexDirection:"column"}}>
                <div style={{height:185,overflow:"hidden",position:"relative",flexShrink:0}}>
                  <Image src={card.img} alt={card.label} fill style={{objectFit:"cover"}}/>
                  <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 40%,rgba(15,15,15,0.95) 100%)"}}/>
                  <div style={{position:"absolute",top:12,left:12,background:i===0?`${GOLD}22`:"rgba(0,0,0,0.55)",border:i===0?`1px solid ${GOLD}66`:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"4px 11px",fontSize:10,color:i===0?GOLD:"rgba(255,255,255,0.6)",fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>{card.badge}</div>
                </div>
                <div style={{padding:"22px 22px 26px",flex:1,display:"flex",flexDirection:"column"}}>
                  <h3 style={{fontSize:18,fontWeight:700,margin:"0 0 9px",color:"#fff",lineHeight:1.3}}>{card.label}</h3>
                  <p style={{fontSize:13,color:"rgba(255,255,255,0.42)",margin:"0 0 22px",lineHeight:1.65,flex:1}}>{card.sub}</p>
                  {"action" in card && card.action ? (
                    <button onClick={card.action} style={{background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,border:"none",borderRadius:10,padding:"14px 20px",color:"#0a0a0a",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>{card.cta}</button>
                  ) : (
                    <a href={(card as {href:string}).href} style={{display:"block",textAlign:"center",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"13px 20px",color:"#fff",fontWeight:700,fontSize:14,textDecoration:"none"}}>{card.cta}</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section ref={quizRef} style={{padding:"0 20px 80px"}}>
        <div style={{maxWidth:640,margin:"0 auto"}}>
          {!quizOpen&&!quizDone&&(<div style={{background:"linear-gradient(135deg,rgba(200,166,92,0.07),rgba(200,166,92,0.02))",border:"1px solid rgba(200,166,92,0.18)",borderRadius:20,padding:"36px 32px",textAlign:"center"}}>
            <div style={{fontSize:10,color:GOLD,fontWeight:700,letterSpacing:3,textTransform:"uppercase",marginBottom:14}}>Property Readiness Check</div>
            <h2 style={{fontSize:"clamp(20px,4vw,30px)",fontWeight:800,margin:"0 0 12px"}}>Are you ready to buy in Jamaica?</h2>
            <p style={{color:"rgba(255,255,255,0.45)",fontSize:14,margin:"0 0 28px",lineHeight:1.75}}>6 questions. 2 minutes. Know your readiness score and get a personalised next-step plan.</p>
            <button onClick={()=>setQuizOpen(true)} style={{background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,border:"none",borderRadius:50,padding:"15px 36px",color:"#0a0a0a",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Start the Check</button>
          </div>)}
          {quizOpen&&!quizDone&&(<div style={{background:"#0f0f0f",border:"1px solid rgba(200,166,92,0.2)",borderRadius:20,padding:"32px clamp(20px,5vw,36px)"}}>
            <div style={{fontSize:10,color:GOLD,fontWeight:700,letterSpacing:3,textTransform:"uppercase",marginBottom:20}}>Property Readiness Check</div>
            <ReadinessQuiz onDone={handleQuizDone}/>
          </div>)}
          {quizDone&&seg&&(<div style={{background:"#0f0f0f",border:`1px solid ${seg.color}33`,borderRadius:20,padding:"36px clamp(20px,5vw,40px)",textAlign:"center"}}>
            <div style={{display:"inline-block",background:`${seg.color}18`,border:`1px solid ${seg.color}44`,borderRadius:20,padding:"5px 16px",fontSize:10,color:seg.color,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:20}}>{seg.label} · Score {score}/110</div>
            <h2 style={{fontSize:"clamp(22px,5vw,32px)",fontWeight:800,margin:"0 0 12px"}}>{seg.headline}</h2>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:15,margin:"0 auto 28px",lineHeight:1.75,maxWidth:480}}>{seg.sub}</p>
            <a href={seg.href} style={{display:"inline-block",background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,borderRadius:50,padding:"15px 36px",color:"#0a0a0a",fontWeight:800,fontSize:15,textDecoration:"none"}}>{seg.cta}</a>
          </div>)}
        </div>
      </section>
      <section style={{padding:"0 20px 80px"}}>
        <div style={{maxWidth:640,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{fontSize:10,color:GOLD,fontWeight:700,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>Transaction Cost Estimator</div>
            <h2 style={{fontSize:"clamp(22px,5vw,34px)",fontWeight:800,margin:"0 0 10px"}}>What will it actually cost?</h2>
            <p style={{color:"rgba(255,255,255,0.4)",fontSize:14,margin:0,lineHeight:1.75}}>Slide to your property value. Instant breakdown of every government and legal fee.</p>
          </div>
          <div style={{background:"#0f0f0f",border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,padding:"28px clamp(20px,5vw,32px)"}}><CostSlider/></div>
        </div>
      </section>
      <section style={{padding:"0 20px 80px"}}>
        <div style={{maxWidth:760,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:36}}>
            <div style={{fontSize:10,color:GOLD,fontWeight:700,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>Client Portal</div>
            <h2 style={{fontSize:"clamp(22px,5vw,34px)",fontWeight:800,margin:"0 0 10px"}}>You are never in the dark.</h2>
            <p style={{color:"rgba(255,255,255,0.4)",fontSize:14,margin:"0 auto",lineHeight:1.75,maxWidth:480}}>Every client gets a secure portal showing real-time matter progress, encrypted messaging, and document access — from New York or anywhere in the world.</p>
          </div>
          <PortalDemoStrip/>
          <div style={{textAlign:"center",marginTop:24}}>
            <a href="/directory/client" style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(200,166,92,0.08)",border:"1px solid rgba(200,166,92,0.25)",borderRadius:50,padding:"11px 24px",color:GOLD,fontWeight:700,fontSize:13,textDecoration:"none"}}>View Client Portal ?</a>
          </div>
        </div>
      </section>
      <section style={{padding:"0 20px 80px"}}>
        <div style={{maxWidth:920,margin:"0 auto"}}>
          <div style={{position:"relative",borderRadius:20,overflow:"hidden",aspectRatio:"16/9",background:"#111"}}>
            {CAROUSEL.map((item,i)=>(
              <div key={i} style={{position:"absolute",inset:0,opacity:i===carouselIdx?1:0,transition:"opacity 1.4s cubic-bezier(.4,0,.2,1)",pointerEvents:i===carouselIdx?"auto":"none"}}>
                {item.type==="video"?(
                  <video autoPlay muted loop playsInline poster={(item as {poster:string}).poster} style={{width:"100%",height:"100%",objectFit:"cover"}}><source src={item.src} type="video/mp4"/></video>
                ):(
                  <Image src={item.src} alt={(item as {alt:string}).alt} fill style={{objectFit:"cover"}}/>
                )}
              </div>
            ))}
            <div style={{position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",display:"flex",gap:6,zIndex:2}}>
              {CAROUSEL.map((_,i)=>(<button key={i} onClick={()=>setCarouselIdx(i)} style={{width:i===carouselIdx?22:6,height:6,borderRadius:3,background:i===carouselIdx?GOLD:"rgba(255,255,255,0.28)",border:"none",cursor:"pointer",transition:"width .3s,background .3s",padding:0}}/>))}
            </div>
            <div style={{position:"absolute",top:16,right:16,zIndex:2,background:"rgba(0,0,0,0.5)",borderRadius:6,padding:"4px 10px",fontSize:9,color:"rgba(255,255,255,0.4)",letterSpacing:1.5,textTransform:"uppercase"}}>Ferguson Law · Jamaica</div>
          </div>
        </div>
      </section>
      <section style={{padding:"0 20px 80px"}}>
        <div style={{maxWidth:920,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:48}}>
            <div style={{fontSize:10,color:GOLD,fontWeight:700,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>How it works</div>
            <h2 style={{fontSize:"clamp(24px,5vw,40px)",fontWeight:800,margin:0}}>From this room to your registry.</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:18}}>
            {[{n:"01",t:"Consultation",b:"We assess your situation, budget, and timeline. You leave with a clear action plan — not a sales pitch."},{n:"02",t:"Title investigation",b:"We verify ownership history, check for encumbrances, and ensure the property is clean before you commit."},{n:"03",t:"Agreement & transfer",b:"We draft and execute the sale agreement, manage stamp duty and registration, and hand you the title."}].map(({n,t,b})=>(
              <div key={n} style={{background:"#0f0f0f",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"28px 24px"}}>
                <div style={{fontSize:11,color:GOLD,fontWeight:700,letterSpacing:3,marginBottom:14}}>{n}</div>
                <h3 style={{fontSize:18,fontWeight:700,margin:"0 0 10px",lineHeight:1.3}}>{t}</h3>
                <p style={{fontSize:13,color:"rgba(255,255,255,0.4)",margin:0,lineHeight:1.7}}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{padding:"60px 20px 80px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0}}><Image src="/nyc/from-deed-to-key.webp" alt="" fill style={{objectFit:"cover",opacity:0.07}}/></div>
        <div style={{position:"relative",maxWidth:580,margin:"0 auto",textAlign:"center"}}>
          <Image src="/img/logo-ferguson.webp" alt="Ferguson Law" width={52} height={52} style={{borderRadius:10,marginBottom:22,opacity:0.92}}/>
          <h2 style={{fontSize:"clamp(28px,6vw,50px)",fontWeight:900,margin:"0 0 16px",lineHeight:1.08,letterSpacing:"-0.02em"}}>Your name on a<br/><span style={{color:GOLD}}>Jamaican title deed.</span></h2>
          <p style={{color:"rgba(255,255,255,0.45)",fontSize:15,margin:"0 0 32px",lineHeight:1.75}}>Ferguson Law has guided hundreds of Diaspora buyers through every step — from first enquiry to final keys. Start with a free 30-minute consultation.</p>
          <a href="/booking?utm_source=qr&utm_campaign=nyc2026" style={{display:"inline-block",background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,borderRadius:50,padding:"18px 46px",color:"#0a0a0a",fontWeight:800,fontSize:16,textDecoration:"none"}}>Book a Free Consultation</a>
          <p style={{fontSize:11,color:"rgba(255,255,255,0.22)",marginTop:16,letterSpacing:1.5,textTransform:"uppercase"}}>No account needed · No commitment · Available now</p>
        </div>
      </section>
      <footer style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"24px 20px",textAlign:"center"}}>
        <p style={{margin:0,fontSize:11,color:"#555"}}>Ferguson Law · fergusonlawja.com · Licensed attorneys · Jamaica</p>
      </footer>
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:"rgba(10,10,10,0.96)",backdropFilter:"blur(16px)",borderTop:"1px solid rgba(200,166,92,0.18)",padding:"12px 16px",display:"flex",gap:10,alignItems:"center"}}>
        <button onClick={()=>{setQuizOpen(true);setTimeout(()=>quizRef.current?.scrollIntoView({behavior:"smooth"}),50);}} style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"11px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Readiness Check</button>
        <a href="/booking?utm_source=qr&utm_campaign=nyc2026" style={{flex:1,display:"block",textAlign:"center",background:`linear-gradient(135deg,${GOLD_DEEP},${GOLD})`,borderRadius:10,padding:"12px",color:"#0a0a0a",fontWeight:800,fontSize:13,textDecoration:"none"}}>Book Consultation</a>
      </div>
      <div style={{height:72}}/>
    </div>
  );
}
