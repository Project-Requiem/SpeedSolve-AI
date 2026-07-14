// Test script for local solver
import { preprocessProblem, tryLocalSolve } from '../src/app/api/solve/local-solver';

const TESTS = [
  { input: '2^10', subject: 'mathematics', expect: '1024' },
  { input: 'Solve 3x + 5 = 14', subject: 'mathematics', expect: '3' },
  { input: '3x + 5 = 14', subject: 'mathematics', expect: '3' },
  { input: '15% of 200', subject: 'mathematics', expect: '30' },
  { input: 'Find 15% of 200', subject: 'mathematics', expect: '30' },
  { input: 'Find the LCM and GCD of 48, 72, 108', subject: 'mathematics', expect: 'LCM' },
  { input: 'Solve x^2 - 5x + 6 = 0', subject: 'mathematics', expect: '2' },
  { input: 'A train travels 360 km in 4 hours. Find its speed in m/s.', subject: 'physics', expect: '25' },
  { input: 'Find the area of a circle with radius 14 cm.', subject: 'mathematics', expect: '615.75' },
  { input: 'If sin theta = 3/5, find cos theta and tan theta.', subject: 'mathematics', expect: '0.8' },
  { input: 'Balance: Fe + O2 → Fe2O3', subject: 'chemistry', expect: '4Fe' },
  { input: 'A 2 kg block is pushed with 10 N force on a frictionless surface. Find acceleration.', subject: 'physics', expect: '5' },
  { input: 'A ball is thrown upward with velocity 20 m/s. Find max height. (g=10)', subject: 'physics', expect: '20' },
  { input: 'Find the pH of 0.01 M HCl solution.', subject: 'chemistry', expect: '2' },
  { input: 'How many moles of NaOH are in 80 g?', subject: 'chemistry', expect: '2' },
  { input: 'Differentiate f(x) = 3x^4 - 2x^2 + 5x - 7', subject: 'mathematics', expect: "f'" },
  { input: 'Find the 10th term of AP: 2, 7, 12, 17, ...', subject: 'mathematics', expect: '47' },
  { input: 'Simple Interest on Rs 5000 at 8% per annum for 3 years', subject: 'mathematics', expect: '1200' },
  { input: 'Find the distance between points A(3,4) and B(7,1)', subject: 'mathematics', expect: '5' },
  { input: 'Simplify: (a+b)^2 - (a-b)^2', subject: 'mathematics', expect: '4ab' },
  { input: 'A bag contains 5 red, 3 blue, and 2 green balls. Find probability of drawing a red ball.', subject: 'mathematics', expect: '0.5' },
  { input: 'A 60 kg person climbs 5 m stairs in 10 s. Find power. (g=9.8)', subject: 'physics', expect: '294' },
  { input: 'Find the resistance of a circuit with 12V battery and 3A current.', subject: 'physics', expect: '4' },
  { input: 'An object is dropped from 20m height. Find velocity at ground. (g=9.8)', subject: 'physics', expect: '19.8' },
  { input: 'A gas at 2 atm and 300 K occupies 5 L. What volume at 1 atm and 300 K?', subject: 'chemistry', expect: '10' },
  { input: 'Find the molarity of 4g NaOH in 500 mL solution.', subject: 'chemistry', expect: '0.2' },
  { input: 'What is the empirical formula of a compound with 40% C, 6.7% H, 53.3% O?', subject: 'chemistry', expect: 'CH2O' },
  { input: 'A ladder 10 m long leans against a wall. If the foot of the ladder is 6 m from the wall, find the height.', subject: 'mathematics', expect: '8' },
  { input: 'Find the mean, median, mode of: 5, 3, 7, 3, 5, 9, 3, 1', subject: 'mathematics', expect: '4.5' },
  { input: '50 mL of 0.1 M HCl reacts with 25 mL of NaOH. Find molarity of NaOH.', subject: 'chemistry', expect: '0.2' },
  { input: 'Two objects of masses 2kg and 4kg moving at 6 m/s and 0 m/s collide and stick. Find final velocity.', subject: 'physics', expect: '2' },
];

async function runTests() {
  console.log('=== Local Solver Test Suite ===\n');
  let pass = 0, fail = 0, errors = 0;

  for (const test of TESTS) {
    const preprocessed = preprocessProblem(test.input);
    try {
      const result = await tryLocalSolve(preprocessed, test.subject);
      if (!result) {
        console.log(`❌ FAIL [no result]: "${test.input}" (subject: ${test.subject})`);
        console.log(`   Preprocessed: "${preprocessed}"`);
        fail++;
      } else if (result.finalAnswer.includes(test.expect)) {
        console.log(`✅ PASS: "${test.input}"`);
        console.log(`   Answer: ${result.finalAnswer}`);
        pass++;
      } else {
        console.log(`⚠️  WRONG: "${test.input}"`);
        console.log(`   Expected to contain: "${test.expect}"`);
        console.log(`   Got: "${result.finalAnswer}"`);
        console.log(`   Preprocessed: "${preprocessed}"`);
        fail++;
      }
    } catch (e: any) {
      console.log(`💥 ERROR: "${test.input}"`);
      console.log(`   Error: ${e.message}`);
      errors++;
    }
    console.log('');
  }

  console.log(`\n=== Results: ${pass} passed, ${fail} failed, ${errors} errors out of ${TESTS.length} ===`);
}

runTests().catch(console.error);