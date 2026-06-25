import "../styles/globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Header from "../components/layout/Header"
import Footer from "../components/layout/Footer"
import { SITE_URL } from "../lib/seo"

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" })

const title = "Transparent.hr — poslovi s vidljivom plaćom"
const description = "Pretraži oglase za posao u Hrvatskoj koji otvoreno prikazuju plaću u EUR."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: "%s | Transparent.hr" },
  description,
  openGraph: {
    title,
    description,
    url: SITE_URL,
    siteName: "Transparent.hr",
    type: "website",
    locale: "hr_HR",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr" className={inter.variable}>
      <body>
        <Header />
        <div className="container page-content">{children}</div>
        <Footer />
      </body>
    </html>
  )
}
