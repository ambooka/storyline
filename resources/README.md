# App Icons & Splash Screens

This directory contains the source assets for generating native app icons and splash screens.

## Required Assets

### App Icon
Create a `icon.png` file at 1024×1024 pixels with the Storyline logo.

### Splash Screen
Create a `splash.png` file at 2732×2732 pixels (largest iPad size) with the logo centered on a solid background (#0A0F1A).

## Generating Native Assets

### Using @capacitor/assets (Recommended)

```bash
npm install -g @capacitor/assets
npx capacitor-assets generate
```

This will automatically generate all required sizes for iOS and Android.

### Manual Requirements

#### iOS Icons (in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`)
- 20×20 (1x, 2x, 3x)
- 29×29 (1x, 2x, 3x)
- 40×40 (1x, 2x, 3x)
- 60×60 (2x, 3x)
- 76×76 (1x, 2x)
- 83.5×83.5 (2x)
- 1024×1024 (App Store)

#### Android Icons (in `android/app/src/main/res/`)
- mipmap-mdpi: 48×48
- mipmap-hdpi: 72×72
- mipmap-xhdpi: 96×96
- mipmap-xxhdpi: 144×144
- mipmap-xxxhdpi: 192×192

#### iOS Splash Screens (in `ios/App/App/Assets.xcassets/Splash.imageset/`)
- splash-2732x2732.png (Universal, for all devices)
- Or create a storyboard-based splash

#### Android Splash (in `android/app/src/main/res/drawable/`)
- splash.png (will be scaled to fit)
- Create 9-patch if needed for different screen sizes

## Color Values

- **Dark Background**: `#0A0F1A`
- **Accent Primary**: `#D4A574`
- **Accent Secondary**: `#C69963`

## App Store Assets

### iOS App Store
- App Icon: 1024×1024 PNG (no alpha)
- Screenshots: See Apple's guidelines for required sizes
- App Preview Videos: Optional but recommended

### Google Play Store
- Feature Graphic: 1024×500 PNG
- Icon: 512×512 PNG
- Screenshots: Min 2, recommended 8
- Promo Video: Optional YouTube link
