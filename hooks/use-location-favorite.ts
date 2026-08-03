"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { locationApi } from "@/lib/api/location-api";
import type { Location } from "@/lib/types";

const FAVORITES_QUERY_KEY = ["locations", "favorites"] as const;
const FAVORITE_CATALOG_QUERY_KEY = [...FAVORITES_QUERY_KEY, "catalog"] as const;

interface UseLocationFavoriteOptions {
  location: Location | null;
  enabled: boolean;
  onError: () => void;
}

interface FavoriteMutationInput {
  location: Location;
  favorite: boolean;
}

export function useLocationFavorite({
  location,
  enabled,
  onError,
}: UseLocationFavoriteOptions) {
  const queryClient = useQueryClient();
  const catalog = useQuery({
    queryKey: FAVORITE_CATALOG_QUERY_KEY,
    queryFn: locationApi.favoriteCatalog,
    enabled: enabled && Boolean(location?.id),
    staleTime: 60_000,
    retry: 1,
  });
  const locationId = location?.id;

  const isFavorite = useMemo(
    () => Boolean(locationId && catalog.data?.some((item) => item.id === locationId)),
    [catalog.data, locationId],
  );

  const mutation = useMutation({
    mutationFn: async ({ location: target, favorite }: FavoriteMutationInput) => {
      if (!target.id) return;
      if (favorite) {
        await locationApi.removeFavorite(target.id);
        return;
      }
      await locationApi.addFavorite(target.id);
    },
    onMutate: async ({ location: target, favorite }) => {
      await queryClient.cancelQueries({ queryKey: FAVORITE_CATALOG_QUERY_KEY });
      const previous = queryClient.getQueryData<Location[]>(FAVORITE_CATALOG_QUERY_KEY);
      queryClient.setQueryData<Location[]>(FAVORITE_CATALOG_QUERY_KEY, (current = []) => {
        if (favorite) return current.filter((item) => item.id !== target.id);
        return current.some((item) => item.id === target.id) ? current : [...current, target];
      });
      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(FAVORITE_CATALOG_QUERY_KEY, context?.previous);
      onError();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
    },
  });

  const toggleFavorite = useCallback(async () => {
    if (!enabled || !location?.id || mutation.isPending) return;

    let favorites = catalog.data;
    if (!favorites) {
      const refreshed = await catalog.refetch();
      favorites = refreshed.data;
      if (!favorites) {
        onError();
        return;
      }
    }

    mutation.mutate({
      location,
      favorite: favorites.some((item) => item.id === location.id),
    });
  }, [catalog, enabled, location, mutation, onError]);

  return {
    isFavorite,
    isLoading: enabled && !catalog.data && catalog.isFetching,
    isUpdating: mutation.isPending,
    toggleFavorite,
  };
}
