'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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

// 小数第2位で丸めて文字列にするヘルパー
function formatVol(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-';
  }
  return value.toFixed(2); // 例: 23.4300003 → "23.43"
}

// 「基準日 baseDate からどこまでさかのぼるか」を計算
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
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const [data, setData] = useState<VolatilityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [latestDate, setLatestDate] = useState<string | null>(null);

  // ① マウント時に「全シンボルの中で一番新しい日付」を取得
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
        console.log('fetchLatest MAX(date):', data[0].date); // ★追加
        setLatestDate(data[0].date); // "YYYY-MM-DD"
      }
    };
    fetchLatest();
  }, []);


  // 最新値（カード用）: 「今表示している範囲の中で」一番新しい値
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

  // グラフ用データ
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

  // ② latestDate がわかったら、その日付を基準に範囲を計算してデータ取得
  useEffect(() => {
    const fetchData = async () => {
      if (!latestDate) return; // まだ最新日付が取れていない

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
        .limit(5000);          // ★ これを追加！

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

        if (rows.length > 0) {
          const minDate = rows[0].date;
          const maxDate = rows[rows.length - 1].date;
          console.log('fetchData', {
            timeRange,
            from,
            latestDate,
            count: rows.length,
            minDate,
            maxDate,
          }); // ★追加
        }

        setData(rows);
      }
      setLoading(false);
    };

    fetchData();
  }, [timeRange, latestDate]);


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
        <header className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
          <h1 className="text-2xl font-bold">Volatility Dashboard</h1>
          <div className="flex gap-2">
            {TIME_RANGE_LABELS.map((tr) => (
              <button
                key={tr.value}
                onClick={() => setTimeRange(tr.value)}
                className={`rounded-full px-3 py-1 text-sm ${
                  timeRange === tr.value
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </header>

        {/* 最新値カード */}
        <section className="grid gap-4 md:grid-cols-2">
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

        {/* グラフ */}
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
                    // ツールチップ全体の見た目（任意）
                    contentStyle={{
                      backgroundColor: '#020617',
                      border: '1px solid #1f2937',
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: '#e5e7eb' }}
                    // 値のフォーマット部分がポイント
                    formatter={(value: any, name: string) => {
                      const n = Number(value);
                      return [formatVol(n), name]; // [表示する値, ラベル名]
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
        </section>
      </main>
    </div>
  );
}
