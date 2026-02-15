import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFormik } from 'formik'
import api from '../../../plugins/axios'
import { toast } from 'sonner'
function AddStaffDialog({ open, onOpenChange }) {
    const formik = useFormik({
        initialValues: {
            name: '',
            email: '',
            phone: '',
            role: 'staff',
            password: '',
            confirmPassword: '',
        },
        onSubmit: async (values) => {
            try {
                const response = await api.post('/api/auth/register-staff', values)
                if (response.data.success) {
                    toast.success(response.data.message)
                } else {
                    toast.error(response.data.message)
                }
            } catch (error) {
                console.error(error)
            }
        }
    })
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-border bg-card max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Staff Member</DialogTitle>
                    <DialogDescription>
                        Enter the new staff member&apos;s information below
                    </DialogDescription>
                </DialogHeader>

                {/* Form layout matching the provided design */}
                <form className="space-y-6" onSubmit={formik.handleSubmit}>
                    {/* Full Name & Role */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="staff-name" className="font-semibold">
                                Full Name
                            </Label>
                            <Input
                                id="staff-name"
                                placeholder="Name"
                                name="name"
                                value={formik.values.name}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                className="bg-input border-border placeholder:text-muted-foreground h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="staff-role" className="font-semibold">
                                Role
                            </Label>
                            <Select name="role" value={formik.values.role} onChange={formik.handleChange} onBlur={formik.handleBlur}>
                                <SelectTrigger
                                    id="staff-role"
                                    className="bg-input border-border h-10"
                                >
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent className="border-border bg-card">
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="staff-email" className="font-semibold">
                                Email
                            </Label>
                            <Input
                                id="staff-email"
                                name="email"
                                value={formik.values.email}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                type="email"
                                placeholder="abc@example.com"
                                className="bg-input border-border placeholder:text-muted-foreground h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="staff-phone" className="font-semibold">
                                Phone Number
                            </Label>
                            <Input
                                id="staff-phone"
                                name="phone"
                                value={formik.values.phone}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                placeholder="03001234567"
                                className="bg-input border-border placeholder:text-muted-foreground h-10"
                            />
                        </div>
                    </div>

                    {/* Password & Confirm Password */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="staff-password" className="font-semibold">
                                Password
                            </Label>
                            <Input
                                id="staff-password"
                                name="password"
                                value={formik.values.password}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                type="password"
                                placeholder="Min 8 characters"
                                className="bg-input border-border placeholder:text-muted-foreground h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="staff-confirm-password" className="font-semibold">
                                Confirm Password
                            </Label>
                            <Input
                                id="staff-confirm-password"
                                name="confirmPassword"
                                value={formik.values.confirmPassword}
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                type="password"
                                placeholder="Re-enter password"
                                className="bg-input border-border placeholder:text-muted-foreground h-10"
                            />
                        </div>
                    </div>

                    {/* Helper text */}
                    <p className="text-xs text-muted-foreground">
                        A verification link will be sent to the staff&apos;s email. They must verify
                        before logging in.
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 border-border"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                            Add Staff Member
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default AddStaffDialog