'use client'

import { useState, useEffect } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SettingsSection } from "./settings-section"
import { toast } from "sonner"
import { useRateLimitStore } from "@/store/use-rate-limit-store"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
    User,
    Mail,
    Phone,
    Globe,
    Bell,
    Pencil,
    Check,
    X,
    Loader2,
    Calendar,
    Clock,
    MapPin,
    Lock
} from "lucide-react"
import type { Doc } from "@/../convex/_generated/dataModel"

interface YouSectionProps {
    user: Doc<"users">
    delay?: number
}

// Frontend rate limiting for username availability checks
// Stored in localStorage to prevent excessive API calls

export function YouSection({ user, delay = 0 }: YouSectionProps) {
    // Mutations
    const updateProfile = useMutation(api.users.updateProfile)
    const updateUsername = useMutation(api.users.updateUsername)
    const updatePreferences = useMutation(api.users.updatePreferences)
    const checkAvailability = useMutation(api.users.checkUsernameAvailability)

    // Edit states
    const [isEditingUsername, setIsEditingUsername] = useState(false)
    const [isEditingPhone, setIsEditingPhone] = useState(false)
    const [editUsername, setEditUsername] = useState(user.username || '')
    const [editPhone, setEditPhone] = useState(user.phone || '')
    const [isSaving, setIsSaving] = useState(false)
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
    const [isChecking, setIsChecking] = useState(false)

    // Sync edit values when user changes
    useEffect(() => {
        setEditUsername(user.username || '')
        setEditPhone(user.phone || '')
    }, [user.username, user.phone])

    // Debounce & Check Availability
    useEffect(() => {
        setIsAvailable(null)
        let active = true;
        if (editUsername.length >= 3 && editUsername !== user.username) {
            const timer = setTimeout(() => {
                const canCheck = useRateLimitStore.getState().canCheckUsername();
                if (!canCheck) {
                    const remaining = useRateLimitStore.getState().getRemainingTime();
                    toast.error(`Rate Limited: Too many checks. Please wait ${remaining} seconds.`);
                    if (active) {
                        setIsAvailable(false);
                        setIsChecking(false);
                    }
                    return;
                }

                setIsChecking(true)
                useRateLimitStore.getState().recordUsernameCheck();
                checkAvailability({ username: editUsername })
                    .then(res => {
                        if (active) setIsAvailable(res.available)
                    })
                    .catch((err: any) => {
                        if (active) {
                            if (err?.message?.includes("RATE_LIMITED")) {
                                const remaining = useRateLimitStore.getState().getRemainingTime();
                                toast.error(`Rate Limited: Too many checks. Please wait ${remaining} seconds.`);
                            }
                            setIsAvailable(false)
                        }
                    })
                    .finally(() => {
                        if (active) setIsChecking(false)
                    })
            }, 2100)
            return () => {
                active = false
                clearTimeout(timer)
            }
        }
    }, [editUsername, user.username, checkAvailability])

    // Get user initials
    const getInitials = (username?: string, email?: string) => {
        if (username) {
            return username.substring(0, 2).toUpperCase()
        }
        if (email) {
            return email[0].toUpperCase()
        }
        return 'U'
    }

    // Handle save username
    const handleSaveUsername = async () => {
        setIsSaving(true)
        try {
            await updateUsername({ username: editUsername })
            setIsEditingUsername(false)
            toast.success("Username updated successfully!")
        } catch (error: any) {
            const msg = error.message || "";
            if (msg.includes("30 days")) {
                toast.error("Rate Limited: You can only change your username once every 30 days. Please try again later.");
            } else if (msg.includes("already taken")) {
                toast.error("That username is already taken. Please choose another.");
            } else if (msg.includes("Invalid username format")) {
                toast.error("Invalid format. Use 1-15 letters, numbers, and underscores.");
            } else {
                toast.error("Failed to update username. Please try again.");
            }
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

    // Check if username can be edited (30-day cooldown)
    const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
    const canEditUsername = !user.lastUsernameChangeAt || Date.now() - user.lastUsernameChangeAt >= COOLDOWN_MS;
    const daysUntilNextChange = user.lastUsernameChangeAt
        ? Math.ceil((COOLDOWN_MS - (Date.now() - user.lastUsernameChangeAt)) / (1000 * 60 * 60 * 24))
        : 0;

    return (
        <SettingsSection
            icon={<User className="h-5 w-5" />}
            title="You"
            description="Your personal information"
            delay={delay}
        >
            {/* Avatar & Username */}
            <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                    <AvatarImage src={user.image} alt={user.username || 'User'} />
                    <AvatarFallback className="bg-primary/10 text-primary font-serif text-xl">
                        {getInitials(user.username, user.email)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    {isEditingUsername ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-sans text-lg">@</span>
                                <Input
                                    value={editUsername}
                                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                    placeholder="your_username"
                                    className="h-9 font-sans"
                                    maxLength={15}
                                    autoFocus
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 text-green-500 hover:text-green-600 hover:bg-green-500/10 shrink-0"
                                    onClick={handleSaveUsername}
                                    disabled={isSaving || editUsername === user.username || editUsername.length < 3 || isAvailable === false || isChecking}
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                    onClick={() => {
                                        setIsEditingUsername(false)
                                        setEditUsername(user.username || '')
                                        setIsAvailable(null)
                                        setIsChecking(false)
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="text-xs pl-6 h-4 flex items-center">
                                {isChecking && <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Checking availability...</span>}
                                {!isChecking && editUsername !== user.username && editUsername.length >= 3 && isAvailable === false && <span className="text-destructive font-medium">Username unavailable or taken</span>}
                                {!isChecking && editUsername !== user.username && editUsername.length >= 3 && isAvailable === true && <span className="text-green-500 font-medium">Username is available!</span>}
                                {(editUsername === user.username || editUsername.length < 3) && <span className="text-muted-foreground">Max 15 chars. Letters, numbers, underscores only.</span>}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <p className="font-medium text-lg truncate font-sans">
                                {user.username ? `@${user.username}` : '@anonymous_stargazer'}
                            </p>
                            {canEditUsername ? (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => setIsEditingUsername(true)}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            ) : (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 opacity-50 hover:bg-transparent hover:cursor-not-allowed"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Username can be changed in {daysUntilNextChange} day{daysUntilNextChange !== 1 ? 's' : ''}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    )}
                    <p className="text-sm text-muted-foreground truncate opacity-70 mt-1">{user.email}</p>
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

            {/* Birth Data — read only, set at onboarding */}
            {user.birthData && (
                <div className="space-y-3">
                    <div className="flex items-center gap-1.5 mb-3">
                        <Lock className="h-3 w-3 text-white/20" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/25">
                            Birth Data — permanent
                        </span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Date</span>
                        </div>
                        <span className="text-sm font-medium">
                            {new Date(user.birthData.date).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'long', day: 'numeric'
                            })}
                        </span>
                    </div>

                    {/* Time */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Time</span>
                        </div>
                        <span className="text-sm font-medium">
                            {(() => {
                                const [h, m] = user.birthData.time.split(':')
                                const hr = parseInt(h)
                                return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
                            })()}
                        </span>
                    </div>

                    {/* Place */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Place</span>
                        </div>
                        <span className="text-sm font-medium text-right max-w-[55%] text-ellipsis overflow-hidden">
                            {user.birthData.location.city}, {user.birthData.location.country}
                        </span>
                    </div>
                </div>
            )}

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
