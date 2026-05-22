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

interface DeleteEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    entryTitle: string;
}

export function DeleteEntryDialog({
    open,
    onOpenChange,
    onConfirm,
    entryTitle,
}: DeleteEntryDialogProps) {
    const [isDeleting, setIsDeleting] = React.useState(false);

    async function handleConfirm() {
        setIsDeleting(true);
        try {
            await onConfirm();
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-white/10 bg-background/95 backdrop-blur-xl sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-white/90 font-serif">
                        Delete entry?
                    </DialogTitle>
                    <DialogDescription className="text-white/50 font-sans">
                        &ldquo;{entryTitle}&rdquo; will be permanently deleted. This cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                        className="border border-white/10 bg-transparent text-white/60 hover:bg-white/5 hover:text-white/80"
                    >
                        Keep it
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="bg-red-500/80 text-white hover:bg-red-500 border-0"
                    >
                        {isDeleting ? "Deleting…" : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
