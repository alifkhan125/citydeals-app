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

export default function RegisterScreen() {
  const { t, i18n } = useTranslation();
  const { signupMutation, verifyRegisterOtpMutation, googleLoginMutation, appleLoginMutation } = useAuthMutations();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isGoogleSigningIn = isGoogleLoading || googleLoginMutation.isPending;

  useEffect(() => {
    initGoogleSignIn();
  }, []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLanguageSheetOpen, setIsLanguageSheetOpen] = useState(false);

  // OTP Verification Step State
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode] = useState("");
  const [resending, setResending] = useState(false);

  const currentLang = useMemo(() => {
    const code = (i18n.language || "en").slice(0, 2);
    return LANGUAGES.find((l) => l.id === code) || LANGUAGES[0];
  }, [i18n.language]);

  const handleCreateAccount = () => {
    if (!agreeTerms) {
      alert(t("auth.agree_terms_required", "Please agree to the Terms & Conditions to proceed."));
      return;
    }
    if (password !== confirmPassword) {
      alert(t("auth.passwords_dont_match", "Passwords do not match."));
      return;
    }
    if (!fullName || !email || !password) return;

    signupMutation.mutate(
      { fullName, email: email.trim(), password, phoneNumber: phone, acceptedTerms: agreeTerms },
      {
        onSuccess: (data: any) => {
          toast.success("Verification Code Sent", {
            description: `A 6-digit OTP code has been sent to ${email.trim()}`,
          });
          if (data?.otp) {
            toast.info("Dev OTP", { description: `Your code is: ${data.otp}` });
          }
          setStep("otp");
        },
      }
    );
  };

  const handleVerifyOtp = () => {
    if (otpCode.trim().length !== 6) {
      toast.error("Invalid Code", { description: "Please enter the 6-digit code sent to your email." });
      return;
    }
    verifyRegisterOtpMutation.mutate({
      email: email.trim(),
      otp: otpCode.trim(),
    });
  };

  const handleResendOtp = () => {
    if (resending || !email.trim()) return;
    setResending(true);
    signupMutation.mutate(
      { fullName, email: email.trim(), password, phoneNumber: phone, acceptedTerms: agreeTerms },
      {
        onSuccess: (data: any) => {
          setResending(false);
          toast.success("Code Resent", { description: `New verification code sent to ${email.trim()}` });
          if (data?.otp) {
            toast.info("Dev OTP", { description: `Your code is: ${data.otp}` });
          }
        },
        onError: () => setResending(false),
      }
    );
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
          <View style={{ maxWidth: 460, width: "100%", alignSelf: "center", opacity: isGoogleSigningIn ? 0.55 : 1 }}>
            {/* Top Bar with Language Selector */}
            <View className="flex-row justify-end items-center mb-1">
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
            <Text className="text-lg font-bold text-neutral-900 tracking-tight">
              {step === "otp" ? "Verify Your Email" : t("auth.register_title")}
            </Text>
            <Text className="text-neutral-500 text-base text-center mt-1 max-w-xs">
              {step === "otp"
                ? `Enter the 6-digit verification code sent to ${email}`
                : t("auth.register_subtitle")}
            </Text>
          </View>

          {step === "otp" ? (
            /* OTP Verification Screen */
            <View className="gap-y-4">
              <View className="items-center bg-orange-50 border border-orange-200 rounded-xl p-4 mb-2">
                <Feather name="mail" size={32} color="#ea580c" />
                <Text className="text-orange-950 font-semibold text-sm mt-2 text-center">
                  Check your inbox for the code
                </Text>
                <Text className="text-orange-800 text-xs text-center mt-0.5">
                  The code is valid for 10 minutes.
                </Text>
              </View>

              <View>
                <Text className="text-neutral-700 text-base font-semibold mb-1 text-center">
                  Verification Code
                </Text>
                <View className="flex-row items-center border border-neutral-200 rounded-xl px-3.5 h-14 bg-white focus:border-orange-500">
                  <TextInput
                    value={otpCode}
                    onChangeText={(val) => setOtpCode(val.replace(/\D/g, ""))}
                    placeholder="123456"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                    maxLength={6}
                    className="flex-1 text-center font-bold tracking-widest text-2xl text-neutral-900 py-0"
                  />
                </View>
              </View>

              <PrimaryButton
                title="Verify & Create Account"
                onPress={handleVerifyOtp}
                loading={verifyRegisterOtpMutation.isPending}
                disabled={otpCode.length !== 6}
                className="mt-2"
              />

              <View className="flex-row justify-between items-center px-1 mt-2">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setStep("form")}
                  className="py-2"
                >
                  <Text className="text-neutral-500 text-sm font-medium">
                    ← Edit Details
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={resending}
                  activeOpacity={0.7}
                  onPress={handleResendOtp}
                  className="py-2"
                >
                  <Text className="text-orange-600 font-semibold text-sm">
                    {resending ? "Sending..." : "Resend Code"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Registration Form Fields */
            <View className="gap-y-3">
            {/* Full Name */}
            <View>
              <Text className="text-neutral-700 text-base font-semibold mb-1">
                {t("auth.full_name", "Full Name")}
              </Text>
              <View className="flex-row items-center border border-neutral-200 rounded-xl px-3.5 h-12 bg-white focus:border-orange-500">
                <Feather name="user" size={18} color="#ea580c" />
                <TextInput
                  editable={!isGoogleSigningIn}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={t("auth.enter_full_name", "Enter your full name")}
                  placeholderTextColor="#9ca3af"
                  className="flex-1 ml-2.5 text-neutral-900 text-base py-0"
                />
              </View>
            </View>

            {/* Email Address */}
            <View>
              <Text className="text-neutral-700 text-base font-semibold mb-1">
                {t("auth.email", "Email Address")}
              </Text>
              <View className="flex-row items-center border border-neutral-200 rounded-xl px-3.5 h-12 bg-white focus:border-orange-500">
                <Feather name="mail" size={18} color="#ea580c" />
                <TextInput
                  editable={!isGoogleSigningIn}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("auth.enter_email", "Enter your email address")}
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 ml-2.5 text-neutral-900 text-base py-0"
                />
              </View>
            </View>

            {/* Phone Number */}
            <View>
              <Text className="text-neutral-700 text-base font-semibold mb-1">
                {t("auth.phone", "Phone Number")}
              </Text>
              <View className="flex-row items-center border border-neutral-200 rounded-xl px-3.5 h-12 bg-white focus:border-orange-500">
                <Feather name="phone" size={18} color="#ea580c" />
                <TextInput
                  editable={!isGoogleSigningIn}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t("auth.enter_phone", "Enter phone number")}
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  className="flex-1 ml-2.5 text-neutral-900 text-base py-0"
                />
              </View>
            </View>

            {/* Password */}
            <View>
              <Text className="text-neutral-700 text-base font-semibold mb-1">
                {t("auth.password", "Password")}
              </Text>
              <View className="flex-row items-center border border-neutral-200 rounded-xl px-3.5 h-12 bg-white focus:border-orange-500">
                <Feather name="lock" size={18} color="#ea580c" />
                <TextInput
                  editable={!isGoogleSigningIn}
                  value={password}
                  onChangeText={setPassword}
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
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View>
              <Text className="text-neutral-700 text-base font-semibold mb-1">
                {t("auth.confirm_password", "Confirm Password")}
              </Text>
              <View className="flex-row items-center border border-neutral-200 rounded-xl px-3.5 h-12 bg-white focus:border-orange-500">
                <Feather name="lock" size={18} color="#ea580c" />
                <TextInput
                  editable={!isGoogleSigningIn}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t("auth.enter_confirm_password", "Confirm your password")}
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showConfirmPassword}
                  className="flex-1 ml-2.5 text-neutral-900 text-base py-0"
                />
                <TouchableOpacity
                  disabled={isGoogleSigningIn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Feather
                    name={showConfirmPassword ? "eye" : "eye-off"}
                    size={18}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms & Conditions Checkbox */}
            <TouchableOpacity
              disabled={isGoogleSigningIn}
              activeOpacity={0.8}
              onPress={() => setAgreeTerms(!agreeTerms)}
              className="flex-row items-center mt-0.5"
              id="agree-terms-checkbox"
            >
              <View
                className={`w-5 h-5 rounded items-center justify-center border ${
                  agreeTerms
                    ? "bg-orange-500 border-orange-500"
                    : "border-neutral-300 bg-white"
                }`}
              >
                {agreeTerms && (
                  <Ionicons name="checkmark" size={14} color="white" />
                )}
              </View>
              <Text className="text-neutral-700 text-base ml-2">
                {t("auth.agree_terms", "I agree to the")}{" "}
                <Text className="text-orange-600 font-semibold">
                  {t("auth.terms_conditions", "Terms & Conditions")}
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Create Account CTA */}
            <PrimaryButton
              title={t("auth.register_title", "Create Account")}
              onPress={handleCreateAccount}
              loading={signupMutation.isPending}
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

            {/* Footer Log In Link */}
            <View className="flex-row justify-center items-center mt-1">
              <Text className="text-neutral-500 text-base">
                {t("auth.already_have_account", "Already have an account?")}{" "}
              </Text>
              <TouchableOpacity
                disabled={isGoogleSigningIn}
                activeOpacity={0.7}
                onPress={() => router.push("/login" as any)}
              >
                <Text className="text-orange-600 font-bold text-base">
                  {t("auth.sign_in", "Log In")}
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
          )}
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
