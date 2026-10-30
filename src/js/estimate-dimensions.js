// Normalize wall measurements and calculate area for per-square-foot print rates.
export function estimateDimensions(rawWidth, rawHeight, unit = 'cm') {
  const inches = unit === 'in';
  const min = inches ? 15.75 : 40;
  const max = inches ? 196.85 : 500;
  const normalize = value => {
    const number = Number(value);
    return Math.round(Math.min(max, Math.max(min, Number.isFinite(number) ? number : min)) * 100) / 100;
  };
  const width = normalize(rawWidth);
  const height = normalize(rawHeight);
  const widthInFeet = inches ? width / 12 : width / 30.48;
  const heightInFeet = inches ? height / 12 : height / 30.48;
  const areaSquareFeet = Math.round(widthInFeet * heightInFeet * 100) / 100;
  // Keep the prior dimension summary fields for callers that still consume them.
  const dimensionFactor = Math.round((width + height) * 100) / 100;
  const rateMultiplier = inches ? 2.54 : 1;
  const centimeters = dimensionFactor * rateMultiplier;
  return { width, height, areaSquareFeet, dimensionFactor, rateMultiplier, centimeters };
}
