"use client";

import { motion } from "framer-motion";
import { Users, Eye, EyeOff, MessageCircle, Flag, Sparkles } from "lucide-react";
import { useReaderStore } from "@/stores/readerStore";
import styles from "./SocialControls.module.css";

/**
 * Social Intensity Slider - Controls visibility of social features
 * 0 = Solo mode (no social features)
 * 1 = Minimal (see friends' positions)
 * 2 = Moderate (+ reactions, highlights)
 * 3 = Full social (+ live chat, rooms)
 */

const INTENSITY_LEVELS = [
    { value: 0, label: "Solo", icon: EyeOff, description: "Focus mode - no distractions" },
    { value: 1, label: "Minimal", icon: Eye, description: "See where friends are reading" },
    { value: 2, label: "Social", icon: Flag, description: "Highlights & reactions visible" },
    { value: 3, label: "Full", icon: Users, description: "Live chat & reading rooms" },
];

export function SocialIntensitySlider() {
    const { socialIntensity, setSocialIntensity } = useReaderStore();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Sparkles size={16} />
                <span>Social Mode</span>
            </div>

            <div className={styles.slider}>
                <input
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    value={socialIntensity}
                    onChange={(e) => setSocialIntensity(Number(e.target.value))}
                    className={styles.sliderInput}
                />
                <div className={styles.trackMarks}>
                    {INTENSITY_LEVELS.map((level) => (
                        <div
                            key={level.value}
                            className={`${styles.mark} ${socialIntensity >= level.value ? styles.markActive : ""}`}
                            onClick={() => setSocialIntensity(level.value)}
                        />
                    ))}
                </div>
            </div>

            <div className={styles.levelInfo}>
                {(() => {
                    const currentLevel = INTENSITY_LEVELS.find(l => l.value === socialIntensity);
                    const IconComponent = currentLevel?.icon || Eye;
                    return <IconComponent size={20} />;
                })()}
                <div className={styles.levelText}>
                    <span className={styles.levelLabel}>
                        {INTENSITY_LEVELS.find(l => l.value === socialIntensity)?.label}
                    </span>
                    <span className={styles.levelDescription}>
                        {INTENSITY_LEVELS.find(l => l.value === socialIntensity)?.description}
                    </span>
                </div>
            </div>

            {/* Feature indicators */}
            <div className={styles.features}>
                <FeatureIndicator
                    icon={<Eye size={14} />}
                    label="Ghost readers"
                    active={socialIntensity >= 1}
                />
                <FeatureIndicator
                    icon={<Flag size={14} />}
                    label="Highlights"
                    active={socialIntensity >= 2}
                />
                <FeatureIndicator
                    icon={<MessageCircle size={14} />}
                    label="Reactions"
                    active={socialIntensity >= 2}
                />
                <FeatureIndicator
                    icon={<Users size={14} />}
                    label="Live rooms"
                    active={socialIntensity >= 3}
                />
            </div>
        </div>
    );
}

function FeatureIndicator({
    icon,
    label,
    active
}: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
}) {
    return (
        <motion.div
            className={`${styles.feature} ${active ? styles.featureActive : ""}`}
            animate={{ opacity: active ? 1 : 0.4 }}
        >
            {icon}
            <span>{label}</span>
        </motion.div>
    );
}

// Ghost Reader component - shows friends' reading positions
interface GhostReader {
    id: string;
    name: string;
    avatar: string;
    position: number; // 0-100 progress
    lastSeen: Date;
}

interface GhostReadersProps {
    readers: GhostReader[];
    totalProgress: number;
    onClick?: (readerId: string) => void;
}

export function GhostReaders({ readers, totalProgress, onClick }: GhostReadersProps) {
    if (readers.length === 0) return null;

    return (
        <div className={styles.ghostContainer}>
            {readers.map((reader) => (
                <motion.div
                    key={reader.id}
                    className={styles.ghost}
                    style={{ left: `${reader.position}%` }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 0.8, y: 0 }}
                    whileHover={{ opacity: 1, scale: 1.1 }}
                    onClick={() => onClick?.(reader.id)}
                    title={`${reader.name} - ${Math.round(reader.position)}%`}
                >
                    {reader.avatar.startsWith('http') ? (
                        <img src={reader.avatar} alt={reader.name} className={styles.ghostAvatar} />
                    ) : (
                        reader.avatar
                    )}
                </motion.div>
            ))}
        </div>
    );
}
