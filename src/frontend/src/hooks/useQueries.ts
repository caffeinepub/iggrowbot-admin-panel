import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  IggrowbotApiCredentials,
  IggrowbotService,
  OrderRecord,
  PaymentRecord,
} from "../backend";
import { useActor } from "./useActor";

// ── Auth ─────────────────────────────────────────────────────────────────────

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

// ── Credentials ───────────────────────────────────────────────────────────────

export function useIsConfigured() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isConfigured"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isConfigured();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCredentials() {
  const { actor, isFetching } = useActor();
  return useQuery<IggrowbotApiCredentials>({
    queryKey: ["credentials"],
    queryFn: async () => {
      if (!actor) return { apiKey: "", apiUrl: "" };
      return actor.getCredentials();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveCredentials() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      apiUrl,
      apiKey,
    }: {
      apiUrl: string;
      apiKey: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.saveCredentials(apiUrl, apiKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isConfigured"] });
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
    },
  });
}

// ── Services ──────────────────────────────────────────────────────────────────

export function useGetServices() {
  const { actor, isFetching } = useActor();
  return useQuery<IggrowbotService[]>({
    queryKey: ["services"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getServices();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useBulkSetServices() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (services: import("../backend").IggrowbotService[]) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.bulkSetServices(services);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useSyncServices() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.syncServices();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

// ── Balance & Alerts ──────────────────────────────────────────────────────────

export function useGetLowBalanceThreshold() {
  const { actor, isFetching } = useActor();
  return useQuery<number>({
    queryKey: ["lowBalanceThreshold"],
    queryFn: async () => {
      if (!actor) return 5;
      return actor.getLowBalanceThreshold();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetLowBalanceThreshold() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (threshold: number) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.setLowBalanceThreshold(threshold);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lowBalanceThreshold"] });
      queryClient.invalidateQueries({ queryKey: ["isLowBalance"] });
    },
  });
}

export function useIsLowBalance() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isLowBalance"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isLowBalance();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60000, // poll every 60s
  });
}

// ── Wallet ────────────────────────────────────────────────────────────────────

export function useGetUserBalance() {
  const { actor, isFetching } = useActor();
  return useQuery<number>({
    queryKey: ["userBalance"],
    queryFn: async () => {
      if (!actor) return 0;
      return actor.getUserBalance();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useCreditUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      user,
      amount,
    }: {
      user: Principal;
      amount: number;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.creditUser(user, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBalance"] });
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
    },
  });
}

// ── Payments ──────────────────────────────────────────────────────────────────

export function useSubmitPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ utr, amount }: { utr: string; amount: number }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.submitPayment(utr, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myPayments"] });
    },
  });
}

export function useVerifyPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (utr: string) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.verifyPayment(utr);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      queryClient.invalidateQueries({ queryKey: ["myPayments"] });
      queryClient.invalidateQueries({ queryKey: ["userBalance"] });
    },
  });
}

export function useGetMyPayments() {
  const { actor, isFetching } = useActor();
  return useQuery<PaymentRecord[]>({
    queryKey: ["myPayments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyPayments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPendingPayments() {
  const { actor, isFetching } = useActor();
  return useQuery<PaymentRecord[]>({
    queryKey: ["pendingPayments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingPayments();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000, // auto-refresh every 30s
  });
}

// ── Orders ────────────────────────────────────────────────────────────────────

export function usePlaceOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      serviceId,
      link,
      quantity,
    }: {
      serviceId: string;
      link: string;
      quantity: bigint;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.placeOrder(serviceId, link, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myOrders"] });
      queryClient.invalidateQueries({ queryKey: ["userBalance"] });
    },
  });
}

export function useGetMyOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<OrderRecord[]>({
    queryKey: ["myOrders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

// ── Admin Manual Credit ───────────────────────────────────────────────────────

export function useAdminManualCredit() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      utr,
      amount,
      userPrincipal,
    }: {
      utr: string;
      amount: number;
      userPrincipal: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      const { Principal } = await import("@icp-sdk/core/principal");
      return actor.adminManualCredit(
        utr,
        amount,
        Principal.fromText(userPrincipal),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
      queryClient.invalidateQueries({ queryKey: ["userBalance"] });
      queryClient.invalidateQueries({ queryKey: ["myPayments"] });
    },
  });
}

// ── Browser-side IGGROWBOT Sync ───────────────────────────────────────────────
// Fetches services directly from IGGROWBOT in the browser (via CORS proxy),
// applies 500% markup, and stores them in the canister.
// This bypasses the balance check entirely.

import { fetchIggrowbotServices } from "../utils/iggrowbotSync";

export function useBrowserSync() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      apiKey,
      apiUrl,
    }: { apiKey: string; apiUrl: string }) => {
      if (!actor) throw new Error("Actor not ready");
      const services = await fetchIggrowbotServices(apiUrl, apiKey);
      if (services.length === 0)
        throw new Error("No services returned from IGGROWBOT");
      await actor.bulkSetServices(services);
      return services.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["isConfigured"] });
    },
  });
}
