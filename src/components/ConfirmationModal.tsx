import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  destructive?: boolean;
  iconName?: React.ComponentProps<typeof Feather>["name"];
};

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
  loading = false,
  destructive = false,
  iconName,
}: Props) {
  const resolvedIcon = iconName ?? (destructive ? "trash-2" : "alert-triangle");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full max-w-sm rounded-3xl bg-white p-6 items-center shadow-2xl">
          {/* Brand Icon Badge */}
          <View
            className={`h-16 w-16 items-center justify-center rounded-2xl border ${
              destructive
                ? "bg-red-50 border-red-100"
                : "bg-orange-50 border-orange-100"
            }`}
          >
            <Feather
              name={resolvedIcon}
              size={30}
              color={destructive ? "#dc2626" : "#ea580c"}
            />
          </View>

          {/* Title */}
          <Text className="mt-4 text-center text-xl font-extrabold text-neutral-900">
            {title}
          </Text>

          {/* Description */}
          <Text className="mt-2 text-center text-sm leading-5 text-neutral-500 px-2">
            {message}
          </Text>

          {/* Action Buttons */}
          <View className="mt-6 flex-row gap-3 w-full">
            <TouchableOpacity
              activeOpacity={0.75}
              className="flex-1 items-center justify-center rounded-2xl bg-neutral-100 py-3.5"
              onPress={onCancel}
              disabled={loading}
            >
              <Text className="text-base font-bold text-neutral-700">
                {cancelLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              className={`flex-1 items-center justify-center rounded-2xl py-3.5 shadow-sm ${
                destructive ? "bg-red-600" : "bg-orange-500"
              }`}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-base font-bold text-white">
                  {confirmLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
