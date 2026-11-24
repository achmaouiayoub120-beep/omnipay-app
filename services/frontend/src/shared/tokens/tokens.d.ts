/**
 * OmniPay Zero-Trust — Design Tokens Spec
 * Source unique de vérité pour le Design System.
 * Toutes les valeurs sont dérivées pour Tailwind et variables CSS.
 */
export declare const tokens: {
    readonly colors: {
        readonly obsidian: {
            readonly 950: "#070A12";
            readonly 900: "#0B101E";
            readonly 850: "#0E1424";
            readonly 800: "#131A2E";
            readonly 750: "#18213A";
            readonly 700: "#1E2947";
            readonly 600: "#2A395E";
            readonly 500: "#3D507F";
        };
        readonly gold: {
            readonly 50: "#FAF6EE";
            readonly 100: "#F5ECDC";
            readonly 200: "#EBD7B6";
            readonly 300: "#DEC08C";
            readonly 400: "#D4A24C";
            readonly 500: "#C49038";
            readonly 600: "#A4742B";
            readonly 700: "#805723";
            readonly 800: "#644220";
            readonly 900: "#4D321D";
        };
        readonly emerald: {
            readonly 500: "#19C37D";
            readonly 600: "#14A669";
            readonly 900: "#063A23";
        };
        readonly crimson: {
            readonly 500: "#E5484D";
            readonly 600: "#CE2C31";
            readonly 900: "#4A1113";
        };
        readonly amber: {
            readonly 500: "#F5A524";
            readonly 600: "#D97706";
            readonly 900: "#4A2B04";
        };
        readonly platinum: {
            readonly 50: "#F8FAFC";
            readonly 100: "#F1F5F9";
            readonly 200: "#E2E8F0";
            readonly 400: "#94A3B8";
            readonly 500: "#64748B";
        };
        readonly light: {
            readonly bg: "#F8FAFC";
            readonly surface: "#FFFFFF";
            readonly surfaceMuted: "#F1F5F9";
            readonly border: "#E2E8F0";
            readonly borderFocus: "#CBD5E1";
            readonly textPrimary: "#0F172A";
            readonly textSecondary: "#475569";
            readonly textMuted: "#64748B";
        };
    };
    readonly spacing: {
        readonly 0: "0px";
        readonly 1: "4px";
        readonly 2: "8px";
        readonly 3: "12px";
        readonly 4: "16px";
        readonly 5: "20px";
        readonly 6: "24px";
        readonly 7: "28px";
        readonly 8: "32px";
        readonly 10: "40px";
        readonly 12: "48px";
        readonly 16: "64px";
        readonly 20: "80px";
        readonly 24: "96px";
        readonly 32: "128px";
    };
    readonly radii: {
        readonly none: "0px";
        readonly xs: "4px";
        readonly sm: "8px";
        readonly md: "12px";
        readonly lg: "16px";
        readonly xl: "20px";
        readonly '2xl': "28px";
        readonly full: "9999px";
    };
    readonly shadows: {
        readonly elevation1: "0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)";
        readonly elevation2: "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)";
        readonly elevation3: "0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.6)";
        readonly goldGlow: "0 0 24px -4px rgba(212, 162, 76, 0.35)";
        readonly goldGlowSubtle: "0 0 12px -2px rgba(212, 162, 76, 0.2)";
        readonly cardSpecular: "0 14px 34px 0 rgba(0, 0, 0, 0.65), inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)";
    };
    readonly transitions: {
        readonly fast: "150ms cubic-bezier(0.16, 1, 0.3, 1)";
        readonly normal: "250ms cubic-bezier(0.16, 1, 0.3, 1)";
        readonly slow: "400ms cubic-bezier(0.16, 1, 0.3, 1)";
    };
    readonly zIndex: {
        readonly base: 0;
        readonly card: 10;
        readonly sticky: 20;
        readonly header: 30;
        readonly dropdown: 40;
        readonly drawer: 50;
        readonly modal: 60;
        readonly toast: 70;
        readonly tooltip: 80;
    };
};
export type Tokens = typeof tokens;
