import "./_group.css";

const ACCENT = "#e06030";
const GREEN = "#18a06b";

function GridSVG({ opacity }: { opacity: number }) {
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox="0 0 390 200" preserveAspectRatio="none">
      {[0,1,2,3,4,5,6,7].map((i) => (
        <line key={`v${i}`} x1={i*56} y1="0" x2={i*56} y2="200" stroke={ACCENT} strokeWidth="1" opacity={opacity}/>
      ))}
      {[0,1,2,3,4].map((i) => (
        <line key={`h${i}`} x1="0" y1={i*50} x2="390" y2={i*50} stroke={ACCENT} strokeWidth="1" opacity={opacity}/>
      ))}
    </svg>
  );
}

function Chip({ label, accent, green }: { label: string; accent?: boolean; green?: boolean }) {
  const bg = accent ? "rgba(224,96,48,0.08)" : green ? "rgba(24,160,107,0.08)" : "#f4f0ed";
  const border = accent ? "rgba(224,96,48,0.20)" : green ? "rgba(24,160,107,0.20)" : "#e8e2dc";
  const color = accent ? ACCENT : green ? GREEN : "#9a8f87";
  return (
    <span style={{ fontSize:11, fontFamily:"DM Sans", fontWeight:600, padding:"4px 10px", borderRadius:100, border:`1px solid ${border}`, backgroundColor:bg, color, whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map((s) => (
        <span key={s} style={{ fontSize:11, color:ACCENT, opacity: s <= rating ? 1 : 0.2 }}>★</span>
      ))}
    </span>
  );
}

export function CardExpandido() {
  return (
    <div style={{ width:390, minHeight:844, backgroundColor:"#faf7f5", fontFamily:"DM Sans, sans-serif", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* ── Thumbnail hero — variante clara (peach) ── */}
      <div style={{ position:"relative", height:200, overflow:"hidden", flexShrink:0, background:"linear-gradient(135deg, #f0e9e3 0%, #f8f5f2 100%)" }}>
        <GridSVG opacity={0.06}/>

        {/* Texto decorativo gigante */}
        <div style={{ position:"absolute", bottom:-18, left:14, fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:80, letterSpacing:-3, lineHeight:1, color:ACCENT, opacity:0.10, userSelect:"none" }}>
          ELÉTR
        </div>

        {/* Badge de status */}
        <div style={{ position:"absolute", top:10, left:14, display:"flex", alignItems:"center", gap:5, border:"1px solid rgba(0,184,122,0.40)", backgroundColor:"rgba(0,184,122,0.10)", borderRadius:100, padding:"4px 9px" }}>
          <div style={{ width:5, height:5, borderRadius:3, backgroundColor:"#00b87a" }}/>
          <span style={{ fontFamily:"DM Sans", fontSize:9, letterSpacing:"0.6px", textTransform:"uppercase", color:"#00b87a" }}>ativo</span>
        </div>

        {/* Badge verificado */}
        <div style={{ position:"absolute", top:10, right:14, width:26, height:26, borderRadius:13, backgroundColor:"rgba(255,255,255,0.60)", border:"1px solid rgba(24,160,107,0.20)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:12, color:GREEN }}>✓</span>
        </div>

        {/* Título + preço no bottom do hero */}
        <div style={{ position:"absolute", bottom:14, left:14, right:14, display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
          <span style={{ fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:20, color:"#1c1916", letterSpacing:-0.5, lineHeight:1.2, flex:1, marginRight:12 }}>
            Instalação Elétrica
          </span>
          <div style={{ flexShrink:0, textAlign:"right" }}>
            <div style={{ fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:24, color:ACCENT, lineHeight:1 }}>R$50</div>
            <div style={{ fontFamily:"DM Sans", fontSize:10, color:"#9a8f87", marginTop:2 }}>/hora</div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div style={{ flex:1, padding:"16px 16px", display:"flex", flexDirection:"column", gap:14 }}>

        {/* Meta: rating · contratos */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <StarRow rating={5}/>
          <span style={{ fontFamily:"DM Mono", fontSize:11, color:"#6b5e56" }}>4.9</span>
          <span style={{ fontFamily:"DM Mono", fontSize:11, color:"#c4b8b0" }}>·</span>
          <span style={{ fontSize:12, color:"#c4b8b0" }}>📄</span>
          <span style={{ fontFamily:"DM Mono", fontSize:11, color:"#6b5e56" }}>32 contratos</span>
        </div>

        {/* Mini card do prestador */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:14, border:"1px solid #ede6e0", backgroundColor:"#fff", cursor:"pointer" }}>
          <div style={{ width:36, height:36, borderRadius:18, backgroundColor:"rgba(224,96,48,0.09)", border:"1px solid rgba(224,96,48,0.20)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:13, color:ACCENT }}>JP</span>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"Sora, sans-serif", fontWeight:600, fontSize:13, color:"#1c1916" }}>João Pereira</div>
            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
              <span style={{ color:ACCENT, fontSize:9 }}>★</span>
              <span style={{ fontFamily:"DM Sans", fontSize:10, color:"#9a8f87" }}>4.8 · 127 avaliações</span>
            </div>
          </div>
          <span style={{ color:"#c4b8b0", fontSize:13 }}>›</span>
        </div>

        {/* Divisor */}
        <div style={{ height:1, backgroundColor:"#ede6e0" }}/>

        {/* Skills */}
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, backgroundColor:"rgba(224,96,48,0.08)", border:"1px solid rgba(224,96,48,0.18)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:12, color:ACCENT }}>★</span>
            </div>
            <span style={{ fontFamily:"DM Mono", fontSize:9, letterSpacing:"0.8px", textTransform:"uppercase", color:"#b3a9a1" }}>Skills</span>
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", paddingLeft:36 }}>
            <Chip label="Elétrica" accent/>
            <Chip label="Enfiação" accent/>
            <Chip label="Baixa tensão" accent/>
            <Chip label="Aterramento" accent/>
            <span style={{ fontSize:11, fontFamily:"DM Sans", fontWeight:600, padding:"4px 10px", borderRadius:100, border:"1px solid rgba(224,96,48,0.20)", backgroundColor:"rgba(224,96,48,0.08)", color:ACCENT }}>+1</span>
          </div>
        </div>

        {/* Tools */}
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, backgroundColor:"rgba(24,160,107,0.08)", border:"1px solid rgba(24,160,107,0.18)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:12, color:GREEN }}>🔑</span>
            </div>
            <span style={{ fontFamily:"DM Mono", fontSize:9, letterSpacing:"0.8px", textTransform:"uppercase", color:"#b3a9a1" }}>Tools</span>
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", paddingLeft:36 }}>
            <Chip label="Furadeira"/>
            <Chip label="Nível a Laser"/>
            <Chip label="Parafusadeira"/>
          </div>
        </div>

        {/* Divisor */}
        <div style={{ height:1, backgroundColor:"#ede6e0" }}/>

        {/* Performance grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            { value:"4.9", label:"NOTA" },
            { value:"48", label:"AVALIAÇÕES" },
            { value:"32", label:"CONTRATOS" },
          ].map((item) => (
            <div key={item.label} style={{ padding:"14px 12px", borderRadius:16, border:"1px solid #ede6e0", backgroundColor:"#fff", display:"flex", flexDirection:"column", gap:4 }}>
              <span style={{ fontFamily:"DM Sans", fontWeight:500, fontSize:22, color:"#1c1916", lineHeight:1 }}>{item.value}</span>
              <span style={{ fontFamily:"DM Mono", fontSize:8, letterSpacing:"0.8px", textTransform:"uppercase", color:"#b3a9a1" }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ marginTop:"auto", paddingTop:8, display:"flex", flexDirection:"column", gap:8 }}>
          <button style={{ width:"100%", padding:"14px", borderRadius:14, backgroundColor:ACCENT, border:"none", cursor:"pointer", fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:15, color:"#fff", letterSpacing:-0.2 }}>
            Contratar serviço
          </button>
          <button style={{ width:"100%", padding:"13px", borderRadius:14, backgroundColor:"transparent", border:"1px solid #ede6e0", cursor:"pointer", fontFamily:"DM Sans", fontWeight:500, fontSize:14, color:"#6b5e56" }}>
            Ver perfil completo
          </button>
        </div>

      </div>
    </div>
  );
}
