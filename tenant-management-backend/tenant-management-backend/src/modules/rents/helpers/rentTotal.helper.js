export function calculateRentTotals(rent) {
  if (!rent) {
    throw new Error("Rent object is required");
  }

  // UNIT-BASED RENT (authoritative)
  if (rent.useUnitBreakdown && Array.isArray(rent.unitBreakdown)) {
    const totals = rent.unitBreakdown.reduce(
      (acc, unit) => {
        acc.rentAmountPaisa += Math.round(Number(unit.rentAmountPaisa) || 0);
        acc.paidAmountPaisa += Math.round(Number(unit.paidAmountPaisa) || 0);
        acc.tdsAmountPaisa += Math.round(Number(unit.tdsAmountPaisa) || 0);
        return acc;
      },
      {
        rentAmountPaisa: 0,
        paidAmountPaisa: 0,
        tdsAmountPaisa: 0,
        remainingAmountPaisa: 0,
      },
    );

    // Calculate remainingAmountPaisa at the end
    totals.remainingAmountPaisa =
      totals.rentAmountPaisa - totals.paidAmountPaisa - totals.tdsAmountPaisa;

    console.log("CALCULATION TRACE", totals);

    return totals;
  }

  // FLAT RENT (legacy / non-unit)
  const rentAmountPaisa = Number(rent.rentAmountPaisa) || 0;
  const paidAmountPaisa = Number(rent.paidAmountPaisa) || 0;
  const tdsAmountPaisa = Number(rent.tdsAmountPaisa) || 0;

  return {
    rentAmountPaisa,
    paidAmountPaisa,
    tdsAmountPaisa,
    remainingAmountPaisa: rentAmountPaisa - paidAmountPaisa,
  };
}
