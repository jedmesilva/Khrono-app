import "./_group.css";

const ACCENT = "#e06030";
const GREEN = "#18a06b";
const BG = "#0e0d0b";
const CARD = "#171512";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "rgba(255,255,255,0.88)";
const MUTED = "rgba(255,255,255,0.38)";
const SUB = "rgba(255,255,255,0.55)";

function GridSVG() {
  return (
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox="0 0 358 150" preserveAspectRatio="none">
      {[0,1,2,3,4,5,6].map((i) => (
        <line key={`v${i}`} x1={i*60} y1="0" x2={i*60} y2="150" stroke={ACCENT} strokeWidth="1" opacity={0.07}/>
      ))}
      {[0,1,2,3].map((i) => (
        <line key={`h${i}`} x1="0" y1={i*50} x2="358" y2={i*50} stroke={ACCENT} strokeWidth="1" opacity={0.07}/>
      ))}
    </svg>
  );
}

function Chip({ label, accent, green }: { label: string; accent?: boolean; green?: boolean }) {
  const bg = accent ? "rgba(224,96,48,0.09)" : green ? "rgba(24,160,107,0.09)" : "rgba(255,255,255,0.05)";
  const border = accent ? "rgba(224,96,48,0.24)" : green ? "rgba(24,160,107,0.24)" : BORDER;
  const color = accent ? ACCENT : green ? GREEN : MUTED;
  return (
    <span style={{ fontSize:11, fontFamily:"DM Sans", fontWeight:600, padding:"5px 11px", borderRadius:100, border:`1px solid ${border}`, backgroundColor:bg, color, whiteSpace:"nowrap", flexShrink:0 }}>
      {label}
    </span>
  );
}

export function CardExpandido() {
  return (
    <div style={{ width:390, minHeight:844, backgroundColor:BG, fontFamily:"DM Sans, sans-serif", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* ── Header compacto ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 16px 10px" }}>
        <div style={{ width:34, height:34, borderRadius:17, backgroundColor:"rgba(0,0,0,0.40)", border:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ color:TEXT, fontSize:16 }}>‹</span>
        </div>
        <span style={{ fontFamily:"Sora, sans-serif", fontWeight:600, fontSize:16, color:TEXT, flex:1, letterSpacing:-0.3 }}>Instalação Elétrica</span>
        <div style={{ display:"flex", alignItems:"center", gap:5, border:"1px solid rgba(0,229,160,0.30)", backgroundColor:"rgba(0,229,160,0.10)", borderRadius:100, padding:"4px 10px" }}>
          <div style={{ width:5, height:5, borderRadius:3, backgroundColor:"#00e5a0" }}/>
          <span style={{ fontFamily:"DM Sans", fontSize:9, letterSpacing:"0.6px", textTransform:"uppercase", color:"#00e5a0" }}>ativo</span>
        </div>
      </div>

      <div style={{ flex:1, padding:"4px 16px 24px", display:"flex", flexDirection:"column", gap:12 }}>

        {/* ── Card do prestador — protagonista ── */}
        <div style={{ borderRadius:20, border:`1px solid ${BORDER}`, backgroundColor:CARD, overflow:"hidden" }}>
          <div style={{ padding:"18px 18px 14px", display:"flex", alignItems:"center", gap:14 }}>
            {/* Avatar grande */}
            <div style={{ width:56, height:56, borderRadius:28, backgroundColor:"rgba(224,96,48,0.12)", border:"1.5px solid rgba(224,96,48,0.28)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:20, color:ACCENT }}>JP</span>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:16, color:TEXT, marginBottom:4 }}>João Pereira</div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ display:"flex", gap:2 }}>
                  {[1,2,3,4,5].map((s) => <span key={s} style={{ fontSize:10, color:ACCENT }}>★</span>)}
                </span>
                <span style={{ fontFamily:"DM Mono", fontSize:11, color:SUB }}>4.8</span>
                <span style={{ color:BORDER }}>·</span>
                <span style={{ fontFamily:"DM Sans", fontSize:11, color:MUTED }}>127 avaliações</span>
              </div>
            </div>
            <span style={{ fontSize:12, color:MUTED }}>Ver perfil ›</span>
          </div>

          {/* Divisor */}
          <div style={{ height:1, backgroundColor:BORDER, margin:"0 18px" }}/>

          {/* Mini thumbnail do serviço — no estilo ServiceCard dentro do prestador card */}
          <div style={{ margin:"14px 18px", borderRadius:14, overflow:"hidden", position:"relative", height:150, background:"linear-gradient(135deg, #1d1510 0%, #100e0c 100%)" }}>
            <GridSVG/>
            <div style={{ position:"absolute", bottom:-16, left:10, fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:72, letterSpacing:-3, lineHeight:1, color:ACCENT, opacity:0.09, userSelect:"none" }}>ELÉTR</div>
            <div style={{ position:"absolute", bottom:12, left:14, right:14, display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontFamily:"DM Mono", fontSize:8, letterSpacing:"0.6px", textTransform:"uppercase", color:MUTED, marginBottom:4 }}>KRN-4F3A</div>
                <div style={{ fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:16, color:TEXT, letterSpacing:-0.4, lineHeight:1.1 }}>Instalação Elétrica</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:22, color:ACCENT, lineHeight:1 }}>R$50</div>
                <div style={{ fontFamily:"DM Sans", fontSize:10, color:MUTED }}>/hora</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Skills ── */}
        <div style={{ borderRadius:16, border:`1px solid ${BORDER}`, backgroundColor:CARD, padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:7, backgroundColor:"rgba(224,96,48,0.10)", border:"1px solid rgba(224,96,48,0.20)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:11, color:ACCENT }}>★</span>
            </div>
            <span style={{ fontFamily:"DM Mono", fontSize:9, letterSpacing:"0.8px", textTransform:"uppercase", color:MUTED }}>Skills</span>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <Chip label="Elétrica" accent/><Chip label="Enfiação" accent/><Chip label="Baixa tensão" accent/><Chip label="Aterramento" accent/><Chip label="+1" accent/>
          </div>
        </div>

        {/* ── Tools ── */}
        <div style={{ borderRadius:16, border:`1px solid ${BORDER}`, backgroundColor:CARD, padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:7, backgroundColor:"rgba(24,160,107,0.10)", border:"1px solid rgba(24,160,107,0.20)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:11, color:GREEN }}>🔑</span>
            </div>
            <span style={{ fontFamily:"DM Mono", fontSize:9, letterSpacing:"0.8px", textTransform:"uppercase", color:MUTED }}>Tools</span>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <Chip label="Furadeira" green/><Chip label="Nível a Laser" green/><Chip label="Parafusadeira" green/>
          </div>
        </div>

        {/* ── Performance ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[{ v:"4.9", l:"NOTA" }, { v:"48", l:"AVALIAÇÕES" }, { v:"32", l:"CONTRATOS" }].map((item) => (
            <div key={item.l} style={{ padding:"14px 12px", borderRadius:14, border:`1px solid ${BORDER}`, backgroundColor:CARD, display:"flex", flexDirection:"column", gap:5 }}>
              <span style={{ fontFamily:"DM Sans", fontWeight:500, fontSize:24, color:TEXT, lineHeight:1 }}>{item.v}</span>
              <span style={{ fontFamily:"DM Mono", fontSize:8, letterSpacing:"0.8px", textTransform:"uppercase", color:MUTED }}>{item.l}</span>
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div style={{ marginTop:"auto", paddingTop:4 }}>
          <button style={{ width:"100%", padding:"15px", borderRadius:14, backgroundColor:ACCENT, border:"none", cursor:"pointer", fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:15, color:"#fff", letterSpacing:-0.2 }}>
            Contratar serviço
          </button>
        </div>
      </div>
    </div>
  );
}
