import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Screen from '../../components/Screen';
import PrimaryButton from '../../components/PrimaryButton';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ReplySent'>;

export default function ReplySentScreen({ navigation, route }: Props) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const to = route.params?.to ?? 'Rescue_01';

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Screen padded>
      <Animated.View style={[styles.center, { opacity }]}>
        <Animated.View style={[styles.outerRing, { transform: [{ scale }] }]}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={46} color={COLORS.white} />
          </View>
        </Animated.View>
        <Text style={styles.title}>Reply Sent</Text>
        <Text style={styles.sub}>
          Your response has been delivered{'\n'}to <Text style={styles.toName}>{to}</Text>
        </Text>
      </Animated.View>
      <PrimaryButton
        label="Back to Home"
        icon="home"
        onPress={() => navigation.popToTop()}
        style={styles.cta}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.blue,
  },
  title: {
    ...TYPOGRAPHY.headline,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  sub: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  toName: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  cta: {
    marginBottom: SPACING.lg,
  },
});
