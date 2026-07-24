// The 5 physical book sets (spec §3). Sets only — individual books are never sold.
// Prices in integer paise, weights in grams. Prices INCLUDE shipping.

export const SKU_CODES = ["PGCET_MBA", "PGCET_MCA", "MAT", "CAT", "CLAT"] as const;
export type SkuCode = (typeof SKU_CODES)[number];

export interface SeedSku {
  code: SkuCode;
  name: string;
  bookCount: number;
  titles: string[];
  pricePaise: number;
  weightGrams: number;
}

export const SKU_CATALOGUE: SeedSku[] = [
  {
    code: "PGCET_MBA",
    name: "PGCET MBA book set",
    bookCount: 5,
    titles: ["Logical", "Quantitative", "English", "Computer", "GK"],
    pricePaise: 160_000, // ₹1,600
    weightGrams: 1000, // 1.0 kg
  },
  {
    code: "PGCET_MCA",
    name: "PGCET MCA book set",
    bookCount: 6,
    titles: ["Logical", "Quantitative", "English", "Computer", "GK", "Mathematics"],
    pricePaise: 170_000, // ₹1,700
    weightGrams: 1200, // 1.2 kg
  },
  {
    code: "MAT",
    name: "MAT book set",
    bookCount: 4,
    titles: ["Logical", "English", "Mathematics", "Data Interpretation"],
    pricePaise: 200_000, // ₹2,000
    weightGrams: 2000, // 2.0 kg
  },
  {
    code: "CAT",
    name: "CAT book set",
    bookCount: 11,
    titles: ["Logical", "Quantitative", "English"],
    pricePaise: 800_000, // ₹8,000
    weightGrams: 4000, // 4.0 kg
  },
  {
    code: "CLAT",
    name: "CLAT book set",
    bookCount: 13,
    titles: ["Logical", "Quantitative", "English", "Legal", "Workbooks", "Textbooks"],
    pricePaise: 900_000, // ₹9,000
    weightGrams: 5500, // 5.5 kg
  },
];
