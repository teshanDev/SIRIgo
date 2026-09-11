require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');

const app = express();
app.use(express.json());

// Initialize HTTPS Clients
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/api/quests', async (req, res) => {
  const { userLat, userLng, radiusKm, persona } = req.body;

  try {
    // 1. Call the Postgres RPC function via HTTPS
    const { data: nodes, error } = await supabase.rpc('get_serene_nodes', {
      user_lat: userLat,
      user_lng: userLng,
      radius_m: radiusKm * 1000
    });

    if (error) throw error;

    if (!nodes || nodes.length === 0) {
      return res.status(200).json({ message: "No serene locations found nearby right now." });
    }

    // 2. Format context for the LLM
    const contextString = nodes.map(n => 
      `Node ID: ${n.id}, Name: ${n.name}, Category: ${n.category}, Crowd Level: ${n.current_crowd_level}/5, Serenity Reward: ${n.serenity_reward}`
    ).join(' | ');

    const prompt = `You are the AI guide for SIRI go. The user's persona is "${persona}". 
    Create exactly 2 travel quests based ONLY on these nearby serene locations: ${contextString}.
    You MUST respond with a raw JSON array of objects matching this exact structure, with no markdown formatting or backticks:
    [
      {
        "node_id": "uuid-string-here",
        "quest_title": "Short Catchy Title",
        "narrative_reason": "A 1-sentence persuasive reason to visit, tailored to their persona.",
        "serenity_points": number
      }
    ]`;

    // 3. Generate dynamic quests via Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-20b', // Keep the model that worked in your test!
      temperature: 0.7,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content?.trim();

    // Safely parse the JSON, stripping any hallucinated markdown blocks
    const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '');
    const quests = JSON.parse(cleanJson);

    res.status(200).json(quests);

  } catch (error) {
    console.error("API Error:", error.message);
    res.status(500).json({ error: "Failed to generate quests." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});