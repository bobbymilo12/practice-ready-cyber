import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { signOut, useConnection } from "@/lib/backend";
import { useApp } from "@/lib/store";
import "@/marketing.css";

export function ContactLink({
  children = "Contact Us",
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Link to="/contact" className={className}>
      {children}
    </Link>
  );
}

export function MarketingShell({
  children,
  home = false,
}: {
  children: ReactNode;
  home?: boolean;
}) {
  const account = useApp((s) => s.account);
  const saving = useConnection((s) => s.saving);
  const [error, setError] = useState("");
  return (
    <div
      className={`marketing min-h-screen bg-background text-foreground${home ? " marketing-home" : ""}`}
    >
      <a href="#main-content" className="marketing-skip">
        Skip to content
      </a>
      <header className="marketing-header">
        <div className="marketing-wrap marketing-header-inner">
          <Link to="/" className="marketing-brand" aria-label="PracticeReady home">
            <span className="marketing-monogram">P</span>
            <span>PracticeReady</span>
          </Link>
          <nav aria-label="Main navigation" className="marketing-nav">
            <Link to="/about">About Us</Link>
            <Link to="/faqs">FAQs</Link>
            <ContactLink />
          </nav>
          <div className="marketing-account">
            {account ? (
              <>
                <Link
                  to={account.role === "manager" ? "/dashboard" : "/staff"}
                  className="marketing-login"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => void signOut().catch((e) => setError(e.message))}
                  className="cursor-pointer rounded-lg border border-transparent px-3 py-2 text-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link to="/auth" className="marketing-login">
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>
      {saving && (
        <p role="status" className="marketing-wrap pt-3 text-sm">
          Saving practice changes…
        </p>
      )}
      {error && (
        <p role="alert" className="marketing-wrap pt-3 text-destructive">
          {error}
        </p>
      )}
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="marketing-footer">
        <div className="marketing-wrap">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="font-display text-lg font-semibold">
              PracticeReady
            </Link>
            <ContactLink className="text-sm underline underline-offset-4" />
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            PracticeReady supports local onboarding and does not replace statutory or mandatory
            training, clinical protocols or manager judgement.
          </p>
        </div>
      </footer>
    </div>
  );
}
