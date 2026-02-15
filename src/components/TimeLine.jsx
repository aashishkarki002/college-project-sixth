import React from "react";

const Timeline = () => {
  const milestones = [
    {
      label: "LEASE START",
      value: "Jan 15, 2023",
      dotColor: "bg-[#3b21f9]",
      textColor: "text-gray-400",
      isActive: true,
    },
    {
      label: "KEY HANDOVER",
      value: "Completed",
      dotColor: "bg-[#17c37b]",
      textColor: "text-[#17c37b]",
      isActive: false,
    },
  ];

  return (
    <div className="bg-[#121212] p-10 min-h-[200px] flex items-center">
      <div className="relative w-full max-w-xl">
        {/* The Background Line */}
        <div className="absolute top-3 left-0 w-full h-[6px] bg-[#3b21f9] rounded-full z-0" />

        {/* Milestones Container */}
        <div className="relative z-10 flex gap-24">
          {milestones.map((item, index) => (
            <div key={index} className="flex flex-col items-start">
              {/* The Dot */}
              <div
                className={`
                  ${item.dotColor} 
                  rounded-full border-2 border-black mb-4
                  ${
                    item.isActive
                      ? "w-6 h-6 -mt-1 -ml-1 shadow-[0_0_10px_rgba(59,33,249,0.5)]"
                      : "w-4 h-4"
                  }
                `}
              />

              {/* Text Labels */}
              <div className="flex flex-col">
                <span
                  className={`text-[10px] font-bold tracking-wider ${item.textColor}`}
                >
                  {item.label}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    item.isActive ? "text-white" : "text-gray-400"
                  }`}
                >
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
