const normalizeLang = (lang: string) => (lang || "en-IN").replace("_", "-");

export const getDefaultCheckInTemplateForLang = (lang: string) => {
    const normalized = normalizeLang(lang);
    switch (normalized) {
        case "hi":
        case "hi-IN":
            return "स्वागत है {name}. आपका टोकन नंबर {token} है। {clinic} में आपका स्वागत है।";
        case "mr":
        case "mr-IN":
            return "स्वागत आहे {name}. तुमचा टोकन नंबर {token} आहे. {clinic} मध्ये आपले स्वागत आहे.";
        case "bn":
        case "bn-IN":
            return "স্বাগতম {name}. আপনার টোকেন নম্বর {token}। {clinic} এ আপনার স্বাগতম।";
        case "en":
            return "Welcome {name}. Your token is {token}. Welcome to {clinic}.";
        case "en-IN":
        default:
            return "Welcome {name}. Your token is {token}. Welcome to {clinic}.";
    }
};

export const getDefaultCallNextTemplateForLang = (lang: string) => {
    const normalized = normalizeLang(lang);
    switch (normalized) {
        case "hi":
        case "hi-IN":
            return "टोकन {token} {name}, कृपया {clinic} में डॉक्टर के पास जाएं।";
        case "mr":
        case "mr-IN":
            return "टोकन {token} {name}, कृपया {clinic} मध्ये डॉक्टरकडे या.";
        case "bn":
        case "bn-IN":
            return "টোকেন {token} {name}, অনুগ্রহ করে {clinic} এ ডাক্তারের কাছে যান।";
        case "en":
            return "{name}, token {token}, please go to the doctor at {clinic}.";
        case "en-IN":
        default:
            return "{name}, token {token}, please go to the doctor at {clinic}.";
    }
};

/**
 * Replaces placeholders in the voice template with actual data.
 */
export const buildVoiceAnnouncement = (
    template: string,
    data: { name: string; token: string; clinic: string; doctor?: string }
) => {
    return template
        .replace(/\{name\}/gi, data.name)
        .replace(/\{token\}/gi, data.token)
        .replace(/\{clinic\}/gi, data.clinic)
        .replace(/\{doctor\}/gi, data.doctor || "the doctor");
};

const getLegacyAnnouncementTemplateForLang = (lang: string) => {
    const normalized = normalizeLang(lang);
    switch (normalized) {
        case "hi":
        case "hi-IN":
            return "स्वागत है {name}. आपका टोकन नंबर {token} है।";
        case "mr":
        case "mr-IN":
            return "स्वागत आहे {name}. तुमचा टोकन नंबर {token} आहे.";
        case "bn":
        case "bn-IN":
            return "স্বাগতম {name}. আপনার টোকেন নম্বর {token}।";
        case "en":
            return "Welcome {name}. your token number is {token}";
        case "en-IN":
        default:
            return "Welcome {name}. your token number is {token}";
    }
};

const getLegacyCheckInTemplateForLang = (lang: string) => {
    const normalized = normalizeLang(lang);
    switch (normalized) {
        case "hi":
        case "hi-IN":
            return "टोकन {token} {name}, कृपया डॉक्टर के पास जाएं।";
        case "mr":
        case "mr-IN":
            return "टोकन {token} {name}, कृपया डॉक्टरकडे या.";
        case "bn":
        case "bn-IN":
            return "টোকেন {token} {name}, অনুগ্রহ করে ডাক্তারের কাছে যান।";
        case "en":
            return "Token {token} {name}, please go to the doctor.";
        case "en-IN":
        default:
            return "Token {token} {name}, please go to the doctor.";
    }
};

export const normalizeVoiceTemplates = (
    lang: string,
    announcementTemplate: string,
    checkInAnnouncementTemplate: string
) => {
    const legacyAnnouncement = getLegacyAnnouncementTemplateForLang(lang);
    const legacyCheckIn = getLegacyCheckInTemplateForLang(lang);
    const defaultCallNext = getDefaultCallNextTemplateForLang(lang);
    const defaultCheckIn = getDefaultCheckInTemplateForLang(lang);

    if (announcementTemplate === legacyAnnouncement && checkInAnnouncementTemplate === legacyCheckIn) {
        return {
            announcementTemplate: defaultCallNext,
            checkInAnnouncementTemplate: defaultCheckIn,
        };
    }

    const nextCheckIn = !checkInAnnouncementTemplate || checkInAnnouncementTemplate.trim().length === 0
        ? defaultCheckIn
        : checkInAnnouncementTemplate === defaultCallNext
            ? defaultCheckIn
            : checkInAnnouncementTemplate;

    return { announcementTemplate: announcementTemplate || defaultCallNext, checkInAnnouncementTemplate: nextCheckIn };
};
