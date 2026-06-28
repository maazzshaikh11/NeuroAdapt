'use strict';

const path = require('path');
// Load environment variables from the backend .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { simplifyText } = require('../src/services/llm.service');

const hardcodedText = "Neuroplasticity, also known as brain plasticity, or neural plasticity, is the ability of the brain to change throughout an individual's life, for example, brain activity associated with a given function can be transferred to a different location, the proportion of grey matter can change, and synapses may strengthen or weaken over time.";

async function runTest() {
  console.log('=== NeuroAdapt LLM Service Test ===\n');
  console.log('Input Text:');
  console.log(hardcodedText);
  console.log('\n----------------------------------------');

  const provider = process.env.LLM_PROVIDER || 'gemini';
  console.log(`Configured Primary Provider: ${provider}`);
  console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}\n`);

  // Define test cases
  const testCases = [
    { level: 'standard', language: 'English' },
    { level: 'basic', language: 'English' },
    { level: 'academic', language: 'English' },
    { level: 'standard', language: 'Spanish' }
  ];

  for (const tc of testCases) {
    console.log(`Running: Level = "${tc.level}", Language = "${tc.language}"`);
    try {
      const response = await simplifyText(hardcodedText, tc.level, tc.language);
      console.log(`Status: SUCCESS`);
      console.log(`Provider Used: ${response.provider}`);
      console.log(`Latency: ${response.latencyMs}ms`);
      console.log(`Simplified Output:\n${response.simplifiedText}`);
    } catch (error) {
      console.error(`Status: FAILED`);
      console.error(`Error: ${error.message}`);
    }
    console.log('----------------------------------------');
  }

  // Test Validation
  console.log('Running Validation Test (Empty Input)...');
  try {
    await simplifyText('');
    console.log('Status: FAILED (Expected validation error but succeeded)');
  } catch (error) {
    console.log(`Status: SUCCESS (Caught expected error: ${error.message})`);
  }
  console.log('----------------------------------------');
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
