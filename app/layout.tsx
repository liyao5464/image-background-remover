import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Background Remover – Remove Background Online",
  description:
    "Remove background from images instantly with our online background remover. No signup, no storage, fast transparent PNG export.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
