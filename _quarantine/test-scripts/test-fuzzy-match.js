#!/usr/bin/env node
// Test why fuzzy matching fails

const titleMap = {
  "airbags_deployed": "were_the_airbags_deployed",
  "damage_to_your_vehicle": "was_there_any_damage_to_your_vehicle",
  "wearing_seatbelts": "were_you_and_all_your_passengers_if_any_wearing_seat_belts",
  "are_you_safe": "quick_safety_check_lets_make_sure_youre_safe_with_our_six_point_check",
  "six_point_safety_check": "quick_safety_check_lets_make_sure_youre_safe_with_our_six_point_check"
};

console.log("Testing substring matches:\n");
Object.entries(titleMap).forEach(([field, title]) => {
  const match = title.includes(field);
  console.log(`Field: ${field}`);
  console.log(`Title: ${title.substring(0, 80)}${title.length > 80 ? '...' : ''}`);
  console.log(`Match: ${match ? '✅ YES' : '❌ NO'}`);

  if (!match) {
    const words = field.split("_");
    const foundWords = words.filter(w => title.includes(w));
    console.log(`  Found words in title: ${foundWords.join(", ") || "none"}`);
  }
  console.log("");
});
