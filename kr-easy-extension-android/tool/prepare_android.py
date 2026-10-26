from pathlib import Path

manifest = Path('android/app/src/main/AndroidManifest.xml')
gradle = Path('android/app/build.gradle.kts')
if not manifest.is_file() or not gradle.is_file():
    raise SystemExit('Execute flutter create --platforms=android antes deste script.')

manifest_content = manifest.read_text(encoding='utf-8')
internet_permission = '<uses-permission android:name="android.permission.INTERNET" />'
if 'android.permission.INTERNET' not in manifest_content:
    manifest_content = manifest_content.replace('<application', f'{internet_permission}\n    <application', 1)
boot_permission = '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />'
if 'android.permission.RECEIVE_BOOT_COMPLETED' not in manifest_content:
    manifest_content = manifest_content.replace('<application', f'{boot_permission}\n    <application', 1)
if 'android:allowBackup=' not in manifest_content:
    manifest_content = manifest_content.replace('<application', '<application android:allowBackup="false"', 1)
manifest_content = manifest_content.replace('android:label="kr_easy_extension"', 'android:label="KR Easy Extension"')
if 'com.dexterous.flutterlocalnotifications.ScheduledNotificationReceiver' not in manifest_content:
    scheduled_receivers = '''        <receiver android:exported="false" android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationReceiver" />
        <receiver android:exported="false" android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationBootReceiver">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
                <action android:name="com.htc.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>
'''
    manifest_content = manifest_content.replace('</application>', f'{scheduled_receivers}    </application>', 1)
manifest.write_text(manifest_content, encoding='utf-8')

gradle_content = gradle.read_text(encoding='utf-8')
gradle_content = gradle_content.replace('minSdk = flutter.minSdkVersion', 'minSdk = 23')
gradle_content = gradle_content.replace('compileSdk = flutter.compileSdkVersion', 'compileSdk = 36')
if 'isCoreLibraryDesugaringEnabled = true' not in gradle_content:
    gradle_content = gradle_content.replace(
        'compileOptions {',
        'compileOptions {\n        isCoreLibraryDesugaringEnabled = true',
        1,
    )
if 'coreLibraryDesugaring(' not in gradle_content:
    dependency = '    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")\n'
    if 'dependencies {' in gradle_content:
        gradle_content = gradle_content.replace('dependencies {', f'dependencies {{\n{dependency}', 1)
    else:
        gradle_content += f'\ndependencies {{\n{dependency}}}\n'
gradle.write_text(gradle_content, encoding='utf-8')

notification_icon = Path('android/app/src/main/res/drawable/kr_notification.xml')
notification_icon.parent.mkdir(parents=True, exist_ok=True)
notification_icon.write_text('''<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path android:fillColor="#FFFFFFFF" android:pathData="M13,2L4,14h6l-1,8 11,-14h-7l2,-6z" />
</vector>
''', encoding='utf-8')
