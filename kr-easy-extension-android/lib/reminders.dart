import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

class KrReminderNotifications {
  KrReminderNotifications({FlutterLocalNotificationsPlugin? plugin})
      : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  final FlutterLocalNotificationsPlugin _plugin;
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;
    tz_data.initializeTimeZones();
    final deviceZone = await FlutterTimezone.getLocalTimezone();
    tz.setLocalLocation(tz.getLocation(deviceZone.identifier));
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('kr_notification'),
      ),
    );
    _initialized = true;
  }

  Future<bool> requestPermission() async {
    await initialize();
    final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    // Android versions before 13 do not expose a runtime notification prompt.
    return await android?.requestNotificationsPermission() ?? true;
  }

  Future<void> schedule({required int id, required String title, required DateTime at}) async {
    await initialize();
    if (!at.isAfter(DateTime.now())) return;
    await _plugin.zonedSchedule(
      id: id,
      title: 'KR Easy Extension · retorno',
      body: title,
      scheduledDate: tz.TZDateTime.from(at, tz.local),
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'kr_follow_up_reminders',
          'Lembretes comerciais',
          channelDescription: 'Avisos de retornos agendados no KR Easy Extension.',
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
      // Inexact alarms avoid asking for the special exact-alarm permission.
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
    );
  }

  Future<void> cancel(int id) async {
    await initialize();
    await _plugin.cancel(id: id);
  }

  Future<void> cancelAll() async {
    await initialize();
    await _plugin.cancelAll();
  }
}
