import collection01 from "../assets/images/collection-01.svg";
import collection02 from "../assets/images/collection-02.svg";
import collection03 from "../assets/images/collection-03.svg";

export const projects = [
  {
    id: "residential-2024",
    title: "Residential Space",
    year: "2024",
    type: "interior",
    category: "residential",
    workType: "wallpaper",
    cover: collection01,
    gallery: [collection01, collection02]
  },
  {
    id: "brand-identity-2023",
    title: "Brand Identity",
    year: "2023",
    type: "graphic",
    category: "branding",
    workType: "3d",
    cover: collection02,
    gallery: [collection02, collection03]
  },
  {
    id: "viana-brand-identity",
    title: "Viana Brand Identity",
    year: "2024",
    type: "graphic",
    category: "branding",
    workType: "3d",
    cover: collection03,
    gallery: [collection03, collection01]
  }
];
