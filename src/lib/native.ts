// Capacitor Native Bridge Utilities
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// ========== Platform Detection ==========
export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isWeb = Capacitor.getPlatform() === 'web';

// ========== Splash Screen ==========
export async function hideSplashScreen() {
    if (!isNative) return;

    try {
        await SplashScreen.hide({
            fadeOutDuration: 300,
        });
    } catch (error) {
        console.error('Failed to hide splash screen:', error);
    }
}

export async function showSplashScreen() {
    if (!isNative) return;

    try {
        await SplashScreen.show({
            showDuration: 2000,
            autoHide: true,
            fadeInDuration: 300,
            fadeOutDuration: 300,
        });
    } catch (error) {
        console.error('Failed to show splash screen:', error);
    }
}

// ========== Status Bar ==========
export async function setStatusBarStyle(style: 'light' | 'dark') {
    if (!isNative) return;

    try {
        await StatusBar.setStyle({
            style: style === 'dark' ? Style.Dark : Style.Light,
        });
    } catch (error) {
        console.error('Failed to set status bar style:', error);
    }
}

export async function setStatusBarColor(color: string) {
    if (!isAndroid) return;

    try {
        await StatusBar.setBackgroundColor({ color });
    } catch (error) {
        console.error('Failed to set status bar color:', error);
    }
}

export async function hideStatusBar() {
    if (!isNative) return;

    try {
        await StatusBar.hide();
    } catch (error) {
        console.error('Failed to hide status bar:', error);
    }
}

export async function showStatusBar() {
    if (!isNative) return;

    try {
        await StatusBar.show();
    } catch (error) {
        console.error('Failed to show status bar:', error);
    }
}

// ========== Haptics ==========
export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium') {
    if (!isNative) return;

    const styleMap = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
    };

    try {
        await Haptics.impact({ style: styleMap[style] });
    } catch (error) {
        console.error('Failed to trigger haptic:', error);
    }
}

export async function hapticNotification(type: 'success' | 'warning' | 'error') {
    if (!isNative) return;

    const typeMap = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
    };

    try {
        await Haptics.notification({ type: typeMap[type] });
    } catch (error) {
        console.error('Failed to trigger notification haptic:', error);
    }
}

export async function hapticVibrate() {
    if (!isNative) return;

    try {
        await Haptics.vibrate();
    } catch (error) {
        console.error('Failed to vibrate:', error);
    }
}

export async function hapticSelectionStart() {
    if (!isNative) return;

    try {
        await Haptics.selectionStart();
    } catch (error) {
        console.error('Failed to start selection haptic:', error);
    }
}

export async function hapticSelectionChanged() {
    if (!isNative) return;

    try {
        await Haptics.selectionChanged();
    } catch (error) {
        console.error('Failed to change selection haptic:', error);
    }
}

export async function hapticSelectionEnd() {
    if (!isNative) return;

    try {
        await Haptics.selectionEnd();
    } catch (error) {
        console.error('Failed to end selection haptic:', error);
    }
}

// ========== Safe Area Insets Hook ==========
export function getSafeAreaInsets(): {
    top: number;
    bottom: number;
    left: number;
    right: number;
} {
    if (typeof window === 'undefined') {
        return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    const computedStyle = getComputedStyle(document.documentElement);

    return {
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
    };
}

// ========== Initialize Native Features ==========
export async function initializeNative(theme: 'light' | 'dark' = 'dark') {
    if (!isNative) return;

    // Set status bar based on theme
    await setStatusBarStyle(theme);
    if (isAndroid) {
        await setStatusBarColor(theme === 'dark' ? '#0A0F1A' : '#FFFFFF');
    }

    // Hide splash after app loads
    await hideSplashScreen();
}
