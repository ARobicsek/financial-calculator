/**
 * Risk Questionnaire Component
 * 8 questions to assess risk tolerance
 */

export const RISK_QUESTIONS = [
    {
        id: 1,
        question: "What is your primary investment goal?",
        options: [
            { value: 1, text: "Preserve my capital with minimal risk" },
            { value: 2, text: "Generate steady income with low risk" },
            { value: 3, text: "Balance growth and income" },
            { value: 4, text: "Grow my wealth over time" },
            { value: 5, text: "Maximize growth, accepting higher volatility" }
        ]
    },
    {
        id: 2,
        question: "Compared to a savings account, what return do you expect from your investments?",
        options: [
            { value: 1, text: "I'm satisfied with savings account returns" },
            { value: 2, text: "Slightly higher, 1-2% more annually" },
            { value: 3, text: "Moderately higher, 3-4% more annually" },
            { value: 4, text: "Significantly higher, 5-6% more annually" },
            { value: 5, text: "Much higher, willing to accept risk for 7%+ more" }
        ]
    },
    {
        id: 3,
        question: "How concerned are you about inflation eroding your purchasing power?",
        options: [
            { value: 1, text: "Not concerned - stability is more important" },
            { value: 2, text: "Somewhat concerned" },
            { value: 3, text: "Moderately concerned" },
            { value: 4, text: "Very concerned - growth is essential" },
            { value: 5, text: "Extremely concerned - must outpace inflation significantly" }
        ]
    },
    {
        id: 4,
        question: "If your portfolio dropped 20% in one month, what would you do?",
        options: [
            { value: 1, text: "Sell everything immediately to prevent further losses" },
            { value: 2, text: "Sell some holdings to reduce exposure" },
            { value: 3, text: "Hold and wait for recovery" },
            { value: 4, text: "Hold and possibly buy more if I had extra cash" },
            { value: 5, text: "Buy more aggressively - this is a great opportunity" }
        ]
    },
    {
        id: 5,
        question: "What is the maximum annual decline you could tolerate before selling?",
        options: [
            { value: 1, text: "5% or less" },
            { value: 2, text: "10%" },
            { value: 3, text: "20%" },
            { value: 4, text: "30%" },
            { value: 5, text: "40% or more - I'm in it for the long term" }
        ]
    },
    {
        id: 6,
        question: "Compared to your peers, how would you describe your risk tolerance?",
        options: [
            { value: 1, text: "Much more conservative" },
            { value: 2, text: "Somewhat more conservative" },
            { value: 3, text: "About average" },
            { value: 4, text: "Somewhat more aggressive" },
            { value: 5, text: "Much more aggressive" }
        ]
    },
    {
        id: 7,
        question: "Do you have emergency savings outside of this investment portfolio?",
        options: [
            { value: 1, text: "No emergency fund" },
            { value: 2, text: "Less than 3 months of expenses" },
            { value: 3, text: "3-6 months of expenses" },
            { value: 4, text: "6-12 months of expenses" },
            { value: 5, text: "More than 12 months of expenses" }
        ]
    },
    {
        id: 8,
        question: "How stable is your current income?",
        options: [
            { value: 1, text: "Highly variable (commission, freelance, gig work)" },
            { value: 2, text: "Somewhat variable" },
            { value: 3, text: "Stable but private sector" },
            { value: 4, text: "Very stable (tenured, long-term contract)" },
            { value: 5, text: "Extremely stable (government, military, pension)" }
        ]
    }
];

/**
 * Calculate risk profile from answers
 */
export function calculateRiskProfile(answers) {
    if (!answers || answers.length !== 8) {
        return { score: 24, profile: 'moderate', equityRange: '50-60%' };
    }

    const score = answers.reduce((sum, val) => sum + val, 0);

    let profile, equityRange;
    if (score <= 12) {
        profile = 'very_conservative';
        equityRange = '20-30%';
    } else if (score <= 18) {
        profile = 'conservative';
        equityRange = '30-45%';
    } else if (score <= 26) {
        profile = 'moderate';
        equityRange = '45-60%';
    } else if (score <= 34) {
        profile = 'moderately_aggressive';
        equityRange = '60-75%';
    } else {
        profile = 'aggressive';
        equityRange = '75-90%';
    }

    return { score, profile, equityRange };
}
