import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import RenderHtml, {
  defaultSystemFonts,
} from "react-native-render-html";
import CurvedHeader from "../../components/CurvedHeader";
import { useTermsOfUse } from "../../features/legal/hooks/useLegal";
import { useTranslation } from "react-i18next";

const systemFonts = [
  ...defaultSystemFonts,
  "System",
];

const tagsStyles = {
  body: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 24,
  },
  p: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 12,
  },
  h1: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800" as const,
    marginTop: 18,
    marginBottom: 10,
    lineHeight: 28,
  },
  h2: {
    color: "#1e293b",
    fontSize: 18,
    fontWeight: "700" as const,
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 24,
  },
  h3: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "700" as const,
    marginTop: 14,
    marginBottom: 6,
    lineHeight: 22,
  },
  ul: {
    marginTop: 4,
    marginBottom: 12,
    paddingLeft: 14,
  },
  ol: {
    marginTop: 4,
    marginBottom: 12,
    paddingLeft: 14,
  },
  li: {
    color: "#4b5563",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  strong: {
    color: "#0f172a",
    fontWeight: "700" as const,
  },
  b: {
    color: "#0f172a",
    fontWeight: "700" as const,
  },
  a: {
    color: "#ea580c",
    textDecorationLine: "underline" as const,
    fontWeight: "600" as const,
  },
  span: {
    lineHeight: 22,
  },
};

export default function TermsOfUseScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  // Card padding is 20px on each side (p-5), screen margin 16px on each side (mx-4)
  const contentWidth = Math.max(width - 72, 280);

  const {
    data: terms,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useTermsOfUse();

  const formattedDate = useMemo(() => {
    if (!terms?.updatedAt) return "Recently Updated";
    try {
      const d = new Date(terms.updatedAt);
      return `Last updated: ${d.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })}`;
    } catch {
      return "Recently Updated";
    }
  }, [terms?.updatedAt]);

  const htmlSource = useMemo(() => {
    const rawContent = terms?.content?.trim();
    if (!rawContent) return null;

    const isHtml = /<[a-z][\s\S]*>/i.test(rawContent);

    if (isHtml) {
      return { html: rawContent };
    }

    // Fallback: convert markdown / plain text to styled html
    const escaped = rawContent
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const converted = escaped
      .split(/\n\n+/)
      .map((block) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("# ")) {
          return `<h1>${trimmed.replace(/^#\s+/, "")}</h1>`;
        }
        if (trimmed.startsWith("## ")) {
          return `<h2>${trimmed.replace(/^##\s+/, "")}</h2>`;
        }
        if (trimmed.startsWith("### ")) {
          return `<h3>${trimmed.replace(/^###\s+/, "")}</h3>`;
        }
        return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
      })
      .join("");

    return { html: converted };
  }, [terms?.content]);

  return (
    <View className="flex-1 bg-neutral-50">
      <StatusBar style="light" />

      {/* Curved Navy Top Header */}
      <CurvedHeader title={terms?.title || t("terms.title")} showBackButton />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#ea580c"
            colors={["#ea580c"]}
          />
        }
      >
        <View className="bg-white rounded-3xl p-5 mx-4 mt-6 border border-neutral-100 shadow-xs">
          {/* Header Badges */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="self-start bg-orange-50 border border-orange-200/60 px-3.5 py-1.5 rounded-full">
              <Text className="text-orange-600 font-bold text-xs">
                {formattedDate}
              </Text>
            </View>
            {terms?.version && (
              <View className="bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-full">
                <Text className="text-neutral-600 font-semibold text-xs">
                  v{terms.version}
                </Text>
              </View>
            )}
          </View>

          {/* Loading State */}
          {isLoading && !isRefetching && (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color="#ea580c" />
              <Text className="text-neutral-500 text-sm mt-3 font-medium">
                {t("terms.loading")}
              </Text>
            </View>
          )}

          {/* Error State */}
          {isError && !isLoading && (
            <View className="py-12 items-center justify-center px-4">
              <View className="w-14 h-14 rounded-2xl bg-red-50 items-center justify-center mb-3 border border-red-100">
                <Feather name="alert-circle" size={26} color="#ef4444" />
              </View>
              <Text className="text-neutral-800 font-bold text-base text-center">
                {t("terms.error_title")}
              </Text>
              <Text className="text-neutral-500 text-sm text-center mt-1 mb-5">
                {t("terms.error_desc")}
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                className="bg-orange-500 px-5 py-2.5 rounded-xl flex-row items-center"
                activeOpacity={0.8}
              >
                <Feather name="refresh-cw" size={14} color="#ffffff" />
                <Text className="text-white font-bold text-sm ml-2">
                  {t("common.retry")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Content Loaded */}
          {!isLoading && !isError && (
            <>
              {t("terms.intro") ? (
                <Text className="text-neutral-600 text-sm leading-6 mb-4">
                  {t("terms.intro")}
                </Text>
              ) : null}

              {htmlSource ? (
                <RenderHtml
                  contentWidth={contentWidth}
                  source={htmlSource}
                  tagsStyles={tagsStyles}
                  systemFonts={systemFonts}
                  renderersProps={{
                    a: {
                      onPress: (_, href) => {
                        if (href) {
                          Linking.openURL(href).catch(() => {});
                        }
                      },
                    },
                  }}
                />
              ) : (
                <Text className="text-neutral-400 text-sm text-center py-6">
                  No terms content available.
                </Text>
              )}
            </>
          )}
        </View>

        {/* Contact Support Assistance Card */}
        <View className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center mr-3.5 border border-orange-100">
            <Feather name="help-circle" size={20} color="#ea580c" />
          </View>
          <View className="flex-1">
            <Text className="text-neutral-900 font-bold text-sm">
              {t("terms.questions_title")}
            </Text>
            <Text className="text-neutral-500 text-xs mt-0.5">
              support@citydeals.com
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
