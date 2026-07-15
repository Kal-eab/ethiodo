import React, { useState, useMemo, useRef } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import {
  getOptionGroups, groupHasImages, unitPrice, selectionImage, shortSelection,
} from '@/lib/productOptions';

const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

// Pinduoduo-style bottom sheet: pick every option group, then confirm.
// Props: { product, open, onOpenChange, onConfirm(selections, quantity) }
// `selections` is { [groupName]: valueLabel }.
export default function VariantPickerSheet({ product, open, onOpenChange, onConfirm }) {
  const groups = useMemo(() => getOptionGroups(product), [product]);
  const [selections, setSelections] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const groupRefs = useRef({});

  const total = unitPrice(product, selections) * quantity;
  const headerImg = selectionImage(product, selections);

  const chosenCount = groups.filter(g => selections[g.name]).length;
  const firstUnchosen = groups.find(g => !selections[g.name]);

  const pick = (group, value) => {
    setSelections(s => ({ ...s, [group.name]: value.label }));
    setError('');
  };

  const handleConfirm = () => {
    if (firstUnchosen) {
      setError(`Please select ${firstUnchosen.name}`);
      groupRefs.current[firstUnchosen.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      groupRefs.current[firstUnchosen.id]?.classList.add('animate-pulse');
      setTimeout(() => groupRefs.current[firstUnchosen.id]?.classList.remove('animate-pulse'), 800);
      return;
    }
    onConfirm(selections, quantity);
  };

  const selectedLine = chosenCount > 0
    ? `Selected: ${shortSelection(selections)}`
    : `Please select: ${groups.map(g => g.name).join(', ')}`;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh] focus:outline-none">
        <DrawerTitle className="sr-only">Select options for {product?.name}</DrawerTitle>
        <DrawerDescription className="sr-only">Choose the product options and quantity, then continue to payment.</DrawerDescription>
        {/* Header: thumbnail + live price + selection summary */}
        <div className="flex items-start gap-3 px-4 pt-2 pb-4 border-b border-border relative">
          <div className="w-24 h-24 flex-shrink-0 border border-border overflow-hidden bg-background -mt-8">
            {headerImg && <img src={headerImg} alt="" className="w-full h-full object-contain" />}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-mono text-2xl font-black text-primary">{fmt(total)} <span className="text-base font-normal">Birr</span></p>
            <p className={`font-mono text-xs mt-1 ${chosenCount > 0 ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
              {selectedLine}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-3 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option groups */}
        <div className="overflow-y-auto px-4 py-3 space-y-5">
          {groups.map(group => {
            const useImages = groupHasImages(group);
            return (
              <div key={group.id} ref={el => { groupRefs.current[group.id] = el; }} className="space-y-2 rounded">
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{group.name}</p>
                {useImages ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {group.values.map(v => {
                      const on = selections[group.name] === v.label;
                      return (
                        <button
                          key={v.id}
                          onClick={() => pick(group, v)}
                          className={`border overflow-hidden text-left transition-all ${on ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-foreground'}`}
                        >
                          <div className="aspect-square bg-black/40">
                            {v.image
                              ? <img src={v.image} alt={v.label} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center font-mono text-xs text-muted-foreground p-1 text-center">{v.label}</div>}
                          </div>
                          <div className={`px-1.5 py-1 ${on ? 'bg-primary text-primary-foreground' : ''}`}>
                            <p className="font-mono text-[11px] truncate">{v.label}</p>
                            {v.price_add > 0 && <p className="font-mono text-[10px] opacity-80">+{fmt(v.price_add)} Birr</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {group.values.map(v => {
                      const on = selections[group.name] === v.label;
                      return (
                        <button
                          key={v.id}
                          onClick={() => pick(group, v)}
                          className={`px-4 py-2 font-mono text-sm border transition-all ${
                            on ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground border-border hover:border-foreground'
                          }`}
                        >
                          {v.label}
                          {v.price_add > 0 && <span className="ml-1 opacity-80">+{fmt(v.price_add)} Birr</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Quantity */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Quantity</span>
            <div className="flex items-center gap-0 border border-border overflow-hidden">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-mono font-bold bg-secondary h-10 flex items-center justify-center">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sticky confirm */}
        <div className="border-t border-border p-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          {error && <p className="font-mono text-xs text-destructive mb-2 text-center">{error}</p>}
          <button
            onClick={handleConfirm}
            className="w-full h-12 bg-primary text-primary-foreground font-mono font-bold tracking-wider hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            CONTINUE — {fmt(total)} Birr
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
