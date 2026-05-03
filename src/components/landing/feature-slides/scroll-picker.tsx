"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

interface ScrollColumnProps {
  items: (string | number)[];
  value: string | number;
  onSelect: (value: string | number) => void;
  className?: string;
  label?: string;
}

export function ScrollColumn({
  items,
  value,
  onSelect,
  className,
  label,
}: ScrollColumnProps) {
  const [api, setApi] = React.useState<CarouselApi>();

  React.useEffect(() => {
    if (!api) return;
    const index = items.indexOf(value);
    if (index !== -1 && api.selectedScrollSnap() !== index) {
      api.scrollTo(index, true);
    }
  }, [api, items, value]);

  React.useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      const index = api.selectedScrollSnap();
      const newValue = items[index];
      if (newValue !== value) {
        onSelect(newValue);
      }
    };

    api.on("select", handleSelect);
    return () => {
      api.off("select", handleSelect);
    };
  }, [api, items, onSelect, value]);

  const onWheel = React.useCallback(
    (e: React.WheelEvent) => {
      if (!api) return;
      if (e.deltaY > 0) {
        api.scrollNext();
      } else {
        api.scrollPrev();
      }
    },
    [api],
  );

  return (
    <div className={cn("h-full grow flex flex-col", className)}>
      {label && (
        <div className="text-center pb-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
            {label}
          </span>
        </div>
      )}
      <div onWheel={onWheel} className="h-48 relative">
        <Carousel
          setApi={setApi}
          orientation="vertical"
          opts={{
            align: "center",
            containScroll: false,
            dragFree: true,
            loop: true,
          }}
          className="w-full h-full"
        >
          <CarouselContent className="h-48 mt-0">
            {items.map((item, index) => {
              const isActive = item === value;
              return (
                <CarouselItem
                  key={index}
                  className="pt-0 h-12 flex items-center justify-center grow-0 shrink-0 basis-12"
                >
                  <div
                    className={cn(
                      "transition-all duration-300 select-none cursor-pointer",
                      isActive
                        ? "text-primary font-bold text-xl scale-110"
                        : "text-muted-foreground/30 text-base hover:text-muted-foreground/60",
                    )}
                    onClick={() => api?.scrollTo(index)}
                  >
                    {item}
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
        {/* Active highlight overlay */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-primary/5 border-y border-primary/10 pointer-events-none rounded-md" />
      </div>
    </div>
  );
}

interface ScrollPickerProps {
  columns: {
    items: (string | number)[];
    value: string | number;
    onSelect: (value: string | number) => void;
    label?: string;
    className?: string;
  }[];
  className?: string;
}

export function ScrollPicker({ columns, className }: ScrollPickerProps) {
  return (
    <div
      className={cn(
        "relative w-full flex items-center justify-center bg-background/30 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden h-56 shadow-xl",
        className,
      )}
    >
      {/* Fading Edges */}
      <div className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-background via-background/50 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background via-background/50 to-transparent pointer-events-none z-10" />

      <div className="flex w-full h-full relative z-0 px-2 gap-1">
        {columns.map((col, i) => (
          <React.Fragment key={i}>
            <ScrollColumn
              items={col.items}
              value={col.value}
              onSelect={col.onSelect}
              label={col.label}
              className={col.className}
            />
            {i < columns.length - 1 && (
              <div className="w-px bg-border/30 self-stretch my-4" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
