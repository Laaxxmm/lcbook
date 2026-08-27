import type { ReactElement } from "react";

// Shared 1200x630 share card, brand palette (§16). Used by app/opengraph-image.tsx and
// app/[sku]/opengraph-image.tsx so the two cards can't drift apart.
//
// NO RUPEE SIGN IN HERE. next/og ships a single font, noto-sans-v27-**latin**, and ₹ (U+20B9)
// is outside that subset — it renders as tofu. Prices on these cards say "Rs." instead, the
// same way llms.txt does. Loading a font just for one glyph is not worth a network fetch on
// every card render.

export const OG_SIZE = { width: 1200, height: 630 };

const GREEN = "#0E3B2E";
const GOLD = "#E8A33D";
const CREAM = "#FAF7F2";

export function ogCard({
  eyebrow,
  title,
  lines,
}: {
  eyebrow: string;
  title: string;
  lines: string[];
}): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: GREEN,
        padding: "72px 80px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 4,
            fontWeight: 700,
            color: GOLD,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
        <div style={{ display: "flex", width: 96, height: 6, background: GOLD, marginTop: 24 }} />
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 82,
            lineHeight: 1.08,
            fontWeight: 800,
            color: CREAM,
            letterSpacing: -2,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
          {lines.map((l) => (
            <div key={l} style={{ display: "flex", fontSize: 34, color: "rgba(250,247,242,0.82)" }}>
              {l}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `2px solid rgba(232,163,61,0.35)`,
          paddingTop: 28,
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: CREAM }}>
          Learn Crew Publications
        </div>
        <div style={{ display: "flex", fontSize: 28, color: GOLD }}>
          publications.learncrew.org
        </div>
      </div>
    </div>
  );
}
