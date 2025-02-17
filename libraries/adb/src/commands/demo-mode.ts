import { AdbCommandBase } from './base';

export enum AdbDemoModeWifiSignalStrength {
    Hidden = 'null',
    Level0 = '0',
    Level1 = '1',
    Level2 = '2',
    Level3 = '3',
    Level4 = '4',
}

// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/packages/SystemUI/src/com/android/systemui/statusbar/policy/NetworkControllerImpl.java;l=1073
export const AdbDemoModeMobileDataTypes = ['1x', '3g', '4g', '4g+', '5g', '5ge', '5g+',
    'e', 'g', 'h', 'h+', 'lte', 'lte+', 'dis', 'not', 'null'] as const;

export type AdbDemoModeMobileDataType = (typeof AdbDemoModeMobileDataTypes)[number];

// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/packages/SystemUI/src/com/android/systemui/statusbar/phone/StatusBar.java;l=3136
export const AdbDemoModeStatusBarModes = ['opaque', 'translucent', 'semi-transparent', 'transparent', 'warning'] as const;

export type AdbDemoModeStatusBarMode = (typeof AdbDemoModeStatusBarModes)[number];

export class AdbDemoMode extends AdbCommandBase {
    static readonly AllowedSettingKey = 'sysui_demo_allowed';

    // Demo Mode actually doesn't have a setting indicates its enablement
    // However Developer Mode menu uses this key
    // So we can only try our best to guess if it's enabled
    static readonly EnabledSettingKey = 'sysui_tuner_demo_on';

    async getAllowed(): Promise<boolean> {
        const result = await this.adb.childProcess.exec('settings', 'get', 'global', AdbDemoMode.AllowedSettingKey);
        return result.trim() === '1';
    }

    async setAllowed(value: boolean): Promise<void> {
        if (value) {
            await this.adb.childProcess.exec('settings', 'put', 'global', AdbDemoMode.AllowedSettingKey, '1');
        } else {
            await this.setEnabled(false);
            await this.adb.childProcess.exec('settings', 'delete', 'global', AdbDemoMode.AllowedSettingKey);
        }
    }

    async getEnabled(): Promise<boolean> {
        const result = await this.adb.childProcess.exec('settings', 'get', 'global', AdbDemoMode.EnabledSettingKey);
        return result.trim() === '1';
    }

    async setEnabled(value: boolean): Promise<void> {
        if (value) {
            await this.adb.childProcess.exec('settings', 'put', 'global', AdbDemoMode.EnabledSettingKey, '1');
        } else {
            await this.adb.childProcess.exec('settings', 'delete', 'global', AdbDemoMode.EnabledSettingKey);
            await this.broadcast('exit');
        }
    }

    async broadcast(command: string, extra?: Record<string, string>): Promise<void> {
        await this.adb.childProcess.exec(
            'am',
            'broadcast',
            '-a',
            'com.android.systemui.demo',
            '-e',
            'command',
            command,
            ...(extra ? Object.entries(extra).flatMap(([key, value]) => ['-e', key, value]) : []),
        );
    }

    async setBatteryLevel(level: number): Promise<void> {
        await this.broadcast('battery', { level: level.toString() });
    }

    async setBatteryCharging(value: boolean): Promise<void> {
        await this.broadcast('battery', { plugged: value.toString() });
    }

    async setPowerSaveMode(value: boolean): Promise<void> {
        await this.broadcast('battery', { powersave: value.toString() });
    }

    async setAirplaneMode(show: boolean): Promise<void> {
        await this.broadcast('network', { airplane: show ? 'show' : 'hide' });
    }

    async setWifiSignalStrength(value: AdbDemoModeWifiSignalStrength): Promise<void> {
        await this.broadcast('network', { wifi: 'show', level: value });
    }

    async setMobileDataType(value: AdbDemoModeMobileDataType): Promise<void> {
        for (let i = 0; i < 2; i += 1) {
            await this.broadcast('network', {
                mobile: 'show',
                sims: '1',
                nosim: 'hide',
                slot: '0',
                datatype: value,
                fully: 'true',
                roam: 'false',
                level: '4',
                inflate: 'false',
                activity: 'in',
                carriernetworkchange: 'hide',
            });
        }
    }

    async setMobileSignalStrength(value: AdbDemoModeWifiSignalStrength): Promise<void> {
        await this.broadcast('network', { mobile: 'show', level: value });
    }

    async setNoSimCardIcon(show: boolean): Promise<void> {
        await this.broadcast('network', { nosim: show ? 'show' : 'hide' });
    }

    async setStatusBarMode(mode: AdbDemoModeStatusBarMode): Promise<void> {
        await this.broadcast('bars', { mode });
    }

    async setVibrateModeEnabled(value: boolean): Promise<void> {
        // https://cs.android.com/android/platform/superproject/+/master:frameworks/base/packages/SystemUI/src/com/android/systemui/statusbar/phone/DemoStatusIcons.java;l=103
        await this.broadcast('status', { volume: value ? 'vibrate' : 'hide' });
    }

    async setBluetoothConnected(value: boolean): Promise<void> {
        // https://cs.android.com/android/platform/superproject/+/master:frameworks/base/packages/SystemUI/src/com/android/systemui/statusbar/phone/DemoStatusIcons.java;l=114
        await this.broadcast('status', { bluetooth: value ? 'connected' : 'hide' });
    }

    async setLocatingIcon(show: boolean): Promise<void> {
        await this.broadcast('status', { location: show ? 'show' : 'hide' });
    }

    async setAlarmIcon(show: boolean): Promise<void> {
        await this.broadcast('status', { alarm: show ? 'show' : 'hide' });
    }

    async setSyncingIcon(show: boolean): Promise<void> {
        await this.broadcast('status', { sync: show ? 'show' : 'hide' });
    }

    async setMuteIcon(show: boolean): Promise<void> {
        await this.broadcast('status', { mute: show ? 'show' : 'hide' });
    }

    async setSpeakerPhoneIcon(show: boolean): Promise<void> {
        await this.broadcast('status', { speakerphone: show ? 'show' : 'hide' });
    }

    async setNotificationsVisibility(show: boolean): Promise<void> {
        // https://cs.android.com/android/platform/superproject/+/master:frameworks/base/packages/SystemUI/src/com/android/systemui/statusbar/phone/StatusBar.java;l=3131
        await this.broadcast('notifications', { visible: show.toString() });
    }

    async setTime(hour: number, minute: number): Promise<void> {
        await this.broadcast('clock', { hhmm: `${hour.toString().padStart(2, '0')}${minute.toString().padStart(2, '0')}` });
    }
}
