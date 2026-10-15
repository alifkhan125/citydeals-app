import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
import {
  Image,
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
import { authApi } from "../../features/auth/services/authApi";
import { handleApiError } from "../../utils/errorHandler";
import { useTranslation } from "react-i18next";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailError, setEmailError] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);
  const [newPasswordErrorMsg, setNewPasswordErrorMsg] = useState("");
  const [confirmPasswordErrorMsg, setConfirmPasswordErrorMsg] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 1. STEP: Send Reset Code (Email)
  const handleSendCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError(true);
      toast.error("Email Required", {
        description: "Please enter your registered email address.",
      });
      return;
    }

    setEmailError(false);
    setLoading(true);

    try {
      const data = await authApi.forgotPassword(trimmedEmail);
      toast.success("Code Sent", {
        description: `A 6-digit verification code was sent to ${trimmedEmail}`,
      });

      if (data?.otp) {
        toast.info("Dev Code", { description: `Your OTP is: ${data.otp}` });
      }

      setStep("otp");
    } catch (error) {
      toast.error("Request Failed", {
        description: handleApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // Resend Code in OTP step
  const handleResendCode = async () => {
    if (resending || !email.trim()) return;
    setResending(true);

    try {
      const data = await authApi.forgotPassword(email.trim());
      toast.success("Code Resent", {
        description: "A new 6-digit verification code has been sent.",
      });

      if (data?.otp) {
        toast.info("Dev Code", { description: `Your OTP is: ${data.otp}` });
      }
    } catch (error) {
      toast.error("Resend Failed", {
        description: handleApiError(error),
      });
    } finally {
      setResending(false);
    }
  };

  // 2. STEP: Verify OTP Code
  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 6) {
      setOtpError(true);
      toast.error("Invalid Code", {
        description: "Please enter the complete 6-digit verification code.",
      });
      return;
    }

    setOtpError(false);
    setLoading(true);

    try {
      await authApi.verifyOtp({ email: email.trim(), otp: trimmedOtp });
      toast.success("Code Verified", {
        description: "Create your new password to complete account recovery.",
      });
      setStep("reset");
    } catch (error) {
      setOtpError(true);
      toast.error("Verification Failed", {
        description: handleApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // 3. STEP: Reset Password
  const handleResetPassword = async () => {
    let hasError = false;

    if (!newPassword || newPassword.length < 6) {
      setNewPasswordError(true);
      setNewPasswordErrorMsg(
        newPassword
          ? "Password must be at least 6 characters"
          : "New password is required"
      );
      hasError = true;
    } else {
      setNewPasswordError(false);
      setNewPasswordErrorMsg("");
    }

    if (!confirmPassword) {
      setConfirmPasswordError(true);
      setConfirmPasswordErrorMsg("Please confirm your password");
      hasError = true;
    } else if (newPassword && newPassword !== confirmPassword) {
      setConfirmPasswordError(true);
      setConfirmPasswordErrorMsg("Passwords do not match");
      hasError = true;
    } else {
      setConfirmPasswordError(false);
      setConfirmPasswordErrorMsg("");
    }

    if (hasError) {
      toast.error("Validation Error", {
        description:
          newPassword && confirmPassword && newPassword !== confirmPassword
            ? "New password and confirm password do not match."
            : "Please fill in all required password fields.",
      });
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });

      toast.success("Password Reset Successful", {
        description: "You can now log in with your new password.",
      });

      router.replace("/(auth)/login" as any);
    } catch (error) {
      toast.error("Reset Failed", {
        description: handleApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "reset") {
      setStep("otp");
    } else if (step === "otp") {
      setStep("email");
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Top Header Bar */}
      <View className="px-5 pt-1 mt-12 pb-2 flex-row items-center">
        <TouchableOpacity
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center active:bg-neutral-200"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#171717" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: keyboardVisible ? "flex-start" : "center",
            paddingHorizontal: 24,
            paddingTop: keyboardVisible ? 12 : 0,
            paddingBottom: keyboardVisible ? 220 : 32,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ maxWidth: 460, width: "100%", alignSelf: "center" }}>
            {/* Centered Logo */}
          <View className="items-center mt-1 mb-2">
            <Image
              source={require("../../../assets/images/city-deals-logo.png")}
              className="h-12 w-40"
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <View className="items-center mb-6">
            <Text className="text-xl font-bold text-neutral-900 tracking-tight">
              {step === "email"
                ? t("forgot_password.title", "Forgot Password?")
                : step === "otp"
                  ? t("forgot_password.verify_code", "Verify Your Email")
                  : t("forgot_password.reset_password", "Reset Your Password")}
            </Text>
            <Text className="text-neutral-500 text-base text-center mt-1.5 max-w-xs">
              {step === "email"
                ? t("forgot_password.instructions_email", "Enter your registered email address to receive a 6-digit recovery code.")
                : step === "otp"
                  ? `${t("forgot_password.instructions_otp", "Enter the 6-digit code sent to")} ${email.trim()}`
                  : t("forgot_password.instructions_new_password", "Enter a new secure password for your account.")}
            </Text>
          </View>

          {/* Step 1: Email Form */}
          {step === "email" && (
            <View className="gap-y-4">
              <View>
                <Text className="text-neutral-700 text-base font-semibold mb-1">
                  {t("auth.email", "Email")}
                </Text>
                <View
                  className={`flex-row items-center border rounded-xl px-3.5 h-12 bg-white ${emailError
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
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (emailError) setEmailError(false);
                    }}
                    placeholder={t("auth.enter_email", "Enter your email")}
                    placeholderTextColor="#a3a3a3"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 ml-3 text-neutral-900 text-base h-full"
                  />
                </View>
                {emailError && (
                  <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">
                    {t("auth.email_required", "Please enter a valid email address")}
                  </Text>
                )}
              </View>

              <PrimaryButton
                title={t("forgot_password.send_code", "Send Code")}
                onPress={handleSendCode}
                loading={loading}
                className="mt-2"
              />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.replace("/(auth)/login" as any)}
                className="items-center py-2 mt-1"
              >
                <Text className="text-neutral-600 text-base">
                  {t("auth.already_have_account", "Remember password?")}{" "}
                  <Text className="text-orange-600 font-semibold">{t("auth.sign_in", "Log In")}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: OTP Verification Form */}
          {step === "otp" && (
            <View className="gap-y-4">
              <View>
                <Text className="text-neutral-700 text-base font-semibold mb-1">
                  {t("forgot_password.otp_code", "6-Digit Verification Code")}
                </Text>
                <View
                  className={`border rounded-xl px-3.5 h-14 bg-white justify-center items-center ${otpError
                    ? "border-red-500 bg-red-50/20"
                    : "border-neutral-200 focus:border-orange-500"
                    }`}
                >
                  <TextInput
                    value={otp}
                    onChangeText={(val) => {
                      setOtp(val.replace(/\D/g, "").slice(0, 6));
                      if (otpError) setOtpError(false);
                    }}
                    placeholder="000000"
                    placeholderTextColor="#a3a3a3"
                    keyboardType="number-pad"
                    maxLength={6}
                    className="text-center font-bold text-2xl tracking-[10px] text-neutral-900 w-full"
                  />
                </View>
                {otpError && (
                  <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">
                    {t("common.required", "Please enter the complete 6-digit code")}
                  </Text>
                )}
              </View>

              <View className="flex-row items-center justify-between px-1">
                <TouchableOpacity
                  onPress={() => setStep("email")}
                  activeOpacity={0.7}
                >
                  <Text className="text-neutral-600 text-sm underline">
                    {t("common.back", "Change email")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={resending}
                  activeOpacity={0.7}
                >
                  <Text className="text-orange-600 font-semibold text-sm">
                    {resending ? t("common.loading", "Sending...") : t("forgot_password.resend_code", "Resend code")}
                  </Text>
                </TouchableOpacity>
              </View>

              <PrimaryButton
                title={t("forgot_password.verify_code", "Verify Code")}
                onPress={handleVerifyOtp}
                loading={loading}
                className="mt-2"
              />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.replace("/(auth)/login" as any)}
                className="items-center py-2"
              >
                <Text className="text-neutral-600 text-base">
                  {t("forgot_password.back_to_login", "Back to Log In")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: New Password Form */}
          {step === "reset" && (
            <View className="gap-y-3.5">
              {/* New Password */}
              <View>
                <Text className="text-neutral-700 text-base font-semibold mb-1">
                  {t("change_password.new_password", "New Password")}
                </Text>
                <View
                  className={`flex-row items-center border rounded-xl px-3.5 h-12 bg-white ${newPasswordError
                    ? "border-red-500 bg-red-50/20"
                    : "border-neutral-200 focus:border-orange-500"
                    }`}
                >
                  <Feather
                    name="lock"
                    size={18}
                    color={newPasswordError ? "#ef4444" : "#ea580c"}
                  />
                  <TextInput
                    value={newPassword}
                    onChangeText={(val) => {
                      setNewPassword(val);
                      if (newPasswordError) setNewPasswordError(false);
                    }}
                    placeholder={t("change_password.enter_new_password", "At least 6 characters")}
                    placeholderTextColor="#a3a3a3"
                    secureTextEntry={!showNewPassword}
                    className="flex-1 ml-3 text-neutral-900 text-base h-full"
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye" : "eye-off"}
                      size={18}
                      color="#737373"
                    />
                  </TouchableOpacity>
                </View>
                {newPasswordError && (
                  <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">
                    {newPasswordErrorMsg}
                  </Text>
                )}
              </View>

              {/* Confirm Password */}
              <View>
                <Text className="text-neutral-700 text-base font-semibold mb-1">
                  {t("change_password.confirm_new_password", "Confirm Password")}
                </Text>
                <View
                  className={`flex-row items-center border rounded-xl px-3.5 h-12 bg-white ${confirmPasswordError
                    ? "border-red-500 bg-red-50/20"
                    : "border-neutral-200 focus:border-orange-500"
                    }`}
                >
                  <Feather
                    name="lock"
                    size={18}
                    color={confirmPasswordError ? "#ef4444" : "#ea580c"}
                  />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (confirmPasswordError) setConfirmPasswordError(false);
                    }}
                    placeholder={t("change_password.re_enter_new_password", "Re-enter your password")}
                    placeholderTextColor="#a3a3a3"
                    secureTextEntry={!showConfirmPassword}
                    className="flex-1 ml-3 text-neutral-900 text-base h-full"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye" : "eye-off"}
                      size={18}
                      color="#737373"
                    />
                  </TouchableOpacity>
                </View>
                {confirmPasswordError && (
                  <Text className="text-red-500 text-xs mt-1 ml-1 font-medium">
                    {confirmPasswordErrorMsg}
                  </Text>
                )}
              </View>

              <PrimaryButton
                title={t("forgot_password.update_password", "Reset Password")}
                onPress={handleResetPassword}
                loading={loading}
                className="mt-2"
              />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.replace("/(auth)/login" as any)}
                className="items-center py-2"
              >
                <Text className="text-neutral-600 text-base">
                  {t("forgot_password.back_to_login", "Back to Log In")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
