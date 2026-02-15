import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import DualCalendarTailwind from "../../../components/dualDate";
import { DocumentUploadSection } from "./DocumentUploadSection";

export const DocumentsTab = ({ formik, isLoading, onPrevious, onClose }) => {
    return (
        <Card className="shadow-sm">
            <CardContent className="p-6 space-y-5">
                <DocumentUploadSection formik={formik} />

                <div className="space-y-2">
                    <Label>Agreement Signed Date</Label>
                    <DualCalendarTailwind
                        onChange={(englishDate) =>
                            formik.setFieldValue("dateOfAgreementSigned", englishDate)
                        }
                    />
                </div>

                <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={onPrevious}>
                        Previous
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1 bg-primary hover:bg-primary/90"
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner /> : "Save & Register"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};