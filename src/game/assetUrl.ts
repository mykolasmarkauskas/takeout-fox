/**
 * URL of a 3D model in public/models. Some static hosts (e.g. the claude.ai demo page)
 * won't serve .glb, so a build can set VITE_MODEL_EXT=.txt and ship the files renamed.
 */
export const modelUrl = (path: string) => import.meta.env.BASE_URL + path + (import.meta.env.VITE_MODEL_EXT ?? '');
