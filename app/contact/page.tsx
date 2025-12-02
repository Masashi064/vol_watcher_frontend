// app/contact/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';   // ← 追加


type Category = 'bug' | 'feature' | 'other';

export default function ContactPage() {
  const [category, setCategory] = useState<Category>('feature');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!message.trim()) {
        setError('内容を入力してください。');
        return;
    }

    setSubmitting(true);
    try {
        const userAgent =
        typeof navigator !== 'undefined' ? navigator.userAgent : null;
        const pagePath =
        typeof window !== 'undefined' ? window.location.pathname : null;

        // app/contact/page.tsx の handleSubmit 内
        const { error: insertError } = await supabase
        .from('vol_feedback')
        .insert({
            category,
            message,
            contact: contact || null,
            user_agent: userAgent,
            page_path: pagePath,
        });

        if (insertError) {
        // 個別に見る
        console.error('insertError message:', (insertError as any).message);
        console.error('insertError code:', (insertError as any).code);
        console.error('insertError details:', (insertError as any).details);

        // 必要ならアラートで可視化
        alert(
            'Supabase Error:\n' +
            JSON.stringify(insertError, null, 2),
        );

        setError(
            '送信中にエラーが発生しました。時間をおいて再度お試しください。',
        );
        return;
        }


        setMessage('');
        setContact('');
        setCategory('feature');
        setInfo(
        'フィードバックありがとうございます！今後の改善の参考にさせていただきます。',
        );
    } finally {
        setSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-xl px-4 py-8">
        {/* アイコン＋タイトル＋自己紹介 */}
        <div className="mb-4 flex items-center gap-3">
            <Image
            src="/baree-hiyoko.gif"          // 保存したファイル名に合わせて変更
            alt="Masashi（ぺとり）のアイコン"
            width={56}
            height={56}
            className="rounded-full border border-slate-700"
            />
            <div>
            <h1 className="text-2xl font-bold">ご意見・ご要望</h1>
            <p className="text-xs text-slate-400">
                  Volatility Dashboard を作っている <span className="font-semibold">Masashi（ぺとり）</span> です。
                  使ってみて気づいたことや「こんな機能があれば便利」など、ぜひ教えてください。
            </p>
            </div>
        </div>

        <p className="mb-4 text-sm text-slate-400">
            Volatility Dashboard に関する不具合の報告や、「こんな機能がほしい」といったご要望など、
            なんでも気軽に送っていただけるフォームです。すべてには返信できないかもしれませんが、今後の改善の参考にさせていただきます。
        </p>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow"
        >
          {/* 種類 */}
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-slate-300">
              種類
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCategory('bug')}
                className={
                  category === 'bug'
                    ? 'rounded-full bg-rose-500/20 px-3 py-1 font-semibold text-rose-300'
                    : 'rounded-full bg-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-700'
                }
              >
                不具合
              </button>
              <button
                type="button"
                onClick={() => setCategory('feature')}
                className={
                  category === 'feature'
                    ? 'rounded-full bg-sky-500/20 px-3 py-1 font-semibold text-sky-300'
                    : 'rounded-full bg-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-700'
                }
              >
                機能要望
              </button>
              <button
                type="button"
                onClick={() => setCategory('other')}
                className={
                  category === 'other'
                    ? 'rounded-full bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-300'
                    : 'rounded-full bg-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-700'
                }
              >
                その他
              </button>
            </div>
          </div>

          {/* 内容 */}
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-slate-300">
              内容（必須）
            </label>
            <textarea
              className="h-32 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
              placeholder="例）VIX の過去データを◯年分までさかのぼって見られると嬉しいです、など"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* 連絡先 */}
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-slate-300">
              連絡先（任意）
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
              placeholder="メールアドレスや X のID（返信が必要な場合のみ）"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              原則として個別の回答はお約束できませんが、内容によってはこちらからご連絡を差し上げる場合があります。
            </p>
          </div>

          {/* エラー / 情報表示 */}
          {error && (
            <div className="mb-3 text-xs text-rose-300">{error}</div>
          )}
          {info && (
            <div className="mb-3 text-xs text-emerald-300">{info}</div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-60"
            >
              {submitting ? '送信中…' : '送信する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
