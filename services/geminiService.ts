import { GoogleGenAI } from "@google/genai";
import { Transaction, BankAccount } from "../types";

const apiKey = process.env.API_KEY;

let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'undefined') {
    ai = new GoogleGenAI({ apiKey: apiKey });
} else {
    console.warn("API_KEY is missing. AI features will be disabled.");
}

export const getFinancialAdvice = async (
    transactions: Transaction[],
    accounts: BankAccount[]
): Promise<string> => {
    if (!ai) {
        return "⚠️ API KEY 未設定。請在佈署環境變數中設定 API_KEY 以啟用 AI 分析功能。目前為離線展示模式。";
    }

    const transactionSummary = transactions.map(t => 
        `- ${t.date.split('T')[0]}: ${t.type === 'income' ? '收入' : '支出'} $${t.amount} (${t.category}) - ${t.description}`
    ).join('\n');

    const accountSummary = accounts.map(a => 
        `- ${a.name} (${a.type}): 餘額 $${a.balance}`
    ).join('\n');

    const prompt = `
    你是一位專業的個人財務顧問。請根據以下的財務數據為使用者提供簡短、具體的建議。
    請使用繁體中文回答。

    目前資產狀況：
    ${accountSummary}

    近期交易紀錄：
    ${transactionSummary}

    請分析消費習慣，指出潛在的浪費，並給出理財建議。請保持語氣鼓勵且專業。
    `;

    try {
        // Using the requested model: gemini-3-pro-preview
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
        });

        return response.text || "無法生成建議。";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "AI 分析暫時無法使用，請稍後再試。";
    }
};