// Twitter uses its own "twitter:image" tag but the same visual works
// perfectly fine. We just re-export the opengraph-image generator.
export { default, alt, size, contentType } from "./opengraph-image";
