import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 md:flex-row md:justify-between md:items-center">
        <div className="max-w-sm">
          <div className="flex items-center gap-3">
            <Logo size={34} />
          </div>
          <p className="mt-6 text-sm leading-relaxed text-slate-500">
            Protect signup forms from disposable emails, bot traffic, and bad lead data without rebuilding your site.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-12 text-sm text-slate-500 md:grid-cols-3">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Product</p>
            <a href="#features" className="block transition hover:text-slate-900">
              Features
            </a>
            <a href="#pricing" className="block transition hover:text-slate-900">
              Pricing
            </a>
            <a href="#demo" className="block transition hover:text-slate-900">
              Demo
            </a>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Developers</p>
            <Link href="/docs" className="block transition hover:text-slate-900">
              Documentation
            </Link>
            <Link href="/blog" className="block transition hover:text-slate-900">
              Blog
            </Link>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Account</p>
            <Link href="/login" className="block transition hover:text-slate-900">
              Log in
            </Link>
            <Link href="/signup" className="block transition hover:text-slate-900">
              Start free
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-6xl px-6 text-center text-xs font-semibold text-slate-400">
        © {new Date().getFullYear()} LeadCop. Lead validation, simplified.
      </div>
    </footer>
  );
}
