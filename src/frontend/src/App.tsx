import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Principal } from "@icp-sdk/core/principal";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardCopy,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  IndianRupee,
  KeyRound,
  LayoutDashboard,
  Link2,
  Loader2,
  LogIn,
  Package,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { OrderRecord, PaymentRecord } from "./backend";
import type { IggrowbotService } from "./backend";
import { OrderStatus, PaymentStatus } from "./backend";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useAdminManualCredit,
  useBrowserSync,
  useBulkSetServices,
  useCreditUser,
  useGetCredentials,
  useGetLowBalanceThreshold,
  useGetMyOrders,
  useGetMyPayments,
  useGetPendingPayments,
  useGetServices,
  useGetUserBalance,
  useIsCallerAdmin,
  useIsConfigured,
  useIsLowBalance,
  usePlaceOrder,
  useSaveCredentials,
  useSetLowBalanceThreshold,
  useSubmitPayment,
  useSyncServices,
  useVerifyPayment,
} from "./hooks/useQueries";
import { fetchIggrowbotServices } from "./utils/iggrowbotSync";

const DEFAULT_API_URL = "https://iggrowbot.com/api/v2";
const UPI_ID = "8825245372-13c6@ibl";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRupees(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

function formatTimestamp(ns: bigint): string {
  const ms = Number(ns / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncatePrincipal(p: Principal): string {
  const str = p.toString();
  if (str.length <= 16) return str;
  return `${str.slice(0, 8)}...${str.slice(-6)}`;
}

function truncateStr(s: string, n = 30): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n)}...`;
}

// ── Status badges ─────────────────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { label: string; cls: string }> = {
    [OrderStatus.pending]: {
      label: "Pending",
      cls: "bg-warning/15 text-warning border-warning/30",
    },
    [OrderStatus.completed]: {
      label: "Completed",
      cls: "bg-success/15 text-success border-success/30",
    },
    [OrderStatus.failed]: {
      label: "Failed",
      cls: "bg-destructive/15 text-destructive border-destructive/30",
    },
  };
  const { label, cls } = map[status] ?? map[OrderStatus.pending];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}
    >
      {label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === PaymentStatus.verified) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-success/15 text-success border-success/30">
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-warning/15 text-warning border-warning/30">
      Pending
    </span>
  );
}

// ── QR Code ───────────────────────────────────────────────────────────────────

function QRPlaceholder() {
  return (
    <div
      className="flex flex-col items-center gap-3 p-5 border border-primary/30 rounded-xl bg-primary/5"
      data-ocid="payment.qr_card"
    >
      <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
        Scan to Pay
      </div>
      <div className="w-44 h-44 rounded-xl overflow-hidden border-2 border-primary/30 bg-white flex items-center justify-center shadow-sm">
        <img
          src="/assets/uploads/AccountQRCodeFino-Payments-Bank-4703_LIGHT_THEME-1-1.png"
          alt="UPI QR Code for 8825245372"
          className="w-full h-full object-contain"
        />
      </div>
      <p className="font-mono text-xs text-primary text-center break-all">
        {UPI_ID}
      </p>
      <p className="text-xs text-muted-foreground text-center">
        PhonePe · GPay · Paytm · BHIM
      </p>
    </div>
  );
}

// ── Seeded Services (shown when backend has no services yet) ──────────────────

const SEEDED_SERVICES: import("./backend").IggrowbotService[] = [
  {
    id: "1001",
    name: "Instagram Followers - Real & Active [Instant]",
    category: "Instagram Followers",
    rate: 0.11,
    min: BigInt(100),
    max: BigInt(100000),
    description:
      "High-quality real Instagram followers delivered instantly. Guaranteed drop protection.",
  },
  {
    id: "1002",
    name: "Instagram Followers - Premium [Refill 30 Days]",
    category: "Instagram Followers",
    rate: 0.18,
    min: BigInt(50),
    max: BigInt(50000),
    description: "Premium Instagram followers with 30-day refill guarantee.",
  },
  {
    id: "1003",
    name: "Instagram Views - Reels [Fast Delivery]",
    category: "Instagram Views",
    rate: 0.09,
    min: BigInt(500),
    max: BigInt(500000),
    description: "Fast Instagram Reels views. Delivery starts within minutes.",
  },
  {
    id: "1004",
    name: "Instagram Views - Story Views [24H]",
    category: "Instagram Views",
    rate: 0.07,
    min: BigInt(100),
    max: BigInt(100000),
    description: "Instagram story views delivered within 24 hours.",
  },
  {
    id: "1005",
    name: "Instagram Likes - Real [Instant]",
    category: "Instagram Likes",
    rate: 0.1,
    min: BigInt(100),
    max: BigInt(50000),
    description: "Real Instagram likes with fast delivery and no drop.",
  },
  {
    id: "1006",
    name: "Instagram Likes - Premium + Refill",
    category: "Instagram Likes",
    rate: 0.15,
    min: BigInt(50),
    max: BigInt(25000),
    description: "Premium Instagram likes with refill guarantee for 30 days.",
  },
  {
    id: "1007",
    name: "Instagram Comments - Custom [Real]",
    category: "Instagram Comments",
    rate: 1.2,
    min: BigInt(10),
    max: BigInt(5000),
    description: "Custom real Instagram comments from active accounts.",
  },
  {
    id: "1008",
    name: "Facebook Page Likes - Real [HQ]",
    category: "Facebook Likes",
    rate: 0.13,
    min: BigInt(100),
    max: BigInt(50000),
    description: "Real Facebook page likes from active profiles.",
  },
  {
    id: "1009",
    name: "Facebook Post Likes - Fast",
    category: "Facebook Likes",
    rate: 0.1,
    min: BigInt(100),
    max: BigInt(50000),
    description: "Fast Facebook post likes with instant delivery.",
  },
  {
    id: "1010",
    name: "Facebook Followers - Real Accounts",
    category: "Facebook Followers",
    rate: 0.14,
    min: BigInt(100),
    max: BigInt(30000),
    description: "Real Facebook profile followers from active users.",
  },
  {
    id: "1011",
    name: "Facebook Video Views - 3 Min Watched",
    category: "Facebook Views",
    rate: 0.08,
    min: BigInt(500),
    max: BigInt(500000),
    description: "Facebook video views with 3-minute watch time counted.",
  },
  {
    id: "1012",
    name: "YouTube Views - HQ [Non-Drop]",
    category: "YouTube Views",
    rate: 0.11,
    min: BigInt(500),
    max: BigInt(1000000),
    description: "High-quality YouTube views, non-drop, safe for monetization.",
  },
  {
    id: "1013",
    name: "YouTube Views - Worldwide [Fast]",
    category: "YouTube Views",
    rate: 0.09,
    min: BigInt(1000),
    max: BigInt(500000),
    description: "Fast worldwide YouTube views delivered within hours.",
  },
  {
    id: "1014",
    name: "YouTube Subscribers - Real [Non-Drop]",
    category: "YouTube Subscribers",
    rate: 0.22,
    min: BigInt(100),
    max: BigInt(100000),
    description: "Real YouTube subscribers with no-drop guarantee.",
  },
  {
    id: "1015",
    name: "YouTube Subscribers - Premium [Refill 60D]",
    category: "YouTube Subscribers",
    rate: 0.3,
    min: BigInt(50),
    max: BigInt(50000),
    description: "Premium YouTube subscribers with 60-day refill guarantee.",
  },
  {
    id: "1016",
    name: "YouTube Likes - Real [Instant]",
    category: "YouTube Likes",
    rate: 0.12,
    min: BigInt(100),
    max: BigInt(100000),
    description: "Real YouTube likes delivered instantly to any video.",
  },
  {
    id: "1017",
    name: "YouTube Watch Hours - Monetization Boost",
    category: "YouTube Watch Hours",
    rate: 2.4,
    min: BigInt(100),
    max: BigInt(4000),
    description: "YouTube watch hours to help reach monetization threshold.",
  },
  {
    id: "1018",
    name: "Telegram Channel Members - Real",
    category: "Telegram Members",
    rate: 0.16,
    min: BigInt(100),
    max: BigInt(100000),
    description: "Real Telegram channel members from active accounts.",
  },
  {
    id: "1019",
    name: "Telegram Post Views - Fast",
    category: "Telegram Views",
    rate: 0.06,
    min: BigInt(500),
    max: BigInt(500000),
    description: "Fast Telegram post views delivered instantly.",
  },
  {
    id: "1020",
    name: "Twitter/X Followers - Real HQ",
    category: "Twitter/X Followers",
    rate: 0.19,
    min: BigInt(100),
    max: BigInt(50000),
    description: "High-quality Twitter/X followers from real accounts.",
  },
];

// ── Guide Dialog ──────────────────────────────────────────────────────────────

const GUIDE_STEPS = [
  {
    icon: <ExternalLink className="w-4 h-4" />,
    title: "Go to iggrowbot.com and log in",
    description:
      "Open your browser and navigate to iggrowbot.com. Sign in to your account using your username and password.",
  },
  {
    icon: <KeyRound className="w-4 h-4" />,
    title: "Open Account or API Settings",
    description:
      'Look for your profile avatar or name in the top-right corner. Click it to open a dropdown, then select "Account Settings", "Developer Settings", or "API Settings".',
  },
  {
    icon: <Copy className="w-4 h-4" />,
    title: "Copy your API Key",
    description:
      'Inside the settings page, find the "API Key" or "Access Token" section. Click "Copy" or select the key and copy it manually.',
  },
  {
    icon: <Link2 className="w-4 h-4" />,
    title: "Paste the API Key here",
    description:
      "Return to this Admin Panel → Settings tab and paste your key into the API Key field.",
  },
  {
    icon: <ShieldCheck className="w-4 h-4" />,
    title: "Check the API URL (do not change it)",
    description: `The API URL field is pre-filled with ${DEFAULT_API_URL}. Leave this as-is unless IGGROWBOT support instructs otherwise.`,
  },
  {
    icon: <Zap className="w-4 h-4" />,
    title: "Click Save to connect",
    description:
      'Click the "Save Configuration" button. The connection status will turn green once saved.',
  },
];

function HowToGuideDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/60 transition-all"
          data-ocid="settings.how_to_button"
        >
          <HelpCircle className="w-4 h-4" />
          How to Connect API
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-lg max-h-[85vh] overflow-y-auto border-border bg-popover"
        data-ocid="settings.guide_dialog"
      >
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-md bg-primary/15 text-primary">
              <Zap className="w-4 h-4" />
            </div>
            <DialogTitle className="font-display text-lg text-foreground">
              How to Connect IGGROWBOT API
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Follow these steps to find your API Key and configure the
            integration.
          </p>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {GUIDE_STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06, duration: 0.3 }}
              className="flex gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-mono text-xs font-bold">
                  {index + 1}
                </div>
                {index < GUIDE_STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-border min-h-[8px]" />
                )}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-primary/70">{step.icon}</span>
                  <h3 className="text-sm font-semibold text-foreground">
                    {step.title}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="text-sm"
            data-ocid="settings.guide_dialog.close_button"
          >
            Got it, close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Connection Status Badge ───────────────────────────────────────────────────

function StatusBadge({
  configured,
  loading,
}: { configured: boolean; loading: boolean }) {
  if (loading) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border"
        data-ocid="api.loading_state"
      >
        <div className="w-2 h-2 rounded-full shimmer" />
        <span className="text-xs font-medium text-muted-foreground font-mono">
          Checking...
        </span>
      </div>
    );
  }
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${configured ? "bg-success/10 border-success/30 text-success" : "bg-muted border-border text-muted-foreground"}`}
    >
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 ${configured ? "bg-success status-pulse" : "bg-muted-foreground"}`}
      />
      <span className="text-xs font-semibold font-mono tracking-wide">
        {configured ? "Connected" : "Not Configured"}
      </span>
    </div>
  );
}

// ── Order Dialog ──────────────────────────────────────────────────────────────

function OrderDialog({
  service,
  onClose,
}: { service: IggrowbotService; onClose: () => void }) {
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState(Number(service.min));
  const placeOrder = usePlaceOrder();

  const cost = (service.rate * quantity) / 1000;
  const minQ = Number(service.min);
  const maxQ = Number(service.max);

  const handleSubmit = () => {
    if (!link.trim()) {
      toast.error("Please enter a valid link/URL");
      return;
    }
    if (quantity < minQ || quantity > maxQ) {
      toast.error(`Quantity must be between ${minQ} and ${maxQ}`);
      return;
    }
    placeOrder.mutate(
      { serviceId: service.id, link: link.trim(), quantity: BigInt(quantity) },
      {
        onSuccess: (orderId) => {
          toast.success(`Order placed! Order ID: ${orderId}`);
          onClose();
        },
        onError: (err) => {
          console.error(err);
          toast.error("Failed to place order. Check your balance.");
        },
      },
    );
  };

  return (
    <div className="space-y-4" data-ocid="order.dialog">
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-xs text-muted-foreground font-mono">Service</p>
        <p className="text-sm font-semibold text-foreground mt-0.5">
          {service.name}
        </p>
        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
          <span>
            Rate:{" "}
            <span className="text-primary font-mono">
              {formatRupees(service.rate)}/1000
            </span>
          </span>
          <span>
            Min: <span className="font-mono">{minQ}</span>
          </span>
          <span>
            Max: <span className="font-mono">{maxQ}</span>
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="order-link"
          className="text-sm font-medium text-foreground"
        >
          Link / URL
        </Label>
        <Input
          id="order-link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://instagram.com/yourprofile"
          className="bg-input border-border font-mono text-sm focus-visible:ring-primary/50"
          data-ocid="new_order.link.input"
        />
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="order-qty"
          className="text-sm font-medium text-foreground"
        >
          Quantity{" "}
          <span className="text-muted-foreground font-normal">
            ({minQ}–{maxQ})
          </span>
        </Label>
        <Input
          id="order-qty"
          type="number"
          min={minQ}
          max={maxQ}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="bg-input border-border font-mono text-sm focus-visible:ring-primary/50"
          data-ocid="new_order.quantity.input"
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
        <span className="text-sm text-muted-foreground">Estimated Cost</span>
        <span className="text-base font-bold text-primary font-mono">
          {formatRupees(cost)}
        </span>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={placeOrder.isPending}
        className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        data-ocid="new_order.submit.button"
      >
        {placeOrder.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Placing Order...
          </>
        ) : (
          <>
            <ShoppingCart className="w-4 h-4" />
            Place Order — {formatRupees(cost)}
          </>
        )}
      </Button>
    </div>
  );
}

// ── TAB: Dashboard (Admin) ───────────────────────────────────────────────────

function AdminDashboard({
  onTabChange,
}: { onTabChange: (tab: string) => void }) {
  const [providerBalance] = useState(6.78);
  const [threshold, setThreshold] = useState<number | null>(null);
  const { data: rawServices = [] } = useGetServices();
  const services = rawServices.length > 0 ? rawServices : SEEDED_SERVICES;
  const { data: userBalance = 0 } = useGetUserBalance();
  const { data: pendingPayments = [] } = useGetPendingPayments();
  const { data: lowBalanceThreshold = 5 } = useGetLowBalanceThreshold();
  const { data: isConfigured = false } = useIsConfigured();
  const setThresholdMutation = useSetLowBalanceThreshold();
  const syncMutation = useSyncServices();
  const browserSync = useBrowserSync();
  const saveMutation = useSaveCredentials();
  const { data: adminCreds } = useGetCredentials();
  const [adminApiKey, setAdminApiKey] = useState("");

  const isLow = providerBalance < lowBalanceThreshold;
  const isSyncing = syncMutation.isPending || browserSync.isPending;

  const handleSetThreshold = () => {
    if (threshold === null) return;
    setThresholdMutation.mutate(threshold, {
      onSuccess: () => toast.success("Low balance threshold updated"),
      onError: () => toast.error("Failed to update threshold"),
    });
  };

  const handleSync = () => {
    const key = adminApiKey || adminCreds?.apiKey || "";
    const url = adminCreds?.apiUrl || "https://iggrowbot.com/api/v2";
    if (!key) {
      toast.error("Please enter your IGGROWBOT API Key first");
      return;
    }
    browserSync.mutate(
      { apiKey: key, apiUrl: url },
      {
        onSuccess: (count) =>
          toast.success(`${count} services synced successfully!`),
        onError: (err) => toast.error(`Sync failed: ${(err as Error).message}`),
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Technical Setup Banner — shown when API is not configured */}
      <AnimatePresence>
        {!isConfigured && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-primary/40 bg-primary/8 p-4"
            data-ocid="dashboard.setup_banner"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/15 border border-primary/25 flex-shrink-0">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Technical Setup Required
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Add your IGGROWBOT Provider Credentials to activate live
                    balance sync, service import, and order automation.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                      <KeyRound className="w-3 h-3" /> API Key needed
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                      <Link2 className="w-3 h-3" /> URL pre-filled
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => onTabChange("settings")}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm shrink-0"
                data-ocid="dashboard.open_settings_button"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Open Technical Setup
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Low balance alert */}
      <AnimatePresence>
        {isLow && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30"
            data-ocid="dashboard.error_state"
          >
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warning">
                Low Provider Balance Alert
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Provider balance ({formatRupees(providerBalance)}) is below the
                threshold ({formatRupees(lowBalanceThreshold)}). Top up your
                IGGROWBOT account.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BIG ADMIN SETTINGS BUTTON */}
      <Button
        onClick={() => onTabChange("settings")}
        className="w-full py-5 text-xl font-bold gap-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
        data-ocid="dashboard.admin_settings_button"
      >
        <Settings className="w-6 h-6" /> ⚙ ADMIN SETTINGS
      </Button>

      {/* Inline API Key Card */}
      <Card className="border-2 border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-400">
            <KeyRound className="w-4 h-4" />
            Provider API Configuration
          </CardTitle>
          <CardDescription className="text-xs">
            Paste your IGGROWBOT API Key and sync all services instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Paste your IGGROWBOT API Key here"
              value={adminApiKey || adminCreds?.apiKey || ""}
              onChange={(e) => setAdminApiKey(e.target.value)}
              className="bg-input border-amber-500/30 focus-visible:ring-amber-500/50 font-mono text-sm flex-1"
              data-ocid="dashboard.api_key_input"
            />
            <Button
              onClick={() => {
                const key = adminApiKey || adminCreds?.apiKey || "";
                if (!key) {
                  toast.error("Please enter your API Key");
                  return;
                }
                saveMutation.mutate(
                  { apiUrl: "https://iggrowbot.com/api/v2", apiKey: key },
                  {
                    onSuccess: () => {
                      browserSync.mutate(
                        { apiKey: key, apiUrl: "https://iggrowbot.com/api/v2" },
                        {
                          onSuccess: (count) =>
                            toast.success(
                              `API saved! ${count} services imported.`,
                            ),
                          onError: (err) =>
                            toast.error(
                              `Sync failed: ${(err as Error).message}`,
                            ),
                        },
                      );
                    },
                    onError: () => toast.error("Failed to save credentials"),
                  },
                );
              }}
              disabled={saveMutation.isPending || isSyncing}
              className="gap-2 bg-amber-500 text-white hover:bg-amber-600 whitespace-nowrap font-semibold shrink-0"
              data-ocid="dashboard.save_sync_button"
            >
              {saveMutation.isPending || isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Save & Sync Services
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Provider balance */}
        <Card className="border-border bg-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-4 translate-x-4" />
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-primary/15">
                <IndianRupee className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Provider Balance
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">
              {formatRupees(providerBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isConfigured
                ? "Live from IGGROWBOT"
                : "Connect API to fetch live"}
            </p>
          </CardContent>
        </Card>

        {/* Total services */}
        <Card className="border-border bg-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-chart-2/5 rounded-full -translate-y-4 translate-x-4" />
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-chart-2/15">
                <Package className="w-3.5 h-3.5 text-chart-2" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total Services
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">
              {services.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Synced from provider
            </p>
          </CardContent>
        </Card>

        {/* Pending payments */}
        <Card className="border-border bg-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-warning/5 rounded-full -translate-y-4 translate-x-4" />
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-md bg-warning/15">
                <CreditCard className="w-3.5 h-3.5 text-warning" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pending Payments
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">
              {pendingPayments.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting verification
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Service Sync with balance display */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" />
                Service Sync (IGGROWBOT)
              </CardTitle>
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                ₹{providerBalance.toFixed(2)}
              </span>
            </div>
            <CardDescription className="text-xs">
              Pull all services from IGGROWBOT and apply 20% profit margin.
              Provider balance shown above.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              data-ocid="dashboard.primary_button"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Sync Now
                </>
              )}
            </Button>
            {!isConfigured && (
              <p className="text-xs text-muted-foreground text-center">
                Paste your API Key in{" "}
                <button
                  type="button"
                  onClick={() => onTabChange("settings")}
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Settings
                </button>{" "}
                first
              </p>
            )}
          </CardContent>
        </Card>

        {/* Balance threshold */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Low Balance Alert
            </CardTitle>
            <CardDescription className="text-xs">
              Alert when provider balance drops below threshold. Current:{" "}
              {formatRupees(lowBalanceThreshold)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              type="number"
              placeholder={String(lowBalanceThreshold)}
              value={threshold ?? ""}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="bg-input border-border font-mono text-sm focus-visible:ring-primary/50"
              data-ocid="dashboard.threshold_input"
            />
            <Button
              onClick={handleSetThreshold}
              disabled={setThresholdMutation.isPending || threshold === null}
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10 whitespace-nowrap"
              data-ocid="dashboard.save_button"
            >
              {setThresholdMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Set Alert"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Wallet + Admin Config shortcut */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Wallet balance card */}
        <Card className="border-border bg-card">
          <CardContent className="pt-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                My Wallet Balance
              </p>
              <p className="text-3xl font-bold font-mono text-primary mt-1">
                {formatRupees(userBalance)}
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => onTabChange("add-funds")}
              data-ocid="dashboard.add_funds_button"
            >
              <Wallet className="w-4 h-4" /> Add Funds
            </Button>
          </CardContent>
        </Card>

        {/* Admin Configuration shortcut */}
        <Card className="border-border bg-card">
          <CardContent className="pt-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Admin Configuration
              </p>
              <p className="text-sm font-semibold text-foreground mt-1">
                Provider Credentials, Sync & Alerts
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Status:{" "}
                <span
                  className={
                    isConfigured
                      ? "text-success font-medium"
                      : "text-warning font-medium"
                  }
                >
                  {isConfigured ? "Connected" : "Not Configured"}
                </span>
              </p>
            </div>
            <Button
              onClick={() => onTabChange("settings")}
              className="gap-2 bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 font-semibold"
              variant="outline"
              data-ocid="dashboard.admin_config_button"
            >
              <SlidersHorizontal className="w-4 h-4" /> Admin Config
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── TAB: Dashboard (User) ─────────────────────────────────────────────────────

function UserDashboard({
  onTabChange,
}: { onTabChange: (tab: string) => void }) {
  const { data: userBalance = 0, isLoading } = useGetUserBalance();
  const { data: orders = [], isLoading: ordersLoading } = useGetMyOrders();
  const saveMutation2 = useSaveCredentials();
  const syncMutation2 = useSyncServices();
  const browserSync2 = useBrowserSync();
  const { data: userCreds } = useGetCredentials();
  const [userApiKey, setUserApiKey] = useState("");
  const isSyncing2 = syncMutation2.isPending || browserSync2.isPending;
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Wallet balance hero */}
      <Card className="border-border bg-gradient-to-br from-primary/10 to-card overflow-hidden relative">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <CardContent className="pt-8 pb-8 relative">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="p-3 rounded-full bg-primary/15 border border-primary/30">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Your Wallet Balance
              </p>
              {isLoading ? (
                <Skeleton className="h-10 w-32 mx-auto mt-2" />
              ) : (
                <p className="text-4xl font-bold font-mono text-foreground mt-1">
                  {formatRupees(userBalance)}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-2 flex-wrap justify-center">
              <Button
                onClick={() => onTabChange("add-funds")}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                data-ocid="dashboard.add_funds_button"
              >
                <Wallet className="w-4 h-4" /> Add Funds
              </Button>
              <Button
                variant="outline"
                onClick={() => onTabChange("services")}
                className="gap-2 border-border hover:bg-accent"
                data-ocid="dashboard.services_button"
              >
                <Package className="w-4 h-4" /> Browse Services
              </Button>
              <Button
                variant="outline"
                onClick={() => onTabChange("orders")}
                className="gap-2 border-border hover:bg-accent"
                data-ocid="dashboard.orders_button"
              >
                <ShoppingCart className="w-4 h-4" /> My Orders
              </Button>
              <Button
                onClick={() => onTabChange("settings")}
                className="gap-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40 font-semibold"
                variant="outline"
                data-ocid="dashboard.provider_api_button"
              >
                <Settings className="w-4 h-4" /> Provider API
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BIG ADMIN SETTINGS BUTTON */}
      <Button
        onClick={() => onTabChange("settings")}
        className="w-full py-5 text-xl font-bold gap-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
        data-ocid="dashboard.admin_settings_button"
      >
        <Settings className="w-6 h-6" /> ⚙ ADMIN SETTINGS
      </Button>

      {/* Inline API Key Card */}
      <Card className="border-2 border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-400">
            <KeyRound className="w-4 h-4" />
            Provider API Configuration
          </CardTitle>
          <CardDescription className="text-xs">
            Paste your IGGROWBOT API Key and sync all services instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Paste your IGGROWBOT API Key here"
              value={userApiKey || userCreds?.apiKey || ""}
              onChange={(e) => setUserApiKey(e.target.value)}
              className="bg-input border-amber-500/30 focus-visible:ring-amber-500/50 font-mono text-sm flex-1"
              data-ocid="dashboard.api_key_input"
            />
            <Button
              onClick={() => {
                const key = userApiKey || userCreds?.apiKey || "";
                if (!key) {
                  toast.error("Please enter your API Key");
                  return;
                }
                saveMutation2.mutate(
                  { apiUrl: "https://iggrowbot.com/api/v2", apiKey: key },
                  {
                    onSuccess: () => {
                      browserSync2.mutate(
                        { apiKey: key, apiUrl: "https://iggrowbot.com/api/v2" },
                        {
                          onSuccess: (count) =>
                            toast.success(
                              `API saved! ${count} services imported.`,
                            ),
                          onError: (err) =>
                            toast.error(
                              `Sync failed: ${(err as Error).message}`,
                            ),
                        },
                      );
                    },
                    onError: () => toast.error("Failed to save credentials"),
                  },
                );
              }}
              disabled={saveMutation2.isPending || isSyncing2}
              className="gap-2 bg-amber-500 text-white hover:bg-amber-600 whitespace-nowrap font-semibold shrink-0"
              data-ocid="dashboard.save_sync_button"
            >
              {saveMutation2.isPending || isSyncing2 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Save & Sync Services
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-2" data-ocid="dashboard.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-6" data-ocid="dashboard.empty_state">
              <ShoppingCart className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No orders yet.</p>
              <Button
                variant="link"
                onClick={() => onTabChange("services")}
                className="text-primary text-sm mt-1 h-auto p-0"
              >
                Browse services to get started{" "}
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order, i) => (
                <div
                  key={order.orderId}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
                  data-ocid={`dashboard.order.item.${i + 1}`}
                >
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">
                      #{order.orderId.slice(0, 12)}...
                    </p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {order.serviceId}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-primary">
                      {formatRupees(order.cost)}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── TAB: Services ─────────────────────────────────────────────────────────────

function ServicesTab({ isAdmin }: { isAdmin: boolean }) {
  const { data: rawServices = [], isLoading } = useGetServices();
  // Use seeded sample services as fallback when backend has no services yet
  const services: IggrowbotService[] =
    rawServices.length > 0 ? rawServices : SEEDED_SERVICES;
  const syncMutation = useSyncServices();
  const browserSyncServices = useBrowserSync();
  const { data: serviceCreds } = useGetCredentials();
  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] =
    useState<IggrowbotService | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const isServicesSyncing =
    syncMutation.isPending || browserSyncServices.isPending;

  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()),
  );

  // Group by category
  const grouped = filtered.reduce<Record<string, IggrowbotService[]>>(
    (acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    },
    {},
  );

  const handleSync = () => {
    const key = serviceCreds?.apiKey || "";
    const url = serviceCreds?.apiUrl || "https://iggrowbot.com/api/v2";
    if (!key) {
      toast.error("Please set your IGGROWBOT API Key in Settings first");
      return;
    }
    browserSyncServices.mutate(
      { apiKey: key, apiUrl: url },
      {
        onSuccess: (count) => toast.success(`${count} services synced!`),
        onError: (err) => toast.error(`Sync failed: ${(err as Error).message}`),
      },
    );
  };

  return (
    <div className="space-y-5">
      {/* Search + sync */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search services by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input border-border focus-visible:ring-primary/50"
            data-ocid="services.search_input"
          />
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={isServicesSyncing}
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
            data-ocid="services.sync_button"
          >
            {isServicesSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Sync Services
          </Button>
        )}
      </div>

      {/* Seeded notice banner */}
      {rawServices.length === 0 && !isLoading && isAdmin && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/8 border border-primary/25">
          <AlertCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Showing{" "}
            <span className="text-primary font-semibold">sample services</span>.
            Go to <span className="font-semibold">Settings</span>, paste your
            IGGROWBOT API Key, then click{" "}
            <span className="font-semibold">Sync Services</span> to import your
            live catalog.
          </p>
        </div>
      )}

      {/* Services list */}
      {isLoading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          data-ocid="services.loading_state"
        >
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div
          className="text-center py-16 border border-dashed border-border rounded-xl"
          data-ocid="services.empty_state"
        >
          <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-foreground font-medium">No services synced yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Click 'Sync Services' to pull services from IGGROWBOT API."
              : "Services will appear here once the admin syncs them."}
          </p>
          {isAdmin && (
            <Button
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="mt-4 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isServicesSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Sync Services
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2">
                  {category}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((service, i) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className="border-border bg-card hover:border-primary/40 transition-all group">
                      <CardContent className="pt-4 pb-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                              {service.name}
                            </p>
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {service.category}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base font-bold font-mono text-primary">
                              {formatRupees(service.rate)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              per 1000
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {service.description ||
                            "Social media growth service."}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>
                              Min:{" "}
                              <span className="font-mono text-foreground/70">
                                {String(service.min)}
                              </span>
                            </span>
                            <span>
                              Max:{" "}
                              <span className="font-mono text-foreground/70">
                                {String(service.max)}
                              </span>
                            </span>
                          </div>
                          <Dialog
                            open={
                              orderDialogOpen &&
                              selectedService?.id === service.id
                            }
                            onOpenChange={(open) => {
                              setOrderDialogOpen(open);
                              if (!open) setSelectedService(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                                onClick={() => {
                                  setSelectedService(service);
                                  setOrderDialogOpen(true);
                                }}
                                data-ocid={`services.order_button.${i + 1}`}
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                Order Now
                              </Button>
                            </DialogTrigger>
                            <DialogContent
                              className="max-w-md border-border bg-popover"
                              data-ocid="order.dialog"
                            >
                              <DialogHeader>
                                <DialogTitle className="font-display text-lg">
                                  Place Order
                                </DialogTitle>
                              </DialogHeader>
                              {selectedService && (
                                <OrderDialog
                                  service={selectedService}
                                  onClose={() => {
                                    setOrderDialogOpen(false);
                                    setSelectedService(null);
                                  }}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TAB: Add Funds ────────────────────────────────────────────────────────────

function AddFundsTab() {
  const [utr, setUtr] = useState("");
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const submitPayment = useSubmitPayment();
  const { identity, login } = useInternetIdentity();
  const { data: myPayments = [], isLoading: paymentsLoading } =
    useGetMyPayments();

  const handleCopyUpi = () => {
    navigator.clipboard
      .writeText(UPI_ID)
      .then(() => toast.success("UPI ID copied!"));
  };

  const handleSubmit = () => {
    if (!identity) {
      toast.error(
        "Pehle login karein. Please login with Internet Identity to submit payment.",
      );
      return;
    }
    const amountNum = Number.parseFloat(amount);
    if (!utr.trim() || utr.trim().length < 6) {
      toast.error("Enter a valid UTR/Transaction ID (min 6 characters)");
      return;
    }
    if (!amountNum || amountNum < 10) {
      toast.error("Minimum amount is ₹10");
      return;
    }
    submitPayment.mutate(
      { utr: utr.trim(), amount: amountNum },
      {
        onSuccess: () => {
          setSubmitted(true);
          setUtr("");
          setAmount("");
          toast.success("Payment submitted for verification!");
          setTimeout(() => setSubmitted(false), 6000);
        },
        onError: (err) => {
          console.error(err);
          const msg = err instanceof Error ? err.message : String(err);
          if (
            msg.includes("User is not registered") ||
            msg.includes("not registered")
          ) {
            toast.error("Please login first to submit payment.");
          } else if (msg.includes("UTR already submitted")) {
            toast.error(
              "This UTR was already submitted. If your payment was not credited, please contact admin with your Transaction ID.",
            );
          } else {
            toast.error("Failed to submit payment. Please try again.");
          }
        },
      },
    );
  };

  const handleCheckPayment = () => {
    if (!utr.trim() || utr.trim().length < 6) {
      toast.error("Enter a valid UTR/Transaction ID first");
      return;
    }
    setCheckingPayment(true);
    setTimeout(() => {
      const found = myPayments.find(
        (p: PaymentRecord) => p.utr.trim() === utr.trim(),
      );
      setCheckingPayment(false);
      if (!found) {
        toast.error("No payment found with this UTR. Please submit first.");
      } else if (found.status === PaymentStatus.verified) {
        toast.success("Payment verified! Wallet credited.");
      } else {
        toast.info("Payment is pending verification by admin.");
      }
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* UPI Details card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Pay via UPI
          </CardTitle>
          <CardDescription>
            Scan the QR code or use the UPI ID to send payment, then submit your
            UTR below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <QRPlaceholder />
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  UPI ID
                </p>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/40 border border-border font-mono text-sm text-foreground">
                  <span className="flex-1 break-all">{UPI_ID}</span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                    data-ocid="payment.copy_upi_button"
                    aria-label="Copy UPI ID"
                  >
                    <ClipboardCopy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Steps
                </p>
                {[
                  "Open your UPI app (GPay, PhonePe, etc.)",
                  "Scan QR code or enter UPI ID manually",
                  "Enter the amount and complete payment",
                  "Note the UTR/Transaction ID from receipt",
                  "Enter UTR below to credit your wallet",
                ].map((step, stepIdx) => (
                  <div
                    key={step}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <span className="w-4 h-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {stepIdx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit payment form */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Submit Payment
          </CardTitle>
          <CardDescription>
            After paying, enter your UTR and amount below to credit your wallet
            instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence mode="wait">
            {submitted && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/25 text-success"
                data-ocid="payment.success_state"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">
                  Payment submitted! Your wallet will be credited after
                  verification.
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <Label
              htmlFor="payment-amount"
              className="text-sm font-medium text-foreground"
            >
              Amount (₹){" "}
              <span className="text-muted-foreground font-normal">
                — min ₹10
              </span>
            </Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="payment-amount"
                type="number"
                min={10}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                className="pl-9 bg-input border-border font-mono text-sm focus-visible:ring-primary/50"
                data-ocid="add_funds.amount.input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="payment-utr"
              className="text-sm font-medium text-foreground"
            >
              Transaction ID (UTR)
            </Label>
            <Input
              id="payment-utr"
              type="text"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="Enter 12-digit UTR number"
              className="bg-input border-border font-mono text-sm focus-visible:ring-primary/50"
              data-ocid="add_funds.utr.input"
            />
            <p className="text-xs text-muted-foreground">
              Find the UTR in your UPI payment receipt or bank transaction
              history.
            </p>
          </div>

          <Button
            onClick={handleCheckPayment}
            disabled={checkingPayment}
            variant="outline"
            className="w-full gap-2 border-green-600 text-green-700 hover:bg-green-50 dark:text-green-400 dark:border-green-500 dark:hover:bg-green-950 font-semibold"
            data-ocid="add_funds.check_payment.button"
          >
            {checkingPayment ? (
              <>
                <Loader2
                  className="w-4 h-4 animate-spin"
                  data-ocid="add_funds.check_payment.loading_state"
                />{" "}
                Checking...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Check Payment
              </>
            )}
          </Button>

          {!identity ? (
            <Button
              onClick={login}
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              data-ocid="add_funds.submit.button"
            >
              <LogIn className="w-4 h-4" /> Login to Submit Payment
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitPayment.isPending}
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              data-ocid="add_funds.submit.button"
            >
              {submitPayment.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" /> Submit Payment
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="space-y-2" data-ocid="payment.loading_state">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : myPayments.length === 0 ? (
            <div className="text-center py-6" data-ocid="payment.empty_state">
              <CreditCard className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No payments submitted yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="payment.table">
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs">
                      UTR
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs">
                      Amount
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs">
                      Date
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myPayments.map((p: PaymentRecord, i: number) => (
                    <TableRow
                      key={p.utr}
                      className="border-border"
                      data-ocid={`payment.item.${i + 1}`}
                    >
                      <TableCell className="font-mono text-xs text-foreground">
                        {p.utr}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-primary">
                        {formatRupees(p.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTimestamp(p.timestamp)}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={p.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── TAB: My Orders ────────────────────────────────────────────────────────────

function MyOrdersTab() {
  const { data: orders = [], isLoading } = useGetMyOrders();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          All Orders ({orders.length})
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-3" data-ocid="orders.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div
          className="text-center py-16 border border-dashed border-border rounded-xl"
          data-ocid="orders.empty_state"
        >
          <ShoppingCart className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-foreground font-medium">No orders yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Browse services to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table data-ocid="orders.table">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent bg-secondary/30">
                <TableHead className="text-muted-foreground text-xs">
                  Order ID
                </TableHead>
                <TableHead className="text-muted-foreground text-xs">
                  Service
                </TableHead>
                <TableHead className="text-muted-foreground text-xs hidden md:table-cell">
                  Link
                </TableHead>
                <TableHead className="text-muted-foreground text-xs">
                  Qty
                </TableHead>
                <TableHead className="text-muted-foreground text-xs">
                  Cost
                </TableHead>
                <TableHead className="text-muted-foreground text-xs">
                  Status
                </TableHead>
                <TableHead className="text-muted-foreground text-xs hidden sm:table-cell">
                  Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: OrderRecord, i: number) => (
                <TableRow
                  key={order.orderId}
                  className="border-border hover:bg-accent/30 transition-colors"
                  data-ocid={`orders.item.${i + 1}`}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{order.orderId.slice(0, 10)}...
                  </TableCell>
                  <TableCell className="text-sm text-foreground max-w-32">
                    <span className="line-clamp-1">{order.serviceId}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground hidden md:table-cell">
                    {truncateStr(order.link, 24)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {String(order.quantity)}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-primary">
                    {formatRupees(order.cost)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                    {formatTimestamp(order.timestamp)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── TAB: Admin Panel ──────────────────────────────────────────────────────────

function AdminPanelTab() {
  const { data: pendingPayments = [], isLoading } = useGetPendingPayments();
  const verifyMutation = useVerifyPayment();
  const creditMutation = useCreditUser();
  const [creditPrincipal, setCreditPrincipal] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [verifyingUtr, setVerifyingUtr] = useState<string | null>(null);
  const manualCreditMutation = useAdminManualCredit();
  const [mcUtr, setMcUtr] = useState("");
  const [mcAmount, setMcAmount] = useState("");
  const [mcPrincipal, setMcPrincipal] = useState("");

  const handleVerify = (utr: string) => {
    setVerifyingUtr(utr);
    verifyMutation.mutate(utr, {
      onSuccess: () => {
        toast.success(`Payment ${utr} verified and credited!`);
        setVerifyingUtr(null);
      },
      onError: (err) => {
        console.error(err);
        toast.error("Failed to verify payment");
        setVerifyingUtr(null);
      },
    });
  };

  const handleCredit = () => {
    const amount = Number.parseFloat(creditAmount);
    if (!creditPrincipal.trim()) {
      toast.error("Enter a valid Principal ID");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    // We construct a Principal from string - the actor will handle conversion
    // Pass as unknown since Principal type conversion is handled by backend
    creditMutation.mutate(
      {
        user: creditPrincipal as unknown as Principal,
        amount,
      },
      {
        onSuccess: () => {
          toast.success(`Credited ${formatRupees(amount)} to wallet`);
          setCreditPrincipal("");
          setCreditAmount("");
        },
        onError: (err) => {
          console.error(err);
          toast.error("Failed to credit user wallet");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Pending payments */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-warning" />
              Pending Payments
            </CardTitle>
            <Badge className="bg-warning/15 text-warning border-warning/30 font-mono">
              {pendingPayments.length} pending · auto-refreshing
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Verify payments to instantly credit user wallets. Refreshes every 30
            seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2" data-ocid="admin.loading_state">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="text-center py-8" data-ocid="admin.empty_state">
              <CheckCircle2 className="w-8 h-8 text-success/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No pending payments. All clear!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="admin.payments.table">
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs">
                      User
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs">
                      UTR
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs">
                      Amount
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs hidden sm:table-cell">
                      Date
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map((p: PaymentRecord, i: number) => (
                    <TableRow
                      key={p.utr}
                      className="border-border"
                      data-ocid={`admin.payment.item.${i + 1}`}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-28">
                        <span title={p.user.toString()}>
                          {truncatePrincipal(p.user)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground">
                        {p.utr}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-primary">
                        {formatRupees(p.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                        {formatTimestamp(p.timestamp)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleVerify(p.utr)}
                          disabled={
                            verifyingUtr === p.utr && verifyMutation.isPending
                          }
                          className="gap-1.5 bg-success/20 text-success hover:bg-success/30 border border-success/30 text-xs"
                          data-ocid={`admin.verify_button.${i + 1}`}
                        >
                          {verifyingUtr === p.utr &&
                          verifyMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Verify & Credit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit user form */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Credit User Wallet
          </CardTitle>
          <CardDescription className="text-xs">
            Manually credit any user's wallet by entering their Principal ID and
            amount.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="credit-principal"
              className="text-sm font-medium text-foreground"
            >
              User Principal ID
            </Label>
            <Input
              id="credit-principal"
              type="text"
              value={creditPrincipal}
              onChange={(e) => setCreditPrincipal(e.target.value)}
              placeholder="aaaaa-bbbbb-ccccc-ddddd-eee"
              className="bg-input border-border font-mono text-sm focus-visible:ring-primary/50"
              data-ocid="admin.credit_user.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="credit-amount"
              className="text-sm font-medium text-foreground"
            >
              Amount (₹)
            </Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="credit-amount"
                type="number"
                min={1}
                step={1}
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="50"
                className="pl-9 bg-input border-border font-mono text-sm focus-visible:ring-primary/50"
                data-ocid="admin.credit_amount.input"
              />
            </div>
          </div>
          <Button
            onClick={handleCredit}
            disabled={creditMutation.isPending}
            className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            data-ocid="admin.credit.button"
          >
            {creditMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Crediting...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" /> Credit Wallet
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Credit Card */}
      <Card className="border-green-500/30 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Manual Credit
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Use this to manually approve payments that show &quot;UTR already
            used&quot; error
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              Transaction ID / UTR
            </Label>
            <Input
              type="text"
              value={mcUtr}
              onChange={(e) => setMcUtr(e.target.value)}
              placeholder="e.g. 892468810500"
              className="bg-input border-border font-mono text-sm focus-visible:ring-primary/50"
              data-ocid="admin.manual_credit.utr.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              Amount (₹)
            </Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={mcAmount}
              onChange={(e) => setMcAmount(e.target.value)}
              placeholder="e.g. 10"
              className="bg-input border-border font-mono text-sm focus-visible:ring-primary/50"
              data-ocid="admin.manual_credit.amount.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              User Principal ID
            </Label>
            <Input
              type="text"
              value={mcPrincipal}
              onChange={(e) => setMcPrincipal(e.target.value)}
              placeholder="Paste user's Principal ID"
              className="bg-input border-border font-mono text-sm focus-visible:ring-primary/50"
              data-ocid="admin.manual_credit.user.input"
            />
          </div>
          <Button
            onClick={() => {
              const amt = Number.parseFloat(mcAmount);
              if (!mcUtr.trim()) {
                toast.error("Enter Transaction ID / UTR");
                return;
              }
              if (!amt || amt <= 0) {
                toast.error("Enter a valid amount");
                return;
              }
              if (!mcPrincipal.trim()) {
                toast.error("Enter user Principal ID");
                return;
              }
              manualCreditMutation.mutate(
                {
                  utr: mcUtr.trim(),
                  amount: amt,
                  userPrincipal: mcPrincipal.trim(),
                },
                {
                  onSuccess: () => {
                    toast.success(`₹${amt} credited for UTR ${mcUtr.trim()}`);
                    setMcUtr("");
                    setMcAmount("");
                    setMcPrincipal("");
                  },
                  onError: (err) => {
                    const msg =
                      err instanceof Error ? err.message : String(err);
                    toast.error(msg || "Failed to credit user");
                  },
                },
              );
            }}
            disabled={manualCreditMutation.isPending}
            className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold"
            data-ocid="admin.manual_credit.submit_button"
          >
            {manualCreditMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Crediting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Credit Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── TAB: New Order ─────────────────────────────────────────────────────────────

function NewOrderTab() {
  const { data: rawServices = [], isLoading } = useGetServices();
  const services: IggrowbotService[] =
    rawServices.length > 0 ? rawServices : SEEDED_SERVICES;
  const { data: userBalance = 0 } = useGetUserBalance();
  const placeOrder = usePlaceOrder();

  const categories = Array.from(new Set(services.map((s) => s.category)));
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [orderResult, setOrderResult] = useState<{
    success: boolean;
    orderId?: string;
    error?: string;
  } | null>(null);

  const filteredServices = selectedCategory
    ? services.filter((s) => s.category === selectedCategory)
    : services;

  const selectedService =
    services.find((s) => s.id === selectedServiceId) ?? null;

  const cost = selectedService ? (selectedService.rate * quantity) / 1000 : 0;
  const minQ = selectedService ? Number(selectedService.min) : 0;
  const maxQ = selectedService ? Number(selectedService.max) : 0;

  const handlePlaceOrder = () => {
    if (!selectedService) {
      toast.error("Please select a service");
      return;
    }
    if (!link.trim()) {
      toast.error("Please enter a valid link/URL");
      return;
    }
    if (quantity < minQ || quantity > maxQ) {
      toast.error(`Quantity must be between ${minQ} and ${maxQ}`);
      return;
    }
    placeOrder.mutate(
      {
        serviceId: selectedService.id,
        link: link.trim(),
        quantity: BigInt(quantity),
      },
      {
        onSuccess: (orderId) => {
          setOrderResult({ success: true, orderId });
          toast.success(`Order placed! ID: ${orderId}`);
          setLink("");
          setQuantity(minQ);
        },
        onError: (err) => {
          console.error(err);
          setOrderResult({
            success: false,
            error: "Failed to place order. Check your balance.",
          });
          toast.error("Failed to place order. Check your balance.");
        },
      },
    );
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <Card className="border-border bg-card shadow-lg shadow-black/20">
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            New Order
          </CardTitle>
          <CardDescription>
            Select a service, enter your target link and quantity, then place
            your order.
          </CardDescription>
          <div className="flex items-center gap-2 pt-1">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Wallet Balance:
            </span>
            <span className="text-sm font-bold font-mono text-primary">
              {formatRupees(userBalance)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="space-y-3" data-ocid="new_order.loading_state">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Category Select */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  Service Category
                </Label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedServiceId("");
                  }}
                  className="w-full h-10 rounded-md border border-border bg-input text-foreground px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  data-ocid="new_order.category.select"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Select */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  Select Service
                </Label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => {
                    setSelectedServiceId(e.target.value);
                    const svc = services.find((s) => s.id === e.target.value);
                    if (svc) setQuantity(Number(svc.min));
                  }}
                  className="w-full h-10 rounded-md border border-border bg-input text-foreground px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  data-ocid="new_order.service.select"
                >
                  <option value="">— Select a service —</option>
                  {filteredServices.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      [{svc.id}] {svc.name} — ₹{svc.rate.toFixed(2)}/1000
                    </option>
                  ))}
                </select>
              </div>

              {/* Service info */}
              {selectedService && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {selectedService.name}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>
                      Rate:{" "}
                      <span className="text-primary font-mono font-bold">
                        {formatRupees(selectedService.rate)}/1000
                      </span>
                    </span>
                    <span>
                      Min: <span className="font-mono">{minQ}</span>
                    </span>
                    <span>
                      Max: <span className="font-mono">{maxQ}</span>
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Link input */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="no-link"
                  className="text-sm font-medium text-foreground"
                >
                  Link / URL
                </Label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="no-link"
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://instagram.com/yourprofile"
                    className="pl-9 bg-input border-border font-mono text-sm focus-visible:ring-primary/50"
                    data-ocid="new_order.link.input"
                  />
                </div>
              </div>

              {/* Quantity input */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="no-qty"
                  className="text-sm font-medium text-foreground"
                >
                  Quantity{selectedService ? ` (${minQ}–${maxQ})` : ""}
                </Label>
                <Input
                  id="no-qty"
                  type="number"
                  min={minQ || 1}
                  max={maxQ || undefined}
                  value={quantity || ""}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder={
                    selectedService ? String(minQ) : "Enter quantity"
                  }
                  className="bg-input border-border font-mono text-sm focus-visible:ring-primary/50"
                  data-ocid="new_order.quantity.input"
                />
              </div>

              {/* Cost display */}
              {selectedService && quantity > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                  <span className="text-sm text-muted-foreground">
                    Estimated Cost
                  </span>
                  <span className="text-lg font-bold text-primary font-mono">
                    {formatRupees(cost)}
                  </span>
                </div>
              )}

              {/* Order result feedback */}
              <AnimatePresence>
                {orderResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${orderResult.success ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}`}
                    data-ocid={
                      orderResult.success
                        ? "new_order.success_state"
                        : "new_order.error_state"
                    }
                  >
                    {orderResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">
                      {orderResult.success
                        ? `Order placed! Order ID: ${orderResult.orderId}`
                        : orderResult.error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <Button
                onClick={handlePlaceOrder}
                disabled={
                  placeOrder.isPending ||
                  !selectedService ||
                  !link ||
                  quantity <= 0
                }
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base h-12"
                data-ocid="new_order.submit.button"
              >
                {placeOrder.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Placing
                    Order...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    {selectedService && cost > 0
                      ? `Place Order — ${formatRupees(cost)}`
                      : "Place Order"}
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── TAB: Settings ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [thresholdVal, setThresholdVal] = useState<number | null>(null);

  const { data: isConfigured = false, isLoading: statusLoading } =
    useIsConfigured();
  const { data: credentials, isLoading: credsLoading } = useGetCredentials();
  const { data: lowBalanceThreshold = 5 } = useGetLowBalanceThreshold();
  const saveMutation = useSaveCredentials();
  const setThresholdMutation = useSetLowBalanceThreshold();
  const syncMutation = useSyncServices();
  const browserSyncSettings = useBrowserSync();
  const isSettingsSyncing =
    syncMutation.isPending || browserSyncSettings.isPending;

  useEffect(() => {
    if (credentials) {
      setApiUrl(credentials.apiUrl || DEFAULT_API_URL);
      setApiKey(credentials.apiKey || "");
    }
  }, [credentials]);

  const isLoading = statusLoading || credsLoading;

  const handleSave = () => {
    saveMutation.mutate(
      { apiUrl, apiKey },
      {
        onSuccess: () => toast.success("API credentials saved successfully!"),
        onError: () =>
          toast.error("Failed to save credentials. Please try again."),
      },
    );
  };

  const handleSetThreshold = () => {
    if (thresholdVal === null) return;
    setThresholdMutation.mutate(thresholdVal, {
      onSuccess: () => toast.success("Low balance threshold updated"),
      onError: () => toast.error("Failed to update threshold"),
    });
  };

  const handleSync = () => {
    if (!apiKey) {
      toast.error("Please enter your IGGROWBOT API Key first");
      return;
    }
    // Save then sync
    saveMutation.mutate(
      { apiUrl, apiKey },
      {
        onSuccess: () => {
          browserSyncSettings.mutate(
            { apiKey, apiUrl },
            {
              onSuccess: (count) =>
                toast.success(`${count} services synced successfully!`),
              onError: (err) =>
                toast.error(`Sync failed: ${(err as Error).message}`),
            },
          );
        },
        onError: () => toast.error("Failed to save credentials"),
      },
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* API Config */}
      <Card className="border-border bg-card shadow-lg shadow-black/20">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="font-display text-xl flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                Provider API Connection
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Connect your IGGROWBOT account to sync services and place orders
                automatically.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge configured={isConfigured} loading={statusLoading} />
              <HowToGuideDialog />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="space-y-3" data-ocid="settings.loading_state">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label
                  htmlFor="settings-api-url"
                  className="text-sm font-medium text-foreground"
                >
                  API URL
                </Label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="settings-api-url"
                    type="url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder={DEFAULT_API_URL}
                    className="pl-9 font-mono text-sm bg-input border-border focus-visible:ring-primary/50"
                    data-ocid="settings.api_url.input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="settings-api-key"
                  className="text-sm font-medium text-foreground"
                >
                  API Key
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="settings-api-key"
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste your IGGROWBOT API Key here"
                    className="pl-9 pr-10 font-mono text-sm bg-input border-border focus-visible:ring-primary/50"
                    data-ocid="settings.api_key.input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-0.5"
                    aria-label={showKey ? "Hide API key" : "Show API key"}
                    data-ocid="settings.api_key_toggle"
                  >
                    {showKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !apiUrl || !apiKey}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                data-ocid="settings.save_credentials.button"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Save Configuration
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Separator className="bg-border" />

      {/* Low Balance Threshold */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Low Balance Alert Threshold
          </CardTitle>
          <CardDescription className="text-xs">
            Receive an alert when provider balance drops below this amount.
            Current: {formatRupees(lowBalanceThreshold)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <div className="relative flex-1">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="number"
              placeholder={String(lowBalanceThreshold)}
              value={thresholdVal ?? ""}
              onChange={(e) => setThresholdVal(Number(e.target.value))}
              className="pl-9 bg-input border-border font-mono text-sm focus-visible:ring-primary/50"
              data-ocid="settings.threshold_input"
            />
          </div>
          <Button
            onClick={handleSetThreshold}
            disabled={setThresholdMutation.isPending || thresholdVal === null}
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 whitespace-nowrap"
            data-ocid="settings.threshold_save_button"
          >
            {setThresholdMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Sync Services */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Sync Services
          </CardTitle>
          <CardDescription className="text-xs">
            Pull all services from IGGROWBOT API and automatically apply a 20%
            profit margin on all prices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSync}
            disabled={isSettingsSyncing}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base px-6 py-3 h-auto"
            data-ocid="settings.sync_services.button"
          >
            {isSettingsSyncing ? (
              <span
                data-ocid="settings.sync_services.loading_state"
                className="flex items-center gap-2"
              >
                <Loader2 className="w-4 h-4 animate-spin" /> Syncing Services...
              </span>
            ) : browserSyncSettings.isSuccess ? (
              <span
                data-ocid="settings.sync_services.success_state"
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Services Synced!
              </span>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" /> Sync All Services
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Welcome Screen ─────────────────────────────────────────────────────────────

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-6"
      >
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display font-bold text-3xl text-foreground">
            Sandeep SMM
          </h1>
          <p className="text-muted-foreground text-sm">
            Welcome to Sandeep's Official Panel
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="pt-6 space-y-4">
            <Button
              onClick={onContinue}
              className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              data-ocid="welcome.continue_button"
            >
              <ArrowRight className="w-4 h-4" />
              Continue as Guest
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You can browse services and add funds. Login with Internet
              Identity for full access.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showWelcome, setShowWelcome] = useState(false);
  const hasCheckedAdmin = useRef(false);

  const {
    data: isAdmin = false,
    isLoading: adminLoading,
    isError: adminError,
  } = useIsCallerAdmin();
  const { data: isConfigured = false, isLoading: statusLoading } =
    useIsConfigured();

  // If admin check fails (unauthenticated), show welcome screen
  useEffect(() => {
    if (!hasCheckedAdmin.current && !adminLoading) {
      hasCheckedAdmin.current = true;
      if (adminError) {
        setShowWelcome(true);
      }
    }
  }, [adminLoading, adminError]);

  if (showWelcome) {
    return <WelcomeScreen onContinue={() => setShowWelcome(false)} />;
  }

  const adminTabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "new-order", label: "New Order", icon: ShoppingCart },
    { id: "services", label: "Services", icon: Package },
    { id: "add-funds", label: "Add Funds", icon: Wallet },
    { id: "orders", label: "My Orders", icon: ShoppingCart },
    { id: "admin", label: "Admin Panel", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const userTabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "new-order", label: "New Order", icon: ShoppingCart },
    { id: "services", label: "Services", icon: Package },
    { id: "add-funds", label: "Add Funds", icon: Wallet },
    { id: "orders", label: "My Orders", icon: ShoppingCart },
    { id: "settings", label: "Provider API", icon: Settings },
  ];

  const tabs = isAdmin ? adminTabs : userTabs;

  return (
    <div className="min-h-screen bg-background grid-bg" data-ocid="admin.page">
      <Toaster position="top-right" theme="dark" />

      {/* Header */}
      <header className="border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-sm sm:text-base text-foreground leading-tight">
                Sandeep SMM
              </h1>
              <p className="text-xs text-muted-foreground leading-none hidden sm:block">
                Sandeep Digital
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-mono hidden sm:inline-flex">
                Admin
              </Badge>
            )}
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("settings")}
                className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 text-xs inline-flex"
                data-ocid="header.admin_config_button"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Admin Config
              </Button>
            )}
            <StatusBadge configured={isConfigured} loading={statusLoading} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {/* Tab nav */}
          <ScrollArea className="w-full">
            <TabsList className="bg-card border border-border flex w-max min-w-full sm:w-auto gap-0 p-1 h-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-muted-foreground hover:text-foreground transition-all rounded-md"
                    data-ocid={`nav.${tab.id.replace("-", "_")}_tab`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <TabsContent value="dashboard" className="mt-0">
                {adminLoading ? (
                  <div
                    className="space-y-4"
                    data-ocid="dashboard.loading_state"
                  >
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-28 w-full" />
                    ))}
                  </div>
                ) : isAdmin ? (
                  <AdminDashboard onTabChange={setActiveTab} />
                ) : (
                  <UserDashboard onTabChange={setActiveTab} />
                )}
              </TabsContent>

              <TabsContent value="new-order" className="mt-0">
                <NewOrderTab />
              </TabsContent>

              <TabsContent value="services" className="mt-0">
                <ServicesTab isAdmin={isAdmin} />
              </TabsContent>

              <TabsContent value="add-funds" className="mt-0">
                <AddFundsTab />
              </TabsContent>

              <TabsContent value="orders" className="mt-0">
                <MyOrdersTab />
              </TabsContent>

              {isAdmin && (
                <TabsContent value="admin" className="mt-0">
                  <AdminPanelTab />
                </TabsContent>
              )}

              <TabsContent value="settings" className="mt-0">
                <SettingsTab />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border sm:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { id: "dashboard", label: "Home", icon: LayoutDashboard },
            { id: "new-order", label: "Order", icon: ShoppingCart },
            { id: "add-funds", label: "Funds", icon: Wallet },
            ...(isAdmin ? [{ id: "admin", label: "Admin", icon: Users }] : []),
            { id: "settings", label: "API Setup", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                  active
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-ocid={`mobile_nav.${tab.id.replace("-", "_")}_tab`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
      <div className="h-16 sm:hidden" />

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-muted-foreground">
            Copyright © 2026 Sandeep
          </p>
          <p className="text-xs text-muted-foreground">
            Built with ♥ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.hostname : "",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary/70 hover:text-primary underline underline-offset-2 transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
