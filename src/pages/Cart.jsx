import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trash2, Minus, Plus, ShoppingCart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/store/Navbar';

export default function Cart() {
  const queryClient = useQueryClient();

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
  });

  const productMap = {};
  products.forEach(p => { productMap[p.id] = p; });

  const cartWithProducts = cartItems.map(item => ({
    ...item,
    product: productMap[item.product_id],
  })).filter(item => item.product);

  const total = cartWithProducts.reduce(
    (sum, item) => sum + (item.product.price || 0) * (item.quantity || 1), 0
  );

  const updateQty = async (item, newQty) => {
    if (newQty <= 0) {
      await base44.entities.CartItem.delete(item.id);
    } else {
      await base44.entities.CartItem.update(item.id, { quantity: newQty });
    }
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  };

  const removeItem = async (id) => {
    await base44.entities.CartItem.delete(id);
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <div className="max-w-[140rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold mb-2">Cart</h1>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-8">
            {cartWithProducts.length} item{cartWithProducts.length !== 1 ? 's' : ''}
          </p>

          {cartWithProducts.length === 0 ? (
            <div className="text-center py-24 space-y-4">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="font-mono text-muted-foreground text-sm">YOUR CART IS EMPTY</p>
              <Link to="/" className="inline-flex items-center gap-2 text-primary font-mono text-sm hover:underline">
                CONTINUE SHOPPING <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Items */}
              <div className="lg:col-span-2 space-y-4">
                {cartWithProducts.map(item => (
                  <div key={item.id} className="flex gap-4 bg-card border border-border p-4">
                    <div className="w-24 h-24 bg-secondary flex-shrink-0 overflow-hidden">
                      <img
                        src={item.product.images?.[0] || '/placeholder.png'}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link to={`/product/${item.product.id}`} className="font-medium text-sm hover:text-primary transition-colors">
                        {item.product.name}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground uppercase mt-1">
                        {item.product.category}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-border">
                          <button
                            onClick={() => updateQty(item, (item.quantity || 1) - 1)}
                            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-mono text-sm">{item.quantity || 1}</span>
                          <button
                            onClick={() => updateQty(item, (item.quantity || 1) + 1)}
                            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-mono font-bold text-primary">
                          ${((item.product.price || 0) * (item.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors self-start"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="lg:sticky lg:top-24 lg:self-start">
                <div className="bg-card border border-border p-6 space-y-4">
                  <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Order Summary</h2>
                  <div className="space-y-2 border-t border-border pt-4">
                    {cartWithProducts.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate mr-2">{item.product.name} ×{item.quantity || 1}</span>
                        <span className="font-mono">${((item.product.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-4 flex justify-between items-center">
                    <span className="font-mono text-sm uppercase">Total</span>
                    <span className="font-mono text-2xl font-bold text-primary">${total.toFixed(2)}</span>
                  </div>
                  <Link to="/checkout">
                    <Button className="w-full h-12 bg-primary text-primary-foreground font-mono font-bold tracking-wider hover:bg-primary/90 mt-2">
                      CHECKOUT
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}