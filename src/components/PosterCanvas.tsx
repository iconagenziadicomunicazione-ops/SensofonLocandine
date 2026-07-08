import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";

import { TemplateDef } from "../templates";
import { fontFor, colors } from "../theme";
import Clipart, { ClipartId } from "./Clipart";

export type LogoValue =
  | { type: "image"; uri: string }
  | { type: "clipart"; id: ClipartId }
  | null;

type Props = {
  tmpl: TemplateDef;
  values: Record<string, string>;
  scale: number;
  logo?: LogoValue;
};

const NUDGE = 0.12; // optical downward nudge to visually center the line box

/**
 * Renders a template image with static labels + user field values overlaid at
 * the exact coordinates defined in templates.ts. Labels and their fields live
 * inside a single <Text> (nested spans) so they always share a baseline —
 * giving perfect alignment. `scale` maps the original pixel space (1 = full res).
 */
export default function PosterCanvas({ tmpl, values, scale, logo }: Props) {
  const lg = tmpl.logo;
  return (
    <View
      style={{ width: tmpl.baseW * scale, height: tmpl.baseH * scale, backgroundColor: "#fff", overflow: "hidden" }}
    >
      <Image
        source={tmpl.image}
        style={StyleSheet.absoluteFill}
        contentFit="fill"
        cachePolicy="memory-disk"
        contentPosition="center"
      />

      {tmpl.overlays.map((o) => {
        const hasFieldValue = o.spans.some((s) => s.field && (values[s.field] || "").trim());
        if (!o.showAlways && !hasFieldValue) return null;
        return (
          <View
            key={o.id}
            style={{
              position: "absolute",
              left: o.x * scale,
              top: o.y * scale,
              width: o.w * scale,
              height: o.h * scale,
              justifyContent: "center",
              alignItems: o.align === "center" ? "center" : "flex-start",
              transformOrigin: o.align === "center" ? "center" : "left center",
              transform: o.rotate ? [{ rotate: `${o.rotate}deg` }] : undefined,
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.3}
              style={{
                fontSize: o.size * scale,
                color: o.color,
                textAlign: o.align === "center" ? "center" : "left",
                width: "100%",
                includeFontPadding: false,
                transform: [{ translateY: o.rotate ? 0 : o.size * scale * NUDGE }],
              }}
            >
              {o.spans.map((s, i) => (
                <Text key={i} style={{ fontFamily: fontFor(s.weight) }}>
                  {(() => {
                    const raw = s.field ? values[s.field] || "" : s.text || "";
                    return o.uppercase ? raw.toUpperCase() : raw;
                  })()}
                </Text>
              ))}
            </Text>
          </View>
        );
      })}

      {lg && logo && (
        <View
          style={{
            position: "absolute",
            left: (lg.cx - lg.r) * scale,
            top: (lg.cy - lg.r) * scale,
            width: lg.r * 2 * scale,
            height: lg.r * 2 * scale,
            borderRadius: lg.r * scale,
            backgroundColor: "#FFFFFF",
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: Math.max(1, 3 * scale),
            borderColor: colors.brand,
          }}
        >
          {logo.type === "image" ? (
            <Image source={{ uri: logo.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <Clipart id={logo.id} size={lg.r * 2 * scale * 0.62} />
          )}
        </View>
      )}
    </View>
  );
}
