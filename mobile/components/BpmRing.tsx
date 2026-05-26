import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { palette, typography } from '../constants/theme';

export function BpmRing({ bpm, size = 220 }: { bpm: number; size?: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (bpm <= 0) {
      cancelAnimation(scale);
      return;
    }
    const periodMs = (60 / bpm) * 1000;
    scale.value = withRepeat(
      withTiming(1.08, { duration: periodMs / 2, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(scale);
  }, [bpm, scale]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: palette.bpmRing,
            opacity: 0.6,
          },
          ringStyle,
        ]}
      />
      <View
        style={{
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: (size * 0.6) / 2,
          backgroundColor: palette.bgRaised,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={[typography.caption]}>BPM</Text>
        <Text style={{ color: palette.text, fontSize: 44, fontWeight: '300' }}>
          {bpm > 0 ? bpm : '—'}
        </Text>
      </View>
    </View>
  );
}
