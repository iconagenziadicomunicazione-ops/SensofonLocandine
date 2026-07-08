import * as Print from "expo-print";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";

import { TemplateDef } from "../templates";

const imgCache: Record<string, string> = {};

async function assetToBase64(mod: any): Promise<string> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Builds a print-ready PDF (32×47 cm) for the "poster" template using the
 * bundled template image as a full-bleed background.
 */
export async function buildPosterPdf(
  tmpl: TemplateDef,
  values: Record<string, string>,
): Promise<string> {
  if (!imgCache[tmpl.key]) {
    imgCache[tmpl.key] = await assetToBase64(tmpl.image);
  }
  const bg = imgCache[tmpl.key];

  const PAGE_H_CM = 47;

  const overlays = tmpl.overlays
    .map((o) => {
      const hasField = o.spans.some((s) => s.field && (values[s.field] || "").trim());
      if (!o.showAlways && !hasField) return "";
      const inner = o.spans
        .map((s) => {
          const raw = s.field ? values[s.field] || "" : s.text || "";
          return escapeHtml(o.uppercase ? raw.toUpperCase() : raw);
        })
        .join("");
      if (!inner.trim()) return "";
      const left = (o.x / tmpl.baseW) * 100;
      const top = (o.y / tmpl.baseH) * 100;
      const w = (o.w / tmpl.baseW) * 100;
      const h = (o.h / tmpl.baseH) * 100;
      const fs = (o.size / tmpl.baseH) * PAGE_H_CM; // cm
      const justify = o.align === "center" ? "center" : "flex-start";
      const rot = o.rotate ? `transform:rotate(${o.rotate}deg);transform-origin:left center;` : "";
      return `<div class="f" style="left:${left}%;top:${top}%;width:${w}%;height:${h}%;font-size:${fs.toFixed(3)}cm;color:${o.color};justify-content:${justify};${rot}">${inner}</div>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    @page{size:32cm 47cm;margin:0;}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    html,body{margin:0;padding:0;}
    .page{position:relative;width:32cm;height:47cm;overflow:hidden;}
    .bg{position:absolute;top:0;left:0;width:100%;height:100%;}
    .f{position:absolute;display:flex;align-items:center;font-family:Arial, Helvetica, sans-serif;font-weight:700;white-space:nowrap;overflow:hidden;line-height:1;}
  </style></head>
  <body><div class="page"><img class="bg" src="data:image/jpeg;base64,${bg}"/>${overlays}</div></body></html>`;

  const { uri } = await Print.printToFileAsync({
    html,
    width: 907, // 32cm in points
    height: 1332, // 47cm in points
    base64: false,
  });
  return uri;
}
