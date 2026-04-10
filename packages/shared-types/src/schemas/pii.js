const PII_PATTERNS = [
    [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL_REDACTED]"],
    [/\b(?:\+?40|0)\s*\d[\d\s.-]{7,}\b/g, "[PHONE_REDACTED]"],
    [/\b\d{13}\b/g, "[CNP_REDACTED]"],
    [/\bRO\d{2,10}\b/gi, "[CUI_REDACTED]"],
    [/\b[A-Z]{2}\d{2}\s?[A-Z]{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, "[IBAN_REDACTED]"],
];
export function redactPii(input) {
    let result = input;
    for (const [pattern, replacement] of PII_PATTERNS) {
        result = result.replace(pattern, replacement);
    }
    return result;
}
export function createPiiRedactor() {
    return {
        redact: redactPii,
        redactObject(obj) {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === "string") {
                    result[key] = redactPii(value);
                }
                else if (typeof value === "object" && value !== null) {
                    result[key] = this.redactObject(value);
                }
                else {
                    result[key] = value;
                }
            }
            return result;
        },
    };
}
