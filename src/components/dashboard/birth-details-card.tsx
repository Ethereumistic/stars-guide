'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "motion/react"
import { MapPin, Calendar, Clock } from "lucide-react"

interface BirthData {
    date: string
    time: string
    location: {
        lat: number
        long: number
        city: string
        country: string
        countryCode?: string
    }
}

interface BirthDetailsCardProps {
    birthData: BirthData
    delay?: number
}

// Format date nicely
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

// Format time nicely
const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
}

// Get flag URL from country code
const getFlagUrl = (code?: string) => code ? `https://flagcdn.com/${code.toLowerCase()}.svg` : null

export function BirthDetailsCard({ birthData, delay = 0.3 }: BirthDetailsCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
        >
            <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="font-serif text-2xl">Birth Details</CardTitle>
                    <CardDescription className="font-sans">
                        The moment when the universe welcomed you
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Date */}
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                    Date
                                </p>
                                <p className="text-lg font-medium">
                                    {formatDate(birthData.date)}
                                </p>
                            </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                <Clock className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                    Time
                                </p>
                                <p className="text-lg font-medium">
                                    {formatTime(birthData.time)}
                                </p>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-primary/10 text-primary overflow-hidden">
                                {getFlagUrl(birthData.location.countryCode) ? (
                                    <div className="h-6 w-6 rounded overflow-hidden">
                                        <img
                                            src={getFlagUrl(birthData.location.countryCode)!}
                                            alt={birthData.location.country}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <MapPin className="h-6 w-6" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                    Location
                                </p>
                                <p className="text-lg font-medium">
                                    {birthData.location.city}, {birthData.location.country}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
