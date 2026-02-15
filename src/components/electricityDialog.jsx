import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFormik } from 'formik'
import api from '../../plugins/axios'
import { toast } from 'sonner'

export default function ElectricityDialog() {
    return (
        <Dialog>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Electricity</DialogTitle>
                    <DialogDescription>Electricity</DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}