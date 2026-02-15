import React, { useState } from 'react'
import { Card } from '@/components/ui/card'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { useFormik } from 'formik'
import api from '../../../plugins/axios'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Globe,
    Lock,
    Save,
    ChevronDown,
    User,
    CreditCard,
    Mail,
    Phone,
    MapPin,
    Building,
    Plus,
    Trash2,
} from "lucide-react";

function SettingTab({
    user,
    bankAccounts = [],
    bankAccountFormik,
    languages,
    selectedLanguage,
    setSelectedLanguage,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordError,
    passwordSuccess,
    handlePasswordChange,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    setAccountToDelete,
    confirmDelete,
    handleDeleteClick,
}) {
    const usemobile = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const formik = useFormik({
        initialValues: {
            name: user?.name || "",
            email: user?.email || "",
            phone: user?.phone || "",
            address: "",
            company: "",
        },
        onSubmit: async (values) => {
            const res = await api.patch("/api/admin/update-admin", values);
            if (res.data.success) {
                toast.success(res.data.message);
            }
        },
    });
    return (
        <div className="space-y-6">


            {/* Admin Details section */}
            <Card
                title="Admin Details"
                subtitle="Manage your administrator profile and contact information"
            >
                <div className="space-y-6 ml-4 mr-4">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900">
                                Administrator Profile
                            </h4>
                            <p className="text-sm text-slate-500">
                                These details will be used for official communications
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <User className="w-4 h-4" /> Full Name
                            </label>
                            <Input
                                value={user?.name}
                                onChange={(e) => formik.setFieldValue("name", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Mail className="w-4 h-4" /> Email Address
                            </label>
                            <Input
                                value={user?.email}
                                onChange={(e) => formik.setFieldValue("email", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Phone className="w-4 h-4" /> Phone Number
                            </label>
                            <Input
                                value={user?.phone}
                                onChange={(e) => formik.setFieldValue("phone", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <Building className="w-4 h-4" /> Company Name
                            </label>
                            <Input
                                value={user?.company}
                                onChange={(e) =>
                                    formik.setFieldValue("company", e.target.value)
                                }
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Office Address
                            </label>
                            <Input
                                value={user?.address}
                                onChange={(e) =>
                                    formik.setFieldValue("address", e.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button icon={Save}>Save Profile Details</Button>
                    </div>
                </div>
            </Card>

            {/* Bank Accounts section */}
            <Card
                title="Bank Accounts"
                subtitle="Manage bank accounts for rent collection and security deposits"
            >
                <div className="space-y-6 ml-4 mr-4">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900">
                                Financial Accounts
                            </h4>
                            <p className="text-sm text-slate-500">
                                Configure bank details for automated payments
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {bankAccounts.map((account) => (
                            <div
                                key={account.id}
                                className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                                        <Building className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <h5 className="font-medium text-slate-900">
                                            {account.bankName}
                                        </h5>
                                        <p className="text-xs text-slate-500">
                                            {account.bankName} • {account.accountNumber}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        icon={Trash2}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleDeleteClick(account._id)}
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-2">
                        {usemobile ? (
                            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                                <DrawerTrigger asChild>
                                    <Button
                                        variant="outline"
                                        icon={Plus}
                                        onClick={() => setDrawerOpen(true)}
                                    >
                                        Add New Bank Account
                                    </Button>
                                </DrawerTrigger>
                                <DrawerContent>
                                    <DrawerHeader>
                                        <DrawerTitle>Add New Bank Account</DrawerTitle>
                                        <p className="text-sm text-gray-500 mt-2">
                                            Add the bank account details for rent collection and
                                            security deposits
                                        </p>
                                    </DrawerHeader>
                                    <form
                                        onSubmit={bankAccountFormik.handleSubmit}
                                        className="px-4 pb-4 space-y-4"
                                    >
                                        <FieldGroup>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    Account Number
                                                </label>
                                                <Input
                                                    type="text"
                                                    placeholder="Account Number"
                                                    value={bankAccountFormik.values.accountNumber}
                                                    onChange={bankAccountFormik.handleChange}
                                                    name="accountNumber"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    Account Name
                                                </label>
                                                <Input
                                                    type="text"
                                                    placeholder="Account Name"
                                                    value={bankAccountFormik.values.accountName}
                                                    onChange={bankAccountFormik.handleChange}
                                                    name="accountName"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    Want to make this account default?
                                                </label>
                                                <Input
                                                    type="checkbox"
                                                    placeholder="Default Account"
                                                    value={bankAccountFormik.values.isDefault}
                                                    onChange={bankAccountFormik.handleChange}
                                                    name="isDefault"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    Bank Name
                                                </label>
                                                <Input
                                                    type="text"
                                                    placeholder="Bank Name"
                                                    value={bankAccountFormik.values.bankName}
                                                    onChange={bankAccountFormik.handleChange}
                                                    name="bankName"
                                                />
                                            </div>
                                        </FieldGroup>
                                        <div className="flex gap-2 pt-4">
                                            <Button
                                                type="submit"
                                                icon={Save}
                                                disabled={bankAccountFormik.isSubmitting}
                                            >
                                                {bankAccountFormik.isSubmitting
                                                    ? "Creating..."
                                                    : "Create Bank Account"}
                                            </Button>
                                            <DrawerClose asChild>
                                                <Button type="button" variant="ghost">
                                                    Cancel
                                                </Button>
                                            </DrawerClose>
                                        </div>
                                    </form>
                                </DrawerContent>
                            </Drawer>
                        ) : (
                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" icon={Plus}>
                                        Add New Bank Account
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add New Bank Account</DialogTitle>
                                        <p className="text-sm text-gray-500 mt-2">
                                            Add the bank account details for rent collection and
                                            security deposits
                                        </p>
                                    </DialogHeader>
                                    <form
                                        onSubmit={bankAccountFormik.handleSubmit}
                                        className="space-y-4"
                                    >
                                        <FieldGroup>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    Account Number
                                                </label>
                                                <Input
                                                    type="text"
                                                    placeholder="Account Number"
                                                    value={bankAccountFormik.values.accountNumber}
                                                    onChange={bankAccountFormik.handleChange}
                                                    name="accountNumber"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    Account Name
                                                </label>
                                                <Input
                                                    type="text"
                                                    placeholder="Account Name"
                                                    value={bankAccountFormik.values.accountName}
                                                    onChange={bankAccountFormik.handleChange}
                                                    name="accountName"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    Bank Name
                                                </label>
                                                <Input
                                                    type="text"
                                                    placeholder="Bank Name"
                                                    value={bankAccountFormik.values.bankName}
                                                    onChange={bankAccountFormik.handleChange}
                                                    name="bankName"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-slate-700">
                                                    Want to make this account default?
                                                </Label>
                                                <Input
                                                    type="checkbox"
                                                    placeholder="Default Account"
                                                    value={bankAccountFormik.values.isDefault}
                                                    onChange={bankAccountFormik.handleChange}
                                                    name="isDefault"
                                                />
                                            </div>
                                        </FieldGroup>
                                        <div className="flex gap-2 pt-4 justify-end">
                                            <DialogClose asChild>
                                                <Button type="button" variant="ghost">
                                                    Cancel
                                                </Button>
                                            </DialogClose>
                                            <Button
                                                type="submit"
                                                icon={Save}
                                                disabled={bankAccountFormik.isSubmitting}
                                            >
                                                {bankAccountFormik.isSubmitting
                                                    ? "Creating..."
                                                    : "Create Bank Account"}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>
            </Card>

            {/* Language Settings */}
            <Card
                title="Language Preferences"
                subtitle="Choose your preferred language for the application"
            >
                <div className="space-y-4 ml-4 mr-4">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Globe className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900">Display Language</h4>
                            <p className="text-sm text-slate-500">
                                Select the language for the interface
                            </p>
                        </div>
                    </div>

                    <div className="relative">
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="w-full p-3 pr-10 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                        >
                            {languages.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.flag} {lang.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="pt-4">
                        <Button icon={Save} size="sm">
                            Save Language
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Password Change */}
            <Card
                title="Security Settings"
                subtitle="Update your password to keep your account secure"
            >
                <form onSubmit={handlePasswordChange} className="space-y-4 ml-4 mr-4">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Lock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900">Change Password</h4>
                            <p className="text-sm text-slate-500">
                                Ensure your password is strong and secure
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label
                                htmlFor="currentPassword"
                                className="block text-sm font-medium text-slate-700 mb-2"
                            >
                                Current Password
                            </label>
                            <Input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter your current password"
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="newPassword"
                                className="block text-sm font-medium text-slate-700 mb-2"
                            >
                                New Password
                            </label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter your new password"
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Must be at least 8 characters long
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="block text-sm font-medium text-slate-700 mb-2"
                            >
                                Confirm New Password
                            </label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your new password"
                                className="w-full p-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {passwordError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {passwordError}
                            </div>
                        )}

                        {passwordSuccess && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                                Password changed successfully!
                            </div>
                        )}

                        <div className="pt-2 flex space-x-3">
                            <Button type="submit" icon={Save}>
                                Update Password
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setCurrentPassword("");
                                    setNewPassword("");
                                    setConfirmPassword("");
                                    setPasswordError("");
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </form>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Bank Account</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this bank account? This action
                            cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDeleteConfirmOpen(false);
                                setAccountToDelete(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default SettingTab