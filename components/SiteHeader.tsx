// components/SiteHeader.tsx
'use client';

import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* 左側：サイトタイトル */}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Volatility Dashboard</h1>
        </div>

        {/* 右側：ナビボタン */}
        <nav className="flex items-center gap-2">
          {/* HOME ボタン */}
          <Link
            href="/"
            className="rounded-full border border-slate-700 px-3 py-1 text-sm hover:bg-slate-800"
          >
            HOME
          </Link>

          {/* 将来ログインを戻すときは、ここにボタンを復活させる */}
          {/*
          <button
            type="button"
            onClick={handleLogin}
            className="rounded-full border border-sky-500 px-3 py-1 text-sm font-medium text-sky-200 hover:bg-sky-500/10"
          >
            Login
          </button>
          */}
        </nav>
      </div>
    </header>
  );
}
