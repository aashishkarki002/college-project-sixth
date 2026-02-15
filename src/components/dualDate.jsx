import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { NepaliDatePicker } from "nepali-datepicker-reactjs";
import "nepali-datepicker-reactjs/dist/index.css";
import dateConverter from "nepali-datetime/dateConverter";

const PANEL_WIDTH = 320; // min panel width in px
const PANEL_GAP = 6;    // gap between trigger and panel

const DualCalendarTailwind = ({ onChange, value }) => {
  const [nepaliDate, setNepaliDate] = useState("");
  const [englishDate, setEnglishDate] = useState(value || "");
  const [showCalendar, setShowCalendar] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  /* ─── helpers ─────────────────────────────────────────── */

  const formatDate = (y, m, d) =>
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  /* ─── sync controlled value ───────────────────────────── */

  useEffect(() => {
    if (value === undefined || value === englishDate) return;
    setEnglishDate(value);
    if (value) {
      const [y, m, d] = value.split("-").map(Number);
      const [ny, nm0, nd] = dateConverter.englishToNepali(y, m - 1, d);
      setNepaliDate(formatDate(ny, nm0 + 1, nd));
    } else {
      setNepaliDate("");
    }
  }, [value]);

  /* ─── portal positioning (shadcn / Radix pattern) ────────
     Use position:fixed + getBoundingClientRect so the panel
     escapes every overflow:hidden ancestor — the exact
     mechanism Radix UI's Popper primitive uses.            */

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Panel width: fill viewport on mobile, capped on desktop
    const width = Math.min(vw - 16, Math.max(PANEL_WIDTH, rect.width));

    // Horizontal: left-align with trigger, clamp to viewport
    let left = rect.left;
    if (left + width > vw - 8) left = vw - width - 8;
    if (left < 8) left = 8;

    // Vertical: prefer below, flip above if not enough room
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const panelH = panelRef.current?.offsetHeight ?? 260;

    let top;
    if (spaceBelow >= panelH + PANEL_GAP || spaceBelow >= spaceAbove) {
      top = rect.bottom + PANEL_GAP;
    } else {
      top = rect.top - panelH - PANEL_GAP;
    }

    setPanelStyle({ position: "fixed", top, left, width });
  }, []);

  /* ─── recompute on open + scroll/resize ──────────────── */

  useEffect(() => {
    if (!showCalendar) return;
    computePosition();

    window.addEventListener("scroll", computePosition, true);
    window.addEventListener("resize", computePosition);
    return () => {
      window.removeEventListener("scroll", computePosition, true);
      window.removeEventListener("resize", computePosition);
    };
  }, [showCalendar, computePosition]);

  /* ─── outside click ──────────────────────────────────── */

  useEffect(() => {
    const onDown = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  /* ─── BS → AD ────────────────────────────────────────── */

  const handleNepaliChange = (bsDate) => {
    if (!bsDate) return;
    const cleaned = bsDate.split(" ")[0];
    setNepaliDate(cleaned);
    const [by, bm, bd] = cleaned.split("-").map(Number);
    const [ey, em0, ed] = dateConverter.nepaliToEnglish(by, bm - 1, bd);
    const eng = formatDate(ey, em0 + 1, ed);
    setEnglishDate(eng);
    onChange?.(eng, cleaned);
    setShowCalendar(false);
  };

  /* ─── AD → BS ────────────────────────────────────────── */

  const handleEnglishChange = (e) => {
    const ad = e.target.value;
    setEnglishDate(ad);
    if (!ad) {
      setNepaliDate("");
      onChange?.("", "");
      return;
    }
    const [y, m, d] = ad.split("-").map(Number);
    const [ny, nm0, nd] = dateConverter.englishToNepali(y, m - 1, d);
    const np = formatDate(ny, nm0 + 1, nd);
    setNepaliDate(np);
    onChange?.(ad, np);
    setShowCalendar(false);
  };

  /* ─── panel (rendered via portal) ───────────────────── */

  const panel = showCalendar
    ? createPortal(
      <div
        ref={panelRef}
        style={panelStyle}
        className="z-[9999] rounded-md border border-gray-200 bg-white p-4 shadow-md"
      >
        {/* Stack vertically on mobile; side-by-side when panel is wide enough */}
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* English */}
          <div className="flex flex-col flex-1 min-w-0">
            <label className="mb-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
              English (AD)
            </label>
            <input
              type="date"
              value={englishDate}
              onChange={handleEnglishChange}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Divider — horizontal on mobile, vertical on desktop */}
          <div className="border-t border-gray-100 sm:border-t-0 sm:border-l sm:border-gray-100" />

          {/* Nepali */}
          <div className="flex flex-col flex-1 min-w-0">
            <label className="mb-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Nepali (BS)
            </label>
            {/*
                overflow-visible prevents THIS wrapper from clipping
                the NepaliDatePicker's own internal calendar popup.
              */}
            <div className="overflow-visible">
              <NepaliDatePicker
                value={nepaliDate}
                onChange={handleNepaliChange}
                inputClassName="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm
                                  focus:outline-none focus:ring-2 focus:ring-blue-400"
                options={{ calendarLocale: "en", valueLocale: "en" }}
              />
            </div>
          </div>
        </div>
      </div>,
      document.body // ← portal root escapes all overflow clipping
    )
    : null;

  /* ─── trigger ────────────────────────────────────────── */

  return (
    <div className="relative w-full">
      <input
        ref={triggerRef}
        type="text"
        readOnly
        value={englishDate && nepaliDate ? `${englishDate}  /  ${nepaliDate}` : ""}
        placeholder="Select Date"
        onClick={() => setShowCalendar((p) => !p)}
        className="w-full cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      {panel}
    </div>
  );
};

export default DualCalendarTailwind;