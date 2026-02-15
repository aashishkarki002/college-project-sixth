import React from 'react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import DetailDonutChart from './DetailDonutChart'
import LedgerTable from './LedgerTable'
export default function RevenueBreakDown({ totals, incomeStreams, ledgerEntries, loadingSummary, loadingLedger }) {
    return (
        <div>

            {/* Revenue KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-bold text-green-600">
                        ₹{totals.totalRevenue.toLocaleString()}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Revenue Source</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {incomeStreams[0]?.name || "—"}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Streams</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {incomeStreams.length}
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Charts */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <DetailDonutChart
                        data={incomeStreams}
                        title="Revenue by Source"
                        loading={loadingSummary}
                        colors={["#10b981", "#34d399", "#6ee7b7", "#a7f3d0"]}
                    />
                </CardContent>
            </Card>

            {/* Revenue Ledger */}
            <Card>
                <CardHeader>
                    <CardTitle>Revenue Ledger Entries</CardTitle>
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
    )
}