import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Navigating between pages remounts components that share queries
			// (products, favorites, cart...). Without a staleTime every remount
			// refires the request even when the data is seconds old. Mutations
			// already call invalidateQueries explicitly, and the realtime socket
			// invalidates on entity events, so a 60s freshness window is safe.
			staleTime: 60 * 1000,
			gcTime: 10 * 60 * 1000,
		},
	},
});