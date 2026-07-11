import React, { useState } from 'react';
import { CreditCard, Copy, Check } from 'lucide-react';

export const PAYMENT_ACCOUNTS = [
  {
    icon: CreditCard,
    label: 'Bank Transfer (CBE)',
    details: [
      { key: 'Account Name', value: 'Kaleab Mamo', copyable: false },
      { key: 'Account Number', value: '1000518281287', copyable: true },
    ],
  },
];

function CopyableRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground font-mono text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold select-all">{value}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded font-mono text-[10px] transition-all"
          style={copied
            ? { background: 'rgba(72,255,72,0.12)', color: 'hsl(157,100%,50%)', border: '1px solid rgba(72,255,72,0.3)' }
            : { background: 'rgba(180,255,0,0.08)', color: 'hsl(72,100%,50%)', border: '1px solid rgba(180,255,0,0.25)' }
          }
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// The "pay to this account" card — shown for both the 10% deposit at checkout
// and the 90% final payment after delivery.
export default function PaymentAccounts() {
  return (
    <div className="space-y-3">
      {PAYMENT_ACCOUNTS.map(acc => {
        const Icon = acc.icon;
        return (
          <div key={acc.label} className="bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">{acc.label}</span>
            </div>
            <div className="space-y-2">
              {acc.details.map(d => (
                d.copyable
                  ? <CopyableRow key={d.key} label={d.key} value={d.value} />
                  : <div key={d.key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-mono text-xs">{d.key}</span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
