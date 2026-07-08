import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";

import { listPosters, deletePoster, PosterRecord } from "@/src/lib/api";
import { TEMPLATES } from "@/src/templates";
import { colors, spacing, radius, fonts } from "@/src/theme";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function History() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<PosterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await listPosters();
      setItems(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const reopen = (item: PosterRecord) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: `/compose/${item.type}`,
      params: { prefill: JSON.stringify(item.fields) },
    });
  };

  const remove = async (item: PosterRecord) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems((prev) => prev.filter((p) => p.id !== item.id));
    try {
      await deletePoster(item.id);
    } catch {
      load();
    }
  };

  const renderItem = ({ item }: { item: PosterRecord }) => {
    const tmpl = TEMPLATES[item.type];
    return (
      <Pressable
        testID={`history-item-${item.id}`}
        onPress={() => reopen(item)}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
      >
        <Image
          source={{ uri: `data:image/jpeg;base64,${item.thumbnail}` }}
          style={styles.thumb}
          contentFit="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.rowSub}>{tmpl?.badge}</Text>
          <Text style={styles.rowDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.rowActions}>
          <Ionicons name="download-outline" size={22} color={colors.brand} />
          <Pressable
            testID={`history-delete-${item.id}`}
            hitSlop={10}
            onPress={() => remove(item)}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={20} color={colors.onSurfaceTertiary} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.h1}>Storico</Text>
        <Text style={styles.sub}>Le tue locandine generate</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.onSurfaceTertiary} />
          <Text style={styles.emptyTitle}>Impossibile caricare</Text>
          <Pressable testID="history-retry" onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Riprova</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="documents-outline" size={40} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>Nessuna locandina creata</Text>
          <Text style={styles.emptyText}>Vai su “Crea” per generare la tua prima locandina Sensofon.</Text>
          <Pressable testID="history-go-create" onPress={() => router.push("/")} style={styles.retryBtn}>
            <Text style={styles.retryText}>Crea locandina</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  h1: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.onSurface },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.onSurfaceSecondary, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
  emptyIcon: {
    width: 84, height: 84, borderRadius: radius.pill, backgroundColor: colors.brandTint,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.sm,
  },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.onSurface },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: colors.onSurfaceSecondary, textAlign: "center", lineHeight: 20 },
  retryBtn: {
    marginTop: spacing.md, backgroundColor: colors.brand, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md, borderRadius: radius.pill,
  },
  retryText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onBrand },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  thumb: { width: 54, height: 68, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  rowTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.onSurface },
  rowSub: { fontFamily: fonts.medium, fontSize: 12, color: colors.brand, marginTop: 2 },
  rowDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.onSurfaceTertiary, marginTop: 2 },
  rowActions: { alignItems: "center", gap: spacing.md },
  deleteBtn: { padding: 2 },
});
