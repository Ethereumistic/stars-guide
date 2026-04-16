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
                className="max-w-sm border-white/15 bg-background/95 text-white backdrop-blur-xl"
            >
                <DialogHeader>
                    <DialogTitle className="text-white">Rename chat</DialogTitle>
                    <DialogDescription className="text-white/50">
                        Give this conversation a new name.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <Input
                        ref={inputRef}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-galactic/30"
                        placeholder="Enter a new name..."
                    />
                    <DialogFooter className="mt-4 gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleOpenChange(false)}
                            className="border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
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