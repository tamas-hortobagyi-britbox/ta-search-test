/**
 * Process a search term according to TA Search requirements.
 * @param {string} term - The input search term (URL encoded).
 * @param {Object} config - Configuration object.
 * @param {Array<string>} config.extraCharacterList - Suffixes to use based on term length.
 * @param {Array<[string, string]>} config.charReplacementList - Array of [from, to] replacements.
 * @param {number} config.shortTermLength - Max length for a "short" term.
 * @returns {string} - The processed term.
 */


// Example config (from ticket)
const processConfigFuzzy = {
  extraCharacterList: ['', '*', '*', '~'], // index = term length, last is default for longer
  charReplacementList: [
    ['  ', ' '],
    ['  ', ' '],
    ['~', ''],
    ['”', '"'],
    ['“', '"'],
    ['""', ''],
  ],
  shortTermLength: 2,
};

const processConfigPrefix = {
  extraCharacterList: ['', '*'], // index = term length, last is default for longer
  charReplacementList: [
    ['  ', ' '],
    ['  ', ' '],
    ['~', ''],
    ['”', '"'],
    ['“', '"'],
    ['""', ''],
  ],
  shortTermLength: 1000, // effectively no long terms
};

function processSearchTerm(term, config) {
  // 1. URL decode
  let decoded = decodeURIComponent(term);

  // 2. Don't change case

  // 3. Trim leading/trailing spaces
  decoded = decoded.trim();

  // 4. Remove duplicate spaces
  decoded = decoded.replace(/\s+/g, ' ');

  // 5. Apply charReplacementList
  for (const [from, to] of config.charReplacementList) {
    decoded = decoded.split(from).join(to);
  }

  // 6. If length is 0, return empty string
  if (decoded.length === 0) return '';

  // 7. Determine extraCharacter
  const termLength = decoded.length;
  const extraCharacter =
    config.extraCharacterList[
      Math.min(termLength, config.extraCharacterList.length - 1)
    ];

  // 8. If extraCharacter is empty, return as is
  if (!extraCharacter) return decoded;

  // 9. If short term, just append extraCharacter
  if (termLength <= config.shortTermLength) {
    return decoded + extraCharacter;
  }

  // 10. For long terms, process word by word
  let processed = '';
  let inDoubleQuote = false;
  let word = '';
  let i = 0;

  // Helper: Should we skip suffix for this word?
  function isOperatorOrSpecial(w) {
    return (
      w === 'AND' ||
      w === 'OR' ||
      w === 'NOT' ||
      w.startsWith('+') ||
      w.startsWith('-')
    );
  }

  while (i < decoded.length) {
    const char = decoded[i];

    if (char === '"') {
      // Flush any pending word
      if (word) {
        if (!inDoubleQuote && !isOperatorOrSpecial(word)) {
            processed += word + extraCharacter;
        } else {
            processed += word;
        }
        word = '';
      }
      processed += '"';
      inDoubleQuote = !inDoubleQuote;
      i++;
      continue;
    }

    if (!inDoubleQuote && (char === ' ' || i === decoded.length - 1)) {
      // End of word (outside quotes)
      if (char !== ' ') word += char; // Add last char if at end

      if (word) {
        if (!isOperatorOrSpecial(word)) {
          processed += word + extraCharacter;
        } else {
          processed += word;
        }
        word = '';
      }
      if (char === ' ') processed += ' ';
      i++;
      continue;
    }

    // Inside quotes or mid-word
    word += char;
    i++;
  }

  // If anything left in word buffer
  if (word) {
    if (!inDoubleQuote && !isOperatorOrSpecial(word)) {
      processed += word + extraCharacter;
    } else {
      processed += word;
    }
  }

  return processed;
}


// // Example usage:
// console.log(processSearchTerm('doctor who', config)); // doctor~ who~
// console.log(processSearchTerm('dr AND who', config)); // dr~ AND who~
// console.log(processSearchTerm('dr NOT who', config)); // dr~ AND who~
// console.log(processSearchTerm('dr OR who', config)); // dr~ AND who~
// console.log(processSearchTerm('"Midsomer" mur', config)); // "Midsomer" mur~
// console.log(processSearchTerm('v', config)); // v*
// console.log(processSearchTerm('ve', config)); // ve*
// console.log(processSearchTerm('ver', config)); // ver~
// console.log(processSearchTerm('test "" word" """', config)); // test~ word~" "
// console.log(processSearchTerm('"Midsomer" +murder', config)); // "Midsomer" +murder
// console.log(processSearchTerm('"this and that" or', config));
// console.log(processSearchTerm('test AND "exact phrase" OR ""', config));