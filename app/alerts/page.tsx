'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type SymbolCode = 'VIX' | 'NIKKEI_VI';

type Severity = 'notice' | 'warning';

type RuleId = 'VIX_25' | 'VIX_40' | 'NIKKEI_30' | 'NIKKEI_45';

type RuleDef = {
  id: RuleId;
  symbol: SymbolCode;
  direction: '>=' | '<=';
  threshold: number;
  severity: Severity;
  title: string;
  description: string;
};

// 固定4ルールの定義
const RULE_DEFS: RuleDef[] = [
  {
    id: 'VIX_25',
    symbol: 'VIX',
    direction: '>=',
    threshold: 25,
    severity: 'notice',
    title: 'VIX が 25 以上になったら「注意」',
    description:
      'VIX が 25 を超えると、平常時よりボラティリティが高まり、市場がざわつき始めている水準と考えられます。調整局面に備え、リスク資産やレバレッジの見直しを意識したいゾーンです。',
  },
  {
    id: 'VIX_40',
    symbol: 'VIX',
    direction: '>=',
    threshold: 40,
    severity: 'warning',
    title: 'VIX が 40 以上になったら「警告」',
    description:
      'VIX が 40 を超える局面は、リーマンショックやコロナショックのような「危機モード」で見られる水準です。大きな値動きやパニック的な売買が起こりやすく、資金管理と防御的な姿勢が特に重要になります。',
  },
  {
    id: 'NIKKEI_30',
    symbol: 'NIKKEI_VI',
    direction: '>=',
    threshold: 30,
    severity: 'notice',
    title: '日経VI が 30 以上になったら「注意」',
    description:
      '日経VI が 30 を超えると、日本株市場でもボラティリティの上昇がはっきりと見え始めます。日本固有のニュースやイベントで相場が落ち着かなくなっている可能性があり、日本株ポジションを慎重に見直したい水準です。',
  },
  {
    id: 'NIKKEI_45',
    symbol: 'NIKKEI_VI',
    direction: '>=',
    threshold: 45,
    severity: 'warning',
    title: '日経VI が 45 以上になったら「警告」',
    description:
      '日経VI が 45 を超えると、日本株市場はかなりの荒れ相場になっていると考えられます。急落・急反発が起こりやすく、追証や強制ロスカットも発生しやすいゾーンです。無理に取り返そうとせず、キャッシュポジションも選択肢として意識したい水準です。',
  },
];

type EnabledMap = Record<RuleId, boolean>;

const INITIAL_ENABLED: EnabledMap = {
  VIX_25: true,
  VIX_40: true,
  NIKKEI_30: true,
  NIKKEI_45: true,
};

export default function AlertsPage() {
  const [enabledMap, setEnabledMap] = useState<EnabledMap>(INITIAL_ENABLED);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleToggleRule = (id: RuleId) => {
    setEnabledMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ★ 追加：全てON / 全てOFF のヘルパー
  const setAllRules = (value: boolean) => {
    setEnabledMap((prev) => {
      const next = { ...prev };
      RULE_DEFS.forEach((rule) => {
        next[rule.id] = value;
      });
      return next;
    });
  };

  const handleSave = async () => {
    setMessage(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage('メールアドレスを入力してください。');
      return;
    }

    setSaving(true);
    try {
      // このメールアドレスの既存設定を削除
      const { error: deleteError } = await supabase
        .from('alert_rules')
        .delete()
        .eq('email', trimmedEmail);

      if (deleteError) {
        console.error(deleteError);
        setMessage('保存中にエラーが発生しました。（削除時）');
        return;
      }

      const anyEnabled = Object.values(enabledMap).some((v) => v);

      // 1つもチェックが付いていなければ「全部解除」
      if (!anyEnabled) {
        setMessage('すべてのアラートを解除しました。いつでもまた登録できます。');
        return;
      }

      // ON になっているルールだけ保存
      const payload = RULE_DEFS.filter((rule) => enabledMap[rule.id]).map(
        (rule) => ({
          user_id: null, // パターンAでは user_id は使わない
          email: trimmedEmail,
          symbol_code: rule.symbol,
          direction: rule.direction,
          threshold: rule.threshold,
          severity: rule.severity,
          enabled: true,
        }),
      );

      const { error: insertError } = await supabase
        .from('alert_rules')
        .insert(payload);

      if (insertError) {
        console.error(insertError);
        setMessage('保存中にエラーが発生しました。（登録時）');
      } else {
        setMessage(
          'アラート条件を保存しました！アラートが不要になったら、同じメールアドレスでチェックを全部外して保存すれば、いつでも解除できます。',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const renderSeverityBadge = (severity: Severity) => {
    if (severity === 'warning') {
      return (
        <span className="rounded-full border border-red-400 px-2 py-0.5 text-[10px] font-semibold text-red-300">
          警告レベル
        </span>
      );
    }
    return (
      <span className="rounded-full border border-amber-400 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
        注意レベル
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* 共通ヘッダー */}
        <h1 className="mb-2 text-2xl font-bold">ボラティリティ・アラート設定</h1>

        <p className="text-sm text-slate-400">
          恐怖指数（VIX / 日経VI）がある段階を超えたとき、指定したメールアドレスに
          アラートメールを送信するサービスです（無料）。
        </p>

        {/* ルール一覧 */}
        <div className="mb-6 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">アラートルール</h2>
            </div>

            {/* ★ 追加：全てON / 全てOFF ボタン */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAllRules(true)}
                className="rounded-full border border-emerald-400 px-3 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/10"
              >
                すべてON
              </button>
              <button
                type="button"
                onClick={() => setAllRules(false)}
                className="rounded-full border border-slate-500 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700/60"
              >
                すべてOFF
              </button>
            </div>
          </div>

          <p className="mb-2 text-xs text-slate-500">
            各ルールの「？」アイコンにマウスオーバーすると、どのような相場環境を想定した水準か説明が表示されます。
          </p>

          <div className="space-y-3">
            {RULE_DEFS.map((rule) => {
              const enabled = enabledMap[rule.id];
              return (
                <div
                  key={rule.id}
                  className="flex flex-col gap-3 rounded-xl bg-slate-950/60 p-3 md:flex-row md:items-start md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    {/* ON/OFF チェックボックス */}
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => handleToggleRule(rule.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />

                    {/* タイトル＋説明＋ツールチップ */}
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{rule.title}</div>
                        <button
                          type="button"
                          className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-xs text-slate-300 hover:border-emerald-400 hover:text-emerald-300"
                          title={rule.description}
                        >
                          ?
                        </button>
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {rule.symbol === 'VIX'
                          ? '対象指数: VIX（米国）'
                          : '対象指数: 日経平均ボラティリティ・インデックス（日経VI）'}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        閾値: {rule.symbol} {rule.direction} {rule.threshold}
                      </div>
                    </div>
                  </div>

                  {/* レベル表示 */}
                  <div className="flex items-start justify-end md:items-center">
                    {renderSeverityBadge(rule.severity)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* メールアドレス入力 */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <label className="block text-sm text-slate-300">
            アラート送信先メールアドレス
          </label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="mt-2 text-xs text-slate-500">
            上記のアラートルールに従って、指定のメールアドレスに注意喚起のメールを送信します(いつでも解除できます)。
          </p>
        </div>

        {/* 保存ボタン＆メッセージ */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {saving ? '保存中…' : 'アラート条件を保存'}
        </button>

        {message && (
          <div className="mt-3 text-sm text-emerald-300">{message}</div>
        )}
      </div>
    </div>
  );
}
