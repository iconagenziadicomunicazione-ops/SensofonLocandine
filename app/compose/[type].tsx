import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Linking,
  KeyboardAvoidingView,
  useWindowDimensions,
  Animated,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";

import { TEMPLATES } from "@/src/templates";
import PosterCanvas, { LogoValue } from "@/src/components/PosterCanvas";
import Clipart, { CLIPARTS, ClipartId } from "@/src/components/Clipart";
import { colors, spacing, radius, fonts } from "@/src/theme";
import { createPoster } from "@/src/lib/api";
import { buildPosterPdf } from "@/src/lib/export";

type ToastType = "success" | "error";

export default function Compose() {
  const { type, prefill } = useLocalSearchParams<{ type: string; prefill?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const tmpl = TEMPLATES[type as string] || TEMPLATES.social;

  const initial = useMemo(() => {
    const base: Record<string, string> = {};
    tmpl.fields.forEach((f) => (base[f.key] = ""));
    if (prefill) {
      try {
        Object.assign(base, JSON.parse(prefill));
      } catch {}
    }
    return base;
  }, [tmpl, prefill]);

  const [values, setValues] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState(false);
  const [permModal, setPermModal] = useState(false);
  const [logo, setLogo] = useState<LogoValue>(() => {
    const c = initial.logoClipart as ClipartId | undefined;
    return c ? { type: "clipart", id: c } : null;
  });

  const fullRef = useRef<View>(null);

  // Toast
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const showToast = useCallback((msg: string, t: ToastType) => {
    setToast({ msg, type: t });
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [toastOpacity]);

  // Preview scaling (fit inside ~40% height box)
  const previewMaxH = height * 0.4;
  const previewMaxW = width - spacing.xl * 2;
  const scale = Math.min(previewMaxW / tmpl.baseW, previewMaxH / tmpl.baseH);

  const setField = (key: string, v: string) => setValues((p) => ({ ...p, [key]: v }));

  const pickLogo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (perm.canAskAgain) {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!req.granted) { setPermModal(true); return; }
      } else {
        setPermModal(true);
        return;
      }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
      base64: true,
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    const uri = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
    setLogo({ type: "image", uri });
    setField("logoClipart", "");
  };

  const selectClipart = (id: ClipartId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLogo({ type: "clipart", id });
    setField("logoClipart", id);
  };

  const clearLogo = () => {
    Haptics.selectionAsync();
    setLogo(null);
    setField("logoClipart", "");
  };

  const historyTitle = () => {
    if (tmpl.key === "social") return values.contact?.trim() || "Locandina Social";
    return `Manifesto ${values.date?.trim() || ""}`.trim();
  };

  const ensureMedia = async (): Promise<boolean> => {
    const cur = await MediaLibrary.getPermissionsAsync();
    if (cur.granted) return true;
    if (cur.canAskAgain) {
      const req = await MediaLibrary.requestPermissionsAsync();
      if (req.granted) return true;
    }
    setPermModal(true);
    return false;
  };

  const webDownload = (dataUri: string, filename: string) => {
    if (typeof document === "undefined") return;
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Web-only: rasterise the off-screen canvas DOM node with html2canvas.
  const captureWebCanvas = async (): Promise<HTMLCanvasElement> => {
    const html2canvas = (await import("html2canvas")).default;
    const node = fullRef.current as unknown as HTMLElement;
    return html2canvas(node, { backgroundColor: "#ffffff", useCORS: true, logging: false });
  };

  const canvasToThumb = (canvas: HTMLCanvasElement): string => {
    const tc = document.createElement("canvas");
    tc.width = 300;
    tc.height = Math.round((300 * tmpl.baseH) / tmpl.baseW);
    tc.getContext("2d")!.drawImage(canvas, 0, 0, tc.width, tc.height);
    return tc.toDataURL("image/jpeg", 0.6).split(",")[1];
  };

  const onDownload = async () => {
    const missing = tmpl.fields.filter((f) => f.required && !values[f.key]?.trim());
    if (missing.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(`Compila: ${missing.map((m) => m.label).join(", ")}`, "error");
      return;
    }
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const isWeb = Platform.OS === "web";
      let thumb: string;

      if (isWeb) {
        // Web: single rasterisation used for download (jpg) and thumbnail.
        const canvas = await captureWebCanvas();
        if (tmpl.exportType === "jpg") {
          webDownload(canvas.toDataURL("image/jpeg", 0.95), `sensofon-${tmpl.key}.jpg`);
        }
        thumb = canvasToThumb(canvas);
      } else if (tmpl.exportType === "jpg") {
        const uri = await captureRef(fullRef, {
          format: "jpg", quality: 0.95, width: tmpl.baseW, height: tmpl.baseH,
        });
        const ok = await ensureMedia();
        if (!ok) { setBusy(false); return; }
        await MediaLibrary.saveToLibraryAsync(uri as string);
        thumb = (await captureRef(fullRef, {
          format: "jpg", quality: 0.6, width: 300,
          height: Math.round((300 * tmpl.baseH) / tmpl.baseW), result: "base64",
        })) as string;
      } else {
        const uri = await buildPosterPdf(tmpl, values);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Locandina PDF" });
        }
        thumb = (await captureRef(fullRef, {
          format: "jpg", quality: 0.6, width: 300,
          height: Math.round((300 * tmpl.baseH) / tmpl.baseW), result: "base64",
        })) as string;
      }

      await createPoster({ type: tmpl.key, title: historyTitle(), fields: values, thumbnail: thumb });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const okMsg = tmpl.exportType === "jpg"
        ? (isWeb ? "Locandina scaricata!" : "Locandina salvata nella galleria!")
        : (isWeb ? "Anteprima salvata · scarica il PDF dall'app" : "PDF pronto per la condivisione!");
      showToast(okMsg, "success");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("Errore durante la generazione", "error");
    } finally {
      setBusy(false);
    }
  };

  const buildThumb = async (): Promise<string> => {
    if (Platform.OS === "web") {
      const c = await captureWebCanvas();
      return canvasToThumb(c);
    }
    return (await captureRef(fullRef, {
      format: "jpg", quality: 0.6, width: 300,
      height: Math.round((300 * tmpl.baseH) / tmpl.baseW), result: "base64",
    })) as string;
  };

  const onShare = async () => {
    const missing = tmpl.fields.filter((f) => f.required && !values[f.key]?.trim());
    if (missing.length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(`Compila: ${missing.map((m) => m.label).join(", ")}`, "error");
      return;
    }
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

   if (Platform.OS === "web") {
  if (tmpl.exportType === "jpg") {
    const canvas = await captureWebCanvas();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const file = new File([blob], `sensofon-${tmpl.key}.jpg`, {
      type: "image/jpeg",
    });

    const nav: any = navigator;

    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({
        files: [file],
        title: "Locandina Sensofon",
        text: "Locandina pronta",
      });

      await createPoster({
        type: tmpl.key,
        title: historyTitle(),
        fields: values,
        thumbnail: await buildThumb(),
      });

      showToast("Locandina pronta per la condivisione!", "success");
      return;
    }

    webDownload(dataUrl, `sensofon-${tmpl.key}.jpg`);

  window.open(
  `https://wa.me/?text=${encodeURIComponent(
    "Ho scaricato la locandina Sensofon. La allego qui."
  )}`,
  "_blank"
);
  }

  await createPoster({
    type: tmpl.key,
    title: historyTitle(),
    fields: values,
    thumbnail: await buildThumb(),
  });

  showToast("Condivisione diretta non supportata. Locandina scaricata.", "success");
  return;
}
          } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("Errore durante la condivisione", "error");
    } finally {
      setBusy(false);
    }
      return;
    }

    webDownload(dataUrl, `sensofon-${tmpl.key}.jpg`);
  }

  await createPoster({
    type: tmpl.key,
    title: historyTitle(),
    fields: values,
    thumbnail: await buildThumb(),
  });
      let uri: string;
      if (tmpl.exportType === "jpg") {
        uri = (await captureRef(fullRef, { format: "jpg", quality: 0.95, width: tmpl.baseW, height: tmpl.baseH })) as string;
      } else {
        uri = await buildPosterPdf(tmpl, values);
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(
          uri,
          tmpl.exportType === "jpg"
            ? { mimeType: "image/jpeg", dialogTitle: "Condividi locandina" }
            : { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Condividi locandina" },
        );
      } else {
        showToast("Condivisione non disponibile", "error");
      }
      await createPoster({ type: tmpl.key, title: historyTitle(), fields: values, thumbnail: await buildThumb() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("Errore durante la condivisione", "error");
    } finally {
      setBusy(false);
    }
  };


  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="compose-back" onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{tmpl.title}</Text>
          <Text style={styles.headerSub}>{tmpl.badge}</Text>
        </View>
      </View>

      {/* Live preview */}
      <View style={[styles.previewArea, { height: previewMaxH + spacing.xl }]}>
        <View style={styles.previewShadow}>
          <PosterCanvas tmpl={tmpl} values={values} scale={scale} logo={logo} />
        </View>
      </View>

      {/* Form */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          style={styles.form}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.formTitle}>Compila i dati</Text>
          {tmpl.fields.map((f) => (
            <View key={f.key} style={styles.fieldWrap}>
              <Text style={styles.label}>
                {f.label}
                {f.required ? <Text style={{ color: colors.brand }}> *</Text> : null}
              </Text>
              <TextInput
                testID={`field-${f.key}`}
                value={values[f.key]}
                onChangeText={(v) => setField(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor={colors.onSurfaceTertiary}
                keyboardType={f.keyboardType as any}
                autoCapitalize={f.autoCapitalize || "sentences"}
                style={styles.input}
                returnKeyType="done"
              />
            </View>
          ))}

          {tmpl.logo && (
            <View style={styles.logoSection}>
              <Text style={styles.label}>Logo attività (sopra l'icona telefono)</Text>
              <Text style={styles.hint}>Carica il logo dell'attività o scegli una clipart.</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                <Pressable testID="logo-upload" onPress={pickLogo} style={[styles.chip, styles.chipUpload]}>
                  <Ionicons name="cloud-upload-outline" size={22} color={colors.brand} />
                  <Text style={styles.chipLabel}>Carica</Text>
                </Pressable>

                <Pressable
                  testID="logo-none"
                  onPress={clearLogo}
                  style={[styles.chip, !logo && styles.chipActive]}
                >
                  <Ionicons name="close-circle-outline" size={22} color={!logo ? colors.brand : colors.onSurfaceTertiary} />
                  <Text style={[styles.chipLabel, !logo && styles.chipLabelActive]}>Nessuno</Text>
                </Pressable>

                {CLIPARTS.map((c) => {
                  const active = logo?.type === "clipart" && logo.id === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      testID={`clipart-${c.id}`}
                      onPress={() => selectClipart(c.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Clipart id={c.id} size={26} />
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{c.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {logo?.type === "image" && (
                <View style={styles.logoPreviewRow}>
                  <Image source={{ uri: logo.uri }} style={styles.logoPreview} contentFit="cover" />
                  <Text style={styles.hint}>Logo caricato · verrà mostrato nel cerchio.</Text>
                  <Pressable testID="logo-remove" onPress={clearLogo} hitSlop={10}>
                    <Ionicons name="trash-outline" size={20} color={colors.onSurfaceTertiary} />
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky action CTAs */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.footerRow}>
          <Pressable
            testID="share-button"
            disabled={busy}
            onPress={onShare}
            style={({ pressed }) => [styles.ctaSecondary, (pressed || busy) && { opacity: 0.7 }]}
          >
            <Ionicons name="logo-whatsapp" size={20} color={colors.brand} />
            <Text style={styles.ctaSecondaryText}>Condividi</Text>
          </Pressable>

          <Pressable
            testID="download-button"
            disabled={busy}
            onPress={onDownload}
            style={({ pressed }) => [styles.cta, styles.ctaFlex, (pressed || busy) && { opacity: 0.85 }]}
          >
            {busy ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <>
                <Ionicons name={tmpl.exportType === "jpg" ? "download" : "document-text"} size={20} color={colors.onBrand} />
                <Text style={styles.ctaText}>{tmpl.exportLabel}</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Off-screen full-resolution canvas for capture */}
      <View style={styles.offscreen} pointerEvents="none">
        <View ref={fullRef} collapsable={false}>
          <PosterCanvas tmpl={tmpl} values={values} scale={1} logo={logo} />
        </View>
      </View>

      {/* Toast */}
      {toast && (
        <Animated.View
          testID="toast"
          style={[
            styles.toast,
            { bottom: insets.bottom + 96, opacity: toastOpacity, backgroundColor: toast.type === "success" ? colors.brandDark : colors.error },
          ]}
        >
          <Ionicons name={toast.type === "success" ? "checkmark-circle" : "alert-circle"} size={18} color="#fff" />
          <Text style={styles.toastText}>{toast.msg}</Text>
        </Animated.View>
      )}

      {/* Permission modal */}
      <Modal visible={permModal} transparent animationType="fade" onRequestClose={() => setPermModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="images-outline" size={30} color={colors.brand} />
            </View>
            <Text style={styles.modalTitle}>Accesso alla galleria</Text>
            <Text style={styles.modalText}>
              Per salvare la locandina serve il permesso di accesso alle foto. Attivalo dalle impostazioni del dispositivo.
            </Text>
            <Pressable testID="perm-settings" onPress={() => { setPermModal(false); Linking.openSettings(); }} style={styles.cta}>
              <Text style={styles.ctaText}>Apri Impostazioni</Text>
            </Pressable>
            <Pressable testID="perm-cancel" onPress={() => setPermModal(false)} style={{ paddingVertical: spacing.md }}>
              <Text style={styles.modalCancel}>Annulla</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
  headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.onSurface },
  headerSub: { fontFamily: fonts.medium, fontSize: 12, color: colors.brand },
  previewArea: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.md },
  previewShadow: {
    borderRadius: radius.sm, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  form: { flex: 1 },
  formTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.onSurface, marginBottom: spacing.md },
  fieldWrap: { marginBottom: spacing.lg },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.onSurfaceSecondary, marginBottom: spacing.sm },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.onSurfaceTertiary, marginBottom: spacing.md },
  logoSection: { marginTop: spacing.sm, marginBottom: spacing.lg },
  chipsRow: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    flexShrink: 0,
    width: 88,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  chipUpload: { borderStyle: "dashed", borderColor: colors.brand, backgroundColor: colors.brandTint },
  chipActive: { borderColor: colors.brand, borderWidth: 2, backgroundColor: colors.brandTint },
  chipLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.onSurfaceSecondary, textAlign: "center" },
  chipLabelActive: { color: colors.brand, fontFamily: fonts.semibold },
  logoPreviewRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  logoPreview: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceTertiary },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontFamily: fonts.medium, fontSize: 15, color: colors.onSurface,
  },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.brand, borderRadius: radius.pill, paddingVertical: 16, width: "100%",
  },
  ctaFlex: { flex: 1.5, width: undefined },
  ctaText: { fontFamily: fonts.bold, fontSize: 16, color: colors.onBrand },
  footerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  ctaSecondary: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs,
    backgroundColor: colors.brandTint, borderRadius: radius.pill, paddingVertical: 15,
    borderWidth: 1, borderColor: colors.brand,
  },
  ctaSecondaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.brand },
  offscreen: { position: "absolute", left: -100000, top: 0 },
  toast: {
    position: "absolute", left: spacing.xl, right: spacing.xl,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md,
  },
  toastText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, color: "#fff" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  modalCard: { width: "100%", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center" },
  emptyIcon: {
    width: 64, height: 64, borderRadius: radius.pill, backgroundColor: colors.brandTint,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.onSurface, marginBottom: spacing.sm },
  modalText: { fontFamily: fonts.regular, fontSize: 14, color: colors.onSurfaceSecondary, textAlign: "center", lineHeight: 20, marginBottom: spacing.lg },
  modalCancel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onSurfaceTertiary },
});
