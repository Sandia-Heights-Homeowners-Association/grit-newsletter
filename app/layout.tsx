import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The GRIT - Newsletter Submission System",
  description: "Guiding Residents, Inspiring Togetherness - Sandia Heights Homeowners Association Newsletter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
