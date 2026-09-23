import { expect, it } from "vitest";
import { getMetricDefinition } from "../data/metrics";
import { formatMetricDifference, formatMetricPeriodChange, formatMetricValue } from "./metric-format";
import { availableMetricYear } from "./metric-year";

it("formats GDP, euros and signed rates from the metric definition", () => {
  const pps = getMetricDefinition("gdp_per_capita");
  const eur = getMetricDefinition("gdp_per_capita_eur");
  const growth = getMetricDefinition("gdp_growth");
  const unemployment = getMetricDefinition("unemployment_rate");
  expect(formatMetricValue(50_400, pps)).toBe("50,400");
  expect(formatMetricValue(50_400, eur)).toBe("€50,400");
  expect(formatMetricValue(-2.4, growth)).toBe("-2.4%");
  expect(formatMetricValue(0, growth)).toBe("0%");
  expect(formatMetricValue(5.3, unemployment)).toBe("5.3%");
  expect(formatMetricDifference(3.2, unemployment)).toBe("+3.2 pp");
  expect(formatMetricDifference(-2.1, growth)).toBe("-2.1 pp");
  expect(formatMetricDifference(10_000, eur)).toBe("€10,000 per inhabitant");
  expect(formatMetricPeriodChange(12.6, pps)).toBe("+12.6%");
  expect(formatMetricPeriodChange(-1.4, unemployment)).toBe("-1.4 pp");
  expect(formatMetricValue(1_234_567, getMetricDefinition("population"))).toBe("1,234,567");
  expect(formatMetricValue(1_234_567, getMetricDefinition("population"), true)).toBe("1.2M");
  expect(formatMetricValue(78.4, getMetricDefinition("employment_rate"))).toBe("78.4%");
  expect(formatMetricPeriodChange(1.2, getMetricDefinition("employment_rate"))).toBe("+1.2 pp");
  expect(formatMetricPeriodChange(-0.4, getMetricDefinition("population_growth"))).toBe("-0.4 pp");
});

it("retains available years and reconciles to the nearest earlier year", () => {
  expect(availableMetricYear(2023, [2024, 2023, 2021])).toBe(2023);
  expect(availableMetricYear(2023, [2024, 2022, 2021])).toBe(2022);
  expect(availableMetricYear(2010, [2024, 2022, 2021])).toBe(2024);
  expect(availableMetricYear(2023, [])).toBe(2023);
});
