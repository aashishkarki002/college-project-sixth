import { useState } from "react";
import { motion } from "framer-motion";

const quarterToMonths = {
    All: "All periods",
    Q1: "Jan – Mar",
    Q2: "Apr – Jun",
    Q3: "Jul – Sep",
    Q4: "Oct – Dec",
};

export default function QuarterButton({
    quarter,
    value,
    selectedQuarter,
    setSelectedQuarter,
}) {
    const [hovered, setHovered] = useState(false);
    const isSelected = selectedQuarter === value;

    // Show quarter and month range (e.g. "Q1 · Jan – Mar")
    const monthText = value ? (quarterToMonths[value] ?? null) : null;
    const displayText = monthText ? `${quarter} · ${monthText}` : quarter;

    // Width accommodates full text
    const width = monthText ? 180 : 80;

    return (
        <motion.button
            onClick={() => setSelectedQuarter(value)}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            animate={{
                width,
                backgroundColor: isSelected ? "#000000" : hovered ? "#00001" : "#00001",
            }}
            transition={{ stiffness: 300, damping: 20 }}
            className="h-10 rounded-md text-white text-sm font-medium whitespace-nowrap"
        >
            {displayText}
        </motion.button>
    );
}
