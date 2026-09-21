// Stored theme rates are per centimeter; convert inch inputs before pricing.
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
  const dimensionFactor = Math.round((width + height) * 100) / 100;
  const rateMultiplier = inches ? 2.54 : 1;
  return { width, height, dimensionFactor, rateMultiplier, centimeters: dimensionFactor * rateMultiplier };
}
