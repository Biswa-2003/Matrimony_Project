// Quick test to list available Gemini models
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local if exists, otherwise .env
try {
    const envLocalPath = join(__dirname, '.env.local');
    const envLocal = readFileSync(envLocalPath, 'utf-8');
    const lines = envLocal.split('\n');
    lines.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length) {
            process.env[key.trim()] = valueParts.join('=').trim();
        }
    });
    console.log("✅ Loaded .env.local");
} catch {
    console.log("⚠️  .env.local not found, checking .env...");
    dotenv.config();
}

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.log("❌ No GOOGLE_API_KEY found in .env or .env.local");
    console.log("   Please add: GOOGLE_API_KEY=your-key-here");
    process.exit(1);
}

console.log("✅ API Key found (first 15 chars):", apiKey.substring(0, 15) + "...");
console.log("   Full length:", apiKey.length, "characters");

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log("\n🔍 Fetching available models from Google AI...\n");

        // Try to list models
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        if (!response.ok) {
            console.log("❌ API Error:", response.status, response.statusText);
            const text = await response.text();
            console.log("Response:", text);
            console.log("\n💡 Your API key might be:");
            console.log("   - Invalid or expired");
            console.log("   - Not enabled for Gemini API");
            console.log("   - Get a new one: https://aistudio.google.com/app/apikey");
            return;
        }

        const data = await response.json();
        console.log("✅ Available models for YOUR API key:\n");

        if (data.models && data.models.length > 0) {
            const generateModels = data.models.filter(m =>
                m.supportedGenerationMethods?.includes('generateContent')
            );

            console.log("📋 Models that support 'generateContent':");
            generateModels.forEach(model => {
                const modelName = model.name.replace('models/', '');
                console.log(`\n  ✅ ${modelName}`);
                console.log(`     Display: ${model.displayName}`);
            });

            console.log("\n\n🎯 RECOMMENDED MODEL TO USE:");
            if (generateModels.length > 0) {
                const recommended = generateModels[0].name.replace('models/', '');
                console.log(`   model: "${recommended}"`);
                console.log("\n   Update line 136 in src/app/api/ai-search/route.js to:");
                console.log(`   const model = genAI.getGenerativeModel({ model: "${recommended}" });`);
            }
        } else {
            console.log("  ❌ No models found! Your API key may not have access.");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

listModels();
