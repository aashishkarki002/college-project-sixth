import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { DOCUMENT_TYPES } from "../constants/tenant.constant";

export const DocumentUploadSection = ({ formik }) => {
    const handleFileChange = (e) => {
        if (!formik.values.documentType) {
            toast.error("Please select a document type first");
            e.target.value = "";
            return;
        }

        const files = Array.from(e.target.files || []);
        const currentFiles = formik.values.documents?.[formik.values.documentType] || [];

        formik.setFieldValue("documents", {
            ...formik.values.documents,
            [formik.values.documentType]: [...currentFiles, ...files],
        });
    };

    const handleRemoveFile = (type, index) => {
        const files = formik.values.documents[type];
        const updatedFiles = files.filter((_, i) => i !== index);

        if (updatedFiles.length === 0) {
            const updatedDocuments = { ...formik.values.documents };
            delete updatedDocuments[type];
            formik.setFieldValue("documents", updatedDocuments);
        } else {
            formik.setFieldValue("documents", {
                ...formik.values.documents,
                [type]: updatedFiles,
            });
        }
    };

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <Label>Document Type</Label>
                <Select
                    name="documentType"
                    value={formik.values.documentType || ""}
                    onValueChange={(value) => formik.setFieldValue("documentType", value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={DOCUMENT_TYPES.CITIZENSHIP}>Citizenship</SelectItem>
                        <SelectItem value={DOCUMENT_TYPES.AGREEMENT}>Agreement</SelectItem>
                        <SelectItem value={DOCUMENT_TYPES.PHOTO}>Photo</SelectItem>
                        <SelectItem value={DOCUMENT_TYPES.COMPANY_DOCUMENT}>
                            Company document
                        </SelectItem>
                        <SelectItem value={DOCUMENT_TYPES.TDS}>TDS</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Upload Document</Label>
                <div className="flex flex-col gap-2 border-2 border-gray-300 border-dashed rounded-md p-2">
                    <input type="file" multiple onChange={handleFileChange} />
                </div>
            </div>

            {/* Display uploaded files */}
            {formik.values.documents &&
                Object.entries(formik.values.documents).map(([type, files]) => (
                    <div key={type} className="space-y-2">
                        <Badge>{type}</Badge>
                        <ul className="space-y-2">
                            {files.map((file, i) => (
                                <li
                                    key={i}
                                    className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-md"
                                >
                                    <span className="flex-1 text-sm truncate">{file.name}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemoveFile(type, i)}
                                    >
                                        <XIcon className="h-4 w-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
        </div>
    );
};