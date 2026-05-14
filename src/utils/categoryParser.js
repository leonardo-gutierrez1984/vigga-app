// ─────────────────────────────────────────────────────────────
// categoryParser.js
// Utilitário centralizado de parse de texto para lançamentos.
// Para adicionar novas marcas, basta editar BRAND_DICT abaixo.
// ─────────────────────────────────────────────────────────────

// Dicionário de marcas → categoria
// Chave: regex (case-insensitive) | Valor: categoria
const BRAND_DICT = [
  // ── MERCADO / SUPERMERCADO ───────────────────────────────
  {
    pattern:
      /amigao|amigão|condor|mufatto|bom dia|angeloni|assai|atacadao|atacadão|extra|carrefour|walmart|sams club|sam's|prezunic/i,
    category: "Mercado",
  },

  // ── FARMÁCIA ────────────────────────────────────────────
  {
    pattern:
      /panvel|nissei|raia|droga raia|farmacias sao paulo|farmácias são paulo|farmacia sao paulo|farmacia brasilia|farmácia brasília|drogasil|ultrafarma|onofre|pacheco|drogaria/i,
    category: "Farmácia",
  },

  // ── DELIVERY / RESTAURANTE ──────────────────────────────
  {
    pattern:
      /ifood|rappi|james delivery|uber eats|mcdonalds|mc donalds|mcdonald|burger king|kfc|subway|giraffas|bobs|bob's|outback|madero|coco bambu|chilli beans|habib/i,
    category: "Delivery",
  },

  // ── TRANSPORTE ──────────────────────────────────────────
  {
    pattern:
      /uber|99pop|99taxi|cabify|ônibus|onibus|passagem|metrô|metro|bicicleta compartilhada|scooter|patinete|mototaxi|taxi|táxi/i,
    category: "Transporte",
  },

  // ── COMBUSTÍVEL / POSTO ─────────────────────────────────
  {
    pattern:
      /ipiranga|shell|br distribuidora|ale combustivel|raizen|petrobras posto|auto posto|posto shell|posto ipiranga/i,
    category: "Combustível",
  },

  // ── ROUPAS / CALÇADOS ───────────────────────────────────
  {
    pattern:
      /renner|riachuelo|pernambucanas|havan|c&a|cea|zara|hm|h&m|shein|marisa|leader|lojas americanas|americanas|decathlon|centauro|lupo|authentic feet|outlet go|lado criança|brooksfield|polo play|recco|bonny|adidas|nike|puma|for boys|genkko|capodarte|homem s\/a|reserva|aramis|lacoste|polo ralph|vivara|pandora|arezzo|via mia|anacapri|melissa/i,
    category: "Vestuário",
  },

  // ── ATIVIDADE FÍSICA ────────────────────────────────────
  {
    pattern:
      /raquet park|arena tennistorm|flow fitness|toss|arena go beach|smartfit|smart fit|bodytech|bio ritmo|bluefit|runner|muay thai|jiu.?jitsu|pilates|yoga/i,
    category: "Atividade Física",
  },

  // ── SAÚDE ───────────────────────────────────────────────
  {
    pattern:
      /unimed|hapvida|bradesco saude|amil|sulamerica saude|notredame|clinica|consultorio|consultório|laboratorio|laboratório|exame|hospital|psicologo|psicóloga|psicóloga|psicopedagoga|terapeuta|odonto|dentista|otica|óptica|drogasil/i,
    category: "Saúde",
  },

  // ── ASSINATURAS / STREAMING ─────────────────────────────
  {
    pattern:
      /netflix|spotify|amazon prime|disney\+|hbo|apple tv|youtube premium|globoplay|telecine|deezer|adobe|microsoft 365|office 365|icloud|dropbox|canva|chatgpt|claude/i,
    category: "Assinaturas",
  },

  // ── ESCOLA / EDUCAÇÃO ───────────────────────────────────
  {
    pattern:
      /colegio|colégio|escola|faculdade|universidade|etec|senai|senac|fgv|insper|unip|uninove|anhanguera|kroton|positivo|mensalidade escolar/i,
    category: "Escola",
  },

  // ── CURSOS ──────────────────────────────────────────────
  {
    pattern:
      /udemy|alura|coursera|rocketseat|dio\.me|origamid|domestika|skillshare|linkedin learning|workshop|bootcamp/i,
    category: "Cursos",
  },

  // ── PETS ────────────────────────────────────────────────
  {
    pattern:
      /petz|cobasi|petlove|agropet|pet shop|petshop|veterinario|veterinária|veterinário|clinica veterin|ração|racao/i,
    category: "Pets",
  },

  // ── LAZER / ENTRETENIMENTO ──────────────────────────────
  {
    pattern:
      /cinemark|cinepolis|cinépolis|uci cinema|ingresso|show|teatro|parque|hopi hari|beto carrero|aquamania|ingressorapido|ticketmaster|eventim/i,
    category: "Lazer",
  },

  // ── VIAGENS ─────────────────────────────────────────────
  {
    pattern:
      /airbnb|booking|hotels\.com|decolar|latam|gol linhas|azul linhas|tam|voeazul|rodoviaria|rodoviária|hotel|pousada|hostel|trivago/i,
    category: "Viagens",
  },

  // ── CONTAS / UTILIDADES ─────────────────────────────────
  {
    pattern:
      /copel|sanepar|compagas|claro|tim |vivo |oi |net |sky |gvt|elektro|cemig|sabesp|enel|light |celpe|equatorial/i,
    category: "Contas",
  },

  // ── CASA ────────────────────────────────────────────────
  {
    pattern:
      /leroy merlin|tokstok|tok&stok|etna|mobly|casas bahia|magazine luiza|magalu|fast shop|ikea|telhanorte|dicico|sodimac|quero quero/i,
    category: "Casa",
  },
];

// Palavras-chave genéricas por categoria (fallback se não bater no dicionário de marcas)
const KEYWORD_RULES = [
  { pattern: /mercado|supermercado/i, category: "Mercado" },
  {
    pattern: /ifood|rappi|delivery|lanche|hamburguer|pizza/i,
    category: "Delivery",
  },
  {
    pattern: /uber|99pop|taxi|táxi|ônibus|transporte/i,
    category: "Transporte",
  },
  {
    pattern: /combustível|combustivel|gasolina|posto|etanol/i,
    category: "Combustível",
  },
  {
    pattern: /farmacia|farmácia|remedio|remédio|medicamento/i,
    category: "Farmácia",
  },
  {
    pattern: /netflix|spotify|disney|prime|youtube|assinatura/i,
    category: "Assinaturas",
  },
  {
    pattern: /mensalidade|escola|faculdade|colegio|colégio/i,
    category: "Escola",
  },
  { pattern: /curso|workshop|treinamento/i, category: "Cursos" },
  {
    pattern: /academia|ginástica|ginastica|natação|natacao|crossfit|personal/i,
    category: "Atividade Física",
  },
  {
    pattern:
      /unimed|plano de saúde|plano saude|medico|médico|psicologo|psicóloga|psicopedagoga|terapeuta|dentista/i,
    category: "Saúde",
  },
  {
    pattern: /luz|água|agua|internet|telefone|celular|conta de/i,
    category: "Contas",
  },
  { pattern: /aluguel|condominio|condomínio|reforma|casa/i, category: "Casa" },
  { pattern: /cinema|teatro|show|ingresso|lazer|parque/i, category: "Lazer" },
  {
    pattern:
      /roupa|calçado|calcado|tenis|tênis|camiseta|camisa|vestido|bermuda/i,
    category: "Vestuário",
  },
  {
    pattern: /pet|petshop|ração|racao|veterinario|veterinário/i,
    category: "Pets",
  },
  { pattern: /viagem|hotel|passagem|airbnb|hostel/i, category: "Viagens" },
];

/**
 * Detecta a categoria a partir do texto digitado.
 * Primeiro tenta o dicionário de marcas, depois as palavras-chave genéricas.
 * Se nada bater, retorna "Geral".
 */
export function detectCategory(text) {
  const t = text.toLowerCase();

  // 1. Dicionário de marcas (maior precisão)
  for (const { pattern, category } of BRAND_DICT) {
    if (pattern.test(t)) return category;
  }

  // 2. Palavras-chave genéricas (fallback)
  for (const { pattern, category } of KEYWORD_RULES) {
    if (pattern.test(t)) return category;
  }

  return "Geral";
}

/**
 * Detecta a forma de pagamento a partir do texto.
 */
export function detectPaymentMethod(text) {
  const t = text.toLowerCase();
  if (/pix/i.test(t)) return "Pix";
  if (/cartão|cartao|credito|crédito/i.test(t)) return "Crédito";
  if (/dinheiro/i.test(t)) return "Dinheiro";
  return "Não identificado";
}

/**
 * Parse completo de um texto de lançamento.
 * Retorna objeto pronto para inserir no Supabase.
 */
export function parseLaunchText(text) {
  const normalizedText = text.toLowerCase().trim();

  // Valor
  const amountMatch = normalizedText.match(
    /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+/,
  );
  const amount = amountMatch ? parseFloat(amountMatch[0].replace(",", ".")) : 0;

  // Categoria
  const category = detectCategory(normalizedText);

  // Forma de pagamento
  const payment_method = detectPaymentMethod(normalizedText);

  // Data
  let transactionDate = new Date();
  let detectedDate = null;

  if (/ontem/i.test(normalizedText)) {
    transactionDate.setDate(transactionDate.getDate() - 1);
  }

  const dateMatch = normalizedText.match(
    /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/,
  );
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]) - 1;
    const year = dateMatch[3]
      ? dateMatch[3].length === 2
        ? 2000 + parseInt(dateMatch[3])
        : parseInt(dateMatch[3])
      : new Date().getFullYear();
    transactionDate = new Date(year, month, day);
    detectedDate = true;
  }

  // Descrição limpa
  let cleanDescription = normalizedText
    .replace(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+/g, "")
    .replace(
      /\bpix\b|\bcartão\b|\bcartao\b|\bcredito\b|\bcrédito\b|\bdinheiro\b/g,
      "",
    )
    .replace(/\bontem\b|\bhoje\b/g, "")
    .replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, "")
    .replace(/\s+/g, " ")
    .trim();
  cleanDescription =
    cleanDescription.charAt(0).toUpperCase() + cleanDescription.slice(1);

  return {
    description: cleanDescription || "Lançamento",
    amount,
    category,
    payment_method,
    type: "expense",
    transaction_date: transactionDate.toISOString().split("T")[0],
    source: "manual",
    notes: null,
    detectedDate,
  };
}
