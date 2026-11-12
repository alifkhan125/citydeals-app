import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useMemo, useEffect } from "react";
import {
  Image,
  ActivityIndicator,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import PrimaryButton from "../../components/PrimaryButton";
import LanguageBottomSheet, { LANGUAGES } from "../../components/LanguageBottomSheet";
import { useAuthMutations } from "../../features/auth/hooks/useAuthMutations";
import { initGoogleSignIn, signInWithGoogle } from "../../features/auth/utils/googleAuth";
import { signInWithApple } from "../../features/auth/utils/appleAuth";
import { useTranslation } from "react-i18next";
import * as AppleAuthentication from "expo-apple-authentication";

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const { loginMutation, googleLoginMutation, appleLoginMutation } = useAuthMutations();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isGoogleSigningIn = isGoogleLoading || googleLoginMutation.isPending;

  useEffect(() => {
    initGoogleSignIn();
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [isLanguageSheetOpen, setIsLanguageSheetOpen] = useState(false);

  const currentLang = useMemo(() => {
    const code = (i18n.language || "en").slice(0, 2);
    return LANGUAGES.find((l) => l.id === code) || LANGUAGES[0];
  }, [i18n.language]);

  const handleLogin = () => {
    const trimmedEmail = email.trim();
    let hasError = false;

    if (!trimmedEmail) {
      setEmailError(true);
      hasError = true;
    } else {
      setEmailError(false);
    }

    if (!password) {
      setPasswordError(true);
      hasError = true;
    } else {
      setPasswordError(false);
    }

    if (hasError) {
      if (!trimmedEmail && !password) {
        toast.error(t("auth.fields_required", "Fields Required"), {
          description: t("auth.fill_both_fields", "Please fill in both email and password."),
        });
      } else if (!trimmedEmail) {
        toast.error(t("common.required", "Required"), {
          description: t("auth.email_required", "Email address is required"),
        });
      } else {
        toast.error(t("common.required", "Required"), {
          description: t("auth.password_required", "Password is required"),
        });
      }
      return;
    }

    loginMutation.mutate({ email: trimmedEmail, password });
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleSigningIn) return;
    setIsGoogleLoading(true);

    try {
      const result = await signInWithGoogle();

      if (!result || result.cancelled) {
        setIsGoogleLoading(false);
        return;
      }

      if (result.idToken) {
        // Run mutation after native Google activity finishes dismissing to prevent black screen / freeze
        InteractionManager.runAfterInteractions(() => {
          googleLoginMutation.mutate(result.idToken!, {
            onSettled: () => setIsGoogleLoading(false),
          });
        });
      } else {
        setIsGoogleLoading(false);
        toast.error("Google Sign-In Failed", { description: "Could not retrieve ID token." });
      }
    } catch (error: any) {
      setIsGoogleLoading(false);
      console.log('Google Sign-In Error:', error);
      toast.error("Google Sign-In Failed", { description: error?.message || "An error occurred during sign in." });
    }
  };

  const handleAppleSignIn = async () => {
    if (isGoogleSigningIn) return;
    try {
      const result = await signInWithApple();

      if (!result || result.cancelled) {
        return;
      }

      appleLoginMutation.mutate({
        identityToken: result.identityToken,
        email: result.email,
        fullName: result.fullName,
      });
    } catch (error: any) {
      toast.error("Apple Sign-In", {
        description: error?.message || "An error occurred during Apple Sign-In.",
      });
    }
  };

  const handleContinueAsGuest = () => {
    router.replace("/(tabs)" as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 40,
            paddingHorizontal: 24,
            paddingTop: 12,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Language Selector */}
          <View style={{ maxWidth: 460, width: "100%", alignSelf: "center", opacity: isGoogleSigningIn ? 0.55 : 1 }} className="flex-row justify-end items-center mb-1">
            <TouchableOpacity
              disabled={isGoogleSigningIn}
              activeOpacity={0.7}
              onPress={() => setIsLanguageSheetOpen(true)}
              className="flex-row items-center bg-neutral-100 rounded-full px-3 py-1.5 border border-neutral-200"
            >
              <Text className="mr-1.5 text-base">{currentLang.flag}</Text>
              <Text className="text-neutral-700 font-semibold text-xs mr-1">
                {currentLang.label}
              </Text>
              <Feather name="chevron-down" size={13} color="#64748b" />
            </TouchableOpacity>

          </View>

          <View style={{ maxWidth: 460, width: "100%", alignSelf: "center", opacity: isGoogleSigningIn ? 0.55 : 1 }} className="flex-1 justify-center my-auto">
            {/* Centered Logo */}
          <View className="items-center mt-1 mb-2">
            <Image
              source={require("../../../assets/images/city-deals-logo.png")}
              className="h-12 w-40"
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <View className="items-center mb-4">
            <Text className="text-lg font-bold text-neutral-900 tracking-tight" numberOfLines={1}>
              {t("auth.login_title")}
            </Text>
            <Text className="text-neutral-500 text-base text-center mt-1 max-w-xs">
              {t("auth.login_subtitle")}
            </Text>
          </View>

          {/* Form Fields */}
          <View className="gap-y-3">
            {/* Email Address */}
            <View>
              <Text className="text-neutral-700 text-base font-semibold mb-1">
                {t("auth.email", "Email Address")}
              </Text>
              <View
                className={`flex-row items-center border rounded-xl px-3.5 h-12 bg-white ${
                  emailError
                    ? "border-red-500 bg-red-50/20"
                    : "border-neutral-200 focus:border-orange-500"
                }`}
              >
                <Feather
                  name="mail"
                  size={18}
                  color={emailError ? "#ef4444" : "#ea580c"}
                />
                <TextInput
                  editable={!isGoogleSigningIn}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) setEmailError(false);
                  }}
                  placeholder={t("auth.enter_email", "Enter your email address")}
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 ml-2.5 text-neutral-900 text-base py-0"
                />
              </View>
              {emailError && (
                <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">
                  {t("auth.email_required", "Email address is required")}
                </Text>
              )}
            </View>

            {/* Password */}
            <View>
              <Text className="text-neutral-700 text-base font-semibold mb-1">
                {t("auth.password", "Password")}
              </Text>
              <View
                className={`flex-row items-center border rounded-xl px-3.5 h-12 bg-white ${
                  passwordError
                    ? "border-red-500 bg-red-50/20"
                    : "border-neutral-200 focus:border-orange-500"
                }`}
              >
                <Feather
                  name="lock"
                  size={18}
                  color={passwordError ? "#ef4444" : "#ea580c"}
                />
                <TextInput
                  editable={!isGoogleSigningIn}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError(false);
                  }}
                  placeholder={t("auth.enter_password", "Enter your password")}
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  className="flex-1 ml-2.5 text-neutral-900 text-base py-0"
                />
                <TouchableOpacity
                  disabled={isGoogleSigningIn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={18}
                    color={passwordError ? "#ef4444" : "#9ca3af"}
                  />
                </TouchableOpacity>
              </View>
              {passwordError && (
                <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">
                  {t("auth.password_required", "Password is required")}
                </Text>
              )}
            </View>

            {/* Remember Me & Forgot Password */}
            <View className="flex-row items-center justify-between mt-0.5">
              <TouchableOpacity
                disabled={isGoogleSigningIn}
                activeOpacity={0.8}
                onPress={() => setRememberMe(!rememberMe)}
                className="flex-row items-center"
              >
                <View
                  className={`w-5 h-5 rounded items-center justify-center border ${rememberMe
                      ? "bg-orange-500 border-orange-500"
                      : "border-neutral-300 bg-white"
                    }`}
                >
                  {rememberMe && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
                <Text className="text-neutral-700 text-base ml-2">
                  {t("auth.remember_me", "Remember me")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isGoogleSigningIn}
                activeOpacity={0.7}
                onPress={() => router.push("/(auth)/forgot-password" as any)}
              >
                <Text className="text-orange-600 font-semibold text-base">
                  {t("auth.forgot_password", "Forgot Password?")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Log In CTA */}
            <PrimaryButton
              title={t("auth.sign_in", "Log In")}
              onPress={handleLogin}
              loading={loginMutation.isPending}
              disabled={isGoogleSigningIn}
              className="mt-1"
            />

            {/* Divider */}
            <View className="flex-row items-center my-1">
              <View className="flex-1 h-[1px] bg-neutral-200" />
              <Text className="px-3 text-neutral-400 text-base font-medium">
                {t("common.or", "or")}
              </Text>
              <View className="flex-1 h-[1px] bg-neutral-200" />
            </View>

            {/* Continue with Google */}
            <TouchableOpacity
              disabled={isGoogleSigningIn}
              activeOpacity={0.85}
              onPress={handleGoogleSignIn}
              className="w-full bg-neutral-50 border border-neutral-200 h-12 rounded-xl flex-row items-center justify-center active:bg-neutral-100"
            >
              {isGoogleSigningIn ? <ActivityIndicator color="#ea580c" /> : <>
                <Ionicons name="logo-google" size={18} color="#EA4335" />
                <Text className="text-neutral-800 font-semibold text-base ml-2.5">
                  {t("auth.continue_with_google", "Continue with Google")}
                </Text>
              </>}
            </TouchableOpacity>

            {Platform.OS === "ios" && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12}
                onPress={handleAppleSignIn}
                style={{ width: "100%", height: 48, marginTop: 12 }}
              />
            )}

            {/* Footer Sign Up Link */}
            <View className="flex-row justify-center items-center mt-1">
              <Text className="text-neutral-500 text-base">
                {t("auth.dont_have_account", "Don't have an account?")}{" "}
              </Text>
              <TouchableOpacity
                disabled={isGoogleSigningIn}
                activeOpacity={0.7}
                onPress={() => router.push("/register" as any)}
              >
                <Text className="text-orange-600 font-bold text-base">
                  {t("auth.sign_up", "Sign Up")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Continue as Guest Link */}
            <TouchableOpacity
              disabled={isGoogleSigningIn}
              activeOpacity={0.7}
              onPress={handleContinueAsGuest}
              className="items-center justify-center py-2 mt-1"
            >
              <Text className="text-neutral-500 font-semibold text-base underline">
                {t("auth.continue_as_guest", "Continue as Guest")}
              </Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LanguageBottomSheet
        isPresented={isLanguageSheetOpen}
        onDismiss={() => setIsLanguageSheetOpen(false)}
        selectedLanguage={i18n.language || "en"}
      />
    </SafeAreaView>
  );
}
