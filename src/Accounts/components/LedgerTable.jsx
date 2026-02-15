

import { usePagination } from "../hooks/usePagination";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    MoreHorizontalIcon,
} from "lucide-react";





export default function LedgerTable({
    entries,
    loading = false,
    itemsPerPage = 10,
}) {
    const {
        currentPage,
        totalPages,
        startIndex,
        endIndex,
        paginatedItems,
        nextPage,
        prevPage,
        goToPage,
    } = usePagination(entries, itemsPerPage);

    return (
        <>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[140px]">Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Debit</TableHead>
                            <TableHead>Credit</TableHead>
                            <TableHead className="text-right">Running Balance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : entries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">
                                    No ledger entries
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((entry) => (
                                <TableRow key={entry._id}>
                                    <TableCell>
                                        {entry.date
                                            ? new Date(entry.date).toLocaleDateString()
                                            : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {entry.description || entry.account?.name || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {entry.debit ? `₹${entry.debit.toLocaleString()}` : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {entry.credit ? `₹${entry.credit.toLocaleString()}` : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {entry.runningBalance !== undefined
                                            ? `₹${entry.runningBalance.toLocaleString()}`
                                            : "-"}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {entries.length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 pt-4 border-t px-4 pb-4">
                    <div className="text-sm text-muted-foreground text-center sm:text-left">
                        Showing {startIndex + 1} to {Math.min(endIndex, entries.length)} of{" "}
                        {entries.length} entries
                    </div>
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={prevPage}
                                    disabled={currentPage === 1 || loading}
                                    className="gap-1 bg-transparent"
                                >
                                    <ChevronLeftIcon className="h-4 w-4" />
                                    <span className="hidden sm:inline">Previous</span>
                                </Button>
                            </PaginationItem>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                // Show first page, last page, current page, and pages around current
                                if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                    return (
                                        <PaginationItem key={page}>
                                            <Button
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => goToPage(page)}
                                                disabled={loading}
                                                className="min-w-[2.5rem]"
                                            >
                                                {page}
                                            </Button>
                                        </PaginationItem>
                                    );
                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                    return (
                                        <PaginationItem key={page}>
                                            <span className="flex h-9 w-9 items-center justify-center">
                                                <MoreHorizontalIcon className="h-4 w-4" />
                                            </span>
                                        </PaginationItem>
                                    );
                                }
                                return null;
                            })}

                            <PaginationItem>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={nextPage}
                                    disabled={currentPage === totalPages || loading}
                                    className="gap-1 bg-transparent"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRightIcon className="h-4 w-4" />
                                </Button>
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </>
    );
}
