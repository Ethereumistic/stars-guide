"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ButtonGroup } from "@/components/ui/button-group";
import { ScrollPicker } from "./scroll-picker";
import { LocationAutocomplete } from "@/components/onboarding/location-autocomplete";
import { ChartCircleView } from "@/components/dashboard/natal-chart/chart-circle-view";
import {
  calculateFullChart,
  type ChartData,
} from "@/lib/birth-chart/full-chart";
import { buildStoredBirthData } from "@/lib/birth-chart/storage";
import { useOnboardingStore } from "@/store/use-onboarding-store";
import { useUserStore } from "@/store/use-user-store";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { mapAuthError } from "@/lib/auth-errors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Undo2,
  CalendarDays,
  Clock,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaXTwitter } from "react-icons/fa6";
import type { GeocodingResult } from "@/lib/geocoding";

/* ─── Constants ─────────────────────────────────────────────── */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toBirthLocation(result: GeocodingResult) {
  return {
    lat: result.lat,
    long: result.long,
    city: result.city,
    country: result.country,
    countryCode: result.countryCode,
  };
}

/* ─── Auth Panel ────────────────────────────────────────────── */

interface AuthPanelProps {
  onAuthenticated: () => void;
}

function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [mode, setMode] = React.useState<"signIn" | "signUp">("signUp");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { signIn } = useAuthActions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signIn("password", { email, password, flow: mode });
      toast.success(
        mode === "signUp" ? "Welcome to Stars Guide!" : "Welcome back!",
      );
      onAuthenticated();
    } catch (err) {
      setError(mapAuthError(err, mode));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider: "google" | "facebook" | "x") => {
    signIn(provider, { redirectTo: "/onboarding" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOAuth("google")}
          className="gap-2"
        >
          <FcGoogle className="size-4" />
          <span className="hidden sm:inline">Google</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOAuth("x")}
          className="gap-2"
        >
          <FaXTwitter className="size-4" />
          <span className="hidden sm:inline">X</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOAuth("facebook")}
          className="gap-2"
        >
          <FaFacebook className="size-4 text-blue-600" />
          <span className="hidden sm:inline">Facebook</span>
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground tracking-wider">
            or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label
            htmlFor="bc-email"
            className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
          >
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="bc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@stars.guide"
              className="pl-10  backdrop-blur-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label
            htmlFor="bc-password"
            className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
          >
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="bc-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10 pr-10 bg-background/30 backdrop-blur-sm"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-destructive"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : mode === "signUp" ? (
            <Sparkles className="size-4 mr-2" />
          ) : (
            <ArrowRight className="size-4 mr-2" />
          )}
          {mode === "signUp" ? "Create Account" : "Sign In"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {mode === "signUp"
          ? "Already have an account?"
          : "Don't have an account?"}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "signUp" ? "signIn" : "signUp")}
          className="text-primary hover:underline underline-offset-4 font-medium"
        >
          {mode === "signUp" ? "Sign in" : "Sign up"}
        </button>
      </p>
    </motion.div>
  );
}

/* ─── Desktop Date Input ────────────────────────────────────── */

function DesktopDateInput({
  day,
  month,
  year,
  onChange,
}: {
  day: number;
  month: number;
  year: number;
  onChange: (d: { day: number; month: number; year: number }) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const selected = React.useMemo(
    () => new Date(year, month - 1, day),
    [year, month, day],
  );

  /* Sync input when selected changes from calendar */
  React.useEffect(() => {
    setInputValue(format(selected, "dd/MM/yyyy"));
  }, [selected]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      if (
        d >= 1 && d <= 31 &&
        m >= 1 && m <= 12 &&
        y >= 1900 && y <= currentYear
      ) {
        onChange({ day: d, month: m, year: y });
      }
    }
  };

  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        Date of Birth
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <ButtonGroup className="w-full" orientation="horizontal">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="DD/MM/YYYY"
            className="h-12 bg-background/30 backdrop-blur-sm border-border/50"
          />
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 border-border/50 bg-background/30 backdrop-blur-sm"
            >
              <CalendarDays className="size-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
        </ButtonGroup>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) {
                onChange({
                  day: date.getDate(),
                  month: date.getMonth() + 1,
                  year: date.getFullYear(),
                });
              }
              setOpen(false);
            }}
            captionLayout="dropdown"
            fromYear={1900}
            toYear={currentYear}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ─── Desktop Time Input ────────────────────────────────────── */

function DesktopTimeInput({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (h: number, m: number) => void;
}) {
  const value = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        Birth Time
      </Label>
      <div className="relative">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          type="time"
          value={value}
          onChange={(e) => {
            const [h, m] = e.target.value.split(":").map(Number);
            onChange(h, m);
          }}
          className="h-12 pl-10 bg-background/30 backdrop-blur-sm border-border/50 [color-scheme:dark]"
        />
      </div>
    </div>
  );
}

/* ─── Birth Chart Slide ─────────────────────────────────────── */

interface BirthChartSlideProps {
  isActive?: boolean;
  wasActive?: boolean;
}

export function BirthChartSlide({ isActive, wasActive }: BirthChartSlideProps) {
  const router = useRouter();
  const isAuthenticated = useUserStore((s) => s.isAuthenticated());
  const updateBirthData = useMutation(api.users.updateBirthData);

  /* Inputs */
  const [day, setDay] = React.useState(15);
  const [month, setMonth] = React.useState(6);
  const [year, setYear] = React.useState(1995);
  const [hour, setHour] = React.useState(12);
  const [minute, setMinute] = React.useState(0);
  const [location, setLocation] = React.useState<GeocodingResult | null>(null);

  /* UI State */
  const [showAuth, setShowAuth] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [chartData, setChartData] = React.useState<ChartData | null>(null);

  /* Data arrays for mobile scroll pickers */
  const currentYear = new Date().getFullYear();
  const years = React.useMemo(
    () => Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i),
    [currentYear],
  );
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = React.useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth],
  );
  const hours = React.useMemo(
    () => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")),
    [],
  );
  const minutes = React.useMemo(
    () => Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0")),
    [],
  );

  /* Keep day valid when month/year changes */
  React.useEffect(() => {
    if (day > daysInMonth) setDay(daysInMonth);
  }, [day, daysInMonth]);

  /* Default preview chart (idle state) */
  const defaultChart = React.useMemo(
    () => calculateFullChart(2000, 1, 1, 12, 0, 40.7128, -74.006),
    [],
  );

  /* Live chart computation */
  React.useEffect(() => {
    if (!location) {
      setChartData(null);
      return;
    }
    try {
      const data = calculateFullChart(
        year,
        month,
        day,
        hour,
        minute,
        location.lat,
        location.long,
      );
      setChartData(data);
    } catch (e) {
      console.error("Chart calculation error:", e);
    }
  }, [day, month, year, hour, minute, location]);

  /* Sync to onboarding store for OAuth continuity */
  React.useEffect(() => {
    const store = useOnboardingStore.getState();
    store.setBirthDate({ day, month, year });
    store.setBirthTime(
      `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
    );
    if (location) {
      store.setBirthLocation(toBirthLocation(location));
    }
  }, [day, month, year, hour, minute, location]);

  /* Save handler */
  const handleSave = React.useCallback(async () => {
    if (!location) return;
    setIsSaving(true);
    try {
      const birthData = buildStoredBirthData({
        date: `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`,
        time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        location: toBirthLocation(location),
      });
      await updateBirthData(birthData);
      toast.success("Birth chart saved to your account!");
      router.push("/dashboard");
    } catch (e) {
      toast.error("Could not save birth chart. Please try again.");
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }, [day, month, year, hour, minute, location, router, updateBirthData]);

  const hasLocation = !!location;
  const activeData = chartData ?? defaultChart;

  const handleDateChange = React.useCallback(
    (d: { day: number; month: number; year: number }) => {
      setDay(d.day);
      setMonth(d.month);
      setYear(d.year);
    },
    [],
  );

  const handleTimeChange = React.useCallback((h: number, m: number) => {
    setHour(h);
    setMinute(m);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 h-full items-center px-6 md:px-12 max-w-[1600px] mx-auto py-8 lg:py-0">
      {/* ── Left Column ── */}
      <div className="space-y-5 order-2 lg:order-1 col-span-1">
        {/* Header */}
        <div className="space-y-2">
          {/*<motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={isActive ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="inline-block text-[10px] uppercase tracking-[0.25em] font-bold px-3 py-1 rounded-full border bg-primary/5 border-primary/10 text-primary"
          >
            Astrological Foundation
          </motion.span>*/}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isActive ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15 }}
            className="text-3xl md:text-4xl lg:text-5xl font-serif tracking-tight"
          >
            Cast Your Birth Chart
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : {}}
            transition={{ delay: 0.25 }}
            className="text-muted-foreground text-xs uppercase tracking-widest font-medium"
          >
            Enter your details to reveal your cosmic blueprint
          </motion.p>
        </div>

        {/* Date — Desktop: Calendar Popover | Mobile: ScrollPicker */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
        >
          <div className="hidden lg:block">
            <DesktopDateInput
              day={day}
              month={month}
              year={year}
              onChange={handleDateChange}
            />
          </div>
          <div className="lg:hidden">
            <ScrollPicker
              columns={[
                {
                  label: "Day",
                  items: days,
                  value: day,
                  onSelect: (v) => setDay(Number(v)),
                  className: "w-1/4",
                },
                {
                  label: "Month",
                  items: MONTHS,
                  value: MONTHS[month - 1],
                  onSelect: (v) => setMonth(MONTHS.indexOf(v as string) + 1),
                  className: "w-1/2",
                },
                {
                  label: "Year",
                  items: years,
                  value: year,
                  onSelect: (v) => setYear(Number(v)),
                  className: "w-1/4",
                },
              ]}
            />
          </div>
        </motion.div>

        {/* Time — Desktop: native time input | Mobile: ScrollPicker */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.35 }}
        >
          <div className="hidden lg:block">
            <DesktopTimeInput
              hour={hour}
              minute={minute}
              onChange={handleTimeChange}
            />
          </div>
          <div className="lg:hidden">
            <ScrollPicker
              columns={[
                {
                  label: "Hour",
                  items: hours,
                  value: hour.toString().padStart(2, "0"),
                  onSelect: (v) => setHour(Number(v)),
                  className: "w-1/2",
                },
                {
                  label: "Minute",
                  items: minutes,
                  value: minute.toString().padStart(2, "0"),
                  onSelect: (v) => setMinute(Number(v)),
                  className: "w-1/2",
                },
              ]}
            />
          </div>
        </motion.div>

        {/* Location */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
        >
          <LocationAutocomplete
            value={location}
            onValueChange={setLocation}
            placeholder="Search for your birth city..."
          />
        </motion.div>

        {/* Auth / Save */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.45 }}
          className="pt-1"
        >
          {isAuthenticated ? (
            <Button
              onClick={handleSave}
              disabled={!hasLocation || isSaving}
              className="gap-2"
              size="lg"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Continue
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <AnimatePresence mode="wait">
              {!showAuth ? (
                <motion.div
                  key="cta"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Button
                    onClick={() => setShowAuth(true)}
                    disabled={!hasLocation}
                    className="gap-2"
                    size="lg"
                  >
                    <Sparkles className="size-4" />
                    Save &amp; Discover
                    <ChevronRight className="size-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 max-w-sm">
                    Create a free account to save your chart and unlock your
                    full cosmic reading.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="auth"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-medium">
                          Connect your chart
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Sign in or create an account to save your birth data.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAuth(false)}
                        className="text-muted-foreground hover:text-primary transition-colors p-1"
                      >
                        <Undo2 className="size-4" />
                      </button>
                    </div>
                    <AuthPanel onAuthenticated={handleSave} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>
      </div>

      {/* ── Right Column: Chart ── */}
      <div
        className={cn(
          "relative flex items-center justify-center order-1 lg:order-2 col-span-2",
          "min-h-[280px] md:min-h-[380px] lg:min-h-0",
        )}
        style={{
          opacity: isActive ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="w-56 h-56 md:w-80 md:h-80 lg:w-96 lg:h-96 bg-primary/5 rounded-full blur-3xl"
            animate={
              isActive ? { scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] } : {}
            }
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <motion.div
          className="relative z-10"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={
            isActive ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0 }
          }
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          {/* Chart — bigger, no rotation */}
          <div className="relative">
            <div className="scale-100 md:scale-100 lg:scale-200 origin-center">
              <ChartCircleView data={activeData} />
            </div>
          </div>

          {/* Floating label */}
          {/*<AnimatePresence>
            {hasLocation && chartData?.ascendant && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
              >
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 backdrop-blur-sm">
                  {chartData.ascendant.signId.replace("_", " ")} Rising
                </span>
              </motion.div>
            )}
          </AnimatePresence>*/}
        </motion.div>
      </div>
    </div>
  );
}
