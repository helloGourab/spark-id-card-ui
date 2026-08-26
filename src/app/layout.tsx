import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gourab | Spark Badge",
  description: "Animated credential badge in rain for Gourab",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-black">
      <body className="w-screen h-screen bg-black overflow-hidden m-0 p-0 antialiased">
        {children}
      </body>
    </html>
  );
}
