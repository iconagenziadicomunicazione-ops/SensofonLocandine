import React from "react";
import { View } from "react-native";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";

export type ClipartId =
  | "farmacia"
  | "parafarmacia"
  | "medico"
  | "ortopedia"
  | "ottico"
  | "laboratorio"
  | "patronato";

export const CLIPARTS: { id: ClipartId; label: string }[] = [
  { id: "farmacia", label: "Farmacia" },
  { id: "parafarmacia", label: "Parafarmacia" },
  { id: "medico", label: "Medico" },
  { id: "ortopedia", label: "Ortopedia" },
  { id: "ottico", label: "Ottico" },
  { id: "laboratorio", label: "Lab. Analisi" },
  { id: "patronato", label: "Patronato" },
];

const BORDEAUX = "#550216";

// A clean medical "plus" cross (used for pharmacy / parafarmacia).
function Cross({ size, color }: { size: number; color: string }) {
  const arm = size * 0.34;
  const r = size * 0.07;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", width: arm, height: size, borderRadius: r, backgroundColor: color }} />
      <View style={{ position: "absolute", width: size, height: arm, borderRadius: r, backgroundColor: color }} />
    </View>
  );
}

export default function Clipart({ id, size }: { id: ClipartId; size: number }) {
  switch (id) {
    case "farmacia":
      return <Cross size={size} color="#16A34A" />;
    case "parafarmacia":
      return <Cross size={size} color="#2563EB" />;
    case "medico":
      return <FontAwesome5 name="user-md" size={size} color={BORDEAUX} />;
    case "ortopedia":
      return <MaterialCommunityIcons name="bone" size={size * 1.05} color={BORDEAUX} />;
    case "ottico":
      return <MaterialCommunityIcons name="glasses" size={size * 1.1} color={BORDEAUX} />;
    case "laboratorio":
      return <MaterialCommunityIcons name="test-tube" size={size} color={BORDEAUX} />;
    case "patronato":
      return <FontAwesome5 name="hands-helping" size={size * 0.92} color={BORDEAUX} />;
    default:
      return null;
  }
}
