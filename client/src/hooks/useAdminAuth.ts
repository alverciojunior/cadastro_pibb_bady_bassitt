import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export function useAdminAuth() {
  const { data: admin, isLoading } = trpc.adminAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  const isAuthenticated = !!admin;

  return { admin, isLoading, isAuthenticated };
}

export function useRequireAdminAuth() {
  const { admin, isLoading, isAuthenticated } = useAdminAuth();
  const [, navigate] = useLocation();

  return { admin, isLoading, isAuthenticated, navigate };
}
