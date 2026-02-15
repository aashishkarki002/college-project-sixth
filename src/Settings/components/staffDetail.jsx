import React, { useState } from 'react'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Plus, Users, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import AddStaffDialog from './AddStaffDialog'
import api from '../../../plugins/axios'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'

function StaffDetail({ staff }) {
    const [open, setOpen] = useState(false)

    const getInitials = (name) => {
        if (!name || typeof name !== 'string') return '?'
        return name
            .trim()
            .split(/\s+/)
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const handleDelete = async (id) => {
        try {
            const res = await api.delete(`/api/staff/delete-staff/${id}`)
            if (res.data.success) {
                toast.success(res.data.message || 'Staff deleted successfully')
                // Ideally refetch in parent; for now just log.
            } else {
                toast.error(res.data.message || 'Failed to delete staff')
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete staff')
        }
    }
    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
                    <p className="text-slate-500">
                        Manage and view your staff details
                    </p>
                </div>
                <Separator />
                <div>
                    <div className="flex items-center gap-2">
                        <Input type="text" placeholder="Search staff" className="" />
                        <Button
                            onClick={() => setOpen(true)}
                            className="bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer w-1/5"
                        >
                            <Plus className="w-4 h-4" />
                            Add Staff Member
                        </Button>
                    </div>
                    <AddStaffDialog open={open} onOpenChange={setOpen} />
                </div></div>

            <div className="mt-4 space-y-3">
                {!staff || staff.length === 0 ? (
                    <Card className="flex items-center gap-3 px-6 py-4 border-border">
                        <Users className="w-10 h-10 text-gray-400" />
                        <CardContent className="p-0">
                            <p className="text-base font-medium text-slate-700">
                                No staff found
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    staff.map((member) => (
                        <Card
                            key={member._id}
                            className="px-6 py-4 border-border rounded-2xl shadow-sm"
                        >
                            <div className="flex items-center justify-between gap-6">
                                {/* Left: Avatar + name/role */}
                                <div className="flex items-center gap-4 min-w-[200px]">
                                    <Avatar className="w-10 h-10 bg-accent/20 text-accent font-semibold">
                                        <AvatarFallback>{getInitials(member?.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            {member?.name}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {member?.role || 'staff'}
                                        </p>
                                    </div>
                                </div>

                                {/* Middle: Email / Phone columns */}
                                <div className="flex-1 flex justify-center gap-16">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                            Email
                                        </p>
                                        <p className="text-sm text-slate-900 break-all">
                                            {member?.email}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                            Phone
                                        </p>
                                        <p className="text-sm text-slate-900">
                                            {member?.phone}
                                        </p>
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-border hover:bg-accent/10 hover:text-accent gap-1"
                                        // Wire up edit logic later
                                    >
                                        <Edit className="w-4 h-4" />
                                        <span>Edit</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-border hover:bg-destructive/10 hover:text-destructive gap-1"
                                        onClick={() => handleDelete(member._id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete</span>
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>


        </>
    )
}

export default StaffDetail