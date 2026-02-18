import type { Metadata } from "next";
import { Sora } from "next/font/google";
import Providers from "@/components/layout/Providers";
import "../styles/globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

const sora = Sora({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Logistics Operations",
  description: "Delivery planning and operations management"
};

import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={sora.className}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
