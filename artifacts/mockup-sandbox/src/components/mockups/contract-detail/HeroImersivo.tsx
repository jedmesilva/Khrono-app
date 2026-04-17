import "./_group.css";

const ACCENT = "#e06030";
const GREEN = "#00e5a0";

function GridSVG({ opacity }: { opacity: number }) {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      viewBox="0 0 390 280"
      preserveAspectRatio="none"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="280" stroke={ACCENT} strokeWidth="1" opacity={opacity} />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <line key={`h${i}`} x1="0" y1={i * 48} x2="390" y2={i * 48} stroke={ACCENT} strokeWidth="1" opacity={opacity} />
      ))}
    </svg>
  );
}

function ArcSVG() {
  const cx = 100, cy = 100, r = 74;
  const startDeg = -215, sweepTotal = 250, sweepFilled = 250 * 0.77;
  function polar(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function arcPath(start: number, sweep: number) {
    const s = polar(start), e = polar(start + sweep);
    const lg = sweep > 180 ? 1 : 0;
    return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${r} ${r} 0 ${lg} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
  }
  return (
    <svg width="200" height="200" style={{ position: "absolute" }}>
      <path d={arcPath(startDeg, sweepTotal)} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="8" strokeLinecap="round" />
      <path d={arcPath(startDeg, sweepFilled)} fill="none" stroke={ACCENT} strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

function Chip({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span style={{
      fontSize: 11,
      fontFamily: "DM Sans",
      fontWeight: 600,
      padding: "4px 10px",
      borderRadius: 100,
      border: `1px solid ${accent ? "rgba(224,96,48,0.24)" : "rgba(255,255,255,0.12)"}`,
      backgroundColor: accent ? "rgba(224,96,48,0.09)" : "rgba(255,255,255,0.05)",
      color: accent ? ACCENT : "rgba(255,255,255,0.55)",
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function DetailRow({ icon, title, sub, action }: { icon: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        backgroundColor: "#1c1a17",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15, color: "rgba(255,255,255,0.4)",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontFamily: "DM Sans", fontWeight: 500, color: "#F2EFE9", lineHeight: 1.3 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, fontFamily: "DM Mono", color: "#9B9487", marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

export function HeroImersivo() {
  return (
    <div style={{
      width: 390, minHeight: 844,
      backgroundColor: "#0e0d0b",
      fontFamily: "DM Sans, sans-serif",
      overflow: "hidden",
      position: "relative",
      display: "flex", flexDirection: "column",
    }}>

      {/* ── Hero gradient header ────────────────────────────── */}
      <div style={{
        position: "relative", height: 300, overflow: "hidden", flexShrink: 0,
        background: "linear-gradient(135deg, #1d1510 0%, #100e0c 100%)",
      }}>
        <GridSVG opacity={0.07} />

        {/* Decorative background text */}
        <div style={{
          position: "absolute", bottom: -20, left: 14,
          fontFamily: "Sora, sans-serif", fontWeight: 700,
          fontSize: 88, letterSpacing: -3, lineHeight: 1,
          color: ACCENT, opacity: 0.09, pointerEvents: "none",
          userSelect: "none",
        }}>
          KRN
        </div>

        {/* Top-left: status badge */}
        <div style={{
          position: "absolute", top: 52, left: 14,
          display: "flex", alignItems: "center", gap: 5,
          border: "1px solid rgba(0,229,160,0.30)",
          backgroundColor: "rgba(0,229,160,0.12)",
          borderRadius: 100, padding: "4px 9px",
        }}>
          <div style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: GREEN }} />
          <span style={{ fontFamily: "DM Sans", fontSize: 9, letterSpacing: "0.6px", textTransform: "uppercase", color: GREEN }}>ativo</span>
        </div>

        {/* Top-right: contract code */}
        <div style={{
          position: "absolute", top: 52, right: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          backgroundColor: "rgba(255,255,255,0.06)",
          borderRadius: 100, padding: "4px 10px",
        }}>
          <span style={{ fontFamily: "DM Mono", fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.4px" }}>KRN-4F3A8C21</span>
        </div>

        {/* Center: counterparty info */}
        <div style={{
          position: "absolute", top: 94, left: 14, right: 14,
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          <span style={{ fontFamily: "DM Sans", fontSize: 11, color: "rgba(255,255,255,0.40)", letterSpacing: "0.3px" }}>Você contratou</span>
          <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 22, color: "rgba(255,255,255,0.88)", letterSpacing: -0.5, lineHeight: 1.2 }}>João Pereira</span>
        </div>

        {/* Arc + values - centered in bottom half of hero */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          paddingBottom: 16,
        }}>
          <div style={{ position: "relative", width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArcSVG />
            {/* Center text inside arc */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 20 }}>
              <span style={{ fontFamily: "DM Sans", fontWeight: 600, fontSize: 9, letterSpacing: "1.2px", color: "#9B9487", marginBottom: 4 }}>DECORRIDO</span>
              <span style={{ fontFamily: "DM Mono", fontSize: 24, color: "#F2EFE9", lineHeight: 1.2 }}>1h 32m</span>
              <span style={{ fontFamily: "DM Sans", fontSize: 11, color: "#9B9487", marginTop: 2 }}>de 2h total</span>
              <div style={{ width: 28, height: 1, backgroundColor: "rgba(255,255,255,0.10)", margin: "8px 0" }} />
              <span style={{ fontFamily: "DM Sans", fontWeight: 600, fontSize: 18, color: ACCENT, lineHeight: 1.2 }}>R$ 76,00</span>
              <span style={{ fontFamily: "DM Sans", fontSize: 10, color: "#9B9487", marginTop: 2 }}>a pagar</span>
            </div>
          </div>
          {/* Remaining pill */}
          <div style={{
            position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
            backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 100, padding: "4px 14px",
          }}>
            <span style={{ fontFamily: "DM Mono", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>28 min restantes</span>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Detail rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <DetailRow
            icon="🔧"
            title="Instalação Elétrica"
            sub="Eletricidade · R$50/h · ★ 4.8"
          />
          <DetailRow
            icon="📍"
            title="Av. Paulista, 1000 · São Paulo"
            sub="1,2 km de você · Endereço do serviço"
            action={
              <div style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "6px 10px", borderRadius: 20,
                border: `1px solid ${ACCENT}40`,
                backgroundColor: `${ACCENT}18`,
                cursor: "pointer", flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, color: ACCENT, fontFamily: "DM Sans", fontWeight: 500 }}>↗ Navegar</span>
              </div>
            }
          />
          <DetailRow
            icon="⏰"
            title="Iniciado em 17 abr · 14:30"
            sub="Término previsto · 16:30"
          />
          <DetailRow
            icon="⚡"
            title="Pix"
            sub="Na conclusão do serviço"
          />
        </div>

        {/* Skills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: "DM Mono", fontSize: 9, letterSpacing: "0.8px", textTransform: "uppercase", color: "#504840" }}>skills</span>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <Chip label="Elétrica" accent />
            <Chip label="Enfiação" accent />
            <Chip label="Baixa tensão" accent />
            <span style={{ fontSize: 11, fontFamily: "DM Sans", fontWeight: 600, padding: "4px 10px", borderRadius: 100, border: `1px solid rgba(224,96,48,0.24)`, backgroundColor: "rgba(224,96,48,0.09)", color: ACCENT }}>+1</span>
          </div>
        </div>

        {/* Tools */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: "DM Mono", fontSize: 9, letterSpacing: "0.8px", textTransform: "uppercase", color: "#504840" }}>tools</span>
          <div style={{ display: "flex", gap: 5 }}>
            <Chip label="Furadeira" />
            <Chip label="Nível a Laser" />
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <button style={{
            width: "100%", padding: "14px", borderRadius: 14,
            backgroundColor: ACCENT, border: "none", cursor: "pointer",
            fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 15,
            color: "#fff", letterSpacing: -0.2,
          }}>
            Encerrar serviço
          </button>
          <button style={{
            width: "100%", padding: "12px", borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
            fontFamily: "DM Sans", fontWeight: 500, fontSize: 14,
            color: "rgba(255,255,255,0.45)",
          }}>
            Reportar problema
          </button>
        </div>
      </div>
    </div>
  );
}
