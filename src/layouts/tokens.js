// v1 frame tokens — the merchant app's skeleton-flow grammar (dark #1b1b1b
// base, hairlines, white sheets). Kept out of chrome.jsx so component files
// only export components (fast-refresh rule).

export const INTER = "font-['Inter',ui-sans-serif,sans-serif]";
export const HAIR = "border-[#ececec]";
export const SUB = "text-[#8a8f98]";
export const SKEL = "rounded-[10px] bg-[#f4f5f6]";
export const PANEL = "rounded-[16px] bg-white overflow-hidden";

// Placeholder identity until the shared teamOS Google-SSO service is wired.
export const USER = { name: "Admin User", initials: "AU", email: "build@iterator.in" };
