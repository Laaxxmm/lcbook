import { ImageResponse } from "next/og";
import { OG_SIZE, ogCard } from "@/app/_lib/og";

// Site-level share card (P1-5). Generated, so there is no binary asset to keep in sync with
// the brand. Every page had og:title/description but no image, so a WhatsApp share rendered
// as a grey stub.
export const alt = "Learn Crew Publications — entrance-exam book sets";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    ogCard({
      eyebrow: "PGCET  ·  MAT  ·  CAT  ·  CLAT",
      title: "Entrance-exam book sets",
      lines: ["Printed sets, one clear price", "Shipping included, dispatched from Bengaluru"],
    }),
    size,
  );
}
