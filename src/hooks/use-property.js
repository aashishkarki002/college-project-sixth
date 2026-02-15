import { useState, useEffect } from "react";
import api from "../../plugins/axios";
import { toast } from "sonner";

function useProperty() {
    const [property, setProperty] = useState(null);
    const [block, setBlock] = useState(null);
    const [innerBlock, setInnerBlock] = useState(null);
    useEffect(() => {
        const getProperty = async () => {
            try {
                const response = await api.get("/api/property/get-property");
                if (response.data.success) {
                    setProperty(response.data.property || []);
                } else {
                    throw new Error(response.data.message || "Failed to fetch property");
                }
            } catch (error) {
                console.error("Error fetching property:", error);
                toast.error("Failed to fetch property. Please try again.");
            } 
        };

        getProperty();

    }, []);
    return { property, block, innerBlock };
}
export default useProperty;