import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import api from "../../plugins/axios";
import { AddExpenseDialog } from "./components/AddExpenseDialog";
import { ExpensesTable } from "./components/ExpensesTable";

export default function Expenses() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [expenseSources, setExpenseSources] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchExpenses = useCallback(async () => {
        try {
            const response = await api.get("/api/expense/get-all");
            setExpenses(response.data?.expenses ?? []);
        } catch (error) {
            console.error("Error fetching expenses:", error);
            setExpenses([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    useEffect(() => {
        const getExpenseSources = async () => {
            try {
                const response = await api.get("/api/expense/get-expense-sources");
                setExpenseSources(response.data?.expenseSources ?? []);
            } catch (error) {
                console.error("Error fetching expense sources:", error);
                setExpenseSources([]);
            }
        };
        getExpenseSources();
    }, []);

    useEffect(() => {
        const getTenants = async () => {
            try {
                const response = await api.get("/api/tenant/get-tenants");
                setTenants(response.data?.tenants ?? []);
            } catch (error) {
                console.error("Error fetching tenants:", error);
                setTenants([]);
            }
        };
        getTenants();
    }, []);

    return (
        <div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Expenses</CardTitle>
                    <Button onClick={() => setIsDialogOpen(true)}>
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add Expense
                    </Button>
                </CardHeader>
                <CardContent>
                    <ExpensesTable expenses={expenses} loading={loading} />
                </CardContent>
            </Card>

            <AddExpenseDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                tenants={tenants}
                expenseSources={expenseSources}
                onSuccess={() => fetchExpenses()}
            />
        </div>
    );
}
