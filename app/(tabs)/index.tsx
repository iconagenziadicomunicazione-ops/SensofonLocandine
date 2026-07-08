import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";

import { TEMPLATES, TemplateDef } from "@/src/templates";
import { colors, spacing, radius, fonts } from "@/src/theme";

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const open = (t: TemplateDef) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/compose/${t.key}`);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header */}
        <View style={styles.brandRow}>
          <Image
            source={require("@/assets/brand/logo.webp")}
            style={styles.logo}
            contentFit="contain"
            testID="brand-logo"
          />
          <Text style={styles.brandSub}>Generatore Locandine</Text>
        </View>

        <Text style={styles.h1}>Quale locandina{"\n"}vuoi creare?</Text>
        <Text style={styles.lead}>Scegli un modello, compila i dati dell'evento e scaricalo pronto da condividere o stampare.</Text>

        <View style={{ height: spacing.lg }} />

        {Object.values(TEMPLATES).map((t) => (
          <Pressable
            key={t.key}
            testID={`template-card-${t.key}`}
            onPress={() => open(t)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.thumbWrap}>
              <Image source={t.image} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t.badge}</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{t.title}</Text>
              <Text style={styles.cardSub}>{t.subtitle}</Text>
              <View style={styles.chooseRow}>
                <Text style={styles.chooseText}>Scegli questo</Text>
                <Ionicons name="arrow-forward-circle" size={22} color={colors.brand} />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  brandRow: { alignItems: "flex-start", marginBottom: spacing.xl },
  logo: { width: 190, height: 52, marginBottom: 2 },
  brandSub: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSurfaceTertiary, marginLeft: 2 },
  h1: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.onSurface, lineHeight: 34 },
  lead: { fontFamily: fonts.regular, fontSize: 14, color: colors.onSurfaceSecondary, marginTop: spacing.sm, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardPressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  thumbWrap: { height: 200, backgroundColor: colors.surfaceTertiary },
  thumb: { width: "100%", height: "100%" },
  badge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11, color: "#fff" },
  cardBody: { padding: spacing.lg },
  cardTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.onSurface },
  cardSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.onSurfaceSecondary, marginTop: 2 },
  chooseRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.md },
  chooseText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.brand },
});
