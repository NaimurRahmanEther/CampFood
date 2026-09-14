const APP_LOCALE = "en-BD";
const APP_TIME_ZONE = "Asia/Dhaka";
const dateTimeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
});
const compactDateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
});
const yearFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
});
const numberFormatter = new Intl.NumberFormat(APP_LOCALE);
export function formatAppDateTime(value) {
    const parsed = parseDateValue(value);
    return parsed ? dateTimeFormatter.format(parsed) : "";
}
export function formatAppDate(value) {
    const parsed = parseDateValue(value);
    return parsed ? dateFormatter.format(parsed) : "";
}
export function formatAppCompactDate(value) {
    const parsed = parseDateValue(value);
    return parsed ? compactDateFormatter.format(parsed) : "";
}
export function formatAppTime(value) {
    const parsed = parseDateValue(value);
    return parsed ? timeFormatter.format(parsed) : "";
}
export function formatAppYear(value) {
    const parsed = parseDateValue(value);
    return parsed ? yearFormatter.format(parsed) : "";
}
export function formatAppNumber(value) {
    return numberFormatter.format(value);
}
function parseDateValue(value) {
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
}
