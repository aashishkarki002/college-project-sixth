import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NEPALI_MONTHS } from '@/constants/nepaliMonths'

export const RentFilter = ({ value, onMonthChange }) => {
    return (
        <div className="flex items-center gap-2">
            <Select value={value != null ? String(value) : undefined} onValueChange={(v) => onMonthChange?.(Number(v))}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                    {NEPALI_MONTHS.map((month) => (
                        <SelectItem key={month.value} value={String(month.value)}>
                            {month.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
