import { NextResponse } from "next/server";
import OpenAI from "openai";
import { query } from "@/lib/db";

/* ---------- OpenRouter client ---------- */
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

/* ---------- Database Tools ---------- */

// Tool 1: Count profiles by first letter
async function countNamesByLetter(letter) {
  try {
    const firstChar = String(letter || "").trim().toUpperCase().substring(0, 1);
    if (!firstChar) return { error: "Invalid letter" };

    const sql = `
      SELECT COUNT(*)::int AS count
      FROM matrimony_profiles mp
      WHERE mp.is_active = true
        AND mp.first_name ILIKE $1
    `;

    const res = await query(sql, [`${firstChar}%`]);
    return { count: res.rows[0]?.count || 0, letter: firstChar };
  } catch (e) {
    return { error: e.message };
  }
}

// Tool 2: List profiles by first letter
async function listProfilesByLetter(letter, limit = 10) {
  try {
    const firstChar = String(letter || "").trim().toUpperCase().substring(0, 1);
    if (!firstChar) return { error: "Invalid letter" };

    const sql = `
      SELECT 
        mp.matri_id, 
        mp.first_name, 
        mp.last_name, 
        mp.gender,
        COALESCE(mp.age_years, EXTRACT(YEAR FROM age(mp.dob))::int) AS age,
        ph.path AS photo_url
      FROM matrimony_profiles mp
      LEFT JOIN LATERAL (
        SELECT path FROM photos WHERE profile_id = mp.id AND is_primary = true LIMIT 1
      ) ph ON true
      WHERE mp.is_active = true
        AND mp.first_name ILIKE $1
      ORDER BY mp.created_at DESC
      LIMIT $2
    `;

    const res = await query(sql, [`${firstChar}%`, limit]);
    return { profiles: res.rows, letter: firstChar, count: res.rows.length };
  } catch (e) {
    return { error: e.message };
  }
}

// Tool 3: Get total counts (overall stats)
async function getOverallStats() {
  try {
    const sql = `
      SELECT 
        COUNT(*)::int AS total_profiles,
        COUNT(CASE WHEN gender = 'Male' THEN 1 END)::int AS male_count,
        COUNT(CASE WHEN gender = 'Female' THEN 1 END)::int AS female_count,
        COUNT(CASE WHEN is_active = true THEN 1 END)::int AS active_profiles
      FROM matrimony_profiles
    `;

    const res = await query(sql);
    return res.rows[0] || {};
  } catch (e) {
    return { error: e.message };
  }
}

// Tool 4: Search profiles by name (ENHANCED with photos for chat cards)
async function searchByName(name, limit = 10) {
  try {
    const searchTerm = String(name || "").trim();
    if (!searchTerm) return { error: "Name required" };

    const sql = `
      SELECT 
        mp.matri_id, 
        mp.first_name, 
        mp.last_name, 
        mp.gender,
        COALESCE(mp.age_years, EXTRACT(YEAR FROM age(mp.dob))::int) AS age,
        r.name AS religion_name,
        ci.name AS city_name,
        st.name AS state_name,
        ph.path AS photo_url
      FROM matrimony_profiles mp
      LEFT JOIN religions r ON r.id = mp.religion_id
      LEFT JOIN cities ci ON ci.id = mp.city_id
      LEFT JOIN states st ON st.id = mp.state_id
      LEFT JOIN LATERAL (
        SELECT path FROM photos WHERE profile_id = mp.id AND is_primary = true LIMIT 1
      ) ph ON true
      WHERE mp.is_active = true
        AND (
          mp.first_name ILIKE $1 
          OR mp.last_name ILIKE $1
          OR mp.matri_id ILIKE $1
        )
      ORDER BY mp.created_at DESC
      LIMIT $2
    `;

    const res = await query(sql, [`%${searchTerm}%`, limit]);
    return { profiles: res.rows, searchTerm, count: res.rows.length };
  } catch (e) {
    return { error: e.message };
  }
}

/* ---------- Tool Definitions for AI ---------- */
const tools = [
  {
    type: "function",
    function: {
      name: "countNamesByLetter",
      description: "Count how many profiles have names starting with a specific letter",
      parameters: {
        type: "object",
        properties: {
          letter: {
            type: "string",
            description: "The first letter to search for (e.g., 'P', 'A', 'M')",
          },
        },
        required: ["letter"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listProfilesByLetter",
      description: "List profiles whose names start with a specific letter",
      parameters: {
        type: "object",
        properties: {
          letter: {
            type: "string",
            description: "The first letter to search for",
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default 10)",
          },
        },
        required: ["letter"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getOverallStats",
      description: "Get overall statistics about profiles (total count, male/female breakdown)",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchByName",
      description: "Search for profiles by name or Matri ID. Use this when user asks about specific names like 'Biswajit', 'Raj', etc.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name or Matri ID to search for",
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default 10)",
          },
        },
        required: ["name"],
      },
    },
  },
];

/* ---------- Execute Tool Function ---------- */
async function executeToolCall(toolName, args) {
  switch (toolName) {
    case "countNamesByLetter":
      return await countNamesByLetter(args.letter);
    case "listProfilesByLetter":
      return await listProfilesByLetter(args.letter, args.limit);
    case "getOverallStats":
      return await getOverallStats();
    case "searchByName":
      return await searchByName(args.name, args.limit);
    default:
      return { error: "Unknown tool" };
  }
}

/* ---------- Main Chat Handler ---------- */
export async function POST(req) {
  try {
    const { message, conversationHistory = [] } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({
        error: "OPENROUTER_API_KEY not configured"
      }, { status: 500 });
    }

    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

    // Build messages array
    const messages = [
      {
        role: "system",
        content: `You are a helpful AI assistant for MatriMoney, a matrimony platform. You can help users by:
- Searching for profiles by name (use searchByName tool)
- Counting profiles by name letters
- Listing profiles by name
- Providing overall statistics

Be friendly, concise, and helpful. When you find profiles using searchByName, mention that the user can click "View Profile" to see full details.`
      },
      ...conversationHistory,
      { role: "user", content: message },
    ];

    // First AI call with tools
    let completion = await client.chat.completions.create({
      model,
      messages,
      tools,
      tool_choice: "auto",
    });

    let assistantMessage = completion.choices[0].message;
    let profileCards = null;

    // Handle tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Execute all tool calls
      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (toolCall) => {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeToolCall(toolCall.function.name, args);

          // ✅ If searchByName or listProfilesByLetter returned profiles, save them for cards
          if ((toolCall.function.name === "searchByName" || toolCall.function.name === "listProfilesByLetter")
            && result.profiles && result.profiles.length > 0) {
            profileCards = result.profiles;
          }

          return {
            tool_call_id: toolCall.id,
            role: "tool",
            name: toolCall.function.name,
            content: JSON.stringify(result),
          };
        })
      );

      // Second AI call with tool results
      messages.push(assistantMessage);
      messages.push(...toolResults);

      completion = await client.chat.completions.create({
        model,
        messages,
      });

      assistantMessage = completion.choices[0].message;
    }

    return NextResponse.json({
      ok: true,
      reply: assistantMessage.content,
      cards: profileCards, // ✅ Include profile cards if found
      conversationHistory: [
        ...conversationHistory,
        { role: "user", content: message },
        { role: "assistant", content: assistantMessage.content },
      ],
    });

  } catch (e) {
    console.error("Chat error:", e);
    return NextResponse.json(
      {
        error: "Chat failed",
        detail: String(e?.message || e),
        reply: "Sorry, I encountered an error. Please try again."
      },
      { status: 500 }
    );
  }
}
