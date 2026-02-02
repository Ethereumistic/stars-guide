'use client'

import { useState, useEffect } from "react"
import { useMutation } from "convex/react"
import { api } from "@/../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SettingsSection } from "./settings-section"
import { toast } from "sonner"
import {
    User,
    Mail,
    Phone,
    Globe,
    Bell,
    Pencil,
    Check,
    X,
    Loader2
} from "lucide-react"
import type { Doc } from "@/../convex/_generated/dataModel"

interface YouSectionProps {
    user: Doc<"users">
    delay?: number
}

export function YouSection({ user, delay = 0 }: YouSectionProps) {
    // Mutations
    const updateProfile = useMutation(api.users.updateProfile)
    const updatePreferences = useMutation(api.users.updatePreferences)

    // Edit states
    const [isEditingName, setIsEditingName] = useState(false)
    const [isEditingPhone, setIsEditingPhone] = useState(false)
    const [editName, setEditName] = useState(user.name || '')
    const [editPhone, setEditPhone] = useState(user.phone || '')
    const [isSaving, setIsSaving] = useState(false)

    // Sync edit values when user changes
    useEffect(() => {
        setEditName(user.name || '')
        setEditPhone(user.phone || '')
    }, [user.name, user.phone])

    // Get user initials
    const getInitials = (name?: string, email?: string) => {
        if (name) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        }
        if (email) {
            return email[0].toUpperCase()
        }
        return 'U'
    }

    // Handle save name
    const handleSaveName = async () => {
        setIsSaving(true)
        try {
            await updateProfile({ name: editName })
            setIsEditingName(false)
            toast.success("Name updated successfully")
        } catch (error) {
            toast.error("Failed to update name")
        } finally {
            setIsSaving(false)
        }
    }

    // Handle save phone
    const handleSavePhone = async () => {
        setIsSaving(true)
        try {
            await updateProfile({ phone: editPhone })
            setIsEditingPhone(false)
            toast.success("Phone updated successfully")
        } catch (error) {
            toast.error("Failed to update phone")
        } finally {
            setIsSaving(false)
        }
    }

    // Handle toggle notifications
    const handleToggleNotifications = async (checked: boolean) => {
        try {
            await updatePreferences({ notifications: checked })
            toast.success(checked ? "Notifications enabled" : "Notifications disabled")
        } catch (error) {
            toast.error("Failed to update preferences")
        }
    }

    return (
        <SettingsSection
            icon={<User className="h-5 w-5" />}
            title="You"
            description="Your personal information"
            delay={delay}
        >
            {/* Avatar & Name */}
            <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                    <AvatarImage src={user.image} alt={user.name || 'User'} />
                    <AvatarFallback className="bg-primary/10 text-primary font-serif text-xl">
                        {getInitials(user.name, user.email)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Your name"
                                className="h-9"
                                autoFocus
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                onClick={handleSaveName}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                    setIsEditingName(false)
                                    setEditName(user.name || '')
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <p className="font-medium text-lg truncate">{user.name || 'Anonymous Stargazer'}</p>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => setIsEditingName(true)}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
            </div>

            <Separator className="my-4" />

            {/* Contact Info */}
            <div className="space-y-4">
                {/* Email - Read only */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Email</span>
                    </div>
                    <span className="text-sm font-medium">{user.email || 'Not set'}</span>
                </div>

                {/* Phone - Editable */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Phone</span>
                    </div>
                    {isEditingPhone ? (
                        <div className="flex items-center gap-2">
                            <Input
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                placeholder="+1 234 567 8900"
                                className="h-8 w-40 text-sm"
                                autoFocus
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                onClick={handleSavePhone}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                    setIsEditingPhone(false)
                                    setEditPhone(user.phone || '')
                                }}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{user.phone || 'Not set'}</span>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => setIsEditingPhone(true)}
                            >
                                <Pencil className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <Separator className="my-4" />

            {/* Preferences */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium">Public Chart</p>
                            <p className="text-xs text-muted-foreground">Allow others to view your birth chart</p>
                        </div>
                    </div>
                    <Switch />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium">Notifications</p>
                            <p className="text-xs text-muted-foreground">Daily horoscope & cosmic updates</p>
                        </div>
                    </div>
                    <Switch
                        defaultChecked={user.preferences?.notifications ?? true}
                        onCheckedChange={handleToggleNotifications}
                    />
                </div>
            </div>
        </SettingsSection>
    )
}
