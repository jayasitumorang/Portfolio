import { ImageResponse } from "next/og";
import { layers, profile } from "@/data/profile";

export const alt = `${profile.name}, ${profile.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: 72, background: "#0e1522", color: "#f4f6f9", fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: "#8b95a8" }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#3ccf8e" }} />
          {profile.role} · {profile.location}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>Jaya Pangihutan</div>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05, color: "#7d9cff" }}>Situmorang</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {layers.map((l) => (
            <div
              key={l.id}
              style={{ display: "flex", padding: "12px 20px", borderRadius: 12, border: "2px solid #263044", fontSize: 26 }}
            >
              {l.label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
