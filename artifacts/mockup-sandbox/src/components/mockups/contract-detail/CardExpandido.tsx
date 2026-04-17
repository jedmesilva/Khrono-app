import "./_group.css";

const ACCENT = "#e06030";
const GREEN = "#00e5a0";

function GridSVG() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      viewBox="0 0 390 168"
      preserveAspectRatio="none"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <line key={`v${i}`} x1={i * 56} y1="0" x2={i * 56} y2="168" stroke={ACCENT} strokeWidth="1" opacity={0.05} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`h${i}`} x1="0" y1={i * 42} x2="390" y2={i * 42} stroke={ACCENT} strokeWidth="1" opacity={0.05} />
      ))}
    </svg>
  );
}

function Chip({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontFamily: "DM Sans", fontWeight: 600,
      padding: "4px 10px", borderRadius: 100,
      border: `1px solid ${accent ? "rgba(224,96,48,0.22)" : "rgba(0,0,0,0.10)"}`,
      backgroundColor: accent ? "rgba(224,96,48,0.07)" : "rgba(0,0,0,0.04)",
      color: accent ? ACCENT : "#7a7060",
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function DetailRow({
  icon, title, sub, action, last,
}: {
  icon: string; title: string; sub?: string; action?: React.ReactNode; last?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      paddingBottom: last ? 0 : 14,
      borderBottom: last ? "none" : "1px solid rgba(0,0,0,0.07)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        backgroundColor: "#F4EDE6",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontFamily: "DM Sans", fontWeight: 500, color: "#2C2A26", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        {sub && <div style={{ fontSize: 11, fontFamily: "DM Mono", color: "#9B9487", marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

export function CardExpandido() {
  return (
    <div style={{
      width: 390, minHeight: 844,
      backgroundColor: "#FDF3EE",
      fontFamily: "DM Sans, sans-serif",
      overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>

      {/* ── Thumbnail — igual ao ServiceCard ───────────────── */}
      <div style={{
        position: "relative", height: 168, overflow: "hidden", flexShrink: 0,
        background: "linear-gradient(135deg, #f0e9e3 0%, #f8f5f2 100%)",
      }}>
        <GridSVG />

        {/* Decorative large text */}
        <div style={{
          position: "absolute", bottom: -20, left: 12,
          fontFamily: "Sora, sans-serif", fontWeight: 700,
          fontSize: 76, letterSpacing: -3, lineHeight: 1,
          color: ACCENT, opacity: 0.06,
          userSelect: "none",
        }}>
          ELÉTR
        </div>

        {/* Status badge — top-left */}
        <div style={{
          position: "absolute", top: 10, left: 10,
          display: "flex", alignItems: "center", gap: 5,
          border: "1px solid rgba(0,229,160,0.30)",
          backgroundColor: "rgba(0,229,160,0.10)",
          borderRadius: 100, padding: "4px 9px",
        }}>
          <div style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: GREEN }} />
          <span style={{ fontFamily: "DM Sans", fontSize: 9, letterSpacing: "0.6px", textTransform: "uppercase", color: GREEN }}>ativo</span>
        </div>

        {/* Contract code — top-right */}
        <div style={{
          position: "absolute", top: 10, right: 10,
          border: "1px solid rgba(192,98,42,0.18)",
          backgroundColor: "rgba(192,98,42,0.08)",
          borderRadius: 100, padding: "4px 10px",
        }}>
          <span style={{ fontFamily: "DM Mono", fontSize: 10, color: "#C0622A", letterSpacing: "0.4px" }}>KRN-4F3A8C21</span>
        </div>
      </div>

      {/* ── Card body ──────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Counterparty + role header */}
        <div style={{
          padding: "14px 16px 12px",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <span style={{ fontFamily: "DM Sans", fontSize: 11, color: "#9B7060" }}>Você prestou serviço para</span>
            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 20, color: "#2C2A26", letterSpacing: -0.4, lineHeight: 1.2, marginTop: 2 }}>
              Mariana Souza
            </div>
          </div>
          {/* Value block */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 22, color: "#C0622A", lineHeight: 1 }}>R$ 76,00</div>
            <div style={{ fontFamily: "DM Sans", fontSize: 10, color: "#9B9487", marginTop: 3 }}>a receber</div>
          </div>
        </div>

        {/* Timer block */}
        <div style={{
          margin: "0 16px",
          padding: "16px 0",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <span style={{ fontFamily: "DM Mono", fontSize: 9, letterSpacing: "0.8px", textTransform: "uppercase", color: "#9B9487" }}>tempo decorrido</span>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "DM Mono", fontSize: 36, color: "#2C2A26", lineHeight: 1, letterSpacing: -1 }}>01:32:45</span>
            <span style={{ fontFamily: "DM Sans", fontSize: 12, color: "#9B9487", paddingBottom: 4 }}>de 2h total</span>
          </div>
          {/* Progress bar */}
          <div style={{
            height: 5, borderRadius: 3, backgroundColor: "#F4D0BC", overflow: "hidden",
          }}>
            <div style={{ height: "100%", width: "77%", borderRadius: 3, backgroundColor: ACCENT }} />
          </div>
          <span style={{ fontFamily: "DM Sans", fontSize: 11, color: "#9B7060" }}>28 min restantes</span>
        </div>

        {/* Detail rows */}
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <DetailRow
            icon="🔧"
            title="Instalação Elétrica"
            sub="Eletricidade · R$50/h · ★ 4.8"
          />
          <DetailRow
            icon="📍"
            title="Av. Paulista, 1000 · SP"
            sub="1,2 km · Endereço do serviço"
            action={
              <div style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "6px 10px", borderRadius: 20,
                border: `1px solid ${ACCENT}40`,
                backgroundColor: `${ACCENT}10`,
                cursor: "pointer", flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, color: ACCENT, fontFamily: "DM Sans", fontWeight: 500 }}>↗ Navegar</span>
              </div>
            }
          />
          <DetailRow
            icon="⚡"
            title="Pix"
            sub="Na conclusão do serviço"
            last
          />
        </div>

        {/* Skills + Tools */}
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: "DM Mono", fontSize: 9, letterSpacing: "0.8px", textTransform: "uppercase", color: "#9B9487" }}>skills</span>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <Chip label="Elétrica" accent />
              <Chip label="Enfiação" accent />
              <Chip label="Baixa tensão" accent />
              <span style={{ fontSize: 11, fontFamily: "DM Sans", fontWeight: 600, padding: "4px 10px", borderRadius: 100, border: "1px solid rgba(224,96,48,0.22)", backgroundColor: "rgba(224,96,48,0.07)", color: ACCENT }}>+1</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: "DM Mono", fontSize: 9, letterSpacing: "0.8px", textTransform: "uppercase", color: "#9B9487" }}>tools</span>
            <div style={{ display: "flex", gap: 5 }}>
              <Chip label="Furadeira" />
              <Chip label="Nível a Laser" />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: "16px", marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
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
            backgroundColor: "transparent",
            border: "1px solid rgba(192,98,42,0.20)", cursor: "pointer",
            fontFamily: "DM Sans", fontWeight: 500, fontSize: 14,
            color: "#9B7060",
          }}>
            Reportar problema
          </button>
        </div>
      </div>
    </div>
  );
}
