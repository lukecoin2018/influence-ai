// Common words that show up as false-positive "detected brands" (scanned from
// captions/hashtags) but aren't brand, creator, celebrity, or media entities —
// classified straight to 'fragment' without spending an AI call. Not
// exhaustive; extend as new false positives turn up in the review queue.
export const COMMON_WORD_FRAGMENTS = new Set([
  // English function words
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'without', 'my', 'your', 'our', 'their',
  'his', 'her', 'its', 'it', 'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being',
  'this', 'that', 'these', 'those', 'here', 'there', 'now', 'today', 'new', 'best',
  'love', 'life', 'style', 'day', 'one', 'two', 'all', 'just', 'so', 'in', 'on', 'at',
  'by', 'to', 'of', 'from', 'we', 'you', 'she', 'he', 'they', 'me', 'us', 'them',
  // Spanish function words
  'la', 'el', 'los', 'las', 'de', 'del', 'y', 'o', 'para', 'con', 'sin', 'mi', 'tu', 'su',
  'es', 'son', 'este', 'esta', 'aqui', 'hoy', 'nuevo', 'todo', 'uno', 'dos', 'amor', 'vida', 'dia',
  // Portuguese function words
  'os', 'as', 'do', 'da', 'e', 'ou', 'sem', 'seu', 'minha', 'sua', 'sao',
  // Colors — usually generic descriptors, not brand names, in this dataset
  'white', 'black', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'gray', 'grey', 'brown', 'gold', 'silver',
]);
