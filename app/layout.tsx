import type { Metadata } from "next";
import Link from "next/link";
import { Manrope } from "next/font/google";
import { POLICY_VERSION, THRESHOLDS } from "@/lib/policy";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReleaseGate",
  description: "Release readiness and approval for AI models.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} dark h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="px-4 pt-3 sm:px-6 sm:pt-4">
          <div className="border-line-strong bg-card/85 mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 rounded-full border pr-5 pl-2.5 shadow-[inset_0_1px_0_rgb(236_255_234/0.08),0_10px_30px_-14px_rgb(0_0_0/0.5)]">
            <Link href="/" className="group flex items-center gap-3 rounded-full pr-2 text-[15px] font-semibold tracking-[-0.02em]">
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-full border border-[rgb(169_198_175/0.7)] font-[Georgia,'Times_New_Roman',serif] text-[13px] font-normal tracking-[-0.06em] transition-[border-color,rotate] duration-500 ease-out-expo group-hover:border-primary motion-safe:group-hover:-rotate-12"
              >
                RG
              </span>
              ReleaseGate
            </Link>
            <p className="text-muted-foreground hidden text-xs font-medium sm:block">
              Policy {POLICY_VERSION} · {Object.keys(THRESHOLDS).length} mandatory checks
            </p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
      </body>
    </html>
  );
}
