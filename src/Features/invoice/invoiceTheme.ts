export type InvoiceTheme = {
    id: string;
    name: string;

    paper: string;
    ink: string;
    inkSoft: string;
    inkMute: string;
    accent: string;
    accentInk: string;

    displayFont: string;
    bodyFont: string;

    displayWeight: number;
    displayItalic: boolean;
    letterSpacing: number;

    spacing: string;
    density: string;
    borderRadius: number;

    showBorders: boolean;
};

export const INVOICE_THEMES: InvoiceTheme[] = [
    {
        id: "classic",
        name: "Classic",

        paper: "#ffffff",
        ink: "#000000",
        inkSoft: "#1a1a1a",
        inkMute: "#4a4a4a",
        accent: "#681EFF",
        accentInk: "#ffffff",

        displayFont: "Inter",
        bodyFont: "Inter",

        displayWeight: 700,
        displayItalic: false,
        letterSpacing: -0.01,

        spacing: "0.7in",
        density: "comfortable",
        borderRadius: 0,

        showBorders: true,
    },

    {
        id: "modern",
        name: "Modern",

        paper: "#ffffff",
        ink: "#171717",
        inkSoft: "#303030",
        inkMute: "#737373",
        accent: "#681EFF",
        accentInk: "#ffffff",

        displayFont: "Inter",
        bodyFont: "Inter",

        displayWeight: 600,
        displayItalic: false,
        letterSpacing: -0.02,

        spacing: "0.7in",
        density: "comfortable",
        borderRadius: 8,

        showBorders: false,
    },

    {
        id: "professional",
        name: "Professional",

        paper: "#f7f7f7",
        ink: "#111827",
        inkSoft: "#374151",
        inkMute: "#6b7280",
        accent: "#1f4b99",
        accentInk: "#ffffff",

        displayFont: "Inter",
        bodyFont: "Inter",

        displayWeight: 700,
        displayItalic: false,
        letterSpacing: -0.01,

        spacing: "0.7in",
        density: "comfortable",
        borderRadius: 4,

        showBorders: true,
    },
];

export const DEFAULT_THEME_ID = "classic";

export function findTheme(id: string): InvoiceTheme | undefined {
    return INVOICE_THEMES.find((theme) => theme.id === id);
}


export function getDefaultTheme(): InvoiceTheme {
    return { ...findTheme(DEFAULT_THEME_ID)! };
}

export function applyTheme(
    element: HTMLElement,
    theme: InvoiceTheme
): void {
    
    element.style.setProperty("--invoice-paper", theme.paper);
    element.style.setProperty("--invoice-ink", theme.ink);
    element.style.setProperty("--invoice-ink-soft", theme.inkSoft);
    element.style.setProperty("--invoice-ink-mute", theme.inkMute);
    element.style.setProperty("--invoice-accent", theme.accent);
    element.style.setProperty("--invoice-accent-ink", theme.accentInk);

    element.style.setProperty("--invoice-display-font", theme.displayFont);
    element.style.setProperty("--invoice-body-font", theme.bodyFont);

    element.style.setProperty(
        "--invoice-display-weight",
        String(theme.displayWeight)
    );

    element.style.setProperty(
        "--invoice-display-style",
        theme.displayItalic ? "italic" : "normal"
    );

    element.style.setProperty(
        "--invoice-letter-spacing",
        `${theme.letterSpacing}em`
    );

    element.style.setProperty("--invoice-spacing", theme.spacing);
    element.style.setProperty("--invoice-density", theme.density);
    element.style.setProperty(
        "--invoice-border-radius",
        `${theme.borderRadius}px`
    );

    element.style.setProperty(
        "--invoice-show-borders",
        theme.showBorders ? "1" : "0"
    );
}