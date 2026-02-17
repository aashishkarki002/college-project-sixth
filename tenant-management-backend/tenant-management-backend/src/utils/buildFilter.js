const buildFilter = ({
  tenantId,
  startDate,
  endDate,
  paymentMethod,
  status,
  dateField = "createdAt",
}) => {
  const query = {};
  if (tenantId) query.tenant = tenantId;
  if (startDate && endDate) {
    query[dateField] = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (status) query.status = status;

  return query;
};
export default buildFilter;
