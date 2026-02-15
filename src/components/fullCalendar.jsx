import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Map maintenance items to FullCalendar events.
 * Uses scheduledDate for start; all-day events.
 */
function maintenanceToEvents(maintenance = []) {
    return maintenance
        .filter((item) => item && (item.scheduledDate || item.createdAt))
        .map((item) => {
            const dateRaw = item.scheduledDate || item.createdAt;
            const startDate = dateRaw ? new Date(dateRaw) : null;
            if (!startDate || isNaN(startDate.getTime())) return null;

            const startStr = startDate.toISOString().slice(0, 10); // YYYY-MM-DD for all-day
            const workOrderId = `#WO-${String(item._id || "").slice(-4).toUpperCase()}`;
            const title = item.title ? `${workOrderId} ${item.title}` : workOrderId;

            return {
                id: item._id,
                title,
                start: startStr,
                extendedProps: {
                    priority: item.priority,
                    status: item.status,
                    workOrderId,
                },
            };
        })
        .filter(Boolean);
}

export default function FullCalendarView({ maintenance = [], onDateSelect }) {
    const events = useMemo(() => maintenanceToEvents(maintenance), [maintenance]);

    const handleDateSelect = (selectInfo) => {
        if (onDateSelect) {
            onDateSelect(selectInfo);
        }
    };

    return (
        <Card className="rounded-2xl shadow-md">
            <CardContent className="p-4">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: "prev,next today",
                        center: "title",
                        right: "dayGridMonth,timeGridWeek,timeGridDay",
                    }}
                    selectable={!!onDateSelect}
                    select={onDateSelect ? handleDateSelect : undefined}
                    events={events}
                    height="auto"
                />
            </CardContent>
        </Card>
    );
}
