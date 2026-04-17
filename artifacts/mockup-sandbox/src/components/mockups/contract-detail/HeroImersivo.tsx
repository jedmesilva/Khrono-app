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
    <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox="0 0 390 340" preserveAspectRatio="none">
      {[0,1,2,3,4,5,6,7,8].map((i) => (
        <line key={`v${i}`} x1={i*50} y1="0" x2={i*50} y2="340" stroke={ACCENT} strokeWidth="1" opacity={0.07}/>
      ))}
      {[0,1,2,3,4,5,6].map((i) => (
        <line key={`h${i}`} x1="0" y1={i*56} x2="390" y2={i*56} stroke={ACCENT} strokeWidth="1" opacity={0.07}/>
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

export function HeroImersivo() {
  return (
    <div style={{ width:390, minHeight:844, backgroundColor:BG, fontFamily:"DM Sans, sans-serif", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* ── Hero tall (~45% da tela) ── */}
      <div style={{ position:"relative", height:340, flexShrink:0, background:"linear-gradient(160deg, #1d1510 0%, #0e0d0b 100%)", overflow:"hidden" }}>
        <GridSVG/>

        {/* Texto decorativo gigante */}
        <div style={{ position:"absolute", bottom:-24, right:-10, fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:110, letterSpacing:-4, lineHeight:1, color:ACCENT, opacity:0.07, userSelect:"none", pointerEvents:"none" }}>
          ELÉTR
        </div>

        {/* Back button */}
        <div style={{ position:"absolute", top:14, left:14, width:34, height:34, borderRadius:17, backgroundColor:"rgba(0,0,0,0.40)", border:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ color:TEXT, fontSize:16, lineHeight:1 }}>‹</span>
        </div>

        {/* Badge de status */}
        <div style={{ position:"absolute", top:17, right:14, display:"flex", alignItems:"center", gap:5, border:"1px solid rgba(0,229,160,0.30)", backgroundColor:"rgba(0,229,160,0.10)", borderRadius:100, padding:"4px 10px" }}>
          <div style={{ width:5, height:5, borderRadius:3, backgroundColor:"#00e5a0" }}/>
          <span style={{ fontFamily:"DM Sans", fontSize:9, letterSpacing:"0.6px", textTransform:"uppercase", color:"#00e5a0" }}>ativo</span>
        </div>

        {/* Conteúdo central do hero */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 20px 24px", background:"linear-gradient(to top, rgba(14,13,11,0.95) 0%, transparent 100%)" }}>
          <div style={{ fontFamily:"DM Mono", fontSize:9, letterSpacing:"0.8px", textTransform:"uppercase", color:MUTED, marginBottom:8 }}>serviço · KRN-4F3A</div>
          <div style={{ fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:26, color:TEXT, letterSpacing:-0.8, lineHeight:1.15, marginBottom:12 }}>
            Instalação Elétrica
          </div>

          {/* Rating inline */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
            <span style={{ display:"flex", gap:2 }}>
              {[1,2,3,4,5].map((s) => <span key={s} style={{ fontSize:12, color:ACCENT }}>★</span>)}
            </span>
            <span style={{ fontFamily:"DM Mono", fontSize:12, color:SUB }}>4.9</span>
            <span style={{ color:BORDER, fontSize:12 }}>·</span>
            <span style={{ fontFamily:"DM Sans", fontSize:12, color:MUTED }}>48 avaliações</span>
            <span style={{ color:BORDER, fontSize:12 }}>·</span>
            <span style={{ fontFamily:"DM Sans", fontSize:12, color:MUTED }}>32 contratos</span>
          </div>

          {/* Preço */}
          <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
            <span style={{ fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:32, color:ACCENT, lineHeight:1 }}>R$50</span>
            <span style={{ fontFamily:"DM Sans", fontSize:12, color:MUTED }}>/hora</span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex:1, padding:"14px 16px 24px", display:"flex", flexDirection:"column", gap:12 }}>

        {/* Mini card do prestador — compacto */}
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, border:`1px solid ${BORDER}`, backgroundColor:CARD, cursor:"pointer" }}>
          <div style={{ width:32, height:32, borderRadius:16, backgroundColor:"rgba(224,96,48,0.12)", border:"1px solid rgba(224,96,48,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:12, color:ACCENT }}>JP</span>
          </div>
          <div style={{ flex:1 }}>
            <span style={{ fontFamily:"Sora, sans-serif", fontWeight:600, fontSize:13, color:TEXT }}>João Pereira</span>
            <span style={{ fontFamily:"DM Sans", fontSize:10, color:MUTED, marginLeft:8 }}>★ 4.8 · 127 avaliações</span>
          </div>
          <span style={{ color:MUTED, fontSize:14 }}>›</span>
        </div>

        {/* Skills — overflow horizontal */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
            <span style={{ fontFamily:"DM Mono", fontSize:9, letterSpacing:"0.8px", textTransform:"uppercase", color:MUTED }}>Skills</span>
          </div>
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
            <Chip label="Elétrica" accent/><Chip label="Enfiação" accent/><Chip label="Baixa tensão" accent/><Chip label="Aterramento" accent/>
            <Chip label="+1" accent/>
          </div>
        </div>

        {/* Tools — overflow horizontal */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
            <span style={{ fontFamily:"DM Mono", fontSize:9, letterSpacing:"0.8px", textTransform:"uppercase", color:MUTED }}>Tools</span>
          </div>
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
            <Chip label="Furadeira" green/><Chip label="Nível a Laser" green/><Chip label="Parafusadeira" green/>
          </div>
        </div>

        {/* Performance grid — 3 colunas */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:4 }}>
          {[{ v:"4.9", l:"NOTA" }, { v:"48", l:"AVALIAÇÕES" }, { v:"32", l:"CONTRATOS" }].map((item) => (
            <div key={item.l} style={{ padding:"14px 12px", borderRadius:14, border:`1px solid ${BORDER}`, backgroundColor:CARD, display:"flex", flexDirection:"column", gap:5 }}>
              <span style={{ fontFamily:"DM Sans", fontWeight:500, fontSize:24, color:TEXT, lineHeight:1 }}>{item.v}</span>
              <span style={{ fontFamily:"DM Mono", fontSize:8, letterSpacing:"0.8px", textTransform:"uppercase", color:MUTED }}>{item.l}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop:"auto", paddingTop:4 }}>
          <button style={{ width:"100%", padding:"15px", borderRadius:14, backgroundColor:ACCENT, border:"none", cursor:"pointer", fontFamily:"Sora, sans-serif", fontWeight:700, fontSize:15, color:"#fff", letterSpacing:-0.2 }}>
            Contratar serviço
          </button>
        </div>
      </div>
    </div>
  );
}
