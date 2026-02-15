import { useState, useEffect } from "react";
import api from "../../plugins/axios";
import { toast } from "sonner";

function useUnits() {
    const [units, setUnits] = useState(null);

    useEffect(() => {
        const getUnits = async () => {
            try {
                const response = await api.get("/api/unit/get-units");
                if (response.data.success) {
                    setUnits(response.data.units || []);
                } else {
                    throw new Error(response.data.message || "Failed to fetch units");
                }
            } catch (error) {
                console.error("Error fetching units:", error);
                toast.error("Failed to fetch units. Please try again.");
            } 
        };
        getUnits();
    }, []);
    
    return { units };
}
export default useUnits;