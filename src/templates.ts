import { OverlayWeight } from "./theme";

export type FieldDef = {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
  keyboardType?: "default" | "phone-pad" | "numbers-and-punctuation";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

// A span is either a piece of static text or a bound field value.
export type Span = { text?: string; field?: string; weight: OverlayWeight };

export type Overlay = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
  color: string;
  align?: "left" | "center";
  spans: Span[];
  // Render even when all field spans are empty (used for static labels).
  showAlways?: boolean;
  // Rotation in degrees (negative = counter-clockwise), pivots on the left edge.
  rotate?: number;
  // Force the rendered value to uppercase.
  uppercase?: boolean;
};

export type TemplateDef = {
  key: "social" | "poster";
  title: string;
  subtitle: string;
  badge: string;
  image: any;
  baseW: number;
  baseH: number;
  exportType: "jpg" | "pdf";
  exportLabel: string;
  fields: FieldDef[];
  overlays: Overlay[];
  logo?: { cx: number; cy: number; r: number };
};

const WHITE = "#FFFFFF";
const BORDEAUX = "#550216";

// Coordinates are expressed in the ORIGINAL pixel space of each template image.
export const TEMPLATES: Record<string, TemplateDef> = {
  social: {
    key: "social",
    title: "Locandina Social",
    subtitle: "Post Instagram / Facebook",
    badge: "JPG · 1080×1350",
    image: require("../assets/templates/locandina1.jpg"),
    baseW: 1080,
    baseH: 1350,
    exportType: "jpg",
    exportLabel: "Scarica JPG",
    fields: [
      { key: "contact", label: "Nome contatto", placeholder: "Es. Ottica Rossi", required: true, autoCapitalize: "words" },
      { key: "date", label: "Data (il giorno)", placeholder: "Es. 15 Aprile 2026" },
      { key: "time", label: "Ora (alle ore)", placeholder: "Es. 10:00" },
      { key: "phone", label: "Telefono", placeholder: "Es. 011 123 4567 / 333 1234567", keyboardType: "default" },
      { key: "address", label: "Indirizzo", placeholder: "Es. Via Roma 12, Torino", autoCapitalize: "words" },
    ],
    overlays: [
      // --- Headline block (above the white "PRENOTA" badge) ---
      { id: "l1", x: 48, y: 196, w: 990, h: 56, size: 46, color: WHITE, align: "left", showAlways: true,
        spans: [{ text: "organizza giornate di", weight: "light" }] },
      { id: "l2", x: 48, y: 250, w: 990, h: 74, size: 60, color: WHITE, align: "left", showAlways: true,
        spans: [{ text: "Screening Audiometrico", weight: "bold" }] },
      { id: "l3", x: 48, y: 330, w: 990, h: 74, size: 60, color: WHITE, align: "left", showAlways: true,
        spans: [{ text: "presso ", weight: "bold" }, { field: "contact", weight: "bold" }] },

      // --- Date / time block (below the white badge) ---
      { id: "giorno", x: 48, y: 632, w: 600, h: 62, size: 48, color: WHITE, align: "left", showAlways: true,
        spans: [{ text: "il giorno: ", weight: "bold" }, { field: "date", weight: "bold" }] },
      { id: "ore", x: 48, y: 706, w: 560, h: 62, size: 48, color: WHITE, align: "left", showAlways: true,
        spans: [{ text: "dalle ore: ", weight: "bold" }, { field: "time", weight: "bold" }] },

      // --- Contact icons (bottom, next to baked-in icons) ---
      { id: "phone", x: 120, y: 1186, w: 560, h: 60, size: 38, color: BORDEAUX, align: "left",
        spans: [{ field: "phone", weight: "semibold" }] },
      { id: "address", x: 120, y: 1262, w: 900, h: 60, size: 34, color: BORDEAUX, align: "left",
        spans: [{ field: "address", weight: "semibold" }] },
    ],
    logo: { cx: 150, cy: 1104, r: 76 },
  },
  poster: {
    key: "poster",
    title: "Locandina Fumetto",
    subtitle: "Manifesto per la stampa",
    badge: "PDF · 32×47 cm",
    image: require("../assets/templates/locandina2.jpg"),
    baseW: 1362,
    baseH: 2000,
    exportType: "pdf",
    exportLabel: "Scarica PDF",
    fields: [
      { key: "date", label: "Data", placeholder: "Es. 15 Aprile 2026", required: true },
      { key: "time", label: "Ora", placeholder: "Es. 10:00", required: true },
      { key: "info", label: "Info (recapito)", placeholder: "Es. Tel. 011 123 4567" },
    ],
    overlays: [
      { id: "date", x: 400, y: 1380, w: 450, h: 60, size: 46, color: BORDEAUX, align: "center", rotate: -3.9, uppercase: true,
        spans: [{ field: "date", weight: "bold" }] },
      { id: "time", x: 1037, y: 1348, w: 200, h: 56, size: 42, color: BORDEAUX, align: "center", rotate: -3.9, uppercase: true,
        spans: [{ field: "time", weight: "bold" }] },
      { id: "info", x: 888, y: 1730, w: 395, h: 56, size: 32, color: "#111111", align: "left", uppercase: true,
        spans: [{ field: "info", weight: "bold" }] },
    ],
  },
};
