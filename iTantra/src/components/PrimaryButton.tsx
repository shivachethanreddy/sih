import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOW, TYPOGRAPHY } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'orange' | 'lime';

interface Props {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const BG: Record<ButtonVariant, string> = {
  primary: COLORS.primary,
  secondary: COLORS.primarySoft,
  outline: 'transparent',
  ghost: COLORS.card,
  danger: COLORS.sos,
  orange: COLORS.accent,
  lime: COLORS.primary,
};

const FG: Record<ButtonVariant, string> = {
  primary: COLORS.white,
  secondary: COLORS.primary,
  outline: COLORS.primary,
  ghost: COLORS.textPrimary,
  danger: COLORS.white,
  orange: COLORS.white,
  lime: COLORS.white,
};

export default function PrimaryButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  fullWidth = true,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 5,
    }).start();
  };

  const shadow =
    variant === 'primary' || variant === 'lime'
      ? SHADOW.blue
      : variant === 'danger'
      ? SHADOW.sos
      : variant === 'orange'
      ? SHADOW.orange
      : {};

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: BG[variant] },
          variant === 'outline' && styles.outlineBorder,
          variant === 'ghost' && styles.ghostBorder,
          variant === 'secondary' && styles.secondaryBorder,
          shadow,
          (pressed || disabled) && { opacity: disabled ? 0.45 : 0.85 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={FG[variant]} size="small" />
        ) : (
          <>
            <Text style={[styles.label, { color: FG[variant] }]}>{label}</Text>
            {icon ? (
              <Ionicons
                name={icon}
                size={17}
                color={FG[variant]}
                style={styles.icon}
              />
            ) : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  btn: {
    height: 52,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    minWidth: 120,
  },
  outlineBorder: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  ghostBorder: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: COLORS.primarySoft,
  },
  label: {
    ...TYPOGRAPHY.button,
  },
  icon: {
    marginLeft: 7,
  },
});
