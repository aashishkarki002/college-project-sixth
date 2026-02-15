'use client';

import React from "react"
import html2pdf from 'html2pdf.js'; // Import html2pdf

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';



export default function ChequeDraft() {
    const chequeRef = useRef(null);
    const [formData, setFormData] = useState({
        businessName: 'Your Company Name',
        businessAddress: '123 Business Street, City, State 100001',
        bankName: 'Premier Bank',
        bankBranch: 'Main Branch, City',
        chequeNumber: '123456',
        date: new Date().toISOString().split('T')[0],
        payeeName: 'Property Owner Full Name',
        amountNumbers: '50,000.00',
        amountWords: 'Fifty Thousand',
        currency: '₹',
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const generatePDF = async () => {
        if (!chequeRef.current) return;

        const html2pdf = (await import('html2pdf.js')).default;
        const element = chequeRef.current;
        const opt = {
            margin: 0,
            filename: `cheque-${formData.chequeNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { format: 'a4', orientation: 'landscape' },
        };

        html2pdf().set(opt).from(element).save();
    };

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=900,height=600');
        if (printWindow && chequeRef.current) {
            printWindow.document.write(chequeRef.current.innerHTML);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Cheque Details</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
                                    <input
                                        type="text"
                                        name="businessName"
                                        value={formData.businessName}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Business Address</label>
                                    <textarea
                                        name="businessAddress"
                                        value={formData.businessAddress}
                                        onChange={handleInputChange}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                                    <input
                                        type="text"
                                        name="bankName"
                                        value={formData.bankName}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Bank Branch</label>
                                    <input
                                        type="text"
                                        name="bankBranch"
                                        value={formData.bankBranch}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cheque Number</label>
                                    <input
                                        type="text"
                                        name="chequeNumber"
                                        value={formData.chequeNumber}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Payee Name</label>
                                    <input
                                        type="text"
                                        name="payeeName"
                                        value={formData.payeeName}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (Numbers)</label>
                                    <input
                                        type="text"
                                        name="amountNumbers"
                                        value={formData.amountNumbers}
                                        onChange={handleInputChange}
                                        placeholder="e.g., 50,000.00"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (Words)</label>
                                    <input
                                        type="text"
                                        name="amountWords"
                                        value={formData.amountWords}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Fifty Thousand"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                                    <select
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="₹">Indian Rupee (₹)</option>
                                        <option value="₨">Nepalese Rupee (₨)</option>
                                        <option value="$">US Dollar ($)</option>
                                        <option value="€">Euro (€)</option>
                                        <option value="£">British Pound (£)</option>
                                    </select>
                                </div>

                                <div className="pt-4 space-y-3">
                                    <Button onClick={handlePrint} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                        Print Cheque
                                    </Button>
                                    <Button onClick={generatePDF} className="w-full bg-green-600 hover:bg-green-700 text-white">
                                        Export as PDF
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cheque Preview */}
                    <div className="lg:col-span-2 flex items-center justify-center">
                        <div ref={chequeRef} className="w-full bg-white rounded-lg shadow-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                            {/* Cheque Background */}
                            <div className="h-full w-full bg-gradient-to-r from-white via-blue-50 to-white p-8 border-2 border-slate-300 flex flex-col justify-between" style={{ fontFamily: 'Georgia, serif' }}>
                                {/* Top Section - Bank Details */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex-1">
                                        <div className="text-2xl font-bold text-slate-900">{formData.bankName}</div>
                                        <div className="text-sm text-slate-600">{formData.bankBranch}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-600">Cheque No.</div>
                                        <div className="text-lg font-bold text-slate-900 border-b-2 border-slate-900">{formData.chequeNumber}</div>
                                    </div>
                                </div>

                                {/* Middle Section - Cheque Details */}
                                <div className="space-y-6">
                                    {/* Date */}
                                    <div className="flex justify-end">
                                        <div className="text-right">
                                            <div className="text-xs text-slate-600 mb-1">Date</div>
                                            <div className="border-b border-slate-900 w-32 text-sm font-semibold text-slate-900">
                                                {new Date(formData.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payee */}
                                    <div>
                                        <div className="text-xs text-slate-600 mb-1">Pay</div>
                                        <div className="border-b-2 border-slate-900 py-1">
                                            <div className="text-lg font-semibold text-slate-900">{formData.payeeName}</div>
                                        </div>
                                    </div>

                                    {/* Amount in Words */}
                                    <div>
                                        <div className="text-xs text-slate-600 mb-1">Amount</div>
                                        <div className="border-b-2 border-slate-900 py-1">
                                            <div className="text-base font-semibold text-slate-900">
                                                {formData.amountWords} {formData.currency}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Amount Box */}
                                <div className="flex justify-end mb-8">
                                    <div className="border-2 border-slate-900 px-6 py-2 text-right bg-blue-50">
                                        <div className="text-xs text-slate-600">Amount</div>
                                        <div className="text-2xl font-bold text-slate-900">
                                            {formData.currency} {formData.amountNumbers}
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Section - Issuer & Signature */}
                                <div className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-300">
                                    <div>
                                        <div className="text-xs text-slate-600 mb-2">Issuer</div>
                                        <div className="text-sm font-semibold text-slate-900">{formData.businessName}</div>
                                        <div className="text-xs text-slate-600">{formData.businessAddress}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-slate-600">A/C Payee Only</div>
                                        <div className="border-2 border-slate-900 px-2 py-1 text-xs font-bold text-slate-900 mt-1 inline-block">
                                            A/C PAYEE ONLY
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="border-t-2 border-slate-900 pt-1 h-16"></div>
                                        <div className="text-xs text-slate-600 mt-1">Authorized Signature</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
