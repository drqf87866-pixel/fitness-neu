import type { Unit } from "@shared/types";

const LBS_PER_KG = 2.2046226218;

export function kgToDisplay(kg: number, unit: Unit): number {
  const value = unit === "lbs" ? kg * LBS_PER_KG : kg;
  return Math.round(value * 10) / 10;
}

export function displayToKg(value: number, unit: Unit): number {
  const kg = unit === "lbs" ? value / LBS_PER_KG : value;
  return Math.round(kg * 100) / 100;
}

export function unitLabel(unit: Unit) {
  return unit === "lbs" ? "lbs" : "kg";
}
