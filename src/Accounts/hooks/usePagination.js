'use client';

import { useState, useEffect, useMemo, useRef } from "react";

export const usePagination = (items, itemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const prevItemsLengthRef = useRef(items?.length || 0);

  const itemsLength = items?.length || 0;
  const totalPages = Math.max(1, Math.ceil(itemsLength / itemsPerPage));

  // Reset to page 1 when items length actually changes
  // Also ensure currentPage doesn't exceed totalPages
  useEffect(() => {
    const currentLength = items?.length || 0;
    if (prevItemsLengthRef.current !== currentLength) {
      setCurrentPage(1);
      prevItemsLengthRef.current = currentLength;
    } else if (currentPage > totalPages && totalPages > 0) {
      // Adjust if current page exceeds available pages (e.g., after filtering)
      setCurrentPage(totalPages);
    }
  }, [itemsLength, totalPages, currentPage]);

  // Ensure currentPage is within valid range
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, itemsLength);
  
  const paginatedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const goToPage = (page) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    if (safeCurrentPage < totalPages) {
      setCurrentPage(safeCurrentPage + 1);
    }
  };

  const prevPage = () => {
    if (safeCurrentPage > 1) {
      setCurrentPage(safeCurrentPage - 1);
    }
  };

  return {
    currentPage: safeCurrentPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    setCurrentPage,
  };
};
