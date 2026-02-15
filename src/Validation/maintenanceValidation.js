import * as yup from "yup";
let maintenanceSchema=yup.object().shape({
    description: yup.string().required("Description is required"),
    priority: yup.string().required("Priority is required"),
    status: yup.string().required("Status is required"),
    assignedTo: yup.string().required("Assigned to is required"),
    assignedDate: yup.date().required("Assigned date is required"),
    completedDate: yup.date().nullable(),
});
export default maintenanceSchema;