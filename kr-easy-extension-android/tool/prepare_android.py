from pathlib import Path

manifest = Path('android/app/src/main/AndroidManifest.xml')
gradle = Path('android/app/build.gradle.kts')
if not manifest.is_file() or not gradle.is_file():
    raise SystemExit('Execute flutter create --platforms=android antes deste script.')

manifest_content = manifest.read_text(encoding='utf-8')
internet_permission = '<uses-permission android:name="android.permission.INTERNET" />'
if 'android.permission.INTERNET' not in manifest_content:
    manifest_content = manifest_content.replace('<application', f'{internet_permission}\n    <application', 1)
if 'android:allowBackup=' not in manifest_content:
    manifest_content = manifest_content.replace('<application', '<application android:allowBackup="false"', 1)
manifest_content = manifest_content.replace('android:label="kr_easy_extension"', 'android:label="KR Easy Extension"')
manifest.write_text(manifest_content, encoding='utf-8')

gradle_content = gradle.read_text(encoding='utf-8')
gradle_content = gradle_content.replace('minSdk = flutter.minSdkVersion', 'minSdk = 23')
gradle.write_text(gradle_content, encoding='utf-8')
