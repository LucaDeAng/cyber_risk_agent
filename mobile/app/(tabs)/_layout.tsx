import { Tabs } from 'expo-router';
import { palette } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: palette.bgRaised,
          borderTopColor: 'transparent',
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textDim,
      }}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profilo' }} />
    </Tabs>
  );
}
