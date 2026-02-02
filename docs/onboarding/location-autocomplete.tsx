// src/components/onboarding/location-autocomplete.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    searchLocations,
    getUserCurrentLocation,
    type GeocodingResult,
} from "@/lib/geocoding";
import { useDebounce } from "@/hooks/use-debounce";

interface LocationAutocompleteProps {
    value?: GeocodingResult;
    onValueChange: (location: GeocodingResult) => void;
    placeholder?: string;
}

export function LocationAutocomplete({
    value,
    onValueChange,
    placeholder = "Search for your birth city...",
}: LocationAutocompleteProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<GeocodingResult[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [isGettingLocation, setIsGettingLocation] = React.useState(false);

    const debouncedQuery = useDebounce(query, 500); // Wait 500ms after user stops typing

    // Fetch results when debounced query changes
    React.useEffect(() => {
        if (debouncedQuery.length < 2) {
            setResults([]);
            return;
        }

        const fetchResults = async () => {
            setIsSearching(true);
            const locations = await searchLocations(debouncedQuery);
            setResults(locations);
            setIsSearching(false);
        };

        fetchResults();
    }, [debouncedQuery]);

    // Handle "Use my current location" button
    const handleGetCurrentLocation = async () => {
        setIsGettingLocation(true);
        const location = await getUserCurrentLocation();
        setIsGettingLocation(false);

        if (location) {
            onValueChange(location);
            setOpen(false);
        } else {
            // Show error toast
            console.error("Could not get current location");
        }
    };

    return (
        <div className="space-y-4">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-auto min-h-[3rem] py-3"
                    >
                        {value ? (
                            <div className="flex items-start gap-2 text-left">
                                <MapPin className="size-4 shrink-0 mt-0.5 text-primary" />
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-medium truncate">
                                        {value.city}, {value.country}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {value.lat.toFixed(4)}°N, {Math.abs(value.long).toFixed(4)}°
                                        {value.long < 0 ? "W" : "E"}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Type to search..."
                            value={query}
                            onValueChange={setQuery}
                        />

                        <CommandList>
                            <CommandEmpty>
                                {isSearching ? (
                                    <div className="flex items-center justify-center gap-2 py-6">
                                        <Loader2 className="size-4 animate-spin" />
                                        <span className="text-sm">Searching...</span>
                                    </div>
                                ) : query.length < 2 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Type at least 2 characters to search
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No locations found</p>
                                )}
                            </CommandEmpty>

                            {results.length > 0 && (
                                <CommandGroup heading="Locations">
                                    {results.map((result) => (
                                        <CommandItem
                                            key={result.displayName}
                                            value={result.displayName}
                                            onSelect={() => {
                                                onValueChange(result);
                                                setOpen(false);
                                            }}
                                            className="cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2 flex-1">
                                                <MapPin className="size-4 text-muted-foreground" />
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="font-medium truncate">
                                                        {result.city}, {result.country}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {result.displayName}
                                                    </p>
                                                </div>
                                                <Check
                                                    className={cn(
                                                        "size-4 shrink-0",
                                                        value?.displayName === result.displayName
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>

                    {/* Divider */}
                    <div className="border-t" />

                    {/* "Use my location" button */}
                    <div className="p-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleGetCurrentLocation}
                            disabled={isGettingLocation}
                            className="w-full justify-start"
                        >
                            {isGettingLocation ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                                <Navigation className="mr-2 size-4" />
                            )}
                            Use my current location
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Optional: Show map preview when location is selected */}
            {value && (
                <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
                    <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${value.long - 0.1
                            },${value.lat - 0.1},${value.long + 0.1},${value.lat + 0.1
                            }&layer=mapnik&marker=${value.lat},${value.long}`}
                        title={`Map showing ${value.city}, ${value.country}`}
                    />
                </div>
            )}
        </div>
    );
}