// components/SiteHeader.tsx
'use client';

import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* 左側：サイトタイトル（HOMEへのリンク） */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-2xl font-bold text-slate-100 transition-colors hover:text-emerald-300"
          >
            Volatility Dashboard
          </Link>
        </div>

        {/* 右側：ご意見ボタン */}
        <nav className="flex items-center gap-2">
          <Link
            href="/contact"
            title="ご意見・ご要望フォーム"
            className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-100 hover:bg-slate-800"
          >
            開発者へ連絡
          </Link>
        </nav>
      </div>
    </header>
  );
}
