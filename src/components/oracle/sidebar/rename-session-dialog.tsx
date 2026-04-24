"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2 } from "lucide-react";

interface RenameSessionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRename: (newTitle: string) => void;
    currentTitle: string;
}

export function RenameSessionDialog({
    open,
    onOpenChange,
    onRename,
    currentTitle,
}: RenameSessionDialogProps) {
    const [title, setTitle] = React.useState(currentTitle);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (open) {
            setTitle(currentTitle);
            // Focus and select the input text when dialog opens
            const timer = window.setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 50);
            return () => window.clearTimeout(timer);
        }
    }, [open, currentTitle]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim() && title.trim() !== currentTitle) {
            onRename(title.trim());
        }
    };

    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
            setTitle(currentTitle);
        }
    };

    const isValid = title.trim().length > 0 && title.trim() !== currentTitle;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="max-w-sm border-white/15 bg-background/90 backdrop-blur-xl text-foreground shadow-xl"
            >
                <DialogHeader>
                    <DialogTitle className="text-foreground font-serif">Rename chat</DialogTitle>
                    <DialogDescription className="text-foreground/50">
                        Give this conversation a new name.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <Input
                        ref={inputRef}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-background/40 border-white/15 text-foreground placeholder:text-foreground/30 focus-visible:ring-primary/30"
                        placeholder="Enter a new name..."
                    />
                    <DialogFooter className="mt-4 gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleOpenChange(false)}
                            className="border border-white/10 text-foreground/70 hover:bg-accent/40 hover:text-primary transition-all duration-500"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!isValid}
                            className="gap-2 bg-galactic/20 hover:bg-galactic/30 text-white border-0 disabled:opacity-40"
                        >
                            <Edit2 className="h-4 w-4" />
                            Rename
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}