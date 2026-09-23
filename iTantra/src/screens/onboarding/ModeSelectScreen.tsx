import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useApp } from '../../context/AppContext';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ModeSelect'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_HEIGHT < 700;

const ICON_CONTAINER_SIZE = IS_SMALL_SCREEN ? 52 : 56;
const ACTION_BTN_SIZE = IS_SMALL_SCREEN ? 44 : 48;
const CARD_PADDING = IS_SMALL_SCREEN ? 18 : 20;
const CARD_RADIUS = 20;
const AVATAR_SIZE = IS_SMALL_SCREEN ? 24 : 28;
const AVATAR_OVERLAP = 10;

export default function ModeSelectScreen({ navigation }: Props) {
  const { setMode, devices } = useApp();

  const peerCount = useMemo(() => devices.length, [devices]);

  const modes = useMemo(() => [
    {
      id: 'public' as const,
      title: 'Public Mesh',
      subtitle: 'Broadcast to all nearby devices',
      description:
        'Your message reaches every device in range. Ideal for emergency alerts and group broadcasts.',
      icon: 'access-point' as const,
      iconLib: 'mci' as const,
      accentColor: COLORS.primary,
      iconBgColor: COLORS.primarySoft,
      peerCount,
    },
    {
      id: 'private' as const,
      title: 'Private Network',
      subtitle: 'Connect to a specific device',
      description:
        'Encrypted point-to-point communication. Best for confidential coordination.',
      icon: 'lock-closed-outline' as const,
      iconLib: 'ionicons' as const,
      accentColor: COLORS.accent,
      iconBgColor: COLORS.accentSoft,
      peerCount,
    },
  ], [peerCount]);

  const choose = (mode: 'public' | 'private') => {
    setMode(mode);
    navigation.replace('Main');
  };

  // Animated background glow
  const bgGlowAnim = useMemo(() => new Animated.Value(0), []);
  
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgGlowAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(bgGlowAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bgGlowAnim]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Subtle animated background glow - top right */}
      <Animated.View
        style={[
          styles.bgGlow,
          {
            opacity: bgGlowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.12, 0.25],
            }),
          },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headline}>Choose your mode</Text>
          <Text style={styles.subtext}>
            How would you like to connect to other devices?
          </Text>
        </View>

        {/* Mode Cards */}
        <View style={styles.cards}>
          {modes.map((m) => (
            <ModeCard
              key={m.id}
              mode={m}
              onPress={() => choose(m.id)}
            />
          ))}
        </View>

        {/* Bottom hint */}
        <Text style={styles.hint}>
          You can switch modes at any time from the home screen.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Separate card component for better animation handling
interface ModeCardProps {
  mode: {
    id: 'public' | 'private';
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    iconLib: 'mci' | 'ionicons';
    accentColor: string;
    iconBgColor: string;
    peerCount: number;
  };
  onPress: () => void;
}

function ModeCard({ mode, onPress }: ModeCardProps) {
  const pressAnim = useMemo(() => new Animated.Value(0), []);
  const arrowAnim = useMemo(() => new Animated.Value(0), []);

  const animatedStyle = {
    transform: [
      {
        scale: pressAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.985],
        }),
      },
    ],
    ...SHADOW.card,
  };

  const arrowScale = arrowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
  });

  const handlePressIn = () => {
    Animated.timing(pressAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start();
    Animated.timing(arrowAnim, { toValue: 1, duration: 60, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.timing(pressAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start();
    Animated.timing(arrowAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`Connect using ${mode.title}`}
        accessibilityHint={
          mode.id === 'public'
            ? 'Broadcast to all nearby devices'
            : 'Connect to a specific device'
        }
      >
        {/* Icon Container */}
        <View style={[styles.iconWrap, { backgroundColor: mode.iconBgColor }]}>
          {mode.iconLib === 'mci' ? (
            <MaterialCommunityIcons
              name={mode.icon as any}
              size={28}
              color={mode.accentColor}
            />
          ) : (
            <Ionicons name={mode.icon as any} size={26} color={mode.accentColor} />
          )}
        </View>

        {/* Text Content */}
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{mode.title}</Text>
          <Text style={styles.cardSubtitle}>{mode.subtitle}</Text>
          <Text style={styles.cardDesc}>{mode.description}</Text>
        </View>

        {/* Footer Row */}
        <View style={styles.cardFooter}>
          {/* Peer Avatars */}
          <View style={styles.avatarRow}>
            <PeerAvatarStack count={mode.peerCount} size={AVATAR_SIZE} overlap={AVATAR_OVERLAP} />
            <Text style={styles.peerLabel}>
              {mode.peerCount > 0 ? `  ${mode.peerCount} peer${mode.peerCount !== 1 ? 's' : ''} nearby` : '  No peers nearby'}
            </Text>
          </View>

          {/* Arrow Button */}
          <Animated.View
            style={[
              styles.arrowBtn,
              { backgroundColor: mode.accentColor },
              { transform: [{ scale: arrowScale }] },
            ]}
          >
            <Ionicons name="arrow-forward" size={IS_SMALL_SCREEN ? 14 : 16} color={COLORS.white} />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function PeerAvatarStack({ count, size, overlap }: { count: number; size: number; overlap: number }) {
  const visibleCount = Math.min(count, 4);
  const avatars = Array.from({ length: visibleCount }, (_, i) => (
    <View
      key={i}
      style={[
        styles.avatar,
        {
          marginLeft: i === 0 ? 0 : -overlap,
          zIndex: visibleCount - i,
        },
      ]}
    >
      <Ionicons name="person" size={size * 0.4} color={COLORS.textSecondary} />
    </View>
  ));

  // Show "+N" indicator if more than 4
  const extra = count > 4 ? (
    <View
      style={[
        styles.avatar,
        styles.avatarExtra,
        { marginLeft: -overlap, zIndex: visibleCount - 4 },
      ]}
    >
      <Text style={styles.avatarExtraText}>+{count - 4}</Text>
    </View>
  ) : null;

  return <View style={styles.avatarStack}>{avatars}{extra}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bgGlow: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.25,
    right: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_HEIGHT * 1.2,
    borderRadius: SCREEN_WIDTH * 0.6,
    backgroundColor: COLORS.primarySoft,
    zIndex: -1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl + 20,
    paddingTop: SPACING.xs,
  },
  header: {
    paddingTop: IS_SMALL_SCREEN ? SPACING.md : SPACING.lg,
    paddingBottom: IS_SMALL_SCREEN ? SPACING.lg : SPACING.xl,
  },
  headline: {
    ...TYPOGRAPHY.headline,
    fontSize: IS_SMALL_SCREEN ? 26 : 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: IS_SMALL_SCREEN ? 32 : 36,
    letterSpacing: -0.3,
  },
  subtext: {
    ...TYPOGRAPHY.body,
    fontSize: IS_SMALL_SCREEN ? 14 : 15,
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: IS_SMALL_SCREEN ? 22 : 24,
    fontWeight: '400',
  },
  cards: {
    gap: IS_SMALL_SCREEN ? 12 : 14,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: CARD_PADDING,
    ...SHADOW.xs,
  },
  cardPressed: {
    backgroundColor: COLORS.cardInner,
  },
  iconWrap: {
    width: ICON_CONTAINER_SIZE,
    height: ICON_CONTAINER_SIZE,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  cardText: {
    gap: 4,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    ...TYPOGRAPHY.title,
    fontSize: IS_SMALL_SCREEN ? 17 : 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: IS_SMALL_SCREEN ? 24 : 26,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    ...TYPOGRAPHY.label,
    fontSize: IS_SMALL_SCREEN ? 12 : 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  cardDesc: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: IS_SMALL_SCREEN ? 11 : 12,
    color: COLORS.textMuted,
    lineHeight: IS_SMALL_SCREEN ? 17 : 18,
    marginTop: 6,
    fontWeight: '400',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: COLORS.cardInner,
    borderWidth: 2,
    borderColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarExtra: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.surface,
  },
  avatarExtraText: {
    ...TYPOGRAPHY.captionMedium,
    fontSize: 9,
    color: COLORS.primary,
    fontWeight: '700',
  },
  peerLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: IS_SMALL_SCREEN ? 11 : 12,
    color: COLORS.textMuted,
    marginLeft: 8,
    fontWeight: '400',
  },
  arrowBtn: {
    width: ACTION_BTN_SIZE,
    height: ACTION_BTN_SIZE,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...SHADOW.xs,
  },
  hint: {
    ...TYPOGRAPHY.caption,
    fontSize: IS_SMALL_SCREEN ? 11 : 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: IS_SMALL_SCREEN ? SPACING.lg : SPACING.xl,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    lineHeight: IS_SMALL_SCREEN ? 16 : 18,
    fontWeight: '400',
    opacity: 0.8,
  },
});