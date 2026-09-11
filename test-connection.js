require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');

async function testConnections() {
  console.log('--- 1. Testing Database Connection (HTTPS) ---');
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  try {
    // A simple HTTP request to count the rows in your table
    const { count, error } = await supabase
      .from('experience_nodes')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    console.log(`✅ Database Connected! Found ${count} nodes in experience_nodes.`);
  } catch (err) {
    console.error('❌ Database Error:', err.message);
  }

  console.log('\n--- 2. Testing Groq API Connection ---');
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Respond with the single word: "READY"' }],
      model: 'openai/gpt-oss-120b', // or whichever model just worked for you!
    });
    console.log(`✅ Groq Connected! Response: ${chatCompletion.choices[0]?.message?.content?.trim()}`);
  } catch (err) {
    console.error('❌ Groq Error:', err.message);
  }
}

testConnections();