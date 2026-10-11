import wallpaperBranchDetail from '../generated/detail-previews/wallpaper-1.webp';
import wallpaperFairyDetail from '../generated/detail-previews/wallpaper-2.webp';
import wallpaperForestDetail from '../generated/detail-previews/wallpaper-3.webp';
import wallpaperArchTreeDetail from '../generated/detail-previews/wallpaper-4.webp';
import wallpaperJungleDetail from '../generated/detail-previews/wallpaper-5.webp';
import wallpaperClassicGardenDetail from '../generated/detail-previews/wallpaper-6.webp';
import bathroomAccessoriesPreviewDetail from '../generated/detail-previews/bathroom-accessories-1.webp';
import aerialTexturePreviewDetail from '../generated/detail-previews/aerial-texture-12.webp';
import thumbnailClassicGarden from '../generated/hero-previews/legacy-6.jpg';
import thumbnailJungle from '../generated/hero-previews/legacy-5.jpg';
import thumbnailArchTree from '../generated/hero-previews/legacy-4.jpg';
import thumbnailForest from '../generated/hero-previews/legacy-3.jpg';
import thumbnailFairy from '../generated/hero-previews/legacy-2.jpg';
import thumbnailBranch from '../generated/hero-previews/legacy-1.jpg';
﻿import wallpaperBranch from "../assets/images/wallpapers/previews/1.jpg";
import wallpaperFairy from "../assets/images/wallpapers/previews/2.jpg";
import localWallpapers from '../generated/wallpaper-featured.js';
import localModels from '../generated/model-catalogue.js';
import wallpaperForest from "../assets/images/wallpapers/previews/3.jpg";
import wallpaperArchTree from "../assets/images/wallpapers/previews/4.jpg";
import wallpaperJungle from "../assets/images/wallpapers/previews/5.jpg";
import wallpaperClassicGarden from "../assets/images/wallpapers/previews/6.jpg";
import bathroomAccessoriesPreview from "../generated/site-media/bathroom-accessories-1.webp";
import aerialTexturePreview from "../generated/site-media/aerial-texture-12.webp";

export const wallpaperShowcaseImages = [
  wallpaperBranch,
  wallpaperFairy,
  wallpaperForest,
  wallpaperArchTree,
  wallpaperJungle,
  wallpaperClassicGarden,
];

export const paperTypes = [
  { id: "standard", label: "Standard Matte", multiplier: 1, note: "Smooth non-woven paper for everyday spaces." },
  { id: "canvas", label: "Premium Canvas", multiplier: 1.16, note: "Visible texture with a richer, hand-finished feel." },
  { id: "feather", label: "Feather Texture", multiplier: 1.28, note: "Soft grain that diffuses light well in bedrooms." },
  { id: "linen", label: "Wall Linen", multiplier: 1.42, note: "Structured weave for premium residential projects." },
  { id: "earthy", label: "Earthy Textile", multiplier: 1.58, note: "Warm tactile finish for statement walls and hospitality work." },
];

export const pricingThemes = [
  {
    id: "child", label: "Child", title: "Moon Garden Storywall",
    description: "Playful characters, soft stars, and calm pastel layering for nurseries and kid zones.",
    preview: wallpaperFairy, accent: "#d89aa7",
    bestFor: "Nursery, playroom, reading nook",
    finish: "Soft matte with low glare", turnaround: "7 to 9 working days",
    rate: 46, setupFee: 3200,
  },
  {
    id: "nature", label: "Nature", title: "Forest Hush Panorama",
    description: "Layered foliage, misty depth, and organic rhythm for restful residential spaces.",
    preview: wallpaperForest, accent: "#8e7d63",
    bestFor: "Living room, foyer, studio",
    finish: "Balanced natural texture", turnaround: "6 to 8 working days",
    rate: 52, setupFee: 3600,
  },
  {
    id: "floral", label: "Floral", title: "Rose Atrium Bloom",
    description: "Large floral rhythm with a soft heritage palette for elegant feature walls.",
    preview: wallpaperBranch, accent: "#b27a84",
    bestFor: "Powder room, lounge, boutique",
    finish: "Painterly detail and warm tone", turnaround: "7 to 10 working days",
    rate: 56, setupFee: 3800,
  },
  {
    id: "abstract", label: "Abstract", title: "Prism Echo Composition",
    description: "Graphic movement, tonal contrast, and a gallery-like finish for bold interiors.",
    preview: wallpaperJungle, accent: "#6e5f91",
    bestFor: "Studio, office, reception",
    finish: "Sharp contrast and clean edges", turnaround: "5 to 7 working days",
    rate: 60, setupFee: 4200,
  },
  {
    id: "luxury", label: "Luxury", title: "Stone Bloom Signature",
    description: "High-contrast mural styling with boutique-hotel presence and tailored detailing.",
    preview: wallpaperClassicGarden, accent: "#8a6448",
    bestFor: "Master suite, lounge, hospitality",
    finish: "Deep color and premium texture", turnaround: "8 to 12 working days",
    rate: 68, setupFee: 5000,
  },
  {
    id: "minimal", label: "Minimal", title: "Dune Quiet Field",
    description: "Restrained tonal work for calm surfaces, subtle luxury, and quiet depth.",
    preview: wallpaperArchTree, accent: "#9e8d79",
    bestFor: "Bedroom, study, hallway",
    finish: "Muted grain and soft edges", turnaround: "5 to 7 working days",
    rate: 48, setupFee: 3000,
  },
];

export const projects = [
  ...localModels,
  {
    id: "aerial-texture-12", title: "Aerial Texture 12",
    workType: "3d", collection: "interior", category: "materials", theme: "Archmaterials",
    ownership: "curated", year: "", location: "",
    mediumLabel: "Archmaterials / MAT / 3DS Max / FBX / OBJ",
    cover: aerialTexturePreviewDetail, thumbnail: aerialTexturePreview, gallery: [aerialTexturePreviewDetail],
    shopCategories: ["materials"],
    sourceFiles: [{ name: "Aerial Texture 12.rar", formats: ["mat", "max", "fbx", "obj"], url: "/api/designs/aerial-texture-12/download" }],
    summary: "Grey architectural surface texture. Download the complete RAR package with MAT material, JPG texture, 3DS Max 2014 scene, FBX, OBJ and MTL files.",
  },
  {
    id: "bathroom-accessories-1", title: "Bathroom Accessories 1",
    workType: "3d", collection: "interior", category: "bathroom", theme: "Bathroom Accessories",
    ownership: "curated", year: "", location: "",
    mediumLabel: "FBX / OBJ / 3DS Max",
    cover: bathroomAccessoriesPreviewDetail, thumbnail: bathroomAccessoriesPreview, gallery: [bathroomAccessoriesPreviewDetail],
    shopCategories: ["bathroom", "decor"],
    sourceFiles: [{ name: "Bathroom Accessories 1.rar", formats: ["fbx", "obj", "max"], url: "/api/designs/bathroom-accessories-1/download" }],
    summary: "Bathroom accessory set with towels, toiletries, decorative vessels and flowers. Download the complete RAR package containing FBX, OBJ, MTL, 3DS Max scenes and texture maps.",
  },
  ...localWallpapers,
  {
    id: "floral-branch-wall", title: "Floral Branch Customized Wallpaper",
    year: "2025", workType: "wallpaper", theme: "floral", ownership: "owned",
    mediumLabel: "Customized Wallpaper", location: "Surat",
    thumbnail: thumbnailBranch, cover: wallpaperBranchDetail, gallery: [wallpaperBranchDetail],
    summary: "Customized floral branch wallpaper installed for a residential entrance wall with soft neutral background and hand illustrated blossoms.",
  },
  {
    id: "fairy-garden-wall", title: "Fairy Garden Kids Room Wallpaper",
    year: "2025", workType: "wallpaper", theme: "child", ownership: "owned",
    mediumLabel: "Customized Wallpaper", location: "Surat",
    thumbnail: thumbnailFairy, cover: wallpaperFairyDetail, gallery: [wallpaperFairyDetail],
    summary: "Custom kids room wallpaper featuring a fairy character and nature landscape designed to create a dreamy playful space.",
  },
  {
    id: "misty-forest-wall", title: "Misty Forest Wallpaper",
    year: "2025", workType: "wallpaper", theme: "nature", ownership: "owned",
    mediumLabel: "Customized Wallpaper", location: "Surat",
    thumbnail: thumbnailForest, cover: wallpaperForestDetail, gallery: [wallpaperForestDetail],
    summary: "Minimal forest themed wallpaper installed in a modern bedroom with soft neutral tones and depth illusion.",
  },
  {
    id: "arch-tree-mural", title: "Arch Frame Tree Wallpaper",
    year: "2025", workType: "wallpaper", theme: "minimal", ownership: "owned",
    mediumLabel: "Customized Wallpaper", location: "Surat",
    thumbnail: thumbnailArchTree, cover: wallpaperArchTreeDetail, gallery: [wallpaperArchTreeDetail],
    summary: "Decorative arch framed wallpaper mural creating a focal wall with a calm tree silhouette composition.",
  },
  {
    id: "jungle-classic-wall", title: "Classic Jungle Landscape Wallpaper",
    year: "2025", workType: "wallpaper", theme: "nature", ownership: "owned",
    mediumLabel: "Customized Wallpaper", location: "Surat",
    thumbnail: thumbnailJungle, cover: wallpaperJungleDetail, gallery: [wallpaperJungleDetail],
    summary: "Large scale jungle landscape mural inspired by classic botanical illustration used for a feature wall.",
  },
  {
    id: "stone-bloom-signature", title: "Stone Bloom Signature",
    year: "2024", workType: "wallpaper", theme: "luxury", ownership: "curated",
    mediumLabel: "Wallpaper Collection", location: "Hyderabad",
    thumbnail: thumbnailClassicGarden, cover: wallpaperClassicGardenDetail, gallery: [wallpaperClassicGardenDetail],
    summary: "A high-end mural language built around stone tones, sculpted blooms, and calm drama.",
  },
  {
    id: "moon-garden-storywall", title: "Moon Garden Storywall",
    year: "2026", workType: "wallpaper", theme: "child", ownership: "owned",
    mediumLabel: "Wallpaper Collection", location: "Mumbai",
    thumbnail: thumbnailFairy, cover: wallpaperFairyDetail, gallery: [wallpaperFairyDetail],
    summary: "A calm illustrated mural for a child bedroom with layered clouds, birds, and pastel foliage.",
  },
  {
    id: "forest-hush-panorama", title: "Forest Hush Panorama",
    year: "2025", workType: "wallpaper", theme: "nature", ownership: "owned",
    mediumLabel: "Wallpaper Collection", location: "Bengaluru",
    thumbnail: thumbnailForest, cover: wallpaperForestDetail, gallery: [wallpaperForestDetail],
    summary: "A panoramic canopy scene tuned for large walls and soft natural light.",
  },
  {
    id: "rose-atrium-bloom", title: "Rose Atrium Bloom",
    year: "2024", workType: "wallpaper", theme: "floral", ownership: "curated",
    mediumLabel: "Wallpaper Collection", location: "Delhi",
    thumbnail: thumbnailBranch, cover: wallpaperBranchDetail, gallery: [wallpaperBranchDetail],
    summary: "Romantic floral layering with restrained pinks and a painterly heritage feel.",
  },
  {
    id: "prism-echo-composition", title: "Prism Echo Composition",
    year: "2025", workType: "wallpaper", theme: "abstract", ownership: "owned",
    mediumLabel: "Wallpaper Collection", location: "Pune",
    thumbnail: thumbnailJungle, cover: wallpaperJungleDetail, gallery: [wallpaperJungleDetail],
    summary: "Geometric rhythm and soft metallic contrast for brand-led interiors and feature walls.",
  },
 ];


let cataloguePending;
export function loadWallpaperCatalogue() {
  if (!cataloguePending) cataloguePending = import('../generated/wallpaper-catalogue.js').then(({ default: catalogue }) => {
    const start = projects.findIndex(project => project.id === localWallpapers[0]?.id);
    if (start >= 0) projects.splice(start, localWallpapers.length, ...catalogue);
    else projects.push(...catalogue);
    return projects;
  }).catch(error => { cataloguePending = null; throw error; });
  return cataloguePending;
}
