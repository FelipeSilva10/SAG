import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "SAG",
  description: "Painel de gestão",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "",
            style: {
              fontWeight: 600,
              fontSize: "14px",
              borderRadius: "8px",
              padding: "12px 20px",
            },
            success: { style: { background: "#28a745", color: "white" } },
            error:   { style: { background: "#e53e3e", color: "white" } },
          }}
        />
      </body>
    </html>
  );
}
