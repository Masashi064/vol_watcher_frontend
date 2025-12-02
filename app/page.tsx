'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type Symbol = 'VIX' | 'NIKKEI_VI';

type VolatilityRow = {
  date: string;
  symbol: Symbol;
  close: number;
};

type TimeRange = '1M' | '1Y' | '3Y' | '5Y' | '10Y';

const TIME_RANGE_LABELS: { value: TimeRange; label: string }[] = [
  { value: '1M', label: '1ヶ月' },
  { value: '1Y', label: '1年' },
  { value: '3Y', label: '3年' },
  { value: '5Y', label: '5年' },
  { value: '10Y', label: '10年' },
];

function formatVol(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-';
  }
  return value.toFixed(2);
}

function calcFromDate(range: TimeRange, baseDate: Date): string {
  const d = new Date(baseDate);
  switch (range) {
    case '1M':
      d.setMonth(d.getMonth() - 1);
      break;
    case '1Y':
      d.setFullYear(d.getFullYear() - 1);
      break;
    case '3Y':
      d.setFullYear(d.getFullYear() - 3);
      break;
    case '5Y':
      d.setFullYear(d.getFullYear() - 5);
      break;
    case '10Y':
      d.setFullYear(d.getFullYear() - 10);
      break;
  }
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const [data, setData] = useState<VolatilityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [latestDate, setLatestDate] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from('volatility_prices')
        .select('date')
        .in('symbol', ['VIX', 'NIKKEI_VI'])
        .order('date', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching latest date:', error);
        return;
      }
      if (data && data.length > 0) {
        setLatestDate(data[0].date);
      }
    };
    fetchLatest();
  }, []);

  const latestBySymbol = useMemo(() => {
    const map = new Map<Symbol, VolatilityRow>();
    for (const row of data) {
      const existing = map.get(row.symbol);
      if (!existing || existing.date < row.date) {
        map.set(row.symbol, row);
      }
    }
    return map;
  }, [data]);

  const chartData = useMemo(() => {
    const byDate = new Map<
      string,
      { date: string; VIX?: number; NIKKEI_VI?: number }
    >();
    for (const row of data) {
      if (!byDate.has(row.date)) {
        byDate.set(row.date, { date: row.date });
      }
      const entry = byDate.get(row.date)!;
      entry[row.symbol] = row.close;
    }
    return Array.from(byDate.values()).sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    );
  }, [data]);

  useEffect(() => {
    const fetchData = async () => {
      if (!latestDate) return;

      setLoading(true);
      const base = new Date(latestDate);
      const from = calcFromDate(timeRange, base);

      const { data, error } = await supabase
        .from('volatility_prices')
        .select('date,symbol,close')
        .gte('date', from)
        .lte('date', latestDate)
        .in('symbol', ['VIX', 'NIKKEI_VI'])
        .order('date', { ascending: true })
        .limit(5000);

      if (error) {
        console.error('Error fetching data:', error);
        setData([]);
      } else {
        const rows =
          data?.map((row: any) => ({
            date: row.date,
            symbol: row.symbol as Symbol,
            close: Number(row.close),
          })) ?? [];
        setData(rows);
      }
      setLoading(false);
    };

    fetchData();
  }, [timeRange, latestDate]);

  return (
    <>
      {/* 上部ヘッダー：アラートボタン（キラキラ） */}
      <header className="mb-6 flex justify-end">
        <Link
          href="/alerts"
          className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg hover:bg-emerald-400"
        >
          アラートを作成
        </Link>
      </header>

      {/* 最新値カード */}
      <section className="mb-6 grid gap-4 md:grid-cols-2">
        {(['VIX', 'NIKKEI_VI'] as Symbol[]).map((symbol) => {
          const latest = latestBySymbol.get(symbol);
          return (
            <div
              key={symbol}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-400">
                    {symbol === 'VIX'
                      ? 'VIX（米国恐怖指数）'
                      : '日経平均ボラティリティ・インデックス'}
                  </div>
                  <div className="mt-1 text-3xl font-semibold">
                    {formatVol(latest?.close)}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {latest
                    ? `最終更新: ${latest.date}`
                    : latestDate
                    ? `最終更新: ${latestDate}`
                    : 'データなし'}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* グラフ＋期間タブ */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow">
        <h2 className="mb-4 text-lg font-semibold">推移グラフ</h2>

        {!latestDate ? (
          <div className="py-12 text-center text-slate-400">
            最新日付を取得中...
          </div>
        ) : loading ? (
          <div className="py-12 text-center text-slate-400">読み込み中...</div>
        ) : chartData.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            データがありません。
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  minTickGap={16}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value: number) => value.toFixed(1)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #1f2937',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(value: any, name: string) => {
                    const n = Number(value);
                    return [formatVol(n), name];
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="NIKKEI_VI"
                  stroke="#38bdf8"
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="VIX"
                  stroke="#22c55e"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 期間ボタン：中央・少し大きめ・目立つタブ風 */}
        <div className="mt-6 border-t border-slate-800 pt-4">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-1 shadow-inner">
              {TIME_RANGE_LABELS.map((tr) => {
                const active = timeRange === tr.value;
                return (
                  <button
                    key={tr.value}
                    type="button"
                    onClick={() => setTimeRange(tr.value)}
                    className={`relative rounded-full px-3 py-1.5 text-sm font-medium transition
                      ${
                        active
                          ? 'bg-sky-500/20 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.7)]'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-slate-50'
                      }`}
                  >
                    {tr.label}
                    {active && (
                      <span className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-sky-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
