'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Edit, Trash2, Search, Plus } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import api from '../../plugins/axios'
import { toast } from 'sonner'

import { useFormik } from 'formik'


export default function StaffManagementPage({ staffs }) {
    // API returns { success, message, data: [...] } – support both raw response and array
    const list = Array.isArray(staffs)
        ? staffs
        : staffs?.data && Array.isArray(staffs.data)
            ? staffs.data
            : [];
    const [addDialogOpen, setAddDialogOpen] = useState(false);

    const getInitials = (name) => {
        if (!name || typeof name !== 'string') return '?'
        return name.trim().split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const formik = useFormik({
        initialValues: {
            name: '',
            email: '',
            phone: '',
            role: '',
            password: '',
            confirmPassword: '',
        },
        onSubmit: async (values, { setFieldError }) => {
            if (values.password !== values.confirmPassword) {
                setFieldError('confirmPassword', 'Passwords do not match')
                return
            }
            if (values.password.length < 8) {
                setFieldError('password', 'Password must be at least 8 characters')
                return
            }
            const payload = {
                name: values.name,
                email: values.email,
                password: values.password,
                phone: values.phone,
                role: values.role || 'staff',
            }
            try {
                const res = await api.post('/api/auth/register-staff', payload)
                if (res.data.success) {
                    toast.success(res.data.message || 'Verification link sent to staff\'s email.')
                    formik.resetForm()
                    setAddDialogOpen(false)
                } else {
                    toast.error(res.data.message || 'Failed to add staff')
                }
            } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to add staff')
            }
        }
    })
    const handleDelete = async (id) => {
        try {
            const res = await api.delete(`/api/staff/delete-staff/${id}`)
            if (res.data.success) {
                toast.success(res.data.message)
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete staff')
        }
    }
    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-accent/10">
                            <Users className="w-6 h-6 text-accent" />
                        </div>
                        <h1 className="text-3xl font-bold">Staff Management</h1>
                    </div>
                    <p className="text-muted-foreground">Manage and view all staff members and their details</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search and Add */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email, or role..."
                            className="pl-10 bg-card border-border placeholder:text-muted-foreground h-11"
                        />
                    </div>
                    <Button
                        className="bg-accent text-accent-foreground hover:bg-accent/90 h-11 gap-2"
                        onClick={() => setAddDialogOpen(true)}
                    >
                        <Plus className="w-4 h-4" />
                        Add Staff Member
                    </Button>
                </div>

                {/* Staff List */}
                <div className="space-y-3">
                    {list.length === 0 ? (
                        <Card className="border-border">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Users className="w-12 h-12 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">No staff members found</p>
                            </CardContent>
                        </Card>
                    ) : (
                        list.map((staff) => (
                            <Card key={staff._id} className="border-border hover:border-accent/50 transition-all">
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {/* Name and Avatar */}
                                        <div className="flex items-center gap-4">
                                            <Avatar className="w-12 h-12 bg-accent/20 text-accent font-semibold">
                                                <AvatarFallback>{getInitials(staff?.name)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-foreground">{staff.name}</p>
                                                <p className="text-sm  font-medium">{staff.role}</p>
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                                Email
                                            </p>
                                            <p className="text-foreground break-all">{staff.email}</p>
                                        </div>

                                        {/* Phone */}
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                                Phone
                                            </p>
                                            <p className="text-foreground">{staff.phone}</p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex justify-between lg:justify-end gap-2">
                                            <Button
                                                onClick={() => handleEdit(staff)}
                                                variant="outline"
                                                size="sm"
                                                className="border-border hover:bg-accent/10 hover:text-accent gap-2"
                                            >
                                                <Edit className="w-4 h-4" />
                                                <span className="hidden sm:inline">Edit</span>
                                            </Button>
                                            <Button
                                                onClick={() => handleDelete(staff._id)}
                                                variant="outline"
                                                size="sm"
                                                className="border-border hover:bg-destructive/10 hover:text-destructive gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                <span className="hidden sm:inline">Delete</span>
                                            </Button>
                                        </div>
                                    </div>


                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Add Staff Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent className="border-border bg-card max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Staff Member</DialogTitle>
                        <DialogDescription>Enter the new staff member&apos;s information below</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={formik.handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="add-name" className="font-semibold">Full Name</Label>
                                <Input
                                    id="add-name"
                                    name="name"
                                    value={formik.values.name}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="John Doe"
                                    className="bg-input border-border placeholder:text-muted-foreground h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="add-role" className="font-semibold">Role</Label>
                                <Select
                                    name="role"
                                    value={formik.values.role}
                                    onValueChange={(value) => formik.setFieldValue('role', value)}
                                >
                                    <SelectTrigger className="bg-input border-border h-10">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent className="border-border bg-card">
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="add-email" className="font-semibold">Email</Label>
                                <Input
                                    id="add-email"
                                    name="email"
                                    type="email"
                                    value={formik.values.email}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="john@example.com"
                                    className="bg-input border-border placeholder:text-muted-foreground h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="add-phone" className="font-semibold">Phone Number</Label>
                                <Input
                                    id="add-phone"
                                    name="phone"
                                    value={formik.values.phone}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="+1 234 567 8900"
                                    className="bg-input border-border placeholder:text-muted-foreground h-10"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="add-password" className="font-semibold">Password</Label>
                                <Input
                                    id="add-password"
                                    name="password"
                                    type="password"
                                    value={formik.values.password}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="Min 8 characters"
                                    className="bg-input border-border placeholder:text-muted-foreground h-10"
                                />
                                {formik.errors.password && formik.touched.password && (
                                    <p className="text-sm text-destructive">{formik.errors.password}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="add-confirm-password" className="font-semibold">Confirm Password</Label>
                                <Input
                                    id="add-confirm-password"
                                    name="confirmPassword"
                                    type="password"
                                    value={formik.values.confirmPassword}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="Re-enter password"
                                    className="bg-input border-border placeholder:text-muted-foreground h-10"
                                />
                                {formik.errors.confirmPassword && formik.touched.confirmPassword && (
                                    <p className="text-sm text-destructive">{formik.errors.confirmPassword}</p>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">A verification link will be sent to the staff&apos;s email. They must verify before logging in.</p>
                        <div className="flex gap-3 pt-4 border-t border-border">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddDialogOpen(false)}
                                className="flex-1 border-border"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                                Add Staff
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog >
                <DialogContent className="border-border bg-card max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Staff Member</DialogTitle>
                        <DialogDescription>Update the staff member's information below</DialogDescription>
                    </DialogHeader>


                    <div className="space-y-6">
                        {/* Name and Role Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="font-semibold">
                                    Full Name
                                </Label>
                                <Input
                                    id="name"

                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className="bg-input border-border placeholder:text-muted-foreground h-10"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role" className="font-semibold">
                                    Role
                                </Label>
                                <Select onValueChange={(value) => handleInputChange('role', value)}>
                                    <SelectTrigger className="bg-input border-border h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-border bg-card">
                                        <SelectItem value="Manager">Manager</SelectItem>
                                        <SelectItem value="Senior Developer">Senior Developer</SelectItem>
                                        <SelectItem value="Developer">Developer</SelectItem>
                                        <SelectItem value="Designer">Designer</SelectItem>
                                        <SelectItem value="Coordinator">Coordinator</SelectItem>
                                        <SelectItem value="Analyst">Analyst</SelectItem>
                                        <SelectItem value="Consultant">Consultant</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Email and Phone Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="font-semibold">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"

                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className="bg-input border-border placeholder:text-muted-foreground h-10"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="font-semibold">
                                    Phone Number
                                </Label>
                                <Input
                                    id="phone"
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    className="bg-input border-border placeholder:text-muted-foreground h-10"
                                />
                            </div>
                        </div>

                        {/* Address - Full Width */}
                        <div className="space-y-2">
                            <Label htmlFor="address" className="font-semibold">
                                Address
                            </Label>
                            <Input
                                id="address"
                                onChange={(e) => handleInputChange('address', e.target.value)}
                                className="bg-input border-border placeholder:text-muted-foreground h-10"
                            />
                        </div>

                        {/* Join Date - Read Only */}
                        <div className="space-y-2">
                            <Label htmlFor="joinDate" className="font-semibold">
                                Join Date
                            </Label>
                            <Input
                                id="joinDate"
                                disabled
                                className="bg-input border-border text-muted-foreground cursor-not-allowed h-10"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-border">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setEditingStaff(null)
                                }}
                                className="flex-1 border-border"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => handleSave(editingStaff)}
                                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                            >
                                Save Changes
                            </Button>
                        </div>
                    </div>

                </DialogContent>
            </Dialog>
        </div>
    )
}
