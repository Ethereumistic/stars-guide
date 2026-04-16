"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteSessionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    sessionTitle: string;
}

export function DeleteSessionDialog({
    open,
    onOpenChange,
    onConfirm,
    sessionTitle,
}: DeleteSessionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="max-w-sm border-white/15 bg-background/95 text-white backdrop-blur-xl"
            >
                <DialogHeader>
                    <DialogTitle className="text-white">Delete this whisper?</DialogTitle>
                    <DialogDescription className="text-white/50">
                        This will permanently delete &ldquo;{sessionTitle}&rdquo; and all its messages. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        className="gap-2 bg-red-600 hover:bg-red-500 text-white"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}