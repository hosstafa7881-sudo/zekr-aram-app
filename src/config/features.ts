// دور دهم — features that can be switched off for a store submission.
//
// WHY THE ۱۰۰٪ CODE IS OFF
//
// It is the one part of the app whose rules are genuinely in question. The user
// asked Cafe Bazaar's support, in writing, whether a gift/referral system that
// hands out a 100% code for sharing the app on social media is allowed under
// their publishing and payment rules (ticket ۳۵۰۲۸۵۲). That question is still
// unanswered after two days.
//
// Blocking the whole release on one feature's answer would be the wrong trade.
// Switched off, the app can go through review now; the answer can turn it back
// on in an update. The code itself is untouched — this is a visibility flag,
// not a deletion — so turning it back on is this one line.
//
// The ۳۰/۵۰٪ count-based discount stays ON: it is an ordinary in-app promotion
// with no sharing, no referral, and nothing tied to ratings, so it does not
// carry the question the other one does.

export const FEATURES = {
  /** «کد تخفیف ۱۰۰ درصدی» — the share-for-a-code feature. */
  referralDiscount: false,
} as const;
