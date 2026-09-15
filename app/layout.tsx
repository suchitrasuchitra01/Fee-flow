import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FeeFlow | Student Fee Portal",
  description: "A transparent and simple student fee portal."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
