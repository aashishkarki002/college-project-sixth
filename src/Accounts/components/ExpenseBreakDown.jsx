import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import DetailDonutChart from "./DetailDonutChart";
import LedgerTable from "./LedgerTable";
import { toast } from "sonner";
import { BanknoteArrowDownIcon, Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function ExpenseBreakDown({
    expenses,
    ledgerEntries,
    loadingSummary,
    loadingLedger,
}) {

    // Export to CSV
    const exportToCSV = () => {
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

        // Create CSV content
        let csvContent = "Expense Breakdown Report\n\n";

        // Summary section
        csvContent += "Summary\n";
        csvContent += `Total Expenses,₹${totalExpenses.toLocaleString()}\n`;
        csvContent += `Number of Categories,${expenses.length}\n`;
        csvContent += `Highest Expense,${expenses[0]?.name || "—"}\n\n`;

        // Expense categories
        csvContent += "Expense Categories\n";
        csvContent += "Category,Amount,Percentage\n";
        expenses.forEach((expense) => {
            const progress = totalExpenses ? ((expense.amount / totalExpenses) * 100).toFixed(2) : 0;
            csvContent += `${expense.name || expense.code},₹${expense.amount.toLocaleString()},${progress}%\n`;
        });

        // Ledger entries
        csvContent += "\nExpense Ledger Entries\n";
        csvContent += "Date,Description,Amount,Type\n";
        // On Expenses tab, API already returns only expense entries
        const expenseLedger = ledgerEntries;
        expenseLedger.forEach((entry) => {
            const date = entry.date ? new Date(entry.date).toLocaleDateString() : "—";
            const description = entry.description || entry.account?.name || "—";
            const amount = (entry.debit || entry.credit) ? `₹${(entry.debit || entry.credit).toLocaleString()}` : "—";
            const typeLabel = entry.account?.type || "EXPENSE";
            csvContent += `${date},${description},${amount},${typeLabel}\n`;
        });

        // Create blob and download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `expense_breakdown_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Export to PDF
    const exportToPDF = () => {
        try {
            const doc = new jsPDF();
            const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

            // Title
            doc.setFontSize(20);
            doc.setFont(undefined, "bold");
            doc.text("Expense Breakdown Report", 14, 20);

            // Date
            doc.setFontSize(10);
            doc.setFont(undefined, "normal");
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

            // Summary section
            doc.setFontSize(14);
            doc.setFont(undefined, "bold");
            doc.text("Summary", 14, 40);

            doc.setFontSize(10);
            doc.setFont(undefined, "normal");
            doc.text(`Total Expenses: ₹${totalExpenses.toLocaleString()}`, 14, 48);
            doc.text(`Number of Categories: ${expenses.length}`, 14, 55);
            doc.text(`Highest Expense: ${expenses[0]?.name || "—"}`, 14, 62);

            // Expense categories table
            doc.setFontSize(14);
            doc.setFont(undefined, "bold");
            doc.text("Expense Categories", 14, 75);

            const categoryData = expenses.map((expense) => {
                const progress = totalExpenses ? ((expense.amount / totalExpenses) * 100).toFixed(2) : 0;
                return [
                    expense.name || expense.code,
                    `₹${expense.amount.toLocaleString()}`,
                    `${progress}%`
                ];
            });

            doc.autoPrint({
                startY: 80,
                head: [["Category", "Amount", "Percentage"]],
                body: categoryData,
                theme: "grid",
                styles: { fontSize: 9 },
                headStyles: { fillColor: [239, 68, 68] }
            });

            // Ledger entries table (on Expenses tab, API already returns only expense entries)
            const expenseLedger = ledgerEntries;
            if (expenseLedger.length > 0) {
                const finalY = doc.lastAutoTable.finalY || 80;

                doc.setFontSize(14);
                doc.setFont(undefined, "bold");
                doc.text("Expense Ledger Entries", 14, finalY + 15);

                const ledgerData = expenseLedger.slice(0, 20).map((entry) => [
                    entry.date ? new Date(entry.date).toLocaleDateString() : "—",
                    entry.description || entry.account?.name || "—",
                    (entry.debit || entry.credit) ? `₹${(entry.debit || entry.credit).toLocaleString()}` : "—",
                    entry.account?.type || "EXPENSE"
                ]);

                doc.autoPrint({
                    startY: finalY + 20,
                    head: [["Date", "Description", "Amount", "Type"]],
                    body: ledgerData,
                    theme: "grid",
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [239, 68, 68] }
                });

                if (expenseLedger.length > 20) {
                    const noteY = doc.lastAutoTable.finalY + 10;
                    doc.setFontSize(9);
                    doc.setFont(undefined, "italic");
                    doc.text(`Note: Showing first 20 of ${expenseLedger.length} entries`, 14, noteY);
                }
            }

            // Save the PDF
            doc.save(`expense_breakdown_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast("Failed to generate PDF. Please try again.");
        }
    };

    return (
        <div className="space-y-4">

            {/* Export Buttons */}
            <div className="flex gap-2 justify-end">
                <Button
                    onClick={exportToCSV}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </Button>
                <Button
                    onClick={exportToPDF}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <FileText className="h-4 w-4" />
                    Export PDF
                </Button>
            </div>

            {/* ===== Expense Summary ===== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Total Expenses
                            <BanknoteArrowDownIcon className="text-red-500 h-5 w-5" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-bold text-red-600">
                        ₹{expenses.reduce((sum, expense) => sum + expense.amount, 0).toLocaleString()}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Expense Categories</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-bold">
                        {expenses.length}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Highest Expense</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {expenses[0]?.name || "—"}
                    </CardContent>
                </Card>
            </div>

            {/* ===== Expense Breakdown Chart ===== */}
            <Card>
                <CardHeader>
                    <CardTitle>Expense Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <DetailDonutChart
                        data={expenses}
                        title="Expenses by Category"
                        loading={loadingSummary}
                        colors={["#ef4444", "#f87171", "#fca5a5", "#fecaca"]}
                    />
                </CardContent>
            </Card>

            {/* ===== Expense Category List ===== */}
            <Card>
                <CardHeader>
                    <CardTitle>Expense Categories</CardTitle>
                    <Separator />
                </CardHeader>
                <CardContent className="space-y-4">
                    {expenses.length > 0 ? (
                        expenses.map((expense, index) => {
                            const progress = expenses.reduce((sum, expense) => sum + expense.amount, 0)
                                ? (expense.amount / expenses.reduce((sum, expense) => sum + expense.amount, 0)) * 100
                                : 0;

                            return (
                                <div key={expense.code || index} className="space-y-2">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span>{expense.name || expense.code}</span>
                                        <span>₹{expense.amount.toLocaleString()}</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No expense data available
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* ===== Expense Ledger ===== */}
            <Card>
                <CardHeader>
                    <CardTitle>Expense Ledger Entries</CardTitle>
                </CardHeader>
                <CardContent>
                    <LedgerTable
                        entries={ledgerEntries}
                        loading={loadingLedger}
                        itemsPerPage={20}
                    />
                </CardContent>
            </Card>

        </div>
    );
}