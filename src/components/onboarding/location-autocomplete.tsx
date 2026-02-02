"use client";

import * as React from "react";
import { Check, Loader2, MapPin, Navigation, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Item,
    ItemMedia,
    ItemContent,
    ItemTitle,
    ItemDescription
} from "@/components/ui/item";
import {
    searchLocations,
    getUserCurrentLocation,
    type GeocodingResult,
} from "@/lib/geocoding";
import { useDebounce } from "@/hooks/use-debounce";
import { motion, AnimatePresence } from "motion/react";

import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";

interface LocationAutocompleteProps {
    value?: GeocodingResult | null;
    onValueChange: (location: GeocodingResult | null) => void;
    placeholder?: string;
}

export function LocationAutocomplete({
    value,
    onValueChange,
    placeholder = "Search for your birth city...",
}: LocationAutocompleteProps) {
    const [query, setQuery] = React.useState(value ? `${value.city}, ${value.country}` : "");
    const [results, setResults] = React.useState<GeocodingResult[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [isGettingLocation, setIsGettingLocation] = React.useState(false);

    const debouncedQuery = useDebounce(query, 400);

    // Sync input with value if value changes externally
    React.useEffect(() => {
        if (value) {
            const formatted = `${value.city}, ${value.country}`;
            if (query !== formatted) {
                setQuery(formatted);
            }
        }
    }, [value]);

    // Fetch results
    React.useEffect(() => {
        // Skip search if the debounced query matches our current selection
        if (value) {
            const formatted = `${value.city}, ${value.country}`;
            if (formatted === debouncedQuery) {
                setResults([]);
                return;
            }
        }

        // Clear results if query is too short
        if (debouncedQuery.length < 2) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        let isMounted = true;

        const fetchResults = async () => {
            setIsSearching(true);
            try {
                const locations = await searchLocations(debouncedQuery);
                if (isMounted) {
                    setResults(locations);
                }
            } catch (error) {
                console.error("Search failed:", error);
            } finally {
                if (isMounted) {
                    setIsSearching(false);
                }
            }
        };

        fetchResults();

        return () => {
            isMounted = false;
        };
    }, [debouncedQuery]); // REMOVED [value] to prevent flickering on selection/clear

    const handleSelect = (location: GeocodingResult) => {
        onValueChange(location);
        setQuery(`${location.city}, ${location.country}`);
        setResults([]);
    };

    const handleClear = () => {
        setQuery("");
        onValueChange(null);
        setResults([]);
    };

    const handleGetCurrentLocation = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsGettingLocation(true);
        try {
            const location = await getUserCurrentLocation();
            if (location) {
                handleSelect(location);
            }
        } catch (error) {
            console.error("Could not get current location", error);
        } finally {
            setIsGettingLocation(false);
        }
    };

    const getFlagUrl = (code?: string) => code ? `https://flagcdn.com/${code.toLowerCase()}.svg` : null;

    return (
        <div className="w-full space-y-4">
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
                    {value ? (
                        <div className="size-6 rounded-full overflow-hidden border border-primary/20 bg-muted shrink-0 shadow-sm">
                            {getFlagUrl(value.countryCode) ? (
                                <img
                                    src={getFlagUrl(value.countryCode)!}
                                    alt={value.country}
                                    className="size-full object-cover"
                                />
                            ) : (
                                <MapPin className="size-4 m-1 text-muted-foreground" />
                            )}
                        </div>
                    ) : (
                        <HoverCard openDelay={200}>
                            <HoverCardTrigger asChild>
                                <button
                                    onClick={handleGetCurrentLocation}
                                    disabled={isGettingLocation || isSearching}
                                    className={cn(
                                        "p-2 -ml-2 rounded-md transition-all hover:bg-primary/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                                        isSearching && "pointer-events-none"
                                    )}
                                >
                                    {isSearching || isGettingLocation ? (
                                        <Loader2 className="size-5 text-primary animate-spin" />
                                    ) : (
                                        <MapPin className="size-5 text-muted-foreground hover:text-primary transition-colors" />
                                    )}
                                </button>
                            </HoverCardTrigger>
                            <HoverCardContent
                                side="left"
                                align="center"
                                className="w-64 bg-background/95 backdrop-blur-xl border-primary/20 p-4 rounded-xl shadow-2xl z-50"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Navigation className="size-4 animate-pulse mr-2" />
                                        <h4 className="text-xs font-bold uppercase tracking-[0.2em]">Use my location</h4>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                        You can use that if you were born in the same place you are right now.
                                    </p>
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    )}
                </div>

                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className={cn(
                        "h-16 pl-14 pr-12 bg-background/30 backdrop-blur-xl border-primary/10 focus:border-primary/40 text-lg font-serif transition-all shadow-2xl",
                        value && "border-primary/40 bg-primary/10 ring-1 ring-primary/30"
                    )}
                />

                {query && (
                    <button
                        onClick={handleClear}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-primary/10 rounded-full transition-colors z-10"
                    >
                        <X className="size-5 text-muted-foreground hover:text-primary" />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3">
                            <ScrollArea className="h-[306px] rounded-md border border-primary/10 bg-background/40 backdrop-blur-md shadow-inner">
                                <div className="p-2 ">
                                    {results.map((result, idx) => (
                                        <Item
                                            key={`${result.city}-${result.country}-${idx}`}
                                            className="cursor-pointer hover:bg-primary/10 transition-colors border-none group/item"
                                            onClick={() => handleSelect(result)}
                                        >
                                            <ItemMedia className="size-10 overflow-hidden rounded-full border border-primary/10 bg-muted/50 flex items-center justify-center">
                                                {getFlagUrl(result.countryCode) ? (
                                                    <img
                                                        src={getFlagUrl(result.countryCode)!}
                                                        alt={result.country}
                                                        className="size-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <MapPin className="size-5 text-muted-foreground" />
                                                )}
                                            </ItemMedia>
                                            <ItemContent>
                                                <ItemTitle className="font-serif text-base group-hover/item:text-primary transition-colors">
                                                    {result.city}, {result.country}
                                                </ItemTitle>
                                            </ItemContent>
                                            <Check className={cn(
                                                "size-4 text-primary shrink-0 transition-opacity",
                                                (value?.city === result.city && value?.country === result.country) ? "opacity-100" : "opacity-0"
                                            )} />
                                        </Item>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

