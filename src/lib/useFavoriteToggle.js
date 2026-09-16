import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Click handler that adds or removes a product from favorites, updating the
 * shared ['favorites'] query optimistically. Shared by every card that shows a
 * heart, so they all behave identically and stay in sync.
 * @param {any} product
 * @param {boolean | undefined} isFavorite
 * @param {any} favoriteId
 */
export function useFavoriteToggle(product, isFavorite, favoriteId) {
  const queryClient = useQueryClient();

  return useCallback(async (e) => {
    // Cards are links; the heart must not navigate to the product.
    e.preventDefault();
    e.stopPropagation();
    if (isFavorite && favoriteId) {
      // @ts-ignore
      queryClient.setQueryData(['favorites'], (old = []) => old.filter(f => f.id !== favoriteId));
      await base44.entities.Favorite.delete(favoriteId);
    } else {
      const tempId = `temp-${Date.now()}`;
      // @ts-ignore
      queryClient.setQueryData(['favorites'], (old = []) => [
        ...old,
        { id: tempId, product_id: product.id },
      ]);
      await base44.entities.Favorite.create({ product_id: product.id });
    }
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
  }, [queryClient, product.id, isFavorite, favoriteId]);
}
