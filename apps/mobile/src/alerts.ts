import * as Notifications from 'expo-notifications';

// A local notification for the demo. It looks the same as a real push, which needs a server and a dev build.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function askAlertPermission() {
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

export async function sendAlert(title: string, body: string, listingId: string) {
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { listingId }, sound: true },
    // A short delay leaves time to close the listing sheet or lock the phone on stage.
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 },
  });
  return true;
}
