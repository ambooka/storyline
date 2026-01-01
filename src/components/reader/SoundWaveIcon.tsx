import React from 'react';
import styles from './SoundWaveIcon.module.css';

export function SoundWaveIcon({ size = 18 }: { size?: number }) {
    return (
        <div className={styles.soundWave} style={{ width: size, height: size }}>
            <div className={styles.bar} style={{ animationDelay: '0s' }} />
            <div className={styles.bar} style={{ animationDelay: '0.12s' }} />
            <div className={styles.bar} style={{ animationDelay: '0.24s' }} />
            <div className={styles.bar} style={{ animationDelay: '0.36s' }} />
        </div>
    );
}
