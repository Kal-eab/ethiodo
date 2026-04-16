import React from 'react';
import { Check, Clock, Truck, Package } from 'lucide-react';

const STEPS = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: Check },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
];

export default function OrderTimeline({ status }) {
  const currentIndex = STEPS.findIndex(s => s.key === status);

  return (
    <div className="flex items-center gap-1 w-full">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i <= currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-10 h-10 flex items-center justify-center border-2 transition-colors ${
                  isCurrent
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isActive
                    ? 'bg-accent/20 border-accent text-accent'
                    : 'bg-secondary border-border text-muted-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-mono uppercase tracking-wider ${
                isActive ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-5 ${
                i < currentIndex ? 'bg-accent' : 'bg-border'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}