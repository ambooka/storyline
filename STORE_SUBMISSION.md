# Storyline Mobile App - Store Submission Guide

## Prerequisites

### Development Environment
- **macOS** (required for iOS builds)
- **Xcode 15+** (for iOS)
- **Android Studio** (for Android)
- **Node.js 20+**
- **CocoaPods** (`sudo gem install cocoapods`)

### Accounts
- **Apple Developer Account** ($99/year) - https://developer.apple.com
- **Google Play Developer Account** ($25 one-time) - https://play.google.com/console

---

## Building for Production

### 1. Build the Next.js App

```bash
# Generate static export
npm run build
npx next export

# The output will be in the "out" directory
```

### 2. Sync with Capacitor

```bash
# Add iOS and Android platforms (first time only)
npx cap add ios
npx cap add android

# Sync web assets to native projects
npx cap sync
```

### 3. Open in IDE

```bash
# Open iOS in Xcode
npx cap open ios

# Open Android in Android Studio
npx cap open android
```

---

## iOS App Store Submission

### 1. Xcode Configuration

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the "App" target
3. Under "Signing & Capabilities":
   - Team: Select your Apple Developer team
   - Bundle Identifier: `com.storyline.app`
4. Under "General":
   - Version: `1.0.0`
   - Build: `1`

### 2. Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click "+" → "New App"
3. Fill in:
   - Platform: iOS
   - Name: Storyline
   - Primary Language: English
   - Bundle ID: `com.storyline.app`
   - SKU: `storyline-ios-1`

### 3. App Information

**App Description:**
```
Storyline transforms reading into a social adventure. Read books with friends in real-time, see where they are in the story, react to passages together, and discuss your favorite moments.

Features:
• Import ePub books and read offline
• Create reading rooms and invite friends
• See ghost avatars showing friends' positions
• React to passages with emoji
• Text-to-speech with word highlighting
• Multiple themes: Light, Dark, Sepia, AMOLED
• OpenDyslexic font for accessibility
• Book clubs with schedules and polls
• Earn badges and track reading streaks
• Generate shareable quote cards
```

**Keywords:**
`reading, books, ebook, epub, social reading, book club, reader, accessibility, tts`

**Categories:**
- Primary: Books
- Secondary: Social Networking

### 4. Screenshots Required

| Device | Size |
|--------|------|
| iPhone 6.7" | 1290 × 2796 |
| iPhone 6.5" | 1284 × 2778 |
| iPhone 5.5" | 1242 × 2208 |
| iPad Pro 12.9" | 2048 × 2732 |

Create screenshots showing:
1. Library page with books
2. Reader with open book
3. Reading room with friends
4. Settings panel
5. Profile with badges

### 5. Archive and Upload

1. In Xcode: Product → Archive
2. Click "Distribute App"
3. Select "App Store Connect"
4. Follow prompts to upload

### 6. Submit for Review

1. In App Store Connect, select your build
2. Complete all required information
3. Click "Submit for Review"
4. Wait 1-3 days for review

---

## Google Play Store Submission

### 1. Android Configuration

1. Open `android/` in Android Studio
2. In `android/app/build.gradle`, update:
   ```gradle
   versionCode 1
   versionName "1.0.0"
   ```

### 2. Create Signing Key

```bash
# Generate keystore (keep this file safe!)
keytool -genkey -v -keystore storyline-release.keystore \
  -alias storyline -keyalg RSA -keysize 2048 -validity 10000

# Move to android/app/
mv storyline-release.keystore android/app/
```

### 3. Configure Signing

Create `android/key.properties`:
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=storyline
storeFile=storyline-release.keystore
```

Update `android/app/build.gradle`:
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### 4. Build Release AAB

```bash
cd android
./gradlew bundleRelease
```

The AAB will be at `android/app/build/outputs/bundle/release/app-release.aab`

### 5. Create App in Play Console

1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in:
   - App name: Storyline
   - Default language: English
   - App or game: App
   - Free or paid: Free

### 6. Store Listing

**Short Description (80 chars):**
```
Read books with friends. Share reactions, see where they are, discuss together.
```

**Full Description (4000 chars):**
Same as iOS description above.

**Graphics Required:**
- Feature Graphic: 1024 × 500
- Icon: 512 × 512
- Screenshots: 2-8 per device type

### 7. Complete All Sections

- [ ] Main store listing
- [ ] Content rating questionnaire
- [ ] Target audience
- [ ] News apps (No)
- [ ] COVID-19 contact tracing (No)
- [ ] Data safety
- [ ] Advertising ID (No if not using ads)

### 8. Upload and Release

1. Go to "Production" → "Create new release"
2. Upload your AAB file
3. Add release notes: "Initial release"
4. Click "Review release" → "Start rollout"

---

## Microsoft Store (PWA)

### Using PWABuilder

1. Go to https://pwabuilder.com
2. Enter your deployed URL
3. Click "Build My PWA"
4. Download the Windows package
5. Upload to Microsoft Partner Center

### Requirements
- PWA manifest with all required fields
- HTTPS hosting
- Screenshots and store listing

---

## Post-Launch Checklist

- [ ] Monitor crash reports
- [ ] Respond to user reviews
- [ ] Track analytics
- [ ] Plan feature updates
- [ ] Set up ASO (App Store Optimization)
