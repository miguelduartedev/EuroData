import type { EurostatJsonStatDataset } from "../../api/eurostat/types";

/** A deterministic sparse JSON-stat fixture with deliberately non-obvious dimension order. */
export const sparseEurostatFixture: EurostatJsonStatDataset = {
  id: ["time", "unit", "geo", "freq"],
  size: [2, 1, 2, 1],
  dimension: {
    time: { category: { index: { "2016": 0, "2015": 1 } } },
    unit: { category: { index: { PPS_EU27_2020_HAB: 0 } } },
    geo: { category: { index: { SE11: 0, FI1B: 1 } } },
    freq: { category: { index: { A: 0 } } },
  },
  value: { "0": 115, "1": 0, "3": 108 },
  status: { "1": "e" },
};
