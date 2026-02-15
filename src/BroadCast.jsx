'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Bell, Mail, MessageCircle, Phone, Upload, X } from 'lucide-react'

export default function BroadCast() {
    const [title, setTitle] = useState('')
    const [message, setMessage] = useState('')
    const [selectedRecipients, setSelectedRecipients] = useState([])
    const [deliveryChannels, setDeliveryChannels] = useState([])
    const [priority, setPriority] = useState('normal')
    const [attachments, setAttachments] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [showConfirmation, setShowConfirmation] = useState(false)

    const recipientOptions = [
        { id: 'all', label: 'All Tenants' },
        { id: 'building-a', label: 'Building A' },
        { id: 'building-b', label: 'Building B' },
        { id: 'floor-1', label: 'Floor 1' },
        { id: 'floor-2', label: 'Floor 2' },
    ]

    const handleRecipientToggle = (recipientId) => {
        setSelectedRecipients((prev) =>
            prev.includes(recipientId) ? prev.filter((id) => id !== recipientId) : [...prev, recipientId]
        )
    }

    const handleChannelToggle = (channel) => {
        setDeliveryChannels((prev) =>
            prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
        )
    }

    const handleFileUpload = (e) => {
        if (e.target.files) {
            setAttachments((prev) => [...prev, ...Array.from(e.target.files || [])])
        }
    }

    const removeAttachment = (index) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index))
    }

    const handleSend = async () => {
        setIsLoading(true)
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500))
        setIsLoading(false)
        setShowConfirmation(false)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
        // Reset form
        setTitle('')
        setMessage('')
        setSelectedRecipients([])
        setDeliveryChannels([])
        setPriority('normal')
        setAttachments([])
    }

    const isFormValid = title.trim() && message.trim() && selectedRecipients.length > 0 && deliveryChannels.length > 0

    const priorityColors = {
        normal: 'bg-slate-600 text-slate-50',
        important: 'bg-amber-600 text-amber-50',
        urgent: 'bg-red-600 text-red-50',
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-accent/10">
                            <Bell className="w-6 h-6 text-accent" />
                        </div>
                        <h1 className="text-3xl font-bold">Broadcast Notice</h1>
                    </div>
                    <p className="text-muted-foreground">Send announcements to tenants via Email & WhatsApp</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Success Toast */}
                {showSuccess && (
                    <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 z-50">
                        Notice sent to 124 tenants successfully!
                    </div>
                )}

                {/* Form Card */}
                <Card className="border-border shadow-lg">
                    <CardHeader className="border-b border-border pb-6">
                        <CardTitle>Create Announcement</CardTitle>
                        <CardDescription>Fill in the details to broadcast your notice</CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6 space-y-8">
                        {/* Notice Title */}
                        <div className="space-y-3">
                            <Label htmlFor="title" className="text-base font-semibold">
                                Notice Title
                            </Label>
                            <Input
                                id="title"
                                placeholder="e.g. Water Supply Maintenance"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="bg-input border-border placeholder:text-muted-foreground h-11"
                            />
                        </div>

                        {/* Message Body */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="message" className="text-base font-semibold">
                                    Message Body
                                </Label>
                                <span className="text-sm text-muted-foreground">{message.length}/500</span>
                            </div>
                            <Textarea
                                id="message"
                                placeholder="Water supply will be unavailable on 5th Feb from 10 AM to 2 PM due to pipeline maintenance. We apologize for the inconvenience."
                                value={message}
                                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                                className="bg-input border-border placeholder:text-muted-foreground min-h-32 resize-none"
                            />
                        </div>

                        {/* Recipient Selection */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Recipients</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {recipientOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => handleRecipientToggle(option.id)}
                                        className={`p-3 rounded-lg border-2 transition-all text-left ${selectedRecipients.includes(option.id)
                                            ? 'border-accent bg-accent/10'
                                            : 'border-border bg-card hover:border-muted'
                                            }`}
                                    >
                                        <span className="font-medium">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                            {selectedRecipients.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {selectedRecipients.map((id) => (
                                        <div key={id} className="bg-accent/20 text-accent px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                                            {recipientOptions.find((o) => o.id === id)?.label}
                                            <button
                                                onClick={() => handleRecipientToggle(id)}
                                                className="hover:opacity-70 transition-opacity"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Delivery Channels */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Delivery Channels</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { id: 'email', label: 'Email', icon: Mail },
                                    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                                    { id: 'phone', label: 'Phone', icon: Phone },
                                ].map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => handleChannelToggle(id)}
                                        className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${deliveryChannels.includes(id)
                                            ? 'border-accent bg-accent/10'
                                            : 'border-border bg-card hover:border-muted'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Priority Level */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Priority Level</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'normal', label: 'Normal' },
                                    { id: 'important', label: 'Important' },
                                    { id: 'urgent', label: 'Urgent' },
                                ].map(({ id, label }) => (
                                    <button
                                        key={id}
                                        onClick={() => setPriority(id)}
                                        className={`p-3 rounded-lg border-2 transition-all font-medium ${priority === id
                                            ? `border-accent ${priorityColors[priority]} bg-opacity-20`
                                            : 'border-border bg-card hover:border-muted'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {priority !== 'normal' && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg ${priorityColors[priority]} bg-opacity-10`}>
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="text-sm font-medium">
                                        {priority === 'important' && 'This notice will be marked as important for recipients.'}
                                        {priority === 'urgent' && 'This notice will be marked as urgent. Recipients will receive immediate notifications.'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Attachments */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Attachments (Optional)</Label>
                            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent hover:bg-accent/5 transition-all cursor-pointer group">
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="file-upload"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                />
                                <label htmlFor="file-upload" className="flex flex-col items-center gap-2 cursor-pointer">
                                    <div className="p-3 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-all">
                                        <Upload className="w-6 h-6 text-accent" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">Drop files or click to upload</p>
                                        <p className="text-sm text-muted-foreground">PDF and images supported</p>
                                    </div>
                                </label>
                            </div>

                            {attachments.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    {attachments.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between bg-card border border-border p-3 rounded-lg">
                                            <span className="text-sm font-medium truncate">{file.name}</span>
                                            <button
                                                onClick={() => removeAttachment(index)}
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-6 border-t border-border">
                            <Button
                                variant="outline"
                                className="flex-1 h-11 border-border hover:bg-secondary bg-transparent"
                            >
                                Save as Draft
                            </Button>
                            <Button
                                onClick={() => setShowConfirmation(true)}
                                disabled={!isFormValid || isLoading}
                                className="flex-1 h-11 bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                            >
                                {isLoading ? 'Sending...' : 'Send Notice'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <Card className="border-border max-w-md w-full shadow-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-accent" />
                                Confirm Send
                            </CardTitle>
                            <CardDescription>Are you sure you want to send this notice?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-card border border-border p-4 rounded-lg space-y-2 text-sm">
                                <p>
                                    <span className="text-muted-foreground">Recipients:</span> <span className="font-semibold">{selectedRecipients.length} group(s)</span>
                                </p>
                                <p>
                                    <span className="text-muted-foreground">Channels:</span> <span className="font-semibold">{deliveryChannels.join(', ').toUpperCase()}</span>
                                </p>
                                <p>
                                    <span className="text-muted-foreground">Priority:</span> <span className="font-semibold capitalize">{priority}</span>
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowConfirmation(false)}
                                    className="flex-1 border-border"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSend}
                                    disabled={isLoading}
                                    className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                                >
                                    {isLoading ? 'Sending...' : 'Confirm'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
