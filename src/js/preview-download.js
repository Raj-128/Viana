// The exported preview includes the watermark in its pixels, not just a CSS overlay.
export async function createPreviewDownload(project) {
  const image = new Image();
  image.src = project.cover;
  await image.decode();
  const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Preview downloads are not supported in this browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const size = Math.max(16, Math.round(canvas.width / 30));
  context.font = `600 ${size}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (let y = 50; y < canvas.height + 100; y += size * 5) {
    for (let x = 60; x < canvas.width + 100; x += size * 10) {
      context.save();
      context.translate(x, y);
      context.rotate(-Math.PI / 6);
      context.lineWidth = 2;
      context.strokeStyle = "rgba(0,0,0,.35)";
      context.fillStyle = "rgba(255,255,255,.65)";
      context.strokeText("Studio Viana", 0, 0);
      context.fillText("Studio Viana", 0, 0);
      context.restore();
    }
  }
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob?.size) resolve(blob);
    else reject(new Error("Could not prepare the preview. Please try again."));
  }, "image/jpeg", .88));
}
